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
9. Give English and Simplified Chinese separate server-rendered canonical URLs.
   English remains the default under `/`; matching Chinese pages live under
   `/zh/`. Every pair must declare reciprocal `en`, `zh-Hans`, and `x-default`
   alternates in both HTML and the sitemap.
10. Treat the English HTML as the maintained source. Generate the nine Chinese
    pages and bilingual sitemap with `npm run generate:website-locales`; CI
    rejects missing translations, stale generated pages, broken locale links,
    or sitemap drift.
11. Maintain focused pages for the three recurring user jobs that do not belong
    in the frozen landing page: installing and completing first launch,
    understanding the current integration matrix, and checking release
    history. These pages reuse verified product and release evidence rather
    than manufacturing generic blog content.
12. Publish an IndexNow ownership key and submit every sitemap URL after a
    verified production deployment. This accelerates discovery in Bing and
    other participating engines; it does not replace the sitemap or affect
    Google indexing.

## Current Status

Verified on 2026-09-14:

- Production contains nine English pages and nine matching `/zh/` pages: home,
  installation, AI collaboration history, factual comparison, integration
  index, Codex, Claude Code, update history, and privacy. All 18 are
  independently canonical, present in the sitemap and `llms.txt`, reachable
  through ordinary links, and return HTTP 200. Unknown paths return HTTP 404.
- The site is English-first and both languages are server-rendered. Language
  switches are ordinary crawlable links, every pair has reciprocal `hreflang`,
  and the sitemap repeats the same alternates for all 18 URLs. The old runtime
  text replacement has been removed. `robots.txt` explicitly allows the AI
  retrieval crawlers
  (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`) alongside `GPTBot`,
  `ClaudeBot`, and `Google-Extended`.
- The deployment workflow verifies the public release and commit marker before
  posting all canonical URLs to IndexNow. The production run for commit
  `d8d1ee5d3182e9357c79b40b70fe4a1dee1d0e56` validated the deployed key and
  completed IndexNow submission successfully.
- The public website, GitHub repository, `0.3.17` release, Product Hunt listing,
  Tauri Show and Tell post, Codex Show and Tell post, and merged awesome-mac
  entry use the current Codex and Claude Code collector scope.
- Production commit `fff98fe7eef23feabcb8b301d29819d4dd4829d2`
  passed Linux, macOS, and Windows CI, production deployment checks, the public
  Windows installer smoke test, and independent live verification of all 18
  canonical pages. Lighthouse 13.4.1 reported SEO 100 for every English and
  Chinese canonical page. Nu HTML Checker reported zero messages across all 18
  pages. Linkinator 8.1.0 checked 45 live pages, assets, and external links with
  zero broken links or redirects.
- Google Search Console ownership is verified for
  `https://wayfinder-ai.pages.dev/` via the HTML file method
  (`website/google9326e3bda374ef14.html`, live and immutable). Do not remove
  this file.
- The sitemap `/sitemap.xml` was submitted in Google Search Console (2026-09-14)
  and present in Bing Webmaster Tools, which imported the verified Google
  property and crawled the sitemap successfully. Google and Bing re-read the
  sitemap automatically. The 18-URL sitemap is now deployed; its new read date
  and discovered URL count remain pending in both consoles and must not be
  inferred from the successful live crawl or IndexNow response.
- All setup steps (Google verification, sitemap submission, Bing import,
  monthly monitoring cadence) are complete. Search impressions, indexing
  coverage, and AI citation trends still need indexing time before they can be
  measured; record them monthly in
  [seo-geo-monitoring.md](seo-geo-monitoring.md).

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
- the last successful IndexNow deployment submission.

Do not install visitor analytics solely for this work. GitHub release download
counts remain the product acquisition measure.

### GEO

Run both fixed prompt sets monthly in the consumer search interfaces of
ChatGPT, Perplexity, Gemini, and Google AI Mode.

English:

1. What tools visualize the history of AI-assisted project work?
2. What local-first tools preserve AI coding session history?
3. How can I review failed and successful attempts across AI assistants?
4. What tools organize Codex and Claude Code sessions by project?
5. What is Wayfinder AI collaboration history?

Simplified Chinese:

1. 哪些工具可以可视化 AI 辅助项目的工作历史？
2. 有哪些本地优先的工具可以保留 AI 编程会话历史？
3. 如何回看不同 AI 助手中的成功和失败尝试？
4. 哪些工具可以按项目整理 Codex 和 Claude Code 会话？
5. Wayfinder AI 协作历史是什么？

Run each prompt three times per language. Record the date, engine, language,
whether Wayfinder was mentioned, whether a Wayfinder-owned URL was cited, the
cited URL, and whether the description was factually correct. Do not count
uncited model recall as a website citation, and do not combine English and
Chinese results into one rate.

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
  verifier rejects a missing canonical URL, a stale sitemap, a mismatched
  document language, malformed HTML, duplicate IDs, broken internal fragments,
  a one-way or incorrect `hreflang`, and a soft 404.
- All nine Chinese pages are readable with JavaScript disabled, self-canonical,
  listed in the sitemap, paired with their English source, and reproduced
  byte-for-byte by `npm run generate:website-locales`.
- Every sitemap URL returns HTTP 200 at its canonical URL after deployment;
  an unknown URL returns HTTP 404; the home-page Lighthouse SEO score remains
  100 and its 1440x900 visual baseline remains unchanged.

If eight weeks of Search Console data produces no indexed non-brand query, stop
adding generic content and reassess query language, distribution, and brand
positioning before expanding the site.
