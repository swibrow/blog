export interface UsesItem {
  name: string;
  note: string;
  url?: string;
  post?: string;
}

export interface UsesSection {
  title: string;
  items: UsesItem[];
}

export const uses: UsesSection[] = [
  {
    title: "ai",
    items: [
      { name: "Claude Code", note: "Daily driver for coding, ops and upstream fixes" },
      { name: "Codex, OpenCode", note: "Other coding agents" },
      { name: "Garrison", note: "Farms tasks out to agents in Kubernetes sandboxes", post: "/posts/garrison-agent-sandbox/" },
      { name: "how", note: "Natural language to shell commands", url: "https://github.com/swibrow/how", post: "/posts/how/" },
      { name: "agent-ops", note: "Operational tooling for managing AI agents", url: "https://github.com/swibrow/agent-ops" },
      { name: "llama.cpp on pitower", note: "Local LLMs on an RTX 3090 Ti and RTX PRO 4000", post: "/posts/rtx-3090-ti-vs-rtx-pro-4000/" },
      { name: "ComfyUI", note: "Image generation on the same GPUs, scales to zero" },
    ],
  },
  {
    title: "terminal",
    items: [
      { name: "Ghostty", note: "Terminal", url: "https://github.com/ghostty-org/ghostty" },
      { name: "herdr", note: "Multiplexer and session picker", post: "/posts/herdr-sesh-picker/" },
      { name: "zsh + Starship", note: "No plugin manager", url: "https://starship.rs/" },
      { name: "Atuin", note: "Shell history, synced to a self-hosted server" },
      { name: "fzf, ripgrep, fd, eza, zoxide", note: "Finding things" },
      { name: "jq, yq", note: "JSON and YAML" },
      { name: "yazi", note: "File manager", url: "https://github.com/sxyazi/yazi" },
    ],
  },
  {
    title: "editors",
    items: [
      { name: "Neovim", note: "Editor" },
      { name: "Zed", note: "Editor" },
    ],
  },
  {
    title: "infra",
    items: [
      { name: "kubectl + k9s", note: "Kubernetes", url: "https://k9scli.io/" },
      { name: "talosctl", note: "Talos nodes" },
      { name: "Argo CD", note: "GitOps for the homelab" },
      { name: "virtctl", note: "KubeVirt VMs" },
      { name: "Terraform, OpenTofu", note: "Everything else" },
      { name: "just", note: "Task runner in every repo" },
    ],
  },
  {
    title: "dotfiles",
    items: [
      { name: "chezmoi", note: "Public dotfiles plus a private layer for work bits", url: "https://github.com/swibrow/dotfiles" },
      { name: "mise", note: "Runtimes, env and age-encrypted secrets" },
      { name: "Homebrew", note: "Packages, kept in a Brewfile", url: "https://brew.sh/" },
    ],
  },
  {
    title: "macos",
    items: [
      { name: "AeroSpace", note: "Tiling window manager", url: "https://github.com/nikitabobko/AeroSpace" },
      { name: "Raycast", note: "Launcher" },
      { name: "Karabiner-Elements", note: "Key remapping" },
      { name: "Obsidian", note: "Notes" },
      { name: "Moonlight", note: "Streams the gaming VM" },
    ],
  },
  {
    title: "homelab",
    items: [
      { name: "pitower", note: "Talos Kubernetes in a 12U rack in the laundry room", url: "https://github.com/swibrow/home-ops" },
      { name: "worker-ai-01", note: "Ryzen 7 9700X, 64GB, RTX 3090 Ti, RTX PRO 4000" },
      { name: "KubeVirt + Omarchy", note: "The 3090 Ti switches between LLMs and gaming" },
    ],
  },
  {
    title: "desk",
    items: [
      { name: "Sofle", note: "Split keyboard", post: "/posts/sofle-split-keyboard/" },
      { name: "Logitech G502", note: "Mouse, on the USB card passed to the gaming VM" },
    ],
  },
];
