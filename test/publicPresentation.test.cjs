const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath));
const listFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });

test("public screenshots use simulated data at 2K or higher", () => {
  const images = [
    "docs/assets/public/wayfinder-social-preview-2k.png",
    "docs/assets/public/wayfinder-voyage-overview-2k.png",
    "docs/assets/public/wayfinder-voyage-branch-2k.png",
    "website/wayfinder-social-preview-2k.png",
    "website/login-voyage-mobile-2k.png"
  ];

  for (const image of images) {
    const png = read(image);
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    assert.ok(png.readUInt32BE(16) >= 2560, image);
    assert.ok(png.readUInt32BE(20) >= 1280, image);
  }
});

test("phone typography uses bundled open-source web fonts", () => {
  for (const font of [
    "website/fonts/wayfinder-sans-400.woff2",
    "website/fonts/wayfinder-sans-700.woff2"
  ]) {
    const data = read(font);
    assert.equal(data.toString("ascii", 0, 4), "wOF2");
    assert.ok(data.length < 100_000, font);
  }

  const license = read("website/fonts/OFL.txt").toString("utf8");
  const styles = read("website/styles.css").toString("utf8");
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(
    styles,
    /@media \(max-width: 540px\)[\s\S]*?body \{[\s\S]*?"Wayfinder Sans"/
  );
});

test("phone product proof labels the three visible waypoints accurately", () => {
  const review = read("docs/mobile-review/index.html").toString("utf8");
  assert.match(review, />3 个航点</);
  assert.doesNotMatch(review, />5 个航点</);
});

test("repository overview uses the public 2K presentation assets", () => {
  const readme = read("README.md").toString("utf8");
  assert.match(readme, /wayfinder-social-preview-2k\.png/);
  assert.match(readme, /wayfinder-voyage-overview-2k\.png/);
  assert.match(readme, /No account\. No telemetry\. No cloud sync\./);
  assert.match(readme, /Wayfinder-Alpha-0\.3\.17-macOS-aarch64\.dmg/);
  assert.match(readme, /Wayfinder-Alpha-0\.3\.17-macOS-x86_64\.dmg/);
  assert.match(readme, /Wayfinder-Alpha-0\.3\.17-Windows-x86_64\.exe/);
  assert.match(readme, /collection cursors, and project maps/);
  assert.doesNotMatch(readme, /collection cursors, and snapshots/);
  assert.doesNotMatch(readme, /wayfinder-product-hunt-map\.png/);
  assert.doesNotMatch(readme, /WBXWHT/);
});

test("website metadata states the product category and current platforms", () => {
  const html = read("website/index.html").toString("utf8");
  assert.match(html, /local-first desktop app that turns AI collaboration/i);
  assert.match(html, /macOS, Windows/);
  assert.match(
    html,
    /Turn the goals, branches, and evidence of AI collaboration/
  );
  assert.match(html, /Use AI as usual; Wayfinder organizes it into a map\./);
  assert.match(html, /rel="canonical" href="https:\/\/wayfinder-ai\.pages\.dev\/"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="og:site_name" content="Wayfinder"/);
  assert.match(html, /property="og:locale" content="en_US"/);
  assert.match(html, /property="og:locale:alternate" content="zh_CN"/);
  assert.match(html, /hreflang="zh-Hans"/);
  assert.match(html, /property="og:image:width" content="2560"/);
  assert.match(html, /property="og:image:alt" content="Wayfinder [^"]+"/);
  assert.match(html, /name="twitter:image:alt" content="Wayfinder [^"]+"/);
  assert.match(html, /"@type": "SoftwareApplication"/);
  assert.match(html, /"@type": "WebSite"/);
  assert.match(html, /"@type": "Organization"/);
  assert.match(html, /"softwareVersion": "0\.3\.17"/);
  assert.match(html, /Wayfinder AI Collaboration History/);
  assert.match(html, /producthunt\.com\/products\/wayfinder-5/);
  assert.match(
    html,
    /github\.com\/jaywcjlove\/awesome-mac\/pull\/2828/
  );
  // Chinese source text feeds independently indexable static pages.
  assert.match(html, /data-zh="把 AI 协作中的目标、分叉与证据/);
  assert.match(html, /data-language-link/);
  assert.match(html, /href="\/zh\/"/);
  assert.equal(
    fs.existsSync(path.join(root, "website", "i18n.js")),
    false
  );
  const chinese = read("website/zh/index.html").toString("utf8");
  assert.match(chinese, /<html lang="zh-CN">/);
  assert.match(chinese, /<h2[^>]*>照常使用 AI，Wayfinder 自动整理成图。<\/h2>/);
  assert.match(
    chinese,
    /rel="canonical" href="https:\/\/wayfinder-ai\.pages\.dev\/zh\/"/
  );
  assert.doesNotMatch(chinese, /\bdata-zh(?:-aria|-alt)?=/);
  assert.match(
    read("website/robots.txt").toString("utf8"),
    /Sitemap: https:\/\/wayfinder-ai\.pages\.dev\/sitemap\.xml/
  );
  assert.match(
    read("website/sitemap.xml").toString("utf8"),
    /https:\/\/wayfinder-ai\.pages\.dev\/privacy/
  );
  assert.doesNotMatch(
    read("website/sitemap.xml").toString("utf8"),
    /\.html/
  );
  assert.match(
    read("website/sitemap.xml").toString("utf8"),
    /<lastmod>2026-09-14<\/lastmod>/
  );
  assert.match(
    read("website/llms.txt").toString("utf8"),
    /^# Wayfinder[\s\S]*?no account, telemetry, cloud sync, or cloud analysis/i
  );
});

test("contribution guide defines durable commit and privacy standards", () => {
  const guide = read("CONTRIBUTING.md").toString("utf8");
  assert.match(guide, /feat\(map\): preserve the selected voyage during refresh/);
  assert.match(guide, /Why:[\s\S]*What:[\s\S]*Verification:/);
  assert.ok(guide.includes("Never commit a real `~/.wayfinder` workspace"));
});

test("public support and release documents are explicit and current", () => {
  const security = read("SECURITY.md").toString("utf8");
  const privacy = read("PRIVACY.md").toString("utf8");
  const privacyPage = read("website/privacy.html").toString("utf8");
  const changelog = read("CHANGELOG.md").toString("utf8");
  const releaseNotes = read("docs/RELEASE-0.3.17.md").toString("utf8");
  const bugTemplate = read(
    ".github/ISSUE_TEMPLATE/bug-report.yml"
  ).toString("utf8");

  assert.match(security, /private vulnerability reporting/);
  assert.ok(security.includes("`~/.wayfinder`"));
  assert.match(security, /\| 0\.3\.17 \| Yes \|/);
  assert.match(privacy, /file-change summaries, and map state/);
  assert.doesNotMatch(privacy, /Snapshot exclusions/);
  assert.doesNotMatch(privacyPage, /代码快照|和快照存储/);
  assert.match(privacyPage, /文件变化摘要和航海图/);
  assert.match(changelog, /## \[0\.3\.14\] - 2026-09-12/);
  assert.match(changelog, /Windows x64 installer/);
  assert.match(releaseNotes, /local-first desktop app/);
  assert.match(releaseNotes, /wayfinder-ai\.pages\.dev\/ai-collaboration-history/);
  assert.match(bugTemplate, /synthetic data/);
});

test("public build excludes the personal TRAE CN collector", () => {
  const publicFiles = [
    "AGENTS.md",
    "README.md",
    "PRIVACY.md",
    "docs/COMPANION.md",
    "docs/INSTALL.md",
    "docs/PRODUCT-HUNT.md",
    "docs/PUBLIC-PRESENTATION.md",
    "docs/PUBLISHING.md",
    "docs/WEBSITE.md",
    "website/llms.txt",
    ...listFiles(path.join(root, "website"))
      .filter((file) => file.endsWith(".html"))
      .map((file) => path.relative(root, file))
  ];
  for (const file of new Set(publicFiles)) {
    assert.doesNotMatch(read(file).toString("utf8"), /TRAE CN/i, file);
  }

  assert.equal(
    fs.existsSync(path.join(root, "src", "traeRuntimeBridge.ts")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(root, "src", "traeSessionCollector.ts")),
    false
  );
  assert.doesNotMatch(
    read("src/sessionCollector.ts").toString("utf8"),
    /discoverTraeSnapshotSources|trae-code/
  );
  assert.doesNotMatch(
    read("companion/src-tauri/src/main.rs").toString("utf8"),
    /TRAE_APP_ROOT|TRAE SOLO CN|workspaceStorage/
  );

  const packageJson = JSON.parse(read("package.json").toString("utf8"));
  assert.equal(packageJson.dependencies.diff, undefined);
  assert.equal(packageJson.dependencies["isomorphic-git"], undefined);
});

test("SEO and GEO monitoring covers both public languages", () => {
  const method = read("docs/SEO-GEO.md").toString("utf8");
  const log = read("docs/seo-geo-monitoring.md").toString("utf8");
  const generator = read("scripts/new-monitoring-entry.cjs").toString("utf8");

  for (const content of [method, log]) {
    assert.match(
      content,
      /What tools visualize the history of AI-assisted project work\?/
    );
    assert.match(content, /哪些工具可以可视化 AI 辅助项目的工作历史？/);
  }
  assert.match(generator, /GEO English/);
  assert.match(generator, /GEO Simplified Chinese/);
  assert.match(log, /### Authority And Distribution/);
  assert.match(
    generator,
    /awesome-AI-driven-development\/pull\/126/
  );
});

test("collector pages cite first-party session documentation", () => {
  const codex = read("website/integrations/codex.html").toString("utf8");
  const claude = read(
    "website/integrations/claude-code.html"
  ).toString("utf8");

  assert.match(
    codex,
    /https:\/\/developers\.openai\.com\/codex\/cli\/features\//
  );
  assert.match(
    claude,
    /https:\/\/code\.claude\.com\/docs\/en\/sessions/
  );
});
