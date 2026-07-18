---
name: create-post
description: Create a new blog post with markdown content and frontmatter
user_invocable: true
---

# Create Blog Post

Create a new blog post for the blog. The user provides a topic or title and you write the post.

## Steps

1. **Gather info**: Ask the user for any missing details:
   - Topic / title
   - Tags (suggest relevant ones based on existing posts)
   - Whether it should be a draft (`draft: true`)
   - Any specific angle, story, or points they want covered

2. **Generate a slug** from the title (lowercase, hyphens, no special chars).

3. **Write the markdown to `posts/{slug}.md`** (at the repo root — Astro Content Collections is configured to glob from `./posts`). Frontmatter lives in the file itself:

   ```markdown
   ---
   title: "{title}"
   date: {YYYY-MM-DD}
   description: "{one-line description, 140-160 chars, keyword-rich for SEO}"
   author: "Samuel Wibrow"
   tags: [{tag1}, {tag2}]
   ---

   {body}
   ```

   Schema is enforced by `src/content.config.ts`. `draft: true` excludes from build, sitemap, and RSS.

4. **Images** go in `public/images/posts/{slug}/` and are referenced as `/images/posts/{slug}/{filename}` in the markdown.

5. **Verify** by running `bun run build`. The post auto-appears at `/posts/{slug}/`.

## Voice guide

Samuel's style — match these or the post will read like every other AI-generated tech blog.

- **Tell a story**, not a feature list. Open with the *why* (the Pi-in-a-drawer moment, the deadline-yesterday scenario, the rage at AI SEO spam). Don't open with "In this post we will…".
- **Sarcasm and satire are fine**, even encouraged. "What could possibly go wrong?", "your CISO wakes up in cold sweats", "the universe telling you to set up the VPN" — that's the voice.
- **No AI disclaimers.** Never write "Claude wrote this", "Claude and I vibed", "AI helped me with…". This actively hurts both reader trust and Google's Helpful Content scoring. Pretend you wrote it.
- **No bloat sections.** Avoid "Production-Ready Features", "Key Takeaways" with 4 generic bullets, "Future Improvements" with pseudo-code, "Enterprise Security", "Get Started" with install instructions when there's already a link to the repo. These read as AI padding.
- **No generic "find me on" outros.** The site header has socials already. End the post with a real conclusion that ties back to the opener, not a fluff paragraph.
- **Headings start at `##`**, sub-sections `###`. Never start at `###` — breaks the auto-TOC.
- **Code blocks need language tags.** Shiki provides Catppuccin syntax highlighting at build time.
- **Show real commands and configs**, not pseudocode.
- **Short paragraphs.** This is a terminal-themed blog, not a novel.
- **Pragmatic over theoretical.** "Here's the one-liner, here's the fallback when it doesn't work, here's the checklist" beats "let's discuss the architecture of…".

The gold-standard reference is `posts/eks-pod-identity-verify-iam.md` — tight, problem-driven, voice-y, ends with a checklist that's useful. Clone that shape.

## Common tags

`aws`, `kubernetes`, `terraform`, `go`, `cli`, `ai`, `devops`, `docker`, `linux`, `observability`, `homelab`, `oidc`, `eks`, `iam`, `talos`
