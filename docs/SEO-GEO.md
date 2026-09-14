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
13. Publish matching visible navigation and locale-specific `BreadcrumbList`
    structured data for every non-home canonical page. The two collector pages
    use the full home-to-integrations-to-collector hierarchy; other pages use
    home-to-current-page. CI verifies positions, labels, canonical item URLs,
    visible links, and the `WebPage` reference in both languages.

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
- All 16 non-home canonical pages expose matching visible and JSON-LD
  breadcrumb hierarchies. English trails resolve through `/`; Chinese trails
  resolve through `/zh/`, and collector pages include their `/integrations`
  parent.
- Audited production baseline commit
  `51c72998ba2f7d7170de217c3f2f549fddc54364` passed 244 JavaScript and
  Chromium checks on Linux, macOS, and Windows, deployment verification,
  IndexNow submission, and an independent 18-page live discovery run. The
  deployment workflow verifies the public release, current commit marker, and
  IndexNow key before posting all canonical URLs.
  Schema.org Validator reported zero errors and zero warnings for the deployed
  English Codex page, Chinese Codex page, and both languages of the comparison
  page's combined `WebPage`, `FAQPage`, and `BreadcrumbList` graph.
- The public website, GitHub repository, `0.3.17` release, Product Hunt listing,
  Tauri Show and Tell post, Codex Show and Tell post, and merged awesome-mac
  entry use the current Codex and Claude Code collector scope.
- The unchanged public Windows `0.3.17` installer passed its smoke test.
  Lighthouse 13.4.1 reported SEO 100 for every English and Chinese canonical
  page. A production home-page audit reported performance 94, accessibility
  100, best practices 100, SEO 100, agentic browsing 100, FCP and LCP of 1.4
  seconds, CLS 0, and TBT 0 ms. Nu HTML Checker reported zero messages across
  all 18 pages. Linkinator 8.1.0 checked 45 live pages, assets, and external
  links with zero broken links or redirects.
- The Codex and Claude Code integration pages cite the vendors' official
  session documentation in visible copy and JSON-LD rather than relying on
  secondary descriptions.
- Google Search Console ownership is verified for
  `https://wayfinder-ai.pages.dev/` via the HTML file method
  (`website/google9326e3bda374ef14.html`, live and immutable). Do not remove
  this file.
- The sitemap `/sitemap.xml` was submitted in Google Search Console and present
  in Bing Webmaster Tools, which imported the verified Google property and
  previously crawled the sitemap successfully. Google Search Console accepted
  a manual resubmission on 2026-09-14, but its immediately refreshed row still
  showed `Couldn't fetch`, no last-read date, and zero discovered pages. A
  Googlebot-user-agent request independently returned HTTP 200 with
  `application/xml`, the XML parsed successfully, and `robots.txt` declared the
  same sitemap. The console's successful read and 18-page discovered count
  therefore remain pending. Bing reports one successful sitemap and five
  discovered URLs from the earlier crawl, while its dashboard says imported
  data can take up to 48 hours to appear. Bing's reread of the expanded
  18-URL sitemap remains pending; neither console's final count may be inferred
  from public crawling or the IndexNow response.
- All setup steps (Google verification, sitemap submission, Bing import,
  monthly monitoring cadence) are complete. Search impressions, indexing
  coverage, and AI citation trends still need indexing time before they can be
  measured; record them monthly in
  [seo-geo-monitoring.md](seo-geo-monitoring.md).

## Domain Boundary

The shared `wayfinder-ai.pages.dev` host is verified and production-ready, but
a distinctive owned domain remains the largest optional long-term brand
authority improvement. The obvious `wayfinder-ai.com` name is already used by
an unrelated product and must not be adopted or represented as Wayfinder's
domain. Any future purchase requires an owner-approved name, redirects,
canonical and `hreflang` migration, and new Search Console verification; it is
not part of the current zero-cost deployment.

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

Also record the first-party Bing Webmaster Tools AI Performance report each
month. It covers citations across Microsoft Copilot, AI-generated Bing
summaries, and selected partner integrations; it does not prove visibility in
the four independently tested consumer interfaces. Record total citations,
average cited pages, cited URLs, grounding queries, intent and topic
breakdowns, citation share, and the comparison with the prior period. The
report is currently in preview and may backfill data, so annotate abrupt
changes instead of attributing them automatically to site work. Microsoft's
official definitions are in the
[AI Performance launch](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
and
[expanded visibility metrics](https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare)
announcements.

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
Chinese results into one rate. Each engine therefore has 15 observations per
language; report mention and owned-citation counts as `n/15`, not `n/3`.

`GEO Optimizer` may run as an advisory check. Its score is not an acceptance
gate because its rules are not official engine ranking criteria.

### Monthly Log

Record every month's SEO and GEO readings in
[seo-geo-monitoring.md](seo-geo-monitoring.md). Run
`node scripts/new-monitoring-entry.cjs` on or after the first business day of
each month to append a blank dated entry, then fill it from Search Console,
Bing Webmaster, the fixed bilingual GEO prompt runs, and public third-party
listing or review pages. The log is append-only; this document defines the
method, the log holds the readings. Pending submissions are tracked as work in
progress and never counted as published authority.

## Acceptance

- Repository tests pass without skipped or weakened checks, and the discovery
  verifier rejects a missing canonical URL, a stale sitemap, a mismatched
  document language, malformed HTML, duplicate IDs, broken internal fragments,
  a one-way or incorrect `hreflang`, and a soft 404.
- All nine Chinese pages are readable with JavaScript disabled, self-canonical,
  listed in the sitemap, paired with their English source, and reproduced
  byte-for-byte by `npm run generate:website-locales`.
- Every non-home canonical page has exactly one visible breadcrumb and one
  `BreadcrumbList` with sequential positions, localized labels, canonical item
  URLs, and a matching reference from its `WebPage` node.
- Every sitemap URL returns HTTP 200 at its canonical URL after deployment;
  an unknown URL returns HTTP 404; the home-page Lighthouse SEO score remains
  100 and its 1440x900 visual baseline remains unchanged.

If eight weeks of Search Console data produces no indexed non-brand query, stop
adding generic content and reassess query language, distribution, and brand
positioning before expanding the site.
