---
name: create-til
description: Create a new "Today I Learned" (TIL) entry
user_invocable: true
---

# Create TIL Entry

Create a new TIL — short, focused notes. Quick tips, gotchas, or discoveries. NOT full blog posts.

## Steps

1. **Gather info**: Ask the user for any missing details:
   - Topic / title
   - Tags (suggest relevant ones based on existing TILs)
   - Any specific commands, configs, or context to include

2. **Generate a slug** from the title (lowercase, hyphens, no special chars).

3. **Write the markdown to `til/{slug}.md`** (at the repo root — Astro Content Collections is configured to glob from `./til`). Frontmatter lives in the file itself:

   ```markdown
   ---
   title: "{title}"
   date: {YYYY-MM-DD}
   tags: [{tag1}, {tag2}]
   ---

   {body}
   ```

   Schema is enforced by `src/content.config.ts`. `draft: true` excludes from the build, sitemap, and RSS. No `description` or `author` field — TILs don't have one.

4. **Images** go in `public/images/til/` and are referenced as `/images/til/{filename}` in the markdown.

5. **Verify** by running `bun run build`. The TIL gets its own indexable page at `/til/{slug}/` AND shows up on the `/til/` index (search/filter island plus a `<noscript>` static list).

## Style guide

- **Lead with the insight or discovery**, not backstory or context. The reader is here to grab the command and leave.
- **Show the command or config first, then briefly explain why it matters.** "Here's the thing → here's why it's useful" beats "Let me set the scene for what we were trying to do…".
- **Code blocks need language tags.** Shiki provides Catppuccin syntax highlighting at build time. `bash`, `yaml`, `hcl`, `go`, `typescript`, etc.
- **A few paragraphs, max.** If it's growing past ~150 lines, it's a post not a TIL — move it to `posts/`.
- **Same voice as the posts:** a bit dry, a bit cheeky, but tight. No "let me share what I learned today!" intros. No AI disclaimers. No fluff outros.
- **Think "quick reference note to future self"**, not "tutorial". The audience is Samuel six months from now after he's forgotten how he fixed this.

## Common tags

`cli`, `aws`, `kubernetes`, `terraform`, `hcl`, `github`, `productivity`, `debugging`, `argocd`, `gitops`, `ci-cd`, `fzf`, `tmux`, `renovate`, `sre`
