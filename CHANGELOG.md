# Changelog

Notable public changes to Wayfinder are recorded here. Release notes describe
user-visible behavior; implementation detail remains in the linked commits.

## [0.3.17] - 2026-09-14

### Removed

- Removed TRAE CN collection from public builds. The public desktop app now
  collects Codex and Claude Code history only.

### Added

- Added canonical AI collaboration history, Codex, and Claude Code pages with
  structured data, `llms.txt`, sitemap coverage, and a real 404 response.
- Added CI checks for public metadata, internal links, Search Console
  verification files, and soft-404 behavior.

### Verification

- 223 JavaScript and Chromium checks.
- 10 Rust checks and clean dependency installation.

## [0.3.16] - 2026-09-13

### Fixed

- Applied the concrete waypoint-title rule to Codex and Claude history as well
  as TRAE CN.
- Used the specific prompt text when a generic domain fallback would otherwise
  produce labels such as "fix current task" or "advance Wayfinder".

### Verification

- 215 JavaScript and Chromium checks.
- 10 Rust checks and native Apple Silicon, Intel macOS, and Windows x64 release
  builds.

## [0.3.15] - 2026-09-13

### Added

- Added Early Access collection for TRAE CN sessions on macOS.
- Paired complete TRAE prompts and replies with verifiable local snapshot
  changes by stable turn identity.

### Changed

- Kept each native TRAE conversation in one voyage while preserving
  evidence-backed branches inside it.
- Replaced empty waypoint names such as "continue current task" with concise
  titles derived from the actual goal, result, or changed file.

### Privacy

- Reads TRAE messages through its loopback-only local session service while
  the app is running.
- Stores normalized TRAE replay data only under
  `~/.wayfinder/trae-runtime/`; no Wayfinder cloud service receives it.

### Verification

- 215 JavaScript and Chromium checks.
- 10 Rust checks, plus packaged macOS validation.

## [0.3.14] - 2026-09-12

### Changed

- Removed the system Git requirement from the desktop collection path.
- Skipped content hashing for unchanged transcript files while retaining
  replacement, truncation, archive, and Cowork sidecar detection.
- Kept the currently displayed project selected until a requested project
  finishes loading.

### Fixed

- Rejected textual nonzero tool exit codes before recording file-change facts.
- Recovered interrupted Hook configuration updates on the next install attempt.
- Cleared stale empty-state summaries and handled failed background refreshes.
- Made release ordering and Chromium UI checks fail closed in CI.

### Verification

- 210 JavaScript and Chromium checks.
- 10 Rust checks, plus Clippy and dependency audits.
- Packaged no-Git collection smoke test and three-platform release builds.

## [0.3.13] - 2026-09-12

### Added

- Restored compatible local Codex and Claude history that predates Wayfinder.
- Added automatic collection from archived Codex rollouts and Claude Cowork
  audit logs on macOS and Windows.
- Preserved sessions without a project folder in one local
  general-collaboration map.

### Changed

- Extended the desktop filesystem watcher to every supported local history
  location while keeping subsequent scans incremental.
- Deduplicated Codex turns when a transcript moves between active and archived
  storage.

### Verification

- 202 JavaScript and Chromium checks.
- 10 Rust checks, plus Clippy and dependency audits.
- Apple Silicon, Intel macOS, and Windows x64 release builds.

## [0.3.12] - 2026-09-12

### Fixed

- Connected installed host hooks to the bundled CLI and preserved existing
  host configuration if an atomic publish fails.
- Kept repeated turns, rotated transcripts, structured tool failures, and
  Hook/collector races truthful without duplicate or phantom file facts.
- Preserved case-only renames on macOS and Windows file systems.
- Kept final successful outcomes out of failure analysis while retaining
  conclusive validation failures.
- Restored macOS 12 WebKit compatibility, keyboard focus, narrow-window
  actions, search framing, and stale project-request handling.
- Required successful CI, verified checksums, latest-main release refs, and an
  installed Windows x64 sidecar before public deployment.

### Verification

- 186 JavaScript and Chromium checks.
- 9 Rust checks, plus Clippy, npm audit, and cargo audit.
- Apple Silicon, Intel macOS, and Windows x64 release gates.

## [0.3.11] - 2026-09-12

### Fixed

- Preserved Codex commentary and subsequent tool evidence in one turn.
- Hardened cross-platform path, rename, lock, process-tree, and state writes.
- Made voyage grouping deterministic and bounded for long project histories.
- Prevented stale project reads and short-window layout changes from replacing
  the current map or viewport.

### Verification

- 160 JavaScript and Chromium checks.
- 9 Rust checks, plus Clippy, npm audit, and cargo audit.
- Apple Silicon, Intel macOS, and Windows x64 release builds.

## [0.3.10] - 2026-09-11

### Added

- Windows x64 installer alongside Apple Silicon and Intel macOS builds.
- Responsive waypoint inspector that stays outside the selected route.
- Project-level voyage layout with clearer spacing between independent paths.

### Changed

- Waypoint details now follow the selected route color and scroll as one panel.
- Opening and closing details preserves the map viewport and selected waypoint.
- Public website and release materials now present all supported platforms
  equally.

### Fixed

- Prevented background refreshes and stale gesture queues from resetting or
  blocking map navigation.
- Restored imported Skill titles, summaries, source files, and line counts.

### Verification

- 105 JavaScript and Chromium checks.
- 6 Rust checks.
- Desktop, 320px portrait, and short-screen landscape visual checks.
- Published installers verified against `SHA256SUMS`.

[0.3.10]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.10
[0.3.11]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.11
[0.3.12]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.12
[0.3.13]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.13
[0.3.16]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.16
[0.3.15]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.15
[0.3.14]: https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.14
