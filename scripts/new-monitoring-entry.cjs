#!/usr/bin/env node
"use strict";

// Zero-dependency helper: append a blank monthly SEO/GEO monitoring entry to
// docs/seo-geo-monitoring.md. Safe to re-run; it will not duplicate a month
// that already has a heading.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const logPath = path.join(root, "docs", "seo-geo-monitoring.md");

function monthLabel(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function blankEntry(label) {
  return [
    `## ${label}`,
    "",
    "Recorded: <YYYY-MM-DD>",
    "",
    "### SEO (Google Search Console + Bing Webmaster)",
    "",
    "| Metric | Value | Notes |",
    "| --- | --- | --- |",
    "| Valid indexed canonical pages | | of 18 |",
    "| Non-brand queries (top) | | |",
    "| Total impressions | | 28-day |",
    "| Total clicks | | 28-day |",
    "| Crawl / indexing errors | | |",
    "| Sitemap status | | submitted / read date |",
    "| Bing sitemap status | | status / discovered URLs / crawl date |",
    "| IndexNow deployment submission | | workflow date / status |",
    "",
    "### GEO First-Party (Bing AI Performance)",
    "",
    "| Metric | Value | Notes |",
    "| --- | --- | --- |",
    "| Total citations | | |",
    "| Average cited pages | | unique cited URLs per day |",
    "| Cited URLs | | URL and citation count |",
    "| Grounding queries | | sampled retrieval phrases |",
    "| Intents / topics | | preview dimensions |",
    "| Citation share | | observational metric, not a ranking |",
    "| Prior-period comparison | | annotate backfills or reporting changes |",
    "",
    "### GEO English (5 prompts x 3 runs per engine)",
    "",
    "| Engine | Mentioned (n/15) | Cited owned URL (n/15) | Cited URL | Factually correct |",
    "| --- | --- | --- | --- | --- |",
    "| ChatGPT Search | | | | |",
    "| Perplexity | | | | |",
    "| Gemini | | | | |",
    "| Google AI Mode | | | | |",
    "",
    "### GEO Simplified Chinese (5 prompts x 3 runs per engine)",
    "",
    "| Engine | Mentioned (n/15) | Cited owned URL (n/15) | Cited URL | Factually correct |",
    "| --- | --- | --- | --- | --- |",
    "| ChatGPT Search | | | | |",
    "| Perplexity | | | | |",
    "| Gemini | | | | |",
    "| Google AI Mode | | | | |",
    "",
    "### Authority And Distribution",
    "",
    "| Surface | Status | Evidence |",
    "| --- | --- | --- |",
    "| awesome-mac | Merged | https://github.com/jaywcjlove/awesome-mac/pull/2828 |",
    "| Tauri Show and Tell | Published | https://github.com/orgs/tauri-apps/discussions/16004 |",
    "| Codex Show and Tell | Published | https://github.com/openai/codex/discussions/44618 |",
    "| Awesome AI-Driven Development | Pending | https://github.com/eltociear/awesome-AI-driven-development/pull/126 |",
    "| Made with Tauri | Pending | manual review |",
    "| Console.dev | Pending | editorial review |",
    "| Changelog News | Pending | editorial review |",
    "",
    "### Actions For Next Month",
    "",
    "- ",
    "",
    "---",
    ""
  ].join("\n");
}

function main() {
  if (!fs.existsSync(logPath)) {
    process.stderr.write(`Missing ${logPath}\n`);
    process.exitCode = 1;
    return;
  }
  const label = monthLabel(new Date());
  const current = fs.readFileSync(logPath, "utf8");
  if (current.includes(`## ${label}`)) {
    process.stdout.write(`Entry for ${label} already exists; nothing to do.\n`);
    return;
  }
  const next = current.replace(/\s*$/, "\n") + "\n" + blankEntry(label);
  fs.writeFileSync(logPath, next);
  process.stdout.write(`Appended blank monitoring entry for ${label}.\n`);
}

main();
