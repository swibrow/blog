+++
title = "Tools"
readingTime = false
showMetadata = false
+++

A small collection of tools to make me feel like a wizard.

![terminal](./images/terminal.png)

## Dotfiles

My configuration files and setup scripts: **[swibrow/dotfiles](https://github.com/swibrow/dotfiles)**


## Terminal & Shell

- **[Ghostty](https://github.com/ghostty-org/ghostty)** - A fast, feature-rich terminal emulator
  - GPU-accelerated rendering
  - Native performance with modern features
  - Excellent font rendering
  - Big Hype

- **[Starship](https://starship.rs/)** - Cross-shell prompt
  - Fast and minimal
  - Highly customizable
  - Shows git status, package versions, and more
  - Makes things pretty

- **[tmux](https://github.com/tmux/tmux)** - Terminal multiplexer
  - Persistent sessions across SSH connections
  - Split panes and windows for organization
  - Custom keybindings for efficiency
  - Keeping your sanity in check

- **[AeroSpace](https://github.com/nikitabobko/AeroSpace)** - Tiling window manager for macOS
  - i3-inspired automatic tiling
  - Workspace management
  - Keyboard-driven workflow
  - Who needs a mouse?

### Package Management

- **[Homebrew](https://brew.sh/)** - The missing package manager for macOS
  - Primary package manager for most tools
  - `brew install` for formulae, `brew install --cask` for applications
- **[bin](https://github.com/marcosnils/bin)** - Manages binary installations from GitHub releases
  - Install and update binaries directly from GitHub
  - `bin install` to add new tools
  - Automatic version management and updates

### CLI utilities

- **[fzf](https://github.com/junegunn/fzf)** - Command-line fuzzy finder
  - Interactive file/directory selection
  - Command history search
  - Integrates with shell completion
  - This is probably the most over powered utility out there

- **[ripgrep (rg)](https://github.com/BurntSushi/ripgrep)** - Fast recursive grep
  - Respects .gitignore by default
  - Faster than ag, ack, or grep
  - Smart case sensitivity
  - Did someone say its written in Rust?

- **[fd](https://github.com/sharkdp/fd)** - Simple, fast alternative to find
  - Intuitive syntax
  - Colorized output
  - Parallel command execution
  - Does the job

- **[zsh-z](https://github.com/agkozak/zsh-z)** - Jump quickly to directories
  - Tracks your most used directories
  - Smart matching with frecency algorithm
  - `z project` jumps to most frecent directory matching "project"
  - for the laziest of all lazies

- **[jq](https://stedolan.github.io/jq/)** - Command-line JSON processor
  - Parse, filter, and transform JSON data
  - Powerful query language for JSON manipulation
  - Essential for working with APIs and JSON files
  - Just a straight up epic tool

- **[yq](https://github.com/mikefarah/yq)** - YAML processor (like jq for YAML)
  - Parse and manipulate YAML files
  - Convert between YAML, JSON, and XML
  - Perfect for Kubernetes configs and CI/CD files
  - Almost as epic as jq

- **[kubectl](https://kubernetes.io/docs/reference/kubectl/)** - Kubernetes command-line tool
  - Manage Kubernetes clusters and resources
  - Deploy applications and inspect cluster resources
  - Essential for container orchestration
  - Back to the roots

### TUI Applications

- **[k9s](https://k9scli.io/)** - Kubernetes CLI to manage clusters
  - Interactive cluster navigation
  - Real-time resource monitoring
  - Log streaming and pod management

- **[yazi](https://github.com/sxyazi/yazi)** - Blazing fast terminal file manager
  - Async I/O for high performance
  - Image preview support
  - Plugin system and customizable keybindings

- **[oha](https://github.com/hatoo/oha)** - HTTP load testing tool with TUI
  - Real-time performance metrics display
  - Beautiful terminal interface for load testing
  - Rust-based alternative to Apache Bench (ab)
  - Gotta love Switzerland's 10 gig pipes

- **[glow](https://github.com/charmbracelet/glow)** - Markdown renderer for the terminal
  - Beautiful markdown rendering in the CLI
  - Syntax highlighting and formatting
  - Read documentation without leaving the terminal
  - Part of the Charm suite of CLI tools

---
