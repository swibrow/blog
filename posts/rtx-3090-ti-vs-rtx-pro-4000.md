---
title: "RTX 3090 Ti vs RTX PRO 4000 Blackwell for local LLMs: Qwen3.8-27B benchmarks"
date: 2026-10-10
description: "llama.cpp benchmarks of a used RTX 3090 Ti at 450W, 300W and 145W against an RTX PRO 4000 Blackwell on Qwen3.8-27B, plus power cost in CHF and both cards split together"
author: "Samuel Wibrow"
tags: [ai, kubernetes]
---

I recently installed a new card in my homelab server: an RTX PRO 4000 Blackwell (24GB, 1600 CHF) to sit alongside my trusty, second-hand RTX 3090 Ti (24GB, 750 CHF off a local market with about a day of use on it). With the two cards in the same box (a Ryzen 7 9700X/64GB RAM node), I wanted to see how they compared on a 27B model.

This wasn't a "what is the best card" test; it was a "what is the best way to run a 27B model?" test.

## The setup

*   **Model:** Qwen3.8-27B (Dense)
*   **Quantization:** GGUF UD-Q4_K_M (16.5GB, what I run day to day); I also ran Q4_0 and UD-Q5_K_M
*   **Infrastructure:** Homelab Kubernetes (Talos), llama.cpp (B11096, CUDA 12), 128-token generation, 512/2048 prompt sizes.
*   **The Cards:** I usually run the 3090 Ti capped at 300W.

| | RTX 3090 Ti | RTX PRO 4000 Blackwell |
| :--- | :--- | :--- |
| **Architecture** | Ampere (GA102), 2022 | Blackwell (GB203), 2025 |
| **Launch price (US)** | $1,999 | $1,799 (reported) |
| **Swiss price today** | Not sold new; used roughly CHF 1,000-1,850 on Ricardo | New from CHF 2,250 (OEM), CHF 2,556 (PNY retail) |
| **What I paid** | CHF 750, used (about a day of use) | CHF 1,600 |
| **Memory** | 24GB GDDR6X, 384-bit | 24GB GDDR7 ECC, 192-bit |
| **Memory bandwidth** | 1,008 GB/s | 672 GB/s |
| **CUDA cores** | 10,752 | 8,960 |
| **Tensor cores** | 3rd gen | 5th gen (FP4 support) |
| **FP32** | 40 TFLOPS | 40 TFLOPS |
| **Power** | 450W, 3x 8-pin or 16-pin | 145W, 1x 16-pin |
| **Idle power (measured)** | 22-31W | ~4W |
| **Size** | 3-slot | Single-slot blower |
| **PCIe** | Gen 4 x16 (x8 in my box) | Gen 5 x16 (x8 in my box) |

*Prices from Toppreise and Ricardo on 10 October 2026. Used 3090 Tis are rare in Switzerland; in Germany they're listed at €1,100-1,800. On eBay, used prices have roughly doubled from a low under $800 to about [$1,500](https://bestvaluegpu.com/history/new-and-used-rtx-3090-ti-price-history-and-specs/), presumably thanks to people like me wanting 24GB for local models. My CHF 750 was a lucky find.*

*Note: I couldn't test FP8 or NVFP4 via vLLM because the weights exceed 24GB. This is a pure llama.cpp comparison.*

## Single user performance

The core difference is how the 3090 Ti behaves when the power is pulled back.

| Metric | 3090 Ti (450W) | 3090 Ti (300W) | 3090 Ti (145W) | PRO 4000 (145W) |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt (2048, 0 context)** | 1591 t/s | 1258 t/s | 309 t/s | 1234 t/s |
| **Gen (Empty context)** | 47.5 t/s | 36.5 t/s | 11.3 t/s | 32.1 t/s |
| **Gen (32K context)** | 40.1 t/s | 28.9 t/s | 9.2 t/s | 26.7 t/s |

![Grafana GPU panels during the 3090 Ti run at 450W, sitting at the power limit around 450W and 78°C](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/03-3090ti-450w.png)

*The 3090 Ti at 450W. Power on these panels is the sum of both cards, so it includes the idle PRO 4000 (about 4W).*

**The "Wall" at 145W:**
When I capped the 3090 Ti to 145W to match the PRO 4000, it fell off a cliff. The SM clocks plummeted to ~300 MHz (compared to ~1900 MHz at 450W), and it still managed to draw ~168W. At this power level, the PRO 4000 is roughly 3x faster at generation. My guess is that the GDDR6X memory and the board itself are eating the power budget, leaving nothing for the silicon, but I didn't measure that.

![Grafana GPU panels during the 3090 Ti run at 145W, a 38 minute run at low utilisation](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/04-3090ti-145w.png)

*Same suite at 145W: 38 minutes instead of 9.*

**The Sweet Spot:**
At my usual 300W cap, the 3090 Ti is only about 14% faster than the PRO 4000 for generation, and they tie on prompt processing at short context. At stock 450W it pulls away: about 48% faster at generation (53% with Q5_K_M). This is the "homelab" answer: if you don't mind the power and heat of a 3090, you get nearly the same performance for a fraction of the price.

![Grafana GPU panels during the PRO 4000 run, holding its 145W limit at up to 83°C](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/02-pro4000-145w.png)

*The PRO 4000 pinned at its 145W limit. The summed power here includes the idle 3090 Ti (22-31W).*

## Throughput (multi-user)

Using `llama-batched-bench` with 16 parallel requests:
*   **3090 Ti (450W):** 249 t/s total
*   **3090 Ti (300W):** 205 t/s total
*   **PRO 4000:** 214 t/s total

The PRO 4000 holds its own incredibly well in concurrent setups, outperforming my capped 3090 Ti by a small margin. Both cards show a big jump in total throughput at a certain batch size (PRO 4000 between 6 and 8 requests, 93 -> 148 t/s; 3090 Ti between 8 and 12). That looks like a llama.cpp kernel switch, not anything Blackwell-specific.

## The cost of power

This is where the PRO 4000 starts to make sense. I pay 0.28 CHF/kWh.

| Metric | 3090 Ti (450W) | 3090 Ti (300W) | PRO 4000 (145W) |
| :--- | :--- | :--- | :--- |
| **Energy per Gen Token** | 9.5 J | 8.3 J | 4.5 J |
| **Cost/Million Tokens** | 0.74 CHF | 0.65 CHF | 0.35 CHF |
| **Idle Power** | 22-31W | 22-31W | ~4W |
| **Annual Idle Cost (24/7)** | 55-77 CHF | 55-77 CHF | ~10 CHF |
| **Cost per t/s (CapEx)** | 15.80 CHF | 20.90 CHF | 50.00 CHF |

The PRO 4000 is roughly twice as efficient per token. While the 3090 Ti is cheaper per t/s of hardware, the power savings would take years to offset the ~850 CHF price difference. Generating nonstop, it pays back after about 2.2 billion tokens, roughly 2.2 years of 24/7 generation. If the card mostly idles like mine does, the 45-67 CHF a year idle saving alone takes 13-19 years. It doesn't pay for itself on power; you buy it for the 145W envelope, the single slot, and the heat and noise.

## Two is better than one

I also tested running the model across both cards, with llama.cpp's layer split. The cards talk over PCIe through the CPU (both x8, no NVLink), and the 3090 Ti was at 300W. Together they could run the Q8_0 quant (29GB), which is nearly lossless and neither card can run alone.

| Metric | Both, 50/50 | Both, 60/40 | 3090 Ti (300W) | PRO 4000 |
| :--- | :--- | :--- | :--- | :--- |
| **Prompt (2048, UD-Q4_K_M)** | 1947 t/s | 1804 t/s | 1258 t/s | 1234 t/s |
| **Gen (UD-Q4_K_M)** | 39.3 t/s | 40.5 t/s | 36.5 t/s | 32.1 t/s |
| **Prompt (2048, Q8_0)** | 1816 t/s | 1772 t/s | - | - |
| **Gen (Q8_0)** | 24.6 t/s | 25.0 t/s | - | - |

The 3090 Ti at 300W and the 4000 split the UD-Q4_K_M and hit 39.3 t/s on generation. I expected this to fall somewhere between the two cards but it actually beat both of them. My guess is that with fewer layers each card handles, the 3090 Ti stays under its power cap for longer. Prompt processing was about 55% faster than either card alone, faster even than the 3090 Ti at 450W.

The 16-request batch hit 242 t/s total across the two. Row split failed to load the model and tensor split crashed with a CUDA error, so layer split it is.

![Grafana GPU panels during the split run across both cards, peaking at 434W and 27.6GB of VRAM](/images/posts/rtx-3090-ti-vs-rtx-pro-4000/08-dual-split.png)

*Both cards together, peaking at 434W. The VRAM peak of 27.6GB is the Q8_0 run.*

## So which one

1.  **Performance per CHF:** If you want the highest raw t/s per dollar and don't mind the heat/power, the used 3090 Ti is still the king.
2.  **The "Server" Choice:** If you need a single-slot card, low heat, or want to run the server 24/7 with minimal idle power, the PRO 4000 offers ~85% of the performance of a 300W-capped 3090 Ti at under half the power.
3.  **The 145W Trap:** Never try to run a 3090 Ti at 145W. You lose all the benefits of the high-end silicon because the cores get starved of power.

## What's next

The RTX PRO 4000 will now become the always-on card. I plan to run an abliterated model, meaning the refusals have been removed, that my SRE agent and my Hermes agent use. I chose abliterated because I use it to pentest my own homelab. A normal model refuses half the questions you need to ask when attacking your own setup, and I would rather find the gaping holes an AI-generated config leaves behind before someone else does. The PRO 4000 suits this perfectly since it idles at about 4W and sips 145W under load, so leaving it running 24/7 is cheap.

The RTX 3090 Ti will become the flexible card for things like ComfyUI image generation, game streaming, and testing new models as they drop. It is the muscle for my personal projects while the PRO 4000 does the heavy lifting for the system. What would you like to see tested next in this lab?
