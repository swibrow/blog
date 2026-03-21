export interface Project {
  name: string;
  description: string;
  badge?: string;
  links?: { label: string; url: string }[];
}

export const projects: Project[] = [
  {
    name: "Home-Ops",
    description: "Home automation and lab",
    links: [{ label: "repo", url: "https://github.com/swibrow/home-ops" }],
  },
  {
    name: "Shortly",
    description: "URL shortening API",
    links: [
      { label: "api docs", url: "https://shortly.wibrow.net/docs" },
      { label: "ui", url: "https://shortly.wibrow.net/" },
    ],
  },
  {
    name: "TFOut",
    description: "Terraform outputs operator",
    links: [{ label: "docs", url: "https://swibrow.github.io/tfout/" }],
  },
  {
    name: "how",
    description: "Natural language to shell commands",
    links: [{ label: "repo", url: "https://github.com/swibrow/how" }],
  },
  {
    name: "GitHub Actions TUI",
    description: "Terminal UI for GitHub Actions",
    links: [
      {
        label: "repo",
        url: "https://github.com/swibrow/github-actions-tui",
      },
    ],
  },
  {
    name: "agent-ops",
    description: "Operational tooling for managing AI agents",
    links: [{ label: "repo", url: "https://github.com/swibrow/agent-ops" }],
  },
  {
    name: "Homb",
    description: "Family organisation management",
    badge: "Coming soon",
  },
  {
    name: "House Hunter",
    description: "Finding the perfect home in Switzerland",
    badge: "Coming soon",
  },
];
