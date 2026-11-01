import { readFile } from "node:fs/promises";
import type { APIContext } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const fontDir = "node_modules/@fontsource/fira-mono/files";
const fonts = Promise.all([
  readFile(`${fontDir}/fira-mono-latin-400-normal.woff`),
  readFile(`${fontDir}/fira-mono-latin-700-normal.woff`),
]);

// Catppuccin Mocha, from src/styles/catppuccin.css (satori can't read CSS vars).
const ctp = {
  base: "#1e1e2e",
  text: "#cdd6f4",
  subtext0: "#a6adc8",
  green: "#a6e3a1",
  lavender: "#b4befe",
};

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, children },
});

export async function GET({ props }: APIContext) {
  const { post } = props as { post: CollectionEntry<"posts"> };
  const tags = post.data.tags.filter((t) => t !== "til");
  const [regular, bold] = await fonts;

  const svg = await satori(
    el(
      "div",
      {
        width: 1200,
        height: 630,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: ctp.base,
        borderTop: `12px solid ${ctp.green}`,
        fontFamily: "Fira Mono",
      },
      [
        el("div", { fontSize: 30, color: ctp.green }, "samuel@wibrow.dev:~/posts"),
        el(
          "div",
          {
            fontSize: post.data.title.length > 60 ? 54 : 66,
            fontWeight: 700,
            lineHeight: 1.15,
            color: ctp.text,
          },
          post.data.title
        ),
        el("div", { display: "flex", justifyContent: "space-between", fontSize: 28 }, [
          el("div", { display: "flex", gap: "16px", color: ctp.lavender }, tags.map((t) => el("div", {}, `#${t}`))),
          el("div", { color: ctp.subtext0 }, post.data.date.toISOString().slice(0, 10)),
        ]),
      ]
    ) as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Fira Mono", data: regular, weight: 400, style: "normal" },
        { name: "Fira Mono", data: bold, weight: 700, style: "normal" },
      ],
    }
  );

  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
