export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  content: string;
}

const postFiles = import.meta.glob<string>(
  "../content/posts/*.md",
  { eager: true, query: "?raw", import: "default" },
);

type Frontmatter = Record<string, string | string[] | boolean>;

function parseFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const [, block, content] = match;
  const data: Frontmatter = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.trim();
    if (value === "true" || value === "false") {
      data[key] = value === "true";
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { data, content };
}

export const posts: Post[] = Object.entries(postFiles)
  .map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(".md", "");
    const { data, content } = parseFrontmatter(raw);
    return {
      slug,
      title: (data.title as string) ?? "",
      date: (data.date as string) ?? "",
      description: (data.description as string) ?? "",
      author: (data.author as string) ?? "",
      tags: (data.tags as string[]) ?? [],
      draft: (data.draft as boolean) ?? false,
      content,
    };
  })
  .filter((p) => !p.draft)
  .map(({ draft: _draft, ...post }) => post)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
