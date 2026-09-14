# Wayfinder SEO And GEO Monitoring Log

Owner surface: https://wayfinder-ai.pages.dev/
Methodology: see [SEO-GEO.md](SEO-GEO.md) (`## Measurement`). This file is the
running record only; it does not redefine the method.

## How To Use

1. Run `node scripts/new-monitoring-entry.cjs` on or after the first business
   day of each month to append a blank dated entry below.
2. Fill the SEO block from Google Search Console (Performance + Pages +
   Sitemaps) and Bing Webmaster Tools. Use absolute dates.
3. Fill the first-party GEO block from Bing Webmaster Tools AI Performance,
   including citations, cited pages, grounding queries, and visibility
   dimensions. Keep `Pending` while Bing says imported data is processing.
4. Fill both GEO language blocks by running the five fixed prompts three times
   each in the consumer interfaces of ChatGPT, Perplexity, Gemini, and Google
   AI Mode. Record only cited Wayfinder-owned URLs as citations; uncited model
   recall is not a citation.
5. Recheck the authority table against the linked public page or pull request.
   A submission remains `Pending` until the third party publishes or merges it.
6. Keep prior months intact. This is an append-only ledger.

## Reminder

A monthly repeating macOS Calendar event ("跑 Wayfinder 月度 SEO/GEO 监测",
1st of each month at 10:00, with a same-day and a one-day-ahead alert) prompts
the owner to open a working session and run the monitoring. There is no
unattended cron job; every step below is done inside a session on purpose.

## Fixed GEO Prompt Sets

### English

1. What tools visualize the history of AI-assisted project work?
2. What local-first tools preserve AI coding session history?
3. How can I review failed and successful attempts across AI assistants?
4. What tools organize Codex and Claude Code sessions by project?
5. What is Wayfinder AI collaboration history?

### Simplified Chinese

1. 哪些工具可以可视化 AI 辅助项目的工作历史？
2. 有哪些本地优先的工具可以保留 AI 编程会话历史？
3. 如何回看不同 AI 助手中的成功和失败尝试？
4. 哪些工具可以按项目整理 Codex 和 Claude Code 会话？
5. Wayfinder AI 协作历史是什么？

## Status Baseline

- 2026-09-14: Production has nine English pages and nine matching independently
  indexable Simplified Chinese pages, reciprocal `hreflang`, an 18-URL
  bilingual sitemap, visible and JSON-LD breadcrumbs on all 16 non-home pages,
  structured data, `llms.txt`, and a real HTTP 404. Audited production commit
  `51c72998ba2f7d7170de217c3f2f549fddc54364` passed 244 checks on all
  three CI platforms, production verification, live crawling of all 18 URLs,
  and IndexNow submission. Lighthouse 13.4.1 reported SEO 100 for all 18
  pages. Its latest production home-page audit reported performance 94,
  accessibility 100, best practices 100, SEO 100, agentic browsing 100, FCP
  and LCP of 1.4 seconds, CLS 0, and TBT 0 ms. Nu HTML Checker returned zero
  messages; Linkinator 8.1.0 verified 45 live pages, assets, and external links
  with zero failures or redirects. Schema.org Validator returned zero errors
  and zero warnings for deployed English and Chinese breadcrumb samples.
  Google Search Console ownership is verified and Bing imported the property.
  Search Console accepted a manual `/sitemap.xml` resubmission on 2026-09-14,
  but the immediate table state remained `Couldn't fetch`, with no last-read
  date and zero discovered pages. The public sitemap independently returned
  HTTP 200 to a Googlebot user agent with valid XML. Bing reports one
  successful sitemap and five discovered URLs from the earlier crawl, while
  its imported data and reports may take up to 48 hours to appear. Successful
  18-URL console reads, impressions, index coverage, and citation data remain
  pending.

---

<!-- ENTRIES: new months are appended below this line by scripts/new-monitoring-entry.cjs -->

## 2026-09

Recorded: 2026-09-14

### SEO (Google Search Console + Bing Webmaster)

| Metric | Value | Notes |
| --- | --- | --- |
| Valid indexed canonical pages | Pending | GSC Page indexing says data is processing; check again in 1-2 days |
| Non-brand queries (top) | Pending | GSC Performance says data is processing and shows no data |
| Total impressions | Pending | 28-day; GSC data is processing |
| Total clicks | Pending | 28-day; GSC data is processing |
| Crawl / indexing errors | Pending | GSC Page indexing data is processing |
| Sitemap status | Re-submitted; read pending | GSC accepted it on 2026-09-14; immediate row remained `Couldn't fetch` / 0 |
| Bing sitemap status | Success; expanded read pending | 1 sitemap, 0 errors, 0 warnings, 5 URLs discovered; imported data may take up to 48 hours |
| IndexNow deployment submission | Success | 2026-09-14; verified deployment workflow |

### GEO First-Party (Bing AI Performance)

| Metric | Value | Notes |
| --- | --- | --- |
| Total citations | Pending | Bing data and reports are processing |
| Average cited pages | Pending | unique cited URLs per day |
| Cited URLs | Pending | record URL and citation count |
| Grounding queries | Pending | sampled retrieval phrases, not verbatim user prompts |
| Intents / topics | Pending | preview dimensions |
| Citation share | Pending | observational metric, not a ranking |
| Prior-period comparison | Pending | annotate backfills or reporting changes |

### Consumer Engine Readiness

Checked: 2026-09-14

| Engine | Status | Evidence / completion requirement |
| --- | --- | --- |
| ChatGPT Search | Authentication required | The consumer search page redirected to login; no run counted |
| Perplexity | Partial probe only | One English probe returned the unrelated Web3 Wayfinder with no owned URL, then anonymous repeat requests required sign-up; no aggregate is reported |
| Gemini | Interactive run required | The signed-in consumer page opened, but a URL query did not submit the prompt; no run counted |
| Google AI Mode | Unavailable in current session | The current Google Hong Kong session rendered ordinary search instead of AI Mode; no run counted |

Complete the fixed baseline as soon as authenticated consumer sessions and a
supported Google AI Mode region are available. Do not mix the exploratory
Perplexity probe into the required 15-run denominator.

### GEO English (5 prompts x 3 runs per engine)

| Engine | Mentioned (n/15) | Cited owned URL (n/15) | Cited URL | Factually correct |
| --- | --- | --- | --- | --- |
| ChatGPT Search | Pending | Pending | | Pending |
| Perplexity | Pending | Pending | | Pending |
| Gemini | Pending | Pending | | Pending |
| Google AI Mode | Pending | Pending | | Pending |

### GEO Simplified Chinese (5 prompts x 3 runs per engine)

| Engine | Mentioned (n/15) | Cited owned URL (n/15) | Cited URL | Factually correct |
| --- | --- | --- | --- | --- |
| ChatGPT Search | Pending | Pending | | Pending |
| Perplexity | Pending | Pending | | Pending |
| Gemini | Pending | Pending | | Pending |
| Google AI Mode | Pending | Pending | | Pending |

### Authority And Distribution

| Surface | Status | Evidence |
| --- | --- | --- |
| awesome-mac | Merged | https://github.com/jaywcjlove/awesome-mac/pull/2828 |
| Tauri Show and Tell | Published | https://github.com/orgs/tauri-apps/discussions/16004 |
| Codex Show and Tell | Published | https://github.com/openai/codex/discussions/44618 |
| Awesome AI-Driven Development | Pending | https://github.com/eltociear/awesome-AI-driven-development/pull/126 |
| Made with Tauri | Pending | manual review |
| Console.dev | Pending | editorial review |
| Changelog News | Pending | editorial review |

### Actions For Next Month

- Confirm Google and Bing have re-read the 18-URL sitemap.
- Record the first available query, impression, click, index, and fixed-prompt
  citation data without backfilling missing values.
- Record Bing AI Performance citations, cited URLs, grounding queries,
  intents, topics, citation share, and prior-period comparison when processing
  completes.

### Scheduled Checkpoints

| Date | Check |
| --- | --- |
| 2026-09-16 | Recheck GSC Sitemap and Page indexing after its stated 1-2 day processing window; recheck Bing after its stated 48-hour import window |
| 2026-09-21 | Record any first-week indexed pages, queries, impressions, clicks, Bing citations, and crawl errors without treating missing data as zero |
| 2026-10-01 | Run the first complete monthly SEO/GEO reading, including 15 observations per engine per language where authenticated consumer sessions are available |
| 2026-10-12 | Earliest four-week directional review; do not claim durable SEO/GEO impact before this checkpoint |
| 2026-11-09 | Eight-week acceptance review and decision on content, distribution, and brand/domain changes |

The consumer-engine baseline can be completed before these dates as soon as
the owner provides authenticated ChatGPT Search and Perplexity sessions plus a
Google session/region where AI Mode is actually available.

---
