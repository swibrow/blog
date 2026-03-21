export interface Tool {
  name: string;
  url: string;
  description: string;
  category: string;
}

export const tools: Tool[] = [
  {
    name: "Ghostty",
    url: "https://github.com/ghostty-org/ghostty",
    description: "Fast, feature-rich, GPU-accelerated terminal emulator",
    category: "Terminal & Shell",
  },
  {
    name: "Starship",
    url: "https://starship.rs/",
    description: "Cross-shell prompt - fast, minimal, and highly customizable",
    category: "Terminal & Shell",
  },
  {
    name: "tmux",
    url: "https://github.com/tmux/tmux",
    description:
      "Terminal multiplexer with persistent sessions and split panes",
    category: "Terminal & Shell",
  },
  {
    name: "AeroSpace",
    url: "https://github.com/nikitabobko/AeroSpace",
    description: "i3-inspired tiling window manager for macOS",
    category: "Terminal & Shell",
  },
  {
    name: "Homebrew",
    url: "https://brew.sh/",
    description: "The missing package manager for macOS",
    category: "Package Management",
  },
  {
    name: "bin",
    url: "https://github.com/marcosnils/bin",
    description:
      "Install and manage binaries directly from GitHub releases",
    category: "Package Management",
  },
  {
    name: "fzf",
    url: "https://github.com/junegunn/fzf",
    description: "Command-line fuzzy finder for files, history, and more",
    category: "CLI Utilities",
  },
  {
    name: "ripgrep",
    url: "https://github.com/BurntSushi/ripgrep",
    description: "Blazing fast recursive grep that respects .gitignore",
    category: "CLI Utilities",
  },
  {
    name: "fd",
    url: "https://github.com/sharkdp/fd",
    description: "Simple, fast alternative to find with intuitive syntax",
    category: "CLI Utilities",
  },
  {
    name: "zsh-z",
    url: "https://github.com/agkozak/zsh-z",
    description: "Jump quickly to frecent directories",
    category: "CLI Utilities",
  },
  {
    name: "jq",
    url: "https://stedolan.github.io/jq/",
    description: "Command-line JSON processor and query language",
    category: "CLI Utilities",
  },
  {
    name: "yq",
    url: "https://github.com/mikefarah/yq",
    description: "YAML processor - like jq but for YAML, JSON, and XML",
    category: "CLI Utilities",
  },
  {
    name: "kubectl",
    url: "https://kubernetes.io/docs/reference/kubectl/",
    description: "Kubernetes command-line tool for cluster management",
    category: "CLI Utilities",
  },
  {
    name: "k9s",
    url: "https://k9scli.io/",
    description:
      "Interactive Kubernetes cluster management with real-time monitoring",
    category: "TUI Applications",
  },
  {
    name: "yazi",
    url: "https://github.com/sxyazi/yazi",
    description: "Blazing fast terminal file manager with image preview",
    category: "TUI Applications",
  },
  {
    name: "oha",
    url: "https://github.com/hatoo/oha",
    description: "HTTP load testing tool with beautiful TUI metrics",
    category: "TUI Applications",
  },
  {
    name: "glow",
    url: "https://github.com/charmbracelet/glow",
    description: "Beautiful markdown renderer for the terminal",
    category: "TUI Applications",
  },
  {
    name: "GitHub Actions TUI",
    url: "https://github.com/swibrow/github-actions-tui",
    description: "Terminal UI for monitoring and managing GitHub Actions workflows",
    category: "TUI Applications",
  },
  {
    name: "agent-ops",
    url: "https://github.com/swibrow/agent-ops",
    description: "Operational tooling for managing AI agents",
    category: "CLI Utilities",
  },
];

export const categories = [...new Set(tools.map((t) => t.category))];

export const toolsByCategory = categories.map((cat) => ({
  name: cat,
  tools: tools.filter((t) => t.category === cat),
}));
