# Wayfinder 0.3.15 Alpha

> **Withdrawn:** public installers were removed on 2026-09-14. Use
> [Wayfinder 0.3.17](https://github.com/StayCurious-Xuan/wayfinder/releases/tag/alpha-v0.3.17),
> which preserves the unrelated improvements with the corrected public
> collector scope.

Wayfinder can now keep TRAE CN conversations beside Codex and Claude Code
history in the same local project map. This release also replaces vague
waypoint names with short descriptions of the actual goal or result.

## New

- Collects completed TRAE CN conversations automatically while Wayfinder and
  TRAE CN are running.
- Backfills available TRAE CN history and pairs each message with verifiable
  local snapshot changes using its stable turn identity.
- Keeps each native TRAE conversation in one voyage, with branches reserved
  for evidence-backed changes in direction.

## Improved

- Waypoint titles now name the concrete task or outcome. Empty labels such as
  "optimize current task", "continue current task", and "implement current
  task" are rejected.
- A continuation with no useful prompt inherits the prior concrete topic or
  uses the completed result or changed filename.
- TRAE history no longer produces a fan of unrelated root branches.

## Privacy And Compatibility

- TRAE CN collection is Early Access and currently validated on macOS.
- Wayfinder reads TRAE messages through the running app's loopback-only local
  session service and watches its local workspace and snapshot data.
- Normalized replay data stays under `~/.wayfinder/trae-runtime/`.
- Wayfinder does not modify TRAE's conversation database or send transcripts
  to a Wayfinder cloud service.
- Codex and Claude Code collection remains available on macOS and Windows.

## Downloads

- macOS Apple Silicon: `Wayfinder-Alpha-0.3.15-macOS-aarch64.dmg`
- macOS Intel: `Wayfinder-Alpha-0.3.15-macOS-x86_64.dmg`
- Windows x64: `Wayfinder-Alpha-0.3.15-Windows-x86_64.exe`
- Integrity manifest: `SHA256SUMS`

## Verification

- 215 JavaScript and Chromium checks.
- 10 Rust checks, plus Clippy and dependency audits.
- Native Apple Silicon, Intel macOS, and Windows x64 release builds.

The macOS builds are ad-hoc signed and are not Apple-notarized. The Windows
build is not code-signed. See the installation guide for first-launch steps.
