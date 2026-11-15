---
title: "Python Lambda Cold Starts: From 7 Seconds to 0.4 Without Keeping Anything Warm"
date: 2026-11-06
description: "Bytecode, lazy imports, one request instead of three, and SnapStart took a chat console's Lambda cold starts from 5-7.5 s to under half a second"
author: "Samuel Wibrow"
tags: [aws]
draft: true
---

<!-- TODO: decide how much to name the work project; everything below keeps it generic -->

We run an internal console where people build and chat with AI agents. The agents themselves were fine. Opening the chat page was not: click, wait, wonder if the click registered, click again, wait some more. Classic.

The lazy fix is provisioned concurrency, or a cron that pokes the Lambda every few minutes. I didn't want to pay for idle instances, and "keep it warm" always feels like admitting defeat. So the rule for this one was: make it fast with nothing kept warm.

---

## Where the time actually went

Before touching anything I pulled two days of `REPORT` lines from CloudWatch. That settled it quickly:

<!-- TODO: screenshot or snippet of a REPORT line with a 6 s Init Duration -->

- The API Lambda: 35 of 147 invocations were cold starts, each with an `Init Duration` of **4.9-7.5 s** before the request even began.
- The worker that ran chat turns: **274** cold starts at 4.2-6.7 s each. A chat turn holds its instance for the whole reply, so the next message nearly always lands on a cold one.

None of that is the agents. It's Python starting up. Three things were stacking:

1. **No bytecode in the zip.** The packaging step dropped `__pycache__` and never compiled anything. `/var/task` is read-only, so every cold start recompiled every module from source, every single time.
2. **Imports nobody asked for.** The API imported the package root, and the package root eagerly imported Strands, the Anthropic and OpenAI SDKs and the MCP client. The API uses none of them.
3. **The page waited on itself.** `/me`, then `/agents` and `/options`, then `/chats`, `/dashboards` and the chat itself. Three rounds, each waiting on the last, and requests sent in parallel each woke up their own cold instance.

---

## Step 1: ship the bytecode

Compile at package time, with the *runtime's* Python. This bit caught me: the repo was on 3.13, Lambda on 3.14, and Python silently ignores `.pyc` files from another version. So the build asks uv for the right interpreter:

```python
subprocess.run(
    ["uv", "run", "--no-project", "--python", "3.14", "python", "-c", COMPILE, staging],
    env={**os.environ, "PYTHONHASHSEED": "0"},
    check=True,
)
```

where `COMPILE` is `compileall.compile_dir(...)` with `invalidation_mode=UNCHECKED_HASH`.

Both of those flags matter. The zip gives every file a fixed mtime so builds are reproducible, which means timestamp-checked bytecode would never match its source. `UNCHECKED_HASH` tells Python not to bother checking. `PYTHONHASHSEED=0` keeps the output identical between builds, otherwise every CI run produces a "new" zip and Terraform happily redeploys it.

## Step 2: stop importing the world

The package root became lazy with a module-level `__getattr__`:

```python
_HOMES = {
    "create_app": "agents_sdk.runtime",
    "gateway_client": "agents_sdk.gateway",
    # ...
}

def __getattr__(name):
    home = _HOMES.get(name)
    if home is None:
        raise AttributeError(name)
    value = getattr(import_module(home), name)
    globals()[name] = value
    return value
```

Same public API, nothing loaded until someone actually asks for it, and after the first lookup the name sits in the module's globals so `__getattr__` never runs for it again. Measured locally on a 1-CPU Lambda image (slower than the CloudWatch numbers above, but a fair before/after), the API's cold import went from **8.0-8.4 s to 1.05-1.3 s** with steps 1 and 2 together.

## Step 3: one request, not three

A `GET /chats/page` endpoint that returns everything the page needs, read from S3 in parallel. Starting a chat now sends the first message in the same request and switches the page in place rather than reloading it.

<!-- TODO: how much did one request save? e.g. page load before/after -->

<!-- TODO: before/after network waterfall screenshot -->

## Step 4: SnapStart

[Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) snapshots the initialised execution environment and restores it instead of booting. It works for Python 3.12+, only on published versions, so you need an alias:

```hcl
resource "aws_lambda_function" "api" {
  publish = true
  snap_start {
    apply_on = "PublishedVersions"
  }
}

resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}
```

The trick is to do as much as possible *before* the snapshot. Lambda sets `AWS_LAMBDA_INITIALIZATION_TYPE=snap-start` during that init, so the handler module builds its clients right then:

```python
SNAPSHOTTED = {
    "agents_service.lambdas.api_handler": api,
    "agents_service.lambdas.chat_handler": chat,
}

prepare = SNAPSHOTTED.get(os.environ.get("_HANDLER", ""))
if prepare is not None and os.environ.get("AWS_LAMBDA_INITIALIZATION_TYPE") == "snap-start":
    prepare()
```

`api` and `chat` are each handler's prepare function: they import what that handler needs and build its boto3 clients.

No secrets and no cached data go into the snapshot, just imports and boto3 clients, so nothing stale gets restored.

The worker couldn't join in: it needs 4 GB of `/tmp`, and SnapStart caps that at 512 MB. So chat turns moved to a new, smaller chat Lambda on its own FIFO queue, which *can* be snapshotted.

---

## Rolling it out

<!-- TODO: trim or cut; maybe one paragraph is enough for the blog -->

Everything sat behind two flags. One switched the CloudFront origin from the old function URL to the `live` alias's URL; the other turned on the chat Lambda. Dev first, read the logs, then prod. Rolling back was setting a boolean to `false`.

Dev's logs turned up two leftovers within minutes:

- The tool list in the agent editor still took 4.6-8.7 s on a fresh instance, because the MCP client was imported lazily *after* the restore. Fix: import it during the snapshot instead.
- `Connection pool is full, discarding connection` from botocore. Parallel reads nested inside parallel reads blew straight through the default 10-connection pool. `Config(max_pool_connections=50)` sorted it.

---

## The numbers

<!-- TODO: turn into a chart? -->

| | Before | After (prod) |
|---|---|---|
| API cold start | 4.9-7.5 s | 0.25-0.45 s restore |
| API request, median | | 101 ms |
| Chat turn start | 4.2-6.7 s | 0.44 s restore |
| Chat page load | 3 chained rounds | 1 request |

Still nothing kept warm.

---

## It wasn't free

<!-- TODO: update the version count once old versions get cleaned up -->

SnapStart isn't magic, and a few things bit or will bite:

- **Every published version is billed while it exists.** AWS charges for caching each SnapStart version's snapshot, with a 3-hour minimum, plus a fee per restore. Terraform publishes a new version on every deploy and deletes nothing, so after day one I had 19 of them, of which 4 were actually in use. Version cleanup is now on the list.
- **The snapshot is shared.** Every restored instance wakes up with the same memory. Imports and boto3 clients are fine. A UUID, a random seed or a secret created at import time would be identical in every instance, which is the kind of bug that sits quietly for months.
- **512 MB of `/tmp`, tops.** No provisioned concurrency or EFS either. That's why the worker got left behind and chat turns got their own Lambda: one more function, queue and dead-letter queue to look after.
- **The first S3 call after a restore is still slow-ish.** AWS doesn't guarantee connections opened before the snapshot survive the restore, and in practice the first read took about a second.
- **Faster polling costs reads.** Checking for replies every 0.5 s instead of 0.9 s nearly doubles the calls while a reply comes in. Streaming would fix that properly.
- **The build now needs the runtime's exact Python.** Bytecode from the wrong version is silently ignored, and one image build that blocked Python downloads fell over because of it.
- **Lazy imports move failures.** A broken heavy import now blows up on first use instead of at start.

---

## What's left

- The agent editor's tool list still takes 2.5-3.7 s on a fresh instance. That's no longer Python, it's about ten paginated round trips to the MCP gateway. Caching the list somewhere shared is the next fix.
- Replies are still polled. Streaming them straight to the browser is the bigger, more fun job.

<!-- TODO: closing line -->
