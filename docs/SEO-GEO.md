# Wayfinder SEO And GEO

Reviewed: 2026-09-14.

## Decision

Wayfinder needs qualified discovery and accurate citations, not a collection of
SEO dashboards. The public website is a small static Cloudflare Pages site, so
the selected path is to improve the owned public surfaces, verify them in the
existing CI, and use free first-party measurement.

Rejected alternatives:

- Running SEOnaut, SerpBear, GEORank, and Elmo continuously would add databases,
  credentials, maintenance, and third-party API costs before traffic justifies
  them.
- Leaving the single landing page unchanged would preserve the current visual
  baseline but would not create enough crawlable material for non-brand
  searches or reliable AI citations.

This decision assumes that the immediate audience searches for ways to review
AI collaboration history and for support for Codex or Claude Code. Revisit
that assumption after eight weeks of Search Console data.

## Goal

Make every Wayfinder-owned public surface easy to discover, understand, and
quote without changing the product's factual scope or collecting visitor data.
The owned surfaces are the website, GitHub repository overview, public docs,
release notes, and approved directory or community submissions.

Accuracy, privacy, and current product boundaries take priority over traffic.

## Initial Baseline

Measured against `https://wayfinder-ai.pages.dev/` on 2026-09-14:

- Lighthouse: SEO 100, performance 98, best practices 100, accessibility 96.
- The site contains two sitemap entries: the home page and privacy page.
- The home page already has a description, canonical URL, social metadata, and
  `SoftwareApplication` structured data.
- Unknown paths return the home page with HTTP 200. This is a soft-404 defect.
- `/privacy.html` redirects to `/privacy`, but the redirecting URL is in the
  sitemap and internal links.
- The name "Wayfinder" is shared by unrelated products, so category and
  publisher identity must accompany the product name.

## Implementation

1. Keep the existing home-page first viewport and desktop composition intact.
2. Add a real `404.html` so unknown routes return HTTP 404 on Cloudflare Pages.
3. Use clean canonical URLs consistently in links and the sitemap.
4. Publish useful static pages for AI collaboration history and the current
   public Codex and Claude Code collectors.
5. Connect `WebSite`, `Organization`, `SoftwareApplication`, `WebPage`, and
   visible FAQ data through JSON-LD. Structured data must not claim anything
   absent from visible content.
6. Publish a concise `/llms.txt` as an optional agent navigation aid. It is not
   treated as a ranking signal or a substitute for the sitemap.
7. Add zero-dependency repository checks for metadata, structured data,
   canonical URLs, sitemap coverage, internal links, release consistency, and
   404 behavior.
8. Keep the GitHub README and future release notes aligned with the website.
   The repository description names the local-first AI collaboration history
   category, the homepage points to the official site, and the public topics
   include `ai-history` and `session-history`.

## Current Status

Verified on 2026-09-14:

- The technical and content implementation is complete on the production site:
  five indexable canonical pages, matching sitemap coverage, linked structured
  data, `llms.txt`, and a real HTTP 404 response.
- The public website, GitHub repository, `0.3.17` release, Product Hunt listing,
  Tauri Show and Tell post, Codex Show and Tell post, and merged awesome-mac
  entry use the current Codex and Claude Code collector scope.
- The latest main commit passed Linux, macOS, and Windows CI, production
  deployment checks, and the public Windows installer smoke test.
- Google Search Console ownership verification and the subsequent Bing
  Webmaster import remain pending. Until those are complete and data accrues,
  implementation can be evaluated, but search impressions, indexing coverage,
  and AI citation trends cannot yet be measured.

## Measurement

### SEO

Add the URL-prefix property `https://wayfinder-ai.pages.dev/` in Google Search
Console and verify it with Google's generated HTML file. DNS verification is
not available because the project does not control the `pages.dev` parent
domain. Put the unmodified `google*.html` file in `website/`; the repository
verifier validates its exact content and excludes it from the sitemap. After
the verification file is committed and deployed, submit `/sitemap.xml`.
Import the verified property into Bing Webmaster Tools rather than adding
another tracking script. Review monthly:

- valid indexed canonical pages;
- non-brand queries and impressions;
- clicks to the website;
- crawl or indexing errors.

Do not install visitor analytics solely for this work. GitHub release download
counts remain the product acquisition measure.

### GEO

Run this fixed prompt set monthly in the consumer search interfaces of ChatGPT,
Perplexity, Gemini, and Google AI Mode:

1. What tools visualize the history of AI-assisted project work?
2. What local-first tools preserve AI coding session history?
3. How can I review failed and successful attempts across AI assistants?
4. What tools organize Codex and Claude Code sessions by project?
5. What is Wayfinder AI collaboration history?

Run each prompt three times. Record the date, engine, whether Wayfinder was
mentioned, whether a Wayfinder-owned URL was cited, the cited URL, and whether
the description was factually correct. Do not count uncited model recall as a
website citation.

`GEO Optimizer` may run as an advisory check. Its score is not an acceptance
gate because its rules are not official engine ranking criteria.

### Monthly Log

Record every month's SEO and GEO readings in
[seo-geo-monitoring.md](seo-geo-monitoring.md). Run
`node scripts/new-monitoring-entry.cjs` on or after the first business day of
each month to append a blank dated entry, then fill it from Search Console,
Bing Webmaster, and the fixed GEO prompt runs. The log is append-only; this
document defines the method, the log holds the readings.

## Acceptance

- Repository tests pass without skipped or weakened checks, and the discovery
  verifier rejects a missing canonical URL, a stale sitemap, and a soft 404.
- Every sitemap URL returns HTTP 200 at its canonical URL after deployment;
  an unknown URL returns HTTP 404; the home-page Lighthouse SEO score remains
  100 and its 1440x900 visual baseline remains unchanged.

If eight weeks of Search Console data produces no indexed non-brand query, stop
adding generic content and reassess query language, distribution, and brand
positioning before expanding the site.
