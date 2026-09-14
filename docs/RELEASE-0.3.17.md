# Wayfinder 0.3.17 Alpha

Wayfinder is a local-first desktop app that turns AI collaboration into a
visual history of goals, attempts, branches, evidence, and outcomes.

[Website](https://wayfinder-ai.pages.dev) ·
[How it works](https://wayfinder-ai.pages.dev/ai-collaboration-history) ·
[Install guide](https://github.com/StayCurious-Xuan/wayfinder/blob/main/docs/INSTALL.md)

This release corrects the public collector boundary while preserving the
mobile website redesign and the concrete waypoint-title improvements from
0.3.15 and 0.3.16.

## Public Collector Scope

- Public desktop builds collect Codex and Claude Code history.
- TRAE CN runtime and snapshot collection is removed from public builds.
- Existing local project data is not deleted or migrated by this update.

## Website Discovery

- Adds canonical pages for AI collaboration history, Codex, Claude Code, and
  the local-data boundary.
- Adds connected `WebSite`, `Organization`, `SoftwareApplication`, `WebPage`,
  and visible FAQ structured data.
- Adds `llms.txt`, a complete sitemap, clean canonical URLs, and a real
  Cloudflare 404 response.
- Adds zero-dependency CI checks for metadata, structured data, internal links,
  sitemap coverage, Search Console verification files, and soft-404 behavior.

## Downloads

- macOS Apple Silicon: `Wayfinder-Alpha-0.3.17-macOS-aarch64.dmg`
- macOS Intel: `Wayfinder-Alpha-0.3.17-macOS-x86_64.dmg`
- Windows x64: `Wayfinder-Alpha-0.3.17-Windows-x86_64.exe`
- Integrity manifest: `SHA256SUMS`

## Verification

- 223 JavaScript and Chromium checks.
- 10 Rust checks.
- Clean npm install with zero reported vulnerabilities.
- Native Apple Silicon, Intel macOS, and Windows x64 release builds.

The macOS builds are ad-hoc signed and are not Apple-notarized. The Windows
build is not code-signed. See the installation guide for first-launch steps.
