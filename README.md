# wibrow.dev

Personal blog and portfolio. Astro 6 + React islands + Catppuccin theme. Deployed to Cloudflare Pages.

## Local dev

```bash
bun install
bun dev          # http://localhost:4321
bun run build    # output to dist/
bun run preview  # preview the production build
```

## Adding content

- New post: drop a `.md` file in `posts/` with frontmatter (`title`, `date`, `description`, `author`, `tags`). It auto-publishes to `/posts/<slug>/`.
- New TIL: drop a `.md` file in `til/` with frontmatter (`title`, `date`, `tags`). Auto-publishes to `/til/<slug>/`.
- Mark a post as unpublished: `draft: true` in frontmatter.
- Images: `public/images/posts/<slug>/foo.png`, referenced as `/images/posts/<slug>/foo.png`.

## SEO smoke tests

```bash
bun run seo:check                              # tests wibrow.dev
SITE=http://localhost:4321 bun run seo:check   # tests local preview
```

## Deploy

Pushes to `main` are built and deployed automatically by Cloudflare Pages.
The GitHub Actions workflow only runs the build for PR validation.
