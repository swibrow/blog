import { tilContent } from "./tilContent";

export interface TilEntry {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  content: string;
}

interface TilMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
}

const allTilMetas: TilMeta[] = [
  {
    slug: "gh-pr-alias",
    title: "One alias to view or create a GitHub PR",
    date: "2026-03-12",
    tags: ["cli", "github", "productivity"],
  },
  {
    slug: "aws-alb-transform-actions",
    title: "AWS ALB Transform Actions for URL Rewrites",
    date: "2025-10-24",
    tags: ["aws", "alb", "kubernetes", "ingress"],
  },
  {
    slug: "time-unit-conversions",
    title: "Random unit conversions",
    date: "2025-09-29",
    tags: ["sre", "math", "reference"],
  },
  {
    slug: "terraform-time-ids",
    title: "Creating Terraform IDs based on time",
    date: "2025-09-28",
    tags: ["terraform", "hcl"],
  },
  {
    slug: "kubernetes-oomkilled",
    title: "Kubernetes Deployment that OOMKilled",
    date: "2025-09-27",
    tags: ["kubernetes", "debugging"],
  },
  {
    slug: "argocd-multi-source",
    title: "ArgoCD multi source applications",
    date: "2025-09-14",
    tags: ["argocd", "kubernetes", "gitops"],
  },
  {
    slug: "fzf",
    title: "fzf and all its glory",
    date: "2025-09-13",
    tags: ["cli", "fzf", "tmux", "productivity"],
  },
  {
    slug: "ncspot",
    title: "Terminal Spotify Client",
    date: "2025-09-12",
    tags: ["cli", "spotify", "rust", "tui"],
  },
  {
    slug: "renovate-github-action",
    title: "Renovate GitHub Action Migration",
    date: "2025-09-11",
    tags: ["renovate", "github-actions", "ci-cd"],
  },
  {
    slug: "terraform-removed",
    title: "Removing Resources from Terraform State",
    date: "2025-09-10",
    tags: ["terraform", "hcl"],
  },
];

export const tilEntries: TilEntry[] = allTilMetas
  .map((meta) => ({
    ...meta,
    content: tilContent[meta.slug] ?? "",
  }))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
