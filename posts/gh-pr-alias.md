---
title: "One alias to view or create a GitHub PR"
date: 2026-03-12
description: "A simple shell alias that saves a surprising amount of context switching."
tags: [til, cli, github, productivity]
---

A simple shell alias that saves a surprising amount of context switching:

```bash
alias ghpr="gh pr view --web 2>/dev/null || gh pr create --web"
```

## How it works

1. `gh pr view --web` tries to open the PR for the current branch in your browser
2. If no PR exists, it exits non-zero (stderr suppressed with `2>/dev/null`)
3. The `||` fallback then runs `gh pr create --web` to open the create PR page instead

## Why it's useful

Without this, the workflow is:
- Run `gh pr view --web`
- See the error "no pull requests found"
- Run `gh pr create --web`

With this alias, you just type `ghpr` and you'll end up in the right place regardless of whether a PR already exists or not.
