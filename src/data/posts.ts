import { postContent } from "./postContent";

export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  content: string;
}

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  draft?: boolean;
}

const allPosts: PostMeta[] = [
  {
    slug: "aws-oidc-pod-identity",
    title:
      "Replicating AWS IRSA Workflow for my Homelab with Talos and a Raspberry Pi",
    date: "2024-06-09",
    description: "Dumping access keys for oidc!",
    author: "Samuel Wibrow",
    tags: ["aws", "oidc", "kubernetes", "talos"],
  },
  {
    slug: "aws-proxy-kube-socat",
    title:
      "Building a Hacky AWS Proxy Service with kube-proxy, socat, and Bash",
    date: "2025-08-15",
    description:
      "A simple solution for tunneling AWS services through Kubernetes using bash, socat, and port forwarding",
    author: "Samuel Wibrow",
    tags: ["AWS", "Kubernetes", "Bash", "Proxy", "DevOps"],
  },
  {
    slug: "chatgpt",
    title: "Sunday afternoon with chatGPT",
    date: "2023-04-12",
    description: "A brief interaction with OpenAi's LLM",
    author: "Samuel Wibrow",
    tags: ["chatgpt", "ai"],
  },
  {
    slug: "how",
    title: "how - Natural Language to Shell Commands",
    date: "2026-02-18",
    description:
      "A CLI tool that turns plain English into shell commands, powered by LLMs running locally with Ollama",
    author: "Samuel Wibrow",
    tags: ["go", "cli", "ai", "ollama", "llm"],
  },
  {
    slug: "sofle-split-keyboard",
    title: "Trying a 66-Key Sofle Split Keyboard",
    date: "2025-09-10",
    description: "",
    author: "Samuel Wibrow",
    tags: ["keyboards", "mechanical-keyboards", "ergonomics", "diy"],
  },
  {
    slug: "tfout",
    title:
      "Building a Kubernetes Operator for the sake of building a Kubernetes Operator",
    date: "2025-05-28",
    description:
      "A simple operator to sync Terraform outputs into Kubernetes ConfigMaps and Secrets",
    author: "Samuel Wibrow",
    tags: ["kubernetes", "operator", "kubebuilder", "claude", "ai"],
  },
];

export const posts: Post[] = allPosts
  .filter((p) => !p.draft)
  .map((meta) => ({
    ...meta,
    content: postContent[meta.slug] ?? "",
  }))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
