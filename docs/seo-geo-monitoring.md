# Wayfinder SEO And GEO Monitoring Log

Owner surface: https://wayfinder-ai.pages.dev/
Methodology: see [SEO-GEO.md](SEO-GEO.md) (`## Measurement`). This file is the
running record only; it does not redefine the method.

## How To Use

1. Run `node scripts/new-monitoring-entry.cjs` on or after the first business
   day of each month to append a blank dated entry below.
2. Fill the SEO block from Google Search Console (Performance + Pages +
   Sitemaps) and Bing Webmaster Tools. Use absolute dates.
3. Fill the GEO block by running the five fixed prompts three times each in the
   consumer interfaces of ChatGPT, Perplexity, Gemini, and Google AI Mode.
   Record only cited Wayfinder-owned URLs as citations; uncited model recall is
   not a citation.
4. Keep prior months intact. This is an append-only ledger.

## Automation

A macOS `launchd` agent (`~/Library/LaunchAgents/com.wayfinder.seo-geo-monthly.plist`,
label `com.wayfinder.seo-geo-monthly`) runs step 1 automatically on the 1st of
each month at 10:00 and logs to `scripts/.monitoring-cron.log`. This only
appends the blank entry. Steps 2 and 3 need a logged-in Search Console/Bing
session and live prompt runs, so they still require a person to open a working
session and fill the readings; they cannot run fully unattended.

## Fixed GEO Prompt Set

1. What tools visualize the history of AI-assisted project work?
2. What local-first tools preserve AI coding session history?
3. How can I review failed and successful attempts across AI assistants?
4. What tools organize Codex and Claude Code sessions by project?
5. What is Wayfinder AI collaboration history?

## Status Baseline

- 2026-09-14: On-site technical and content implementation complete; five
  indexable canonical pages, sitemap, structured data, `llms.txt`, and a real
  404 verified in production. Google Search Console ownership verified the same
  day via the HTML file method (`website/google9326e3bda374ef14.html`), the
  sitemap `/sitemap.xml` was submitted in Search Console, and Bing Webmaster
  Tools imported the verified Google property and crawled the sitemap with
  status Success (5 URLs discovered). No impression, index, or citation data
  exists yet. The first data-bearing entry begins the month after indexing
  starts.

---

<!-- ENTRIES: new months are appended below this line by scripts/new-monitoring-entry.cjs -->

## 2026-09

Recorded: <YYYY-MM-DD>

### SEO (Google Search Console + Bing Webmaster)

| Metric | Value | Notes |
| --- | --- | --- |
| Valid indexed canonical pages | | of 5 |
| Non-brand queries (top) | | |
| Total impressions | | 28-day |
| Total clicks | | 28-day |
| Crawl / indexing errors | | |
| Sitemap status | | submitted / read date |

### GEO (5 prompts x 3 runs per engine)

| Engine | Mentioned (n/3) | Cited owned URL (n/3) | Cited URL | Factually correct |
| --- | --- | --- | --- | --- |
| ChatGPT Search | | | | |
| Perplexity | | | | |
| Gemini | | | | |
| Google AI Mode | | | | |

### Actions For Next Month

- 

---
