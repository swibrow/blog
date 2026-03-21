const tilFiles = import.meta.glob<string>(
  "../content/til/*.md",
  { eager: true, query: "?raw", import: "default" },
);

export const tilContent: Record<string, string> = {};
for (const [path, content] of Object.entries(tilFiles)) {
  const slug = path.split("/").pop()!.replace(".md", "");
  tilContent[slug] = content;
}
