---
title: "Fine-tuning Gemma to write like me"
date: 2026-10-10
description: "QLoRA on Gemma 4 12B with 17k of my own Slack, email and WhatsApp messages, trained on a 3090 Ti in my home Kubernetes cluster"
author: "Samuel Wibrow"
tags: [ai, kubernetes]
---

Ask any instruction-tuned model to write a quick message to a mate and you get the same thing every time: a short preamble about what it's going to do, three options with headings, and a closing line offering to adjust the tone. Nobody I know writes like that. I certainly don't.

So I spent a couple of days finding out what it takes to make a model write like *me*. The plan: export everything I've written in Slack, email and WhatsApp, turn it into a fine-tuning dataset, and train a LoRA adapter for Gemma 4 12B on the GPU sitting in my home cluster.

Short version: the style transfers surprisingly well. The content is a different story.

---

## The data

Three sources, all text I wrote myself:

| Source | Samples | Median length |
|---|---|---|
| Slack | 14,061 | 9 words |
| Gmail | 2,645 | 48 words |
| WhatsApp | 1,122 | 9 words |

That's 17,828 samples, split 95/5 into 16,937 train and 891 validation.

Getting them out was its own little project:

- **Gmail**: `Sent.mbox` from Google Takeout. Only messages where the `From` header matches one of my addresses.
- **Slack**: a small script that pages through `search.messages` with `from:<@me>`, sorted by timestamp, and writes every match to JSONL. It backs off on `429`s, which it hits a lot.
- **WhatsApp**: no export button gets you everything, but WhatsApp Desktop on macOS keeps a `ChatStorage.sqlite` under `~/Library/Group Containers/`. A read-only `sqlite3` connection and one join between `ZWAMESSAGE` and `ZWACHATSESSION` gives you every message with an `ZISFROMME` flag. The catch: Desktop only has the last year or so of history.

### Cleaning it up

`prep.py` turns all three into one chat-format dataset. Most of the work is deciding what counts as "a message I wrote":

- **WhatsApp bursts**: I send three short messages in a row far more often than one long one. Consecutive messages in the same chat within five minutes get merged into a single sample, otherwise the model would only ever learn fragments.
- **Email quotes**: everything after `On ... wrote:` gets cut, along with the German and French variants (`Am ... schrieb`, `Le ... a écrit`), `-- Original Message --`, signatures and `Sent from my iPhone`. Living in Switzerland, the reply headers come in more languages than my emails do.
- **Slack markup**: `<@U123>` mentions become `@name`, channel links become `#channel`, `<url|label>` becomes the label.
- **Redaction**: email addresses, phone numbers and IBANs are replaced with `[email]`, `[phone]` and `[iban]`.
- **Filtering**: anything under three words is dropped, and exact duplicates are removed.

Each sample then becomes a two-turn conversation. The model needs *some* instruction to respond to, so the prompt is generated from the metadata:

```json
{"messages": [
  {"role": "user", "content": "Write a Slack message in #<channel>."},
  {"role": "assistant", "content": "<something I actually wrote>"}
]}
```

Emails get `Write an email with the subject: <subject>` (with `Re:`/`AW:`/`Fwd:` stripped), and WhatsApp just gets `Write a WhatsApp message.` Keep that in mind, it comes back later.

---

## Training

The training script is about 80 lines with [Unsloth](https://github.com/unslothai/unsloth): 4-bit QLoRA on `google/gemma-4-12B-it`.

```python
model, tokenizer = FastModel.from_pretrained(
    model_name="google/gemma-4-12B-it",
    max_seq_length=2048,
    load_in_4bit=True,
    full_finetuning=False,
)
model = FastModel.get_peft_model(
    model,
    finetune_vision_layers=False,
    finetune_language_layers=True,
    finetune_attention_modules=True,
    finetune_mlp_modules=True,
    r=16,
    lora_alpha=16,
    lora_dropout=0,
)
```

The settings that matter:

- **LoRA rank 16** on the attention and MLP layers, vision layers left alone
- **One epoch**, learning rate `2e-4` with a cosine schedule
- **Batch size 2 with 8 gradient accumulation steps**, so an effective batch of 16
- **Loss only on my replies**: `train_on_responses_only` masks the prompt tokens, so the model isn't wasting capacity learning to predict "Write a Slack message."

That last one is easy to miss and it matters. Without it, a good chunk of the loss is spent on the same handful of synthetic prompts.

### Running it on the home cluster

The GPU sits in one worker node of my home Talos cluster, so training runs there. The first run was a plain Kubernetes `Job` with an init container that waited for a marker file while a wrapper script `kubectl cp`'d the dataset onto the volume. It worked, but every run meant scaling the other GPU apps to zero by hand first.

Now it's an [Argo Workflows](https://argoproj.github.io/workflows/) `WorkflowTemplate` in my home-ops repo, one submit per version:

```bash
argo -n ai submit --from workflowtemplate/train -p version=v2 -p gguf=true
```

- **check**: fails the run before any GPU time is spent if that version already exists in S3. My object store has no versioning, so nothing ever gets overwritten.
- **train**: Unsloth on a PVC that already has the dataset and the Hugging Face cache, metrics going to MLflow. The training code comes in through a ConfigMap, so changing a hyperparameter doesn't need an image rebuild.
- **publish**: the LoRA adapter goes to `s3://models/<name>/<version>/`.
- **export** (with `gguf=true`): merges the adapter into the base model and publishes a llama.cpp GGUF next to it.

The GPU comes from a `ResourceClaimTemplate` (dynamic resource allocation, rather than the old `nvidia.com/gpu` resource), and `/dev/shm` is an 8Gi memory-backed `emptyDir` because the default 64Mi is too small for dataloader workers. Since then a [second GPU](/posts/rtx-3090-ti-vs-rtx-pro-4000/) went into the box, so a training run usually gets a card to itself instead of fighting the image generator for it.

### Numbers

| | |
|---|---|
| Steps | 1,059 |
| Wall time | 1h 19m |
| Time per step | ~4.5 s |
| VRAM | 10.2 GB |
| Average train loss | 2.10 |

| Step | 200 | 400 | 600 | 800 | 1000 | end |
|---|---|---|---|---|---|---|
| eval loss | 2.735 | 2.656 | 2.598 | 2.565 | 2.553 | 2.553 |

Validation loss drops steadily and flattens out towards the end of the epoch. A 12B model in 10 GB of VRAM is the whole point of QLoRA, and it leaves plenty of headroom on a 24 GB card.

---

## Running it

The merged GGUF from the export step is served in the cluster like any other model: `style-gemma4`, a llama.cpp server that scales to zero when nobody's talking to it. It loads in about ten seconds on the next request.

For comparisons I still use the adapter on its own on my Mac, on top of Unsloth's Q4_K_M quantisation of the base model:

```bash
llama-server \
  -m outputs/gemma-4-12b-it-Q4_K_M.gguf \
  --lora outputs/style-lora.gguf \
  --port 8089 -c 4096 -ngl 99
```

Converting the adapter needed a newer `transformers` than llama.cpp's conversion script pins, since the older one doesn't know Gemma 4's architecture yet.

The nice thing about loading the adapter separately is that `llama-server` lets you set its scale per request. The same prompt with `"lora": [{"id": 0, "scale": 0}]` gives base Gemma, and `scale: 1` gives me, so comparing the two is a single request each.

---

## What it learned

**The style transfers.** Fine-tuned output is short and casual, uses my sign-offs, and goes straight to the point. Base Gemma, given the same prompt, thinks out loud and then offers a list of templates. Same prompt, "Write a WhatsApp message to a friend asking if they want to grab a beer on Friday.", both ways:

Base Gemma 4 12B, after about a thousand characters of thinking:

> Depending on how close you are with the friend, here are a few different ways to phrase it:
>
> **Option 1: Casual & Short (Best for a close friend)**
> "Hey! You down for a beer this Friday? 🍻"
>
> **Option 2: The "Catch up" (Best if you haven't seen them in a while)** ...

And three more options after that. With the adapter:

> Hey mate, you free for a beer on Friday?

On tone alone, it's convincing.

**But it writes like it's halfway through a conversation.** A lot of outputs read like replies to something you can't see: "Yeah that would be great...". Looking back at the data, that's exactly what I trained it on:

- About 42% of my sent email is replies. I stripped the `Re:` and the quoted original, so the model sees a reply with no question.
- 46% of the Slack and WhatsApp samples are eight words or fewer.
- The prompts carry almost no information. "Write a Slack message in #channel" says nothing about *what* the message should say, so the model learns to produce plausible-sounding text with no particular content.

It learned my style perfectly well. It just had nothing to learn content *from*.

I got a very concrete demonstration of this when I had it write a first draft of my [GPU benchmark post](/posts/rtx-3090-ti-vs-rtx-pro-4000/). I gave it every number. It still swapped "faster" for "slower" in a comparison, turned "per million tokens" into "per 100 million", invented a power connector claim and promised a GitHub repo that doesn't exist. The voice was fine; every fact needed checking.

**It also memorised things it shouldn't have.** Redacting emails, phone numbers and IBANs isn't enough: the model happily reproduces colleagues' names, internal links and my full name. Regex redaction catches the structured stuff, not the people. The adapter stays private, and anything trained on personal messages should be treated as if it contains those messages, because to a degree it does.

---

## Next time

The fix for the content problem is better prompts, not more data:

1. **Instruction back-translation**: have base Gemma read each message and write a specific instruction for it ("Tell the team the deploy is delayed until tomorrow because of the failing migration"), so the model learns to map *what to say* to *how I'd say it*.
2. **Reply versus new**: train replies as `Reply to this email: <original>` with the quoted text kept, and new messages as `Write a new email about <subject>`. Same for Slack threads and WhatsApp.
3. **Rebalance the sources**: Slack is almost 80% of the data. Cap it, and pull the full WhatsApp history from an iPhone backup, which uses the same `ChatStorage.sqlite` schema.

The interesting lesson for me is how much of fine-tuning is dataset work. The training script barely changed after the first run. Every problem with the output came straight back to how the samples were built, and the model was very good at learning exactly what I gave it, including the bits I didn't mean to.
