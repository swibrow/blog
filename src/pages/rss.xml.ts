import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  const items = posts
    .map((p) => {
      const isTil = p.data.tags.includes("til");
      return {
        title: isTil ? `TIL: ${p.data.title}` : p.data.title,
        pubDate: p.data.date,
        description: p.data.description,
        link: `/posts/${p.id}/`,
        categories: p.data.tags,
        author: p.data.author,
      };
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "Samuel Wibrow",
    description:
      "Posts on Kubernetes, AWS, Terraform, and platform engineering, plus TIL notes.",
    site: context.site!.toString(),
    items,
    customData: `<language>en-us</language>`,
  });
}
