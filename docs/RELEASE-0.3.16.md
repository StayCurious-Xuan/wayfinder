# Wayfinder 0.3.16 Alpha

> **Withdrawn:** public installers were removed on 2026-09-14. Use
> [Wayfinder 0.3.17](https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.17),
> which keeps the waypoint-title improvements with the corrected public
> collector scope.

Wayfinder is a local-first desktop app that turns AI collaboration into a
visual history of goals, attempts, branches, evidence, and outcomes.

[Website](https://wayfinder-ai.pages.dev) ·
[How it works](https://wayfinder-ai.pages.dev/ai-collaboration-history) ·
[Install guide](https://github.com/StayCurious-Xuan/wayfinder/blob/main/docs/INSTALL.md)

Waypoint names should explain the work, not merely report that work continued.
This patch applies Wayfinder's concrete-title rule consistently across every
current collector.

## Improved

- Codex, Claude Code, and TRAE CN waypoints now avoid generic labels such as
  "optimize current task", "continue current task", "implement current task",
  and "advance Wayfinder".
- When a broad category would produce an empty label, Wayfinder uses the
  specific task named in the prompt.
- TRAE CN continuations still prefer a concrete completed result, changed
  filename, or prior topic when the new prompt contains no useful subject.

## Privacy And Compatibility

- This release does not change stored conversations or require a data
  migration.
- Wayfinder remains local-first, with no account, telemetry, cloud sync, or
  cloud analysis.
- TRAE CN collection remains Early Access and currently validated on macOS.
- Codex and Claude Code collection remains available on macOS and Windows.

## Downloads

- macOS Apple Silicon: `Wayfinder-Alpha-0.3.16-macOS-aarch64.dmg`
- macOS Intel: `Wayfinder-Alpha-0.3.16-macOS-x86_64.dmg`
- Windows x64: `Wayfinder-Alpha-0.3.16-Windows-x86_64.exe`
- Integrity manifest: `SHA256SUMS`

## Verification

- 215 JavaScript and Chromium checks.
- 10 Rust checks, plus native Apple Silicon, Intel macOS, and Windows x64
  release builds.

The macOS builds are ad-hoc signed and are not Apple-notarized. The Windows
build is not code-signed. See the installation guide for first-launch steps.
