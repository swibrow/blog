import matter from "gray-matter";

export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  author: string;
  tags: string[];
  content: string;
}

interface PostFrontmatter {
  title: string;
  date: string | Date;
  description?: string;
  author: string;
  tags?: string[];
  draft?: boolean;
}

const postFiles = import.meta.glob<string>(
  "../content/posts/*.md",
  { eager: true, query: "?raw", import: "default" },
);

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

export const posts: Post[] = Object.entries(postFiles)
  .map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(".md", "");
    const { data, content } = matter(raw);
    const fm = data as PostFrontmatter;
    return {
      slug,
      title: fm.title,
      date: toDateString(fm.date),
      description: fm.description ?? "",
      author: fm.author,
      tags: fm.tags ?? [],
      draft: fm.draft ?? false,
      content,
    };
  })
  .filter((p) => !p.draft)
  .map(({ draft: _draft, ...post }) => post)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
