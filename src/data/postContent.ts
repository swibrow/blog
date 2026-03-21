const postFiles = import.meta.glob<string>(
  "../content/posts/*.md",
  { eager: true, query: "?raw", import: "default" },
);

export const postContent: Record<string, string> = {};
for (const [path, content] of Object.entries(postFiles)) {
  const slug = path.split("/").pop()!.replace(".md", "");
  postContent[slug] = content;
}
