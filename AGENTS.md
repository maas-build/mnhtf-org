# AGENTS.md — AI Agent Guide for mnhtf.org

This file documents conventions, commands, and guardrails for AI agents (GitHub Copilot, Claude, etc.) working on this project.

---

## Project Overview

**mnhtf.org** is the website for the Minnesota Hoarding Task Force, a volunteer nonprofit. This project migrates the existing WordPress + Elementor site to a static Astro site deployed entirely on **Cloudflare Workers** (using Workers Static Assets). A single Worker serves all static content and handles the contact form API endpoint. No Cloudflare Pages is used.

**Critical constraint**: The new site must look visually identical to the existing site at https://mnhtf.org — this is a platform migration, not a redesign. Do not change colors, typography, layout, or spacing without explicit instruction.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro (static output) |
| Hosting | **Cloudflare Workers** (Workers Static Assets — no Pages) |
| Dynamic endpoint | Cloudflare Workers — same Worker, routes `/api/contact` |
| Language | TypeScript throughout |
| Package manager | **pnpm** (do not use npm or yarn) |
| Linting / Formatting | **Biome.js** (`biome.json`) |
| Testing | **Vitest** |

---

## Essential Commands

```bash
# Install dependencies
pnpm install

# Local dev server
pnpm dev

# Production build
pnpm build

# Preview production build locally
pnpm preview

# Astro type-check
pnpm check

# Lint (Biome)
pnpm lint

# Format (Biome, writes in-place)
pnpm format

# Run tests (Vitest)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Deploy everything (build → wrangler deploy)
pnpm deploy
```

Always run `pnpm lint` and `pnpm test` before considering a task complete. Fix all errors before finishing.

---

## Deployment

Deployments are triggered automatically via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`. The workflow runs `pnpm deploy`, which:

1. Builds the Astro site (`astro build` → `dist/`)
2. Runs `wrangler deploy` — deploys the Worker script **and** the static assets in `dist/` as a single unit via Workers Static Assets

**`wrangler.toml`** configures both the Worker entry point (`workers/index.ts`) and the static assets directory (`[assets] directory = "./dist"`). No separate Cloudflare Pages project is needed or used.

The `TURNSTILE_SITE_KEY` var is committed in `wrangler.toml`; the `TURNSTILE_SECRET_KEY` secret is set via `wrangler secret put` and never committed.

Required GitHub secrets: `CLOUDFLARE_API_TOKEN` (Worker Scripts:Edit permission), `CLOUDFLARE_ACCOUNT_ID`.

---

## Project Structure

```
src/
  components/   # Reusable Astro components
  layouts/      # BaseLayout.astro wraps every page
  pages/        # One .astro file per route
  styles/
    tokens.css  # CSS custom properties — colors, fonts, spacing extracted from live site
  types/
    env.d.ts    # Cloudflare env binding types
workers/
  index.ts             # Main Worker entry — routes /api/contact, falls through to ASSETS
  contact-form.ts      # Contact form handler (imported by index.ts)
  contact-form.test.ts # Vitest tests for the contact form handler
public/
  images/   # Migrated WordPress media
  pdfs/     # Migrated PDF downloads
```

---

## Coding Conventions

- **TypeScript everywhere** — `.ts` for Workers and utilities, `.astro` for components/pages (frontmatter is TypeScript)
- **No `any`** — use proper types or `unknown` with narrowing
- **CSS custom properties** — all colors, font sizes, and spacing values must come from `src/styles/tokens.css`, never hardcoded
- **No inline styles** — use scoped `<style>` blocks in `.astro` files or imported CSS
- **Accessibility** — every image needs meaningful `alt` text; interactive elements need visible focus states; heading hierarchy must be correct
- **No new dependencies** without checking if Astro or Biome already cover the need

---

## UX / Visual Rules

- **Do not change the visual design** — match the live site exactly (layout, colors, fonts, spacing, component structure)
- **Adaptive layout** — all pages must be responsive across mobile, tablet, and desktop, matching the current site's breakpoints
- **Text instead of text-images** — replace any content that is currently a screenshot/image of text with real HTML text, but style it to look identical to the image

### Design Principles (applied during this migration)

- **Prefer vertical layouts** — stack sections top-to-bottom as the default. Only use multi-column horizontal layouts when content naturally belongs side-by-side (e.g. a photo + text pair). Avoid wide sidebar-based layouts.
- **Generous spacing** — sections should breathe. Use `--space-12` padding on white card sections, `--space-8` gap between sections. Never feel cramped or packed.
- **Large, readable type** — body text at `--font-size-lg` (18px) minimum; FAQ and prominent links at `--font-size-xl` (22px); section headings (`h2`) at `--font-size-3xl` (36px); card subheadings (`h3`) at `--font-size-xl` (22px). Never use `--font-size-sm` (14px) for flowing content.
- **Prominent headshots** — person / board member circular photos should be at least 140px. Don't shrink them to fit more per row; reduce columns instead.
- **White cards with shadow** — content sections are white cards (`border-radius: 16px`, `box-shadow: 0 2px 16px rgba(0,0,0,0.07)`) on a light background. All four sides of a card must look the same — do **not** add a colored `border-top` strip or any single-side accent border. Color accents belong on icon badges or headings, not card borders.
- **No iframes for external forms or feeds** — if the service sends `X-Frame-Options: DENY`, replace with a native HTML form or external link instead of embedding.
- **Hero image on every page** — every page must open with a full-width hero section. Use a relevant background image (from `public/images/`) with a dark gradient overlay (`linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45))`) so the page title remains readable in white. Minimum hero height: `320px`. The `<h1>` lives inside the hero.

---

## Testing Guidelines

- **Vitest** covers TypeScript logic: contact form Worker, utility functions, env validation
- **No Vitest tests for Astro pages** — page rendering is verified via manual QA against the live site and Lighthouse
- Each Worker function should have at least one happy-path test and one error-path test
- Do not mock external services in tests without clearly marking the mock

---

## What NOT To Do

- Do not run `npm install` or `yarn` — use `pnpm` only
- Do not commit secrets, API keys, or credentials
- Do not change the visual design without explicit approval
- Do not add new pages, routes, or features not in the plan without confirmation
- Do not use Cloudflare Pages — everything is served via Cloudflare Workers Static Assets
- Do not edit `wrangler.toml` bindings without understanding the Worker + assets deployment
- Do not edit `.github/workflows/deploy.yml` without verifying the required GitHub secrets are in place
- Do not remove or modify the `_redirects` file in `public/` — it preserves SEO for existing URLs

---

## Key External Integrations

| Integration | How it works |
|---|---|
| GiveButter | External links only (`<a href="...">`) |
| Google Forms | External links; membership page may embed via iframe |
| Cloudflare Turnstile | CAPTCHA on contact form; verify via `TURNSTILE_SECRET_KEY` env var in Worker |
| MailChannels | Email delivery from contact form Worker (Cloudflare's free transactional email) |
| YouTube | `<iframe>` embeds on Events page; consider `lite-youtube-embed` for performance |
| Facebook | External links only |

---

## Environment Variables

| Variable | Where used | How to set |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Contact form Worker | Cloudflare Worker secret (via `wrangler secret put`) |
| `TURNSTILE_SITE_KEY` | Contact form frontend | Public — safe to commit to astro config or env file |

Never hardcode these values in source files.
