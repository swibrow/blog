# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, etc.) when working with code in this repository.

## Overview

Astro static site generator with React islands for interactivity. Portfolio/blog with a terminal-style theme (Catppuccin Mocha/Latte). Deployed to Cloudflare Workers (static assets) at wibrow.dev.

Pages are pre-rendered to static HTML at build time; React only hydrates the parts that need interactivity (Header terminal popover, status pill, theme toggle, games, snow effect, cluster metrics dashboard, Tools filter, posts search).

## Development Commands

- `bun dev` - Run local Astro dev server
- `bun run build` - Build the site to `dist/` (static HTML per route)
- `bun run preview` - Preview the production build locally

## Architecture

### Tech Stack
- **Framework**: Astro 5 (static output)
- **Islands**: React 19 via `@astrojs/react`
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`) + custom CSS (Catppuccin theme)
- **Animations**: Framer Motion (inside React islands only)
- **Markdown**: Astro Content Collections, Shiki for syntax highlighting (build-time, zero runtime), rehype-slug + rehype-autolink-headings for anchor links
- **Build**: Astro + Vite, Bun package manager
- **Deployment**: GitHub Actions → Cloudflare Workers static assets (Worker `wibrow-dev`, config in `wrangler.jsonc`)

### Content Organization
- `/posts/*.md` - Blog posts (root of repo, plain Markdown with frontmatter)
- `/til/*.md` - Today I Learned entries (root of repo)
- `/src/data/projects.ts` - Project listings
- `/src/data/tools.ts` - Tools listing
- `/src/content.config.ts` - Content collection schemas (Zod) for `posts` and `til`

Frontmatter schema (posts): `title`, `date`, `description`, `author`, `tags[]`, `draft?`
Frontmatter schema (til): `title`, `date`, `tags[]`, `draft?`

`draft: true` posts are excluded from the build.

### Layouts
- `/src/layouts/BaseLayout.astro` - HTML shell, all SEO meta tags, font links, theme init script, `<Header client:load>`, `<Footer>`. Accepts `title`, `description`, `image`, `type`, `publishedTime`, `tags`, `noindex` props.
- `/src/layouts/PostLayout.astro` - Wraps a rendered post with header (title, date, reading time, tags), JSON-LD `BlogPosting` schema, Table of Contents, prose body, Comments island.

### Components
- `/src/components/SEO.astro` - All `<title>`, meta description, canonical, Open Graph, Twitter Card, article tags. Used by BaseLayout.
- `/src/components/TableOfContents.astro` - Renders TOC from Astro `headings` (depth 2-3). Hidden if fewer than 3 headings.
- `/src/components/layout/Header.tsx` - React island. Sticky nav + Terminal popover with command input. Receives `currentPath` prop.
- `/src/components/layout/Footer.astro` - Static footer + SnowEffect island.
- `/src/components/layout/SectionHeading.astro` - `~/title` heading + optional subtitle, with CSS fade-in.
- `/src/components/ui/Card.astro` - Static card with hover effect (used by Astro pages).
- `/src/components/ui/Card.tsx` - React equivalent (used inside React islands when needed).
- `/src/components/ui/Comments.tsx` - giscus comments, hydrates on visibility.
- `/src/components/home/Masthead.astro` - Name + blinking cursor, subtitle, rotating tagline, social links.
- `/src/components/home/StatCard.astro` - Dashboard stat card (label/value/sub), styles in `global.css` (`.stat-card`).
- `/src/components/react/ClusterMetrics.tsx` - Island fetching kromgo badges (`kromgo.wibrow.dev`) with offline fallback.
- `/src/components/react/StatusPill.tsx` - Header operational/degraded pill from the kromgo `alerts` badge.
- `/src/components/react/Terminal.tsx` - Interactive terminal with commands, fetches `/resume.json`. Loads game components lazily.
- `/src/components/react/games/` - Snake, Wordle, Game2048, TicTacToe, Pong (lazy-loaded by Terminal).
- `/src/components/react/SnowEffect.tsx` - Canvas snow toggle, respects `prefers-reduced-motion`.
- `/src/components/react/ThemeToggle.tsx` - Light/dark toggle, writes to `localStorage`.
- `/src/components/react/TilSearch.tsx` - Search/filter island for the TIL index page.
- `/src/components/react/ToolsList.tsx` - Category filter island for the Tools page.

### Styling
- `/src/styles/global.css` - Tailwind directive + imports for the rest
- `/src/styles/catppuccin.css` - Catppuccin Mocha/Latte CSS custom properties
- `/src/styles/prose.css` - Markdown content rendering styles
- `/src/styles/terminal.css` - Terminal widget styles

Theme via CSS custom properties (`var(--ctp-green)`, `var(--ctp-blue)`, etc.). Don't hardcode colors.

### Pages (file-based routing)
- `/src/pages/index.astro` - Home: masthead + `~/github` stats (build-time via `src/lib/github.ts`, needs `GITHUB_TOKEN`) + `~/cluster` kromgo metrics island + recent posts
- `/src/pages/about.astro` - About + skills grid + `Person` JSON-LD
- `/src/pages/posts/index.astro` - Posts list (sorted by date desc)
- `/src/pages/posts/[slug].astro` - Individual post (uses `getStaticPaths`)
- `/src/pages/til/index.astro` - TIL list with search/filter island + `<noscript>` fallback
- `/src/pages/til/[slug].astro` - Individual TIL entry with `TechArticle` JSON-LD
- `/src/pages/projects.astro` - Projects list
- `/src/pages/tools.astro` - Tools list with category filter island
- `/src/pages/404.astro` - Terminal-themed 404 (proper 404 status, `noindex`)
- `/src/pages/rss.xml.ts` - RSS feed (posts + TIL combined)

### SEO
- Per-page `<title>`, meta description, canonical URL, OG/Twitter Card tags via `BaseLayout`
- JSON-LD: `BlogPosting` per post, `TechArticle` per TIL, `Person` on /about, `WebSite` on /
- `/sitemap-index.xml` auto-generated by `@astrojs/sitemap`
- `/rss.xml` generated by `@astrojs/rss` (combines posts + til)
- `/robots.txt` in `public/` points at the sitemap
- 404 page returns proper 404 status (no soft-404)

### Deployment
- GitHub Actions (`/.github/workflows/build.yml`): bun build + wrangler-action `deploy` on `main` / `versions upload` on PRs (daily cron keeps GitHub stats fresh); `legacy-redirect.yml` serves the old samuel.wibrow.net redirect. Worker serves `dist/` as static assets; custom domains `wibrow.dev` + `samuel.wibrow.dev` are declared in `wrangler.jsonc`. The `dist/_headers` file (security + cache-control headers) and Astro's generated redirect pages are honored by Workers static assets.
- Terraform in `/terraform/` manages GitHub repository settings
- No staging environment — commits to main go live

## Key Configuration

- **Site URL**: `https://wibrow.dev` (set in `astro.config.mjs` so canonical URLs and sitemap resolve correctly)
- **Theme**: Catppuccin Mocha (dark) / Latte (light)
- **Terminal prompt**: `samuel@wibrow.dev`
- **Cluster metrics**: kromgo at `kromgo.wibrow.dev` (deployed in the home-ops repo, `kubernetes/apps/pitower/networking/kromgo`)
- **Analytics**: Self-hosted at `insights.wibrow.dev`
- **Comments**: giscus, repo `swibrow/blog`, mapped by post/til slug
- **Social links**: GitHub, LinkedIn, Strava

## Working with Content

- Add a new post: drop `posts/<slug>.md` with frontmatter (`title`, `date`, `description`, `author`, `tags`). It appears at `/posts/<slug>/`.
- Add a new TIL: drop `til/<slug>.md` with frontmatter (`title`, `date`, `tags`). It appears at `/til/<slug>/`.
- Mark a post unpublished with `draft: true` in frontmatter.
- Images go in `public/images/posts/<slug>/` or `public/images/til/`, referenced as `/images/posts/<slug>/foo.png`.
- Code blocks get Catppuccin syntax highlighting automatically (Shiki, build-time).

## About the Owner

Samuel Wibrow - Senior SRE / Platform Engineer based in Zurich, Switzerland. Originally from Brisbane, Australia. Moved to Germany in 2015 (Stylight in Munich), then Switzerland in 2023 (Tamedia in Zurich). 15+ years in IT infrastructure.

### Skills Profile
- **Platform & Orchestration**: Kubernetes, AWS EKS, Karpenter, Helm, Kustomize, Kubebuilder, Talos, AWS ECS
- **Cloud & Infrastructure**: AWS (10+ years), Terraform, Terragrunt, CloudFormation, CDK, GCP (basic)
- **AI & Automation**: Claude / Anthropic API, OpenAI / ChatGPT, Ollama, LLM Tooling, AI-Assisted Development, Renovate
- **Observability**: Datadog, Prometheus Stack, LGTM Stack, EFK Stack, AWS CloudWatch
- **Languages**: Go, Python, TypeScript, Bash, React, PowerShell
- **CI/CD & GitOps**: GitHub Actions, GitLab CI, ArgoCD, Flux, CircleCI
- **Networking & Security**: TCP/IP, DNS, VPN, OAuth2/OIDC, Hashicorp Vault, Secrets Operator
- **Tools**: Git, Linux, Docker, Neovim, CNCF Ecosystem

### Key Projects
- **TFOut** - Kubernetes operator (Go/Kubebuilder) to sync Terraform outputs into ConfigMaps/Secrets
- **how** - Go CLI that converts natural language to shell commands using Claude, OpenAI, or Ollama
- **Home-Ops** - Home automation and lab
- **Shortly** - URL shortening API
- **GitHub Actions TUI** - Terminal UI for GitHub Actions

### Social
- GitHub: swibrow
- LinkedIn: samuelwibrow
- Strava: 21868831

## Important Notes

- Pages are static by default. Add a React island only when you need interactivity, and pick the lightest hydration directive (`client:visible` > `client:load` > `client:only`).
- Don't import `react-router-dom` — navigation uses plain `<a href>` for full-page loads.
- Browser-only code (window/document) inside React islands must be guarded or moved into `useEffect`. Astro renders islands during SSR.
- Static assets go in `public/` (resume.json, resume.html, me.jpg, images/, robots.txt, favicon).
- The Terminal component fetches `/resume.json` for dynamic resume data.
- Use Catppuccin CSS custom properties (e.g., `var(--ctp-green)`) for theming — never hardcode hex.
- Framer Motion only inside React islands; use CSS animations for static page transitions.
