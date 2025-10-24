---
title: "Random unit conversions"
date: 2025-09-29
draft: false
---

As an SRE, we're often measuring things in units of time. Eg. billions of requests per month, cost of running x in aws for y time, etc.

## Seconds

| Unit   | Number of Seconds                                   |
|--------|-----------------------------------------------------|
| Minute | 60                                                  |
| Hour   | 3,600 (60 minutes × 60 seconds)                     |
| Day    | 86,400 (24 hours × 60 minutes × 60 seconds)         |
| Week   | 604,800 (7 days × 86,400 seconds)                   |
| Month  | 2,629,746 (30.44 days × 86,400 seconds)             |
| Year   | 31,536,000 (365 days × 86,400 seconds)              |

## Minutes

| Unit      | Number of Minutes                                |
|-----------|--------------------------------------------------|
| Minute    | 1                                                |
| Hour      | 60                                               |
| Day       | 1,440 (24 hours × 60 minutes)                    |
| Week      | 10,080 (7 days × 1,440 minutes)                  |
| Month     | 43,800 (30.44 days × 1,440 minutes)              |
| Year      | 525,600 (365 days × 1,440 minutes)               |

## Hours

| Unit      | Number of Hours                                  |
|-----------|--------------------------------------------------|
| Hour      | 1                                                |
| Day       | 24                                               |
| Week      | 168 (7 days × 24 hours)                          |
| Month     | 730.5 (30.44 days × 24 hours)                    |
| Year      | 8,760 (365 days × 24 hours)                      |


## 1 Billion units per month

| Unit      | Number of Units per Month                        |
|-----------|--------------------------------------------------|
| Per Second| ~380 (1,000,000,000 / 2,629,746 seconds)         |
| Per Minute| ~22,831 (1,000,000,000 / 43,829 minutes)         |
| Per Hour  | ~1,369,863 (1,000,000,000 / 730 hours)           |
| Per Day   | ~32,894,737 (1,000,000,000 / 30.44 days)         |
| Per Week  | ~230,263,158 (1,000,000,000 / 4.35 weeks)        |
| Per Month | 1,000,000,000                                    |
| Per Year  | 12,000,000,000 (1,000,000,000 × 12 months)       |
