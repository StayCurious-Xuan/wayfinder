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
    "| Valid indexed canonical pages | | of 6 |",
    "| Non-brand queries (top) | | |",
    "| Total impressions | | 28-day |",
    "| Total clicks | | 28-day |",
    "| Crawl / indexing errors | | |",
    "| Sitemap status | | submitted / read date |",
    "",
    "### GEO (5 prompts x 3 runs per engine)",
    "",
    "| Engine | Mentioned (n/3) | Cited owned URL (n/3) | Cited URL | Factually correct |",
    "| --- | --- | --- | --- | --- |",
    "| ChatGPT Search | | | | |",
    "| Perplexity | | | | |",
    "| Gemini | | | | |",
    "| Google AI Mode | | | | |",
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

