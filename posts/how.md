---
title: "how - Natural Language to Shell Commands"
date: 2026-02-18
description: "A CLI tool that turns plain English into shell commands, powered by LLMs running locally with Ollama"
author: "Samuel Wibrow"
tags: [go, cli, ai, ollama, llm]
---

You know *what* you want to do in the terminal, but can't remember the exact flags. Was it `find -mtime` or `find -mmin`? Does `tar` need `-xvf` or `-xzf`? You Google it, wade through Stack Overflow circa 2012, and eventually find the answer buried under AI-generated SEO spam — three blog posts deep into "Best 10 ways to find files in Linux 2024 (Updated!)".

So I wrote a small Go binary that asks an LLM what I meant and gets out of the way. **[how](https://github.com/swibrow/how)** turns plain English into shell commands.

```bash
$ how find all go files modified in the last 24 hours

  find . -name '*.go' -mtime -1

  Finds all files ending in .go that were modified within the last day.
```

No fluff. No ads. No cookie banners. Just the command and a short explanation.

---

## Running it locally with Ollama

The tool supports Anthropic, OpenAI, and Ollama as backends. I use **[Ollama](https://ollama.com/)** for local inference - no API keys, no network calls, no usage costs. Just a model running on my machine. Everything stays private and it works offline, which is handy on a plane or in an environment where you'd rather not send queries to external APIs.

---

## Setup

Install with Go or grab a binary from the [releases page](https://github.com/swibrow/how/releases):

```bash
go install github.com/swibrow/how@latest
```

Then initialise the config:

```bash
how config init
```

This creates `~/.config/how/config.yaml`. Point it at Ollama:

```yaml
provider: ollama
ollama:
  model: llama3
  url: http://localhost:11434
```

That's it. No API key required - just make sure Ollama is running.

---

## Usage

Basic query:

```bash
how reverse a string in bash
```

Auto-execute the returned command with `-y`:

```bash
how -y list listening ports
```

Pipe directly into your shell with `-q` (quiet mode):

```bash
how -q convert png to jpg with imagemagick | sh
```

---

## Examples

```bash
$ how compress this folder into a tar.gz called backup.tar.gz
  tar -czvf backup.tar.gz .
  Creates a gzipped tarball of the current directory.

$ how show me the 10 largest files in this directory
  du -ah . | sort -rh | head -n 10
  Lists files by size, largest first, top 10.

$ how kill the process listening on port 8080
  lsof -ti:8080 | xargs kill -9
  Finds and kills the process bound to port 8080.

$ how rename all .jpeg files to .jpg in this folder
  for f in *.jpeg; do mv -- "$f" "${f%.jpeg}.jpg"; done
  Renames every .jpeg file in the current directory to .jpg.
```

The code is on GitHub: **[github.com/swibrow/how](https://github.com/swibrow/how)** — MIT licensed, written in Go, contributions welcome.
