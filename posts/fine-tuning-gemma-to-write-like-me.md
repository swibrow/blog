---
title: "Fine-Tuning Gemma to Write Like Me"
date: 2026-10-08
description: "QLoRA on Gemma 4 12B with 17k of my own Slack, email and WhatsApp messages, trained on a 3090 Ti in my home Kubernetes cluster"
author: "Samuel Wibrow"
tags: [ai, kubernetes]
draft: true
---

Ask any instruction-tuned model to write a quick message to a mate and you get the same thing every time: a short preamble about what it's going to do, three options with headings, and a closing line offering to adjust the tone. Nobody I know writes like that. I certainly don't.

So I spent a couple of days finding out what it takes to make a model write like *me*. The plan: export everything I've written in Slack, email and WhatsApp, turn it into a fine-tuning dataset, and train a LoRA adapter for Gemma 4 12B on the GPU sitting in my home cluster.

Short version: the style transfers surprisingly well. The content is a different story.

---

## The data

Three sources, all text I wrote myself:

| Source | Samples | Median length |
|---|---|---|
| Slack | 14,061 | |
| Gmail | 2,645 | 51 words |
| WhatsApp | 1,122 | 8 words |

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

The GPU is an RTX 3090 Ti in one worker node of my home Talos cluster, so training runs as a Kubernetes `Job`. The PVC and the GPU `ResourceClaimTemplate` (dynamic resource allocation, rather than the old `nvidia.com/gpu` resource) live in my home-ops repo; the job itself is a plain manifest submitted by a wrapper script.

The fiddly part is getting a 5 MB dataset onto the volume before training starts. Rather than building an image or adding an upload service, the pod starts with an init container that waits for a marker file:

```yaml
initContainers:
  - name: wait-for-data
    image: docker.io/library/busybox:1.37
    command: ["sh", "-c", "until [ -f /workspace/data/.ready-$HOSTNAME ]; do sleep 5; done"]
```

`run.sh` creates the job, waits for that init container to be running, `kubectl cp`s the JSONL files in, touches the marker, and follows the training logs. The training code itself goes in through a ConfigMap, so changing a hyperparameter doesn't need an image rebuild. Two other small things: `/dev/shm` is an 8Gi memory-backed `emptyDir`, because the default 64Mi is too small for dataloader workers, and the Hugging Face token comes from a secret that's already in the cluster.

The one real annoyance: there's only one GPU, and other apps on the cluster (image generation, a local LLM) grab it whenever they're awake. Before every run they have to be scaled to zero, and ArgoCD keeps putting one of them back on sync. That needs an `ignoreDifferences` on `/spec/replicas`, which I still haven't done.

### Numbers

| | |
|---|---|
| Steps | 1,059 |
| Wall time | 1h 19m |
| Time per step | ~4.3 s |
| VRAM | 10.2 GB |
| Average train loss | 2.10 |

| Step | 200 | 400 | 600 | 800 | 1000 | end |
|---|---|---|---|---|---|---|
| eval loss | 2.735 | 2.656 | 2.598 | 2.565 | 2.553 | 2.553 |

Validation loss drops steadily and flattens out towards the end of the epoch. A 12B model in 10 GB of VRAM is the whole point of QLoRA, and it leaves plenty of headroom on a 24 GB card.

---

## Running it locally

I didn't want to need the cluster just to try it out, so the adapter gets converted to GGUF and served on my Mac with llama.cpp, on top of Unsloth's Q4_K_M quantisation of the base model:

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

**The style transfers.** Fine-tuned output is short and casual, uses my sign-offs, and goes straight to the point. Base Gemma, given the same prompt, thinks out loud and then offers a list of templates. On tone alone, it's convincing.

**But it writes like it's halfway through a conversation.** A lot of outputs read like replies to something you can't see: "Yeah that would be great...". Looking back at the data, that's exactly what I trained it on:

- About 42% of my sent email is replies. I stripped the `Re:` and the quoted original, so the model sees a reply with no question.
- 46% of the Slack and WhatsApp samples are eight words or fewer.
- The prompts carry almost no information. "Write a Slack message in #channel" says nothing about *what* the message should say, so the model learns to produce plausible-sounding text with no particular content.

It learned my style perfectly well. It just had nothing to learn content *from*.

**It also memorised things it shouldn't have.** Redacting emails, phone numbers and IBANs isn't enough: the model happily reproduces colleagues' names, internal links and my full name. Regex redaction catches the structured stuff, not the people. The adapter stays private, and anything trained on personal messages should be treated as if it contains those messages, because to a degree it does.

---

## Next time

The fix for the content problem is better prompts, not more data:

1. **Instruction back-translation**: have base Gemma read each message and write a specific instruction for it ("Tell the team the deploy is delayed until tomorrow because of the failing migration"), so the model learns to map *what to say* to *how I'd say it*.
2. **Reply versus new**: train replies as `Reply to this email: <original>` with the quoted text kept, and new messages as `Write a new email about <subject>`. Same for Slack threads and WhatsApp.
3. **Rebalance the sources**: Slack is almost 80% of the data. Cap it, and pull the full WhatsApp history from an iPhone backup, which uses the same `ChatStorage.sqlite` schema.
4. **Make the GPU dance automatic**: an Argo Workflow that scales the GPU apps down, trains, and scales them back up.

The interesting lesson for me is how much of fine-tuning is dataset work. The training script barely changed after the first run. Every problem with the output came straight back to how the samples were built, and the model was very good at learning exactly what I gave it, including the bits I didn't mean to.
