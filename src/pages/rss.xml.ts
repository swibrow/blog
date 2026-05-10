import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const til = await getCollection("til", ({ data }) => !data.draft);

  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/posts/${p.id}/`,
      categories: p.data.tags,
      author: p.data.author,
    })),
    ...til.map((t) => ({
      title: `TIL: ${t.data.title}`,
      pubDate: t.data.date,
      description: `Today I Learned — ${t.data.title}`,
      link: `/til/${t.id}/`,
      categories: t.data.tags,
      author: "Samuel Wibrow",
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "Samuel Wibrow",
    description:
      "Posts on Kubernetes, AWS, Terraform, and platform engineering, plus TIL notes.",
    site: context.site!.toString(),
    items,
    customData: `<language>en-us</language>`,
  });
}
