# MNHTF.org — Astro + Cloudflare Redesign Plan

## Executive Summary

Migrate **mnhtf.org** from WordPress + Elementor to an **Astro static site deployed entirely on Cloudflare Workers**. A single Worker serves all static assets (via Workers Static Assets) and also handles the contact form API endpoint. The result is faster, cheaper, easier to maintain, and eliminates the WordPress attack surface — with no Cloudflare Pages involved.

---

## Current Site Inventory

### Pages (14 total)

| Route | Purpose |
|---|---|
| `/` | Home — mission statement, hero, email signup, CTA blocks |
| `/about-hoarding/` | Educational content on HD, Hoarding Behavior, Diogenes Syndrome |
| `/events-and-calendar/` | Meeting info, event photos, media/press (YouTube embeds) |
| `/education/` | Education resources (content not fully crawled) |
| `/directory/` | Resource hub — PDF downloads, YouTube channel link |
| `/for-people-who-hoard/` | Resources sub-page |
| `/for-friends-and-family/` | Resources sub-page |
| `/for-municipalities/` | Resources sub-page |
| `/for-property-managers/` | Resources sub-page |
| `/coming-soon/` | Mental health professionals (placeholder) |
| `/contact/` | Contact form, board members, FAQ links, voicemail/email |
| `/ways-to-give/` | Donation info — GiveButter CTA, mail-in, gift match, in-kind |
| `/membership/` | Membership types, dues, GiveButter CTA, Google Form link |

### Assets to Migrate

- Logo (`MN-HTF-Logo.png` and `-300x139.png`)
- All hero/banner images per page
- Event photo gallery images (6+ photos)
- Board member headshots (6 people)
- PDF downloads:
  - `MNHTF-Final-How-to-Help-Brochure-.pdf`
  - `11_15_25-MN-Hoarding-Taskforce-Comprehensive-Resource-List-.xlsx.pdf`
  - `MNHTF-Membership-App-2026-Google-Forms.pdf`
- External PDFs (Bridging donor list, HRS assessment tool, Clutter Image Rating Scale)

---

## Third-Party Integrations

### 1. GiveButter ✅ Keep as-is (external links)

Two campaigns:

| Campaign | URL |
|---|---|
| General Donation | `https://givebutter.com/mnhtfgeneraldonation` |
| Membership Dues | `https://givebutter.com/mnhtfmembershipdues` |

**Implementation**: Simple `<a>` links and CTA buttons pointing to GiveButter's hosted pages. No embed needed — GiveButter's hosted pages handle all payment flow.

GiveButter also offers a **widget embed** (`<script>` tag) if you want an inline donate button with a popup modal. Worth considering for the header "Donate" button and the Ways to Give page. Just add their script and use `data-givebutter-widget` attributes.

```html
<!-- Optional widget approach -->
<script src="https://givebutter.com/js/widget.js"></script>
<a href="https://givebutter.com/mnhtfgeneraldonation"
   data-givebutter-widget>Donate</a>
```

### 2. Give MN ✅ Keep as-is (external link)

- `https://give.mn/fmb5wf` — secondary donation link on the Ways to Give page
- Simple `<a>` tag, no integration needed

### 3. Google Forms ✅ Keep as-is (external links + embeds)

Two forms:

| Form | Use |
|---|---|
| Membership application | `https://docs.google.com/forms/d/e/1FAIpQLScw8c_P9rqJwlLDa4L9XK8vhq_ziIhgFB9GhunKpxFIM70oDw/viewform` |
| Volunteer/interest form | `https://docs.google.com/forms/d/e/1FAIpQLSezrbXlvtZp7CKz4VmNUHZF1u3A0MT1-yB9agi52L5utJ_XCA/viewform` |

**Implementation**: Link out directly, or use Google Forms `?embedded=true` iframe embed on the membership page. The iframe approach keeps users on-site.

```html
<iframe
  src="https://docs.google.com/forms/d/e/[FORM_ID]/viewform?embedded=true"
  width="100%" height="800" frameborder="0">
</iframe>
```

### 4. Contact Form → Cloudflare Worker

The current WP contact form (with the dropdown "I Want To…" selector and fields for name/email/message) needs a backend replacement. **Use a Cloudflare Worker** to accept a `POST` from the Astro form and forward it to `info@mnhtf.org` via Mailchannels (Cloudflare's free transactional email, no API key needed from Pages/Workers).

**Form fields to preserve**:
- Name
- Email Address
- Intent dropdown (12 options: "Find Support for Myself", "Learn How to Support my Friend/Family Member", etc.)
- Message

**Worker implementation** (sketch):

```ts
// workers/contact-form.ts
interface ContactPayload {
  name: string;
  email: string;
  intent: string;
  message: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await request.json<ContactPayload>();

    await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'info@mnhtf.org' }] }],
        from: { email: 'noreply@mnhtf.org', name: 'MNHTF Website' },
        subject: `Website Contact: ${body.intent}`,
        content: [{ type: 'text/plain', value: `Name: ${body.name}\nEmail: ${body.email}\n\n${body.message}` }]
      })
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
} satisfies ExportedHandler<Env>;
```

Add CAPTCHA (Cloudflare Turnstile — free) to prevent spam.

### 5. Email Newsletter Signup → Buttondown or Mailchimp

The home page has an email list signup widget (was a WP plugin). Options:

- **Buttondown** — simple, markdown-friendly, free tier, embeds a basic `<form>` that POSTs to their API. Good fit for a volunteer org.
- **Mailchimp** — more powerful, has audience segmentation; also has a simple embed form.

Either way, replace the WP widget with a plain HTML `<form>` that POSTs to the chosen provider's subscribe endpoint.

```html
<!-- Buttondown example -->
<form action="https://buttondown.com/api/emails/embed-subscribe/mnhtf"
      method="post" target="_blank">
  <input type="email" name="email" placeholder="Your email address" required />
  <button type="submit">Subscribe</button>
</form>
```

### 6. Facebook ✅ Keep as-is (external link)

- `https://www.facebook.com/mnhtf`
- Used in nav and footer; link out directly
- Consider adding Open Graph meta tags for Facebook sharing

### 7. YouTube ✅ Keep as-is (embeds)

- Channel: `https://www.youtube.com/@mnhoardingtaskforce1757`
- Events page has embedded WCCO interview videos
- In Astro, use `<lite-youtube>` web component (or plain `<iframe>`) — `lite-youtube-embed` is a lightweight option that lazy-loads and avoids performance hit

### 8. Dropbox (Member Resources)

Currently mentioned as a member benefit ("access to resources on Dropbox"). This is a private link handed out to members — no change needed, just document the URL in site content.

---

## Technical Architecture

### Stack

```
Astro (static output, TypeScript)
  └── Cloudflare Workers (hosting + CDN + dynamic endpoints)
       ├── Workers Static Assets — serves the Astro dist/ output
       └── Worker script — handles /api/contact (contact form POST)
```

> **No Cloudflare Pages.** Everything — static site and dynamic endpoints — runs through a single Cloudflare Worker using the [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) feature. This simplifies the deployment to a single `wrangler deploy`.

**Tooling**

| Tool | Purpose |
|---|---|
| pnpm | Package manager |
| TypeScript | Typed JS across Astro components, Workers, and utilities |
| Biome.js | Formatting + linting (replaces ESLint + Prettier) |
| Vitest | Unit testing for Worker logic, utility functions |

### Astro Project Structure

```
mnhtf-site/
├── public/
│   ├── images/          # Migrated WP images
│   ├── pdfs/            # Migrated PDF downloads
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Nav.astro
│   │   ├── DonateButton.astro
│   │   ├── ContactForm.astro
│   │   ├── EmailSignup.astro
│   │   └── BoardMembers.astro
│   ├── layouts/
│   │   └── BaseLayout.astro   # Head, Header, Footer, SEO meta
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about-hoarding.astro
│   │   ├── events-and-calendar.astro
│   │   ├── education.astro
│   │   ├── directory.astro
│   │   ├── for-people-who-hoard.astro
│   │   ├── for-friends-and-family.astro
│   │   ├── for-municipalities.astro
│   │   ├── for-property-managers.astro
│   │   ├── coming-soon.astro
│   │   ├── contact.astro
│   │   ├── ways-to-give.astro
│   │   └── membership.astro
│   ├── content/             # Optional: MDX for editable content
│   │   └── resources.json   # Resource directory data
│   └── types/
│       └── env.d.ts         # Cloudflare env bindings type declarations
├── workers/
│   ├── index.ts             # Main Worker entry — routes /api/contact, falls through to static assets
│   ├── contact-form.ts      # Contact form handler (imported by index.ts)
│   └── contact-form.test.ts # Vitest unit tests for the contact form handler
├── biome.json               # Biome formatting + linting config
├── vitest.config.ts         # Vitest config
├── tsconfig.json
├── wrangler.toml
├── AGENTS.md                # AI agent guidance for this project
└── astro.config.ts
```

**Key scripts in `package.json`**

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "biome lint ./src ./workers",
    "format": "biome format --write ./src ./workers",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "pnpm run build && wrangler deploy"
  }
}
```

### Astro Config

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',  // build to dist/ — served by Workers Static Assets
});
```

No adapter needed. Astro builds plain HTML/CSS/JS to `dist/`; the Worker serves it via the `[assets]` binding.

### Worker Entry Point

The main Worker routes the contact form API call and delegates everything else to static assets:

```ts
// workers/index.ts
import { handleContact } from './contact-form';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);  // serve static file from dist/
  }
} satisfies ExportedHandler<Env>;
```

### Biome Config

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 }
}
```

### Testing with Vitest

Vitest covers pure TypeScript logic — mainly the contact form Worker and any shared utilities. Astro page rendering is verified via the testing checklist and Lighthouse CI.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node' }
});
```

### Cloudflare Deployment

#### `wrangler.toml`

A single `wrangler.toml` configures the Worker script **and** static asset serving. One `wrangler deploy` deploys everything — no Cloudflare Pages project needed.

```toml
# wrangler.toml
name = "mnhtf-org"
main = "workers/index.ts"          # Worker entry — routes /api/contact, serves assets
compatibility_date = "2025-01-01"

[assets]
directory = "./dist"               # Astro build output — served as static assets

[vars]
# Public Turnstile site key — safe to commit
TURNSTILE_SITE_KEY = "your-site-key-here"

# Secrets (never commit; set via wrangler CLI):
#   wrangler secret put TURNSTILE_SECRET_KEY
```

**Set secrets once (not in CI):**

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

**Custom domain setup** (in Cloudflare dashboard):
1. Go to **Workers & Pages → mnhtf-org → Settings → Domains & Routes**
2. Add custom domain: `mnhtf.org`
3. Cloudflare handles DNS and TLS automatically

#### GitHub Actions — `.github/workflows/deploy.yml`

Builds the Astro site and deploys the Worker (which also serves static assets) on every push to `main`.

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Deploy
        run: pnpm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Required GitHub secrets** (set in repo Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with **Worker Scripts:Edit** permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## URL / Redirect Strategy

All existing URLs use a trailing-slash pattern (e.g., `/about-hoarding/`). Astro generates `about-hoarding/index.html` by default, which Cloudflare Workers Static Assets serves correctly.

Add a `_redirects` file in `public/` for any changed routes — Workers Static Assets honors this file the same way Pages does:

```
/coming-soon/   /for-mental-health-professionals/   301
```

---

## Content Migration Steps

1. **Download all images** from WP media library (via WP admin → Media → Bulk export, or use `wget` against the image URLs)
2. **Download all PDFs** linked on the site
3. **Copy page text** into Astro page files (plain HTML in `.astro` templates, or MDX if you want markdown editing)
4. **Repoint image `src` attributes** from `https://mnhtf.org/wp-content/uploads/...` to `/images/...`
5. **Repoint PDF `href` attributes** from WP paths to `/pdfs/...`
6. **Test all external links** (GiveButter, Google Forms, Facebook, YouTube)

---

## SEO / Meta Tags

The current site has solid Open Graph and Twitter card meta. Replicate in `BaseLayout.astro`:

```astro
---
// BaseLayout.astro props
const { title, description, ogImage } = Astro.props;
---
<head>
  <title>{title} - MN HTF</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={`${title} - MN HTF`} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <!-- Google site verification -->
  <meta name="google-site-verification" content="wNEArU7JQ0tsm_MPjp5lxIGS2nhyzIv-1QuwkN-bVW0" />
</head>
```

---

## UX / Design Goals

**The new site must look visually identical to the current mnhtf.org** — pixel-faithful reproduction of the existing layout, colors, typography, spacing, and component structure. This is a platform migration, not a redesign.

Key requirements:

- **Exact visual match**: Extract and reuse the actual hex colors, font families, font sizes, and spacing from the live site — do not substitute or approximate
- **Adaptive layout**: All pages must remain fully responsive across mobile, tablet, and desktop breakpoints, matching the current site's adaptive behavior
- **Replace text-as-image blocks** with real HTML text (accessibility + SEO benefit) while preserving the exact same visual appearance
- **Preserve warm, approachable tone** — this serves a vulnerable population; no visual changes without explicit approval
- **Large tap targets and readable font sizes** maintained as-is (many visitors may be older)
- **Full WCAG 2.1 AA accessibility compliance** — where the current site falls short, the new site should meet or exceed it

### Color & Typography Extraction

Before building components, audit the live site to extract:

- All CSS custom properties / color values (use DevTools → Computed Styles)
- Font families and weights in use (Google Fonts, system fonts, etc.)
- Heading/body size scale
- Spacing scale (margin/padding values)

Encode these as CSS custom properties in a `src/styles/tokens.css` file so they're consistent across all components.

---

## Testing Checklist Before Go-Live
- [ ] All redirects work
- [ ] Contact form submits and email arrives at `info@mnhtf.org`
- [ ] Turnstile CAPTCHA blocks bots
- [ ] GiveButter donation links open correctly (both campaigns)
- [ ] Google Form embeds/links work on Membership page
- [ ] Email signup form subscribes successfully
- [ ] All PDF downloads work
- [ ] YouTube embeds load on Events page
- [ ] Facebook links open correctly
- [ ] All board member photos load
- [ ] Mobile nav works (hamburger menu)
- [ ] OG image renders correctly when sharing on Facebook
- [ ] Google Search Console verified (`wNEArU7JQ0tsm_MPjp5lxIGS2nhyzIv-1QuwkN-bVW0`)
- [ ] Old WordPress URLs 301 redirect correctly
- [ ] Lighthouse score ≥ 90 on all pages
- [ ] `pnpm run lint` passes with zero errors (Biome)
- [ ] `pnpm run check` passes (Astro type-check)
- [ ] `pnpm test` passes (Vitest — Worker unit tests)
- [ ] Visual comparison against live site on mobile, tablet, and desktop

---

## Effort Estimate

| Task | Effort |
|---|---|
| Astro project scaffold + Cloudflare Workers deploy | 2–3 hours |
| BaseLayout, Header, Footer, Nav components | 3–4 hours |
| Home page (complex layout, multiple blocks) | 3–4 hours |
| About Hoarding + 5 Resources sub-pages | 4–6 hours |
| Events page (gallery + YouTube embeds) | 2–3 hours |
| Directory page + PDF assets | 1–2 hours |
| Contact page + Worker + Turnstile | 3–4 hours |
| Ways to Give + Membership pages | 2–3 hours |
| Image/PDF migration + asset optimization | 2–3 hours |
| Email signup integration | 1 hour |
| QA, redirects, DNS cutover | 2–3 hours |
| **Total** | **~25–35 hours** |
