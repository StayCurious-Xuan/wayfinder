# Wayfinder Download Website

The static download website lives in `website/`. It has no backend, account,
analytics, cookies, or runtime dependency. Download URLs come from
`website/releases.json` and point to versioned GitHub Release assets.

The public copy leads with Wayfinder's value across AI-assisted conversations,
research, writing, design, coding, and other project work. It then describes
the current early-access flow: install the app, continue working in Codex,
or Claude Code, and inspect the automatically updated local voyage map. It
must not tell Companion users to configure or approve Hooks.

The responsive composition and viewport acceptance contract lives in
[MOBILE-REDESIGN.md](MOBILE-REDESIGN.md).

## Discovery Surface

The home page remains the download experience. Search and AI discovery use
separate static pages so the frozen desktop hero does not become a text-heavy
SEO page:

| Purpose | Canonical path |
| --- | --- |
| Download experience | `/` and `/zh/` |
| AI collaboration history | `/ai-collaboration-history` |
| Factual comparison | `/compare` |
| Codex collector | `/integrations/codex` |
| Claude Code collector | `/integrations/claude-code` |
| Data boundary | `/privacy` |
| Agent navigation | `/llms.txt` |

The six English pages are the maintained sources. Their independently
indexable Simplified Chinese counterparts use the same paths under `/zh/`.
Run `npm run generate:website-locales` after changing source text, metadata, or
internal links. Generated Chinese HTML and the bilingual sitemap are committed;
`npm run check` fails if they drift.

Every indexed HTML page must have a unique title, description, canonical URL,
one visible H1, reciprocal `en` / `zh-Hans` / `x-default` alternates, and valid
JSON-LD that agrees with visible copy and language. `404.html` must remain
present so Cloudflare Pages returns HTTP 404 for unknown paths instead of
serving the home page as a soft 404.

Run the locale and discovery checks before publishing:

```bash
npm run verify:website-locales
npm run verify:website-discovery
```

`llms.txt` is an optional navigation aid for agents. It is not treated as an
official ranking signal and does not replace `sitemap.xml`.

Search Console setup uses a URL-prefix property for
`https://wayfinder-ai.pages.dev/` and Google's generated HTML verification
file. The project cannot add DNS records to the shared `pages.dev` parent
domain. Place the downloaded `google*.html` file at the root of `website/`
without renaming or editing it. The discovery verifier accepts only the exact
`google-site-verification: <filename>` content and excludes the file from the
sitemap. After verification, submit `/sitemap.xml` and import the property
into Bing Webmaster Tools.

## Local Preview

Serve the repository root and open `/website/`:

```bash
python3 -m http.server 4180
```

## Cloudflare Pages

The selected free address is:

https://wayfinder-ai.pages.dev

The originally requested `wayfinder.pages.dev` address was already serving an
unrelated project on 2026-09-09. Configure:

- Repository variable `CLOUDFLARE_PROJECT_NAME=wayfinder-ai`
- Secret `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`

Then run `.github/workflows/deploy-website.yml`. A purchased custom domain is
not required.

## Public Links

| Purpose | Address |
| --- | --- |
| Official website | https://wayfinder-ai.pages.dev |
| Source and overview | https://github.com/StayCurious-Xuan/wayfinder |
| Desktop Alpha | https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.17 |
| Installation guide | https://github.com/StayCurious-Xuan/wayfinder/blob/main/docs/INSTALL.md |
| Privacy policy | https://github.com/StayCurious-Xuan/wayfinder/blob/main/PRIVACY.md |
| Issue tracker | https://github.com/StayCurious-Xuan/wayfinder/issues |
| MIT license | https://github.com/StayCurious-Xuan/wayfinder/blob/main/LICENSE |
| Product Hunt | https://www.producthunt.com/products/wayfinder-5?launch=wayfinder-6 |

## Release Updates

Before publishing the site for a new Companion release, update
`website/releases.json` with the matching version, `alpha` or `stable`
channel, and versioned asset names. Publish the GitHub Release and set
`published` to `true` only after both macOS DMGs and the Windows x64 installer
return successfully; until then unavailable download actions point to the
general Releases page.
