---
title: "RTX PRO 4000 Blackwell vs RTX 3090 Ti for local LLMs: Qwen3.8-27B benchmarks"
date: 2026-10-10
description: "Is a single-slot RTX PRO 4000 Blackwell a viable second GPU instead of another 3090 Ti? llama.cpp benchmarks on Qwen3.8-27B, power cost in CHF, and both cards split together"
author: "Samuel Wibrow"
tags: [ai, kubernetes]
---

My AI node already has a used RTX 3090 Ti. I wanted a second 24GB card, but a second 3090 Ti is three slots and doesn't fit in the case. The only option was a single-slot card, so I bought an RTX PRO 4000 Blackwell and benchmarked it against the 3090 Ti to check it was worth it.

## Verdict

- **Single card:** the PRO 4000 does 88% of the 3090 Ti's generation speed at my usual 300W cap, 98% of its prompt speed, and 104% of its batched throughput, at 145W.
- **Against a stock 450W 3090 Ti** it does 68% of the generation speed.
- **Efficiency:** 4.5 J per generated token vs 8.3 J (300W) and 9.5 J (450W). Idle is ~4W vs 22-31W.
- **Paired:** the two cards together run Q8_0 (29GB), which neither card can load alone, at 25 t/s, and split Q4 at 40.5 t/s, faster than either card alone.
- **Cost:** CHF 1,600 vs CHF 750 for the used 3090 Ti. Power savings don't recover the difference. You pay for the single slot.

For a build that can only take a single-slot card, the PRO 4000 is the right call.

![My 12U homelab rack, with the 4U AI node in the middle](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/rack.jpg)

## Setup

- **Node:** Ryzen 7 9700X, 64GB RAM, Talos Kubernetes
- **Model:** Qwen3.8-27B (dense), GGUF UD-Q4_K_M (16.5GB). Q4_0, UD-Q5_K_M and Q8_0 also tested.
- **Runtime:** llama.cpp B11096, CUDA 12. `llama-bench` with 128-token generation and 512/2048-token prompts; `llama-batched-bench` for concurrency.
- **Not tested:** FP8 and NVFP4 via vLLM. The weights exceed 24GB.

| | RTX 3090 Ti | RTX PRO 4000 Blackwell |
| :--- | :--- | :--- |
| **Architecture** | Ampere (GA102), 2022 | Blackwell (GB203), 2025 |
| **Launch price (US)** | $1,999 | $1,799 (reported) |
| **Swiss price, 10 Oct 2026** | Not sold new; used CHF 1,000-1,850 on Ricardo | New from CHF 2,250 (OEM), CHF 2,556 (PNY retail) |
| **What I paid** | CHF 750, used | CHF 1,600 |
| **Memory** | 24GB GDDR6X, 384-bit | 24GB GDDR7 ECC, 192-bit |
| **Memory bandwidth** | 1,008 GB/s | 672 GB/s |
| **CUDA cores** | 10,752 | 8,960 |
| **Tensor cores** | 3rd gen | 5th gen (FP4 support) |
| **FP32** | 40 TFLOPS | 40 TFLOPS |
| **Power** | 450W, 3x 8-pin or 16-pin | 145W, 1x 16-pin |
| **Idle power (measured)** | 22-31W | ~4W |
| **Size** | 3-slot | Single-slot blower |
| **PCIe** | Gen 4 x16 (x8 in my box) | Gen 5 x16 (x8 in my box) |

Used 3090 Ti prices: €1,100-1,800 in Germany; on eBay up from under $800 to about [$1,500](https://bestvaluegpu.com/history/new-and-used-rtx-3090-ti-price-history-and-specs/). CHF 750 was well below market.

![The RTX PRO 4000 and the MSI RTX 3090 Ti installed side by side in the AI node](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/both-cards.jpg)

*Single-slot PRO 4000 on the left, three-slot 3090 Ti on the right.*

## Single user

UD-Q4_K_M:

| Metric | 3090 Ti (450W) | 3090 Ti (300W) | 3090 Ti (145W) | PRO 4000 (145W) |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt (2048, 0 context)** | 1591 t/s | 1258 t/s | 309 t/s | 1234 t/s |
| **Gen (0 context)** | 47.5 t/s | 36.5 t/s | 11.3 t/s | 32.1 t/s |
| **Gen (32K context)** | 40.1 t/s | 28.9 t/s | 9.2 t/s | 26.7 t/s |

- 3090 Ti at 450W vs PRO 4000: +48% generation (+53% with UD-Q5_K_M).
- 3090 Ti at 300W vs PRO 4000: +14% generation, +2% prompt.
- 3090 Ti capped at 145W: SM clocks drop to ~300 MHz (vs ~1900 MHz at 450W), it still draws ~168W, and the PRO 4000 is ~3x faster at generation. The full suite took 38 minutes vs 9 at 450W. Don't run a 3090 Ti at 145W.

![Grafana GPU panels during the 3090 Ti run at 450W, sitting at the power limit around 450W and 78°C](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/03-3090ti-450w.png)

*3090 Ti at 450W. Power is the sum of both cards, so it includes the idle PRO 4000 (~4W).*

![Grafana GPU panels during the PRO 4000 run, holding its 145W limit at up to 83°C](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/02-pro4000-145w.png)

*PRO 4000 pinned at 145W, up to 83°C. Includes the idle 3090 Ti (22-31W).*

## Batched throughput

`llama-batched-bench`, 16 parallel requests:

| Card | Total t/s |
| :--- | :--- |
| 3090 Ti (450W) | 249 |
| 3090 Ti (300W) | 205 |
| PRO 4000 (145W) | 214 |

Both cards show a step up in total throughput at a certain batch size: the PRO 4000 between 6 and 8 requests (93 -> 148 t/s), the 3090 Ti between 8 and 12.

## Power cost

Electricity at 0.28 CHF/kWh.

| Metric | 3090 Ti (450W) | 3090 Ti (300W) | PRO 4000 (145W) |
| :--- | :--- | :--- | :--- |
| **Energy per generated token** | 9.5 J | 8.3 J | 4.5 J |
| **CHF per million generated tokens** | 0.74 | 0.65 | 0.35 |
| **Idle power** | 22-31W | 22-31W | ~4W |
| **Idle cost per year (24/7)** | 55-77 CHF | 55-77 CHF | ~10 CHF |
| **Purchase CHF per t/s** | 15.80 | 20.90 | 50.00 |

Recovering the ~850 CHF price difference from power:

- Generating 24/7: ~2.2 billion tokens, ~2.2 years.
- Mostly idle: 45-67 CHF/year saved, 13-19 years.

### Against OpenRouter

Qwen3.8 27B on [OpenRouter](https://openrouter.ai/qwen/qwen3.8-27b), 19 providers (mostly FP8/FP4), 9 October 2026, at 0.83 CHF/USD. Prices per million tokens:

| | Input | Output |
| :--- | :--- | :--- |
| **OpenRouter, cheapest** | 0.02 CHF | 1.12 CHF |
| **OpenRouter, median** | 0.19 CHF | 1.91 CHF |
| **OpenRouter, most expensive** | 0.82 CHF | 3.91 CHF |
| **PRO 4000, electricity only** | under 0.01 CHF | 0.35 CHF |
| **3090 Ti (300W), electricity only** | under 0.02 CHF | 0.65 CHF |

Local input costs are upper bounds: they assume the card sat at its power limit during prompt processing (not measured).

Payback against OpenRouter, single user, counting idle power for the rest of the day. "Busy" is the share of the day spent generating.

| Payback (vs median / vs cheapest) | Busy 10% | Busy 33% | Busy 100% |
| :--- | :--- | :--- | :--- |
| **3090 Ti, 300W (750 CHF)** | 10 years / never | 1.8 / 5.9 years | 0.5 / 1.4 years |
| **PRO 4000 (1,600 CHF)** | 11 / 23 years | 3.1 / 6.4 years | 1.0 / 2.1 years |

At 16 parallel requests, electricity drops to ~0.05-0.11 CHF per million output tokens. At 10% busy that pays the 3090 Ti back in under a year and the PRO 4000 in 1.3 years against the median. This assumes both cards sit at their power limit under batched load (not measured) and ignores input tokens.

## Both cards together

llama.cpp layer split, 3090 Ti at 300W, both cards on PCIe x8 through the CPU, no NVLink.

| Metric | Both, 50/50 | Both, 60/40 | 3090 Ti (300W) | PRO 4000 |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt (2048, UD-Q4_K_M)** | 1947 t/s | 1804 t/s | 1258 t/s | 1234 t/s |
| **Gen (UD-Q4_K_M)** | 39.3 t/s | 40.5 t/s | 36.5 t/s | 32.1 t/s |
| **Prompt (2048, Q8_0)** | 1816 t/s | 1772 t/s | - | - |
| **Gen (Q8_0)** | 24.6 t/s | 25.0 t/s | - | - |

- Split generation beats either card alone; split prompt processing is ~55% faster than either card alone and faster than the 3090 Ti at 450W.
- Q8_0 (29GB) only fits across both cards.
- 16-request batch: 242 t/s total.
- Row split failed to load the model. Tensor split crashed with a CUDA error.

![Grafana GPU panels during the split run across both cards, peaking at 434W and 27.6GB of VRAM](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/08-dual-split.png)

*Both cards, peaking at 434W. The 27.6GB VRAM peak is the Q8_0 run.*

## How the cards are used now

- **PRO 4000:** always-on inference for my agents, since it idles at ~4W.
- **3090 Ti:** ComfyUI, game streaming, and testing new models.
