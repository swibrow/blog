---
title: "One Keybinding to Find, Clone, or Jump to Any Repo"
date: 2026-10-05
description: "A sesh-style fzf picker for herdr that lists open workspaces, zoxide directories, and GitHub repos I haven't even cloned yet"
author: "Samuel Wibrow"
tags: [cli, fzf, github, herdr, zsh, productivity]
draft: true
toc: false
---

Every morning goes roughly the same way. Open the terminal, remember a repo exists, `cd ~/dev/` and start tab-completing. Wrong org. Back up. Right org, but it turns out I never cloned it on this laptop. Open the browser, find the repo, copy the clone URL, back to the terminal, `gh repo clone`, `cd`, open a new workspace. By then I've forgotten why I wanted it, which is honestly a pretty efficient way to avoid work.

I've been using [herdr](https://github.com/herdrdev/herdr) as my terminal multiplexer lately, and like with tmux before it, the thing I lean on most is one popup: `prefix+s`. Hit it, type a few letters, end up where I wanted to be. It started as a knock-off of [sesh](https://github.com/joshmedeski/sesh), and over the last week it picked up two extra tricks that I reckon are worth writing up.

---

## What the picker shows

One fzf list, three kinds of things in it:

```
● vast-ai (open · home-ops worktree)
● vast-ai-operator (open)
▸ ~/dev/swibrow/home-ops
▸ ~/.local/share/chezmoi
⇣ swibrow/goat (clone)
```

- **● open workspaces** - pick one and herdr focuses it
- **▸ directories** from [zoxide](https://github.com/ajeetdsouza/zoxide) - pick one and it starts a new workspace there
- **⇣ GitHub repos I haven't cloned yet** - pick one and it clones to `~/dev/<owner>/<repo>`, *then* starts a workspace there

<video src="/images/posts/herdr-sesh-picker/picker.mp4" autoplay loop muted playsinline aria-label="herdr-sesh picker"></video>

---

## Repos that don't exist yet (locally)

This is the bit I'm happiest with. The list of every repo my GitHub token can see comes from a `just` recipe I already had for cloning repos:

```bash
gh api 'user/repos?per_page=100' --paginate \
  --jq '.[] | .full_name + (if .archived then "\tarchived" else "" end)'
```

Across my own repos and a few orgs that's about 1,600 of them, and paginating through all of that takes around 30 seconds. Nobody is waiting 30 seconds for a popup. So the list is cached to `~/.cache/just/github-repos`, and the picker only ever reads the file:

```zsh
repo_cache="${XDG_CACHE_HOME:-$HOME/.cache}/just/github-repos"
repo_lines=$([[ -s "$repo_cache" ]] && grep -v $'\tarchived$' "$repo_cache" | while IFS= read -r repo; do
  owner="${repo%%/*}"; name="${repo#*/}"
  [[ -d "$HOME/dev/${owner:l}/$name" ]] || printf 'repo\t%s\t\e[35m⇣\e[0m %s (clone)\n' "$repo" "$repo"
done)
```

Archived repos get dropped, anything already sitting in `~/dev` gets dropped, and what's left is the stuff I *could* be working on if I were more organised. When a new repo appears, `just -g gh repo refresh` fetches the list again.

Selecting one does the obvious thing:

```zsh
if [[ "$type" == "repo" ]]; then
  owner="${value%%/*}"; name="${value#*/}"
  dir="$HOME/dev/${owner:l}/$name"
  [[ -d "$dir" ]] || gh repo clone "$value" "$dir" || { read -rs -k1 '?clone failed, press any key'; exit 1; }
fi
```

The preview pane runs `gh repo view` on the highlighted repo, so I can read the README before deciding whether I actually want 400MB of somebody's monorepo on my disk.

---

## Which vast-ai was that again?

The second improvement came from a screenshot of my own picker. I typed `vast` and got this:

```
● vast-ai-operator (open)
● vast-ai (open)
```

Two workspaces, nearly the same name, no clue which was which. One was a standalone repo. The other was a git worktree of my home-ops repo that herdr had created for a branch. Useful information, hidden from me by... me.

Turns out `herdr workspace list` already returns the worktree details, I just wasn't reading them:

```json
{
  "label": "vast-ai",
  "workspace_id": "w7G",
  "worktree": {
    "is_linked_worktree": true,
    "repo_name": "home-ops"
  }
}
```

So the jq gets one extra column and the label gets a suffix when there's a repo name to show:

```zsh
workspace_lines=$(herdr workspace list \
  | jq -r '.result.workspaces[] | [.workspace_id, .label, (if .worktree.is_linked_worktree then .worktree.repo_name else "" end)] | @tsv' \
  | while IFS=$'\t' read -r id label repo; do
      printf 'workspace\t%s\t\e[32m●\e[0m %s (open%s)\n' "$id" "$label" "${repo:+ · $repo worktree}"
    done)
```

Now it reads:

```
● vast-ai (open · home-ops worktree)
● vast-ai-operator (open)
```

A nice side effect: the repo name is now part of the line fzf searches, so typing `home-ops` lists every worktree I've got open against it. Given how many half-finished branches that turns out to be, maybe that isn't a feature.

---

## Wiring it up

The herdr side is a single popup binding:

```toml
[[keys.command]]
key = "prefix+s"
type = "popup"
command = "$HOME/.local/bin/herdr-sesh"
description = "jump to open workspace / start new at directory (sesh-style)"
width = "80%"
height = "70%"
```

The whole script is about 60 lines of zsh and lives in my dotfiles: [herdr-sesh](https://github.com/swibrow/dotfiles/blob/main/dot_local/bin/executable_herdr-sesh). It's not clever, but it means "I want to work on that repo" is now one keybinding and a few letters, wherever the repo happens to be. Including on GitHub, which until last week I'd been treating as somewhere else entirely.
