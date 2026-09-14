#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const parse5 = require("parse5");

const DEFAULT_BASE_URL = "https://wayfinder-ai.pages.dev";
const DEFAULT_LIVE_ATTEMPTS = 12;
const DEFAULT_LIVE_INTERVAL_MS = 3_000;
const root = path.resolve(__dirname, "..");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function listFiles(directory, suffix) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(entryPath, suffix);
      }
      return entry.name.endsWith(suffix) ? [entryPath] : [];
    });
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/g)]
      .map((match) => [match[1].toLowerCase(), match[2]])
  );
}

function elements(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))]
    .map((match) => ({
      tag: match[0],
      attributes: attributes(match[0])
    }));
}

function metaContent(html, key, value) {
  const match = elements(html, "meta").find(
    (element) => element.attributes[key] === value
  );
  return match?.attributes.content;
}

function canonicalHref(html) {
  return elements(html, "link").find(
    (element) => element.attributes.rel === "canonical"
  )?.attributes.href;
}

function alternateHrefs(html) {
  return new Map(
    elements(html, "link")
      .filter((element) => element.attributes.rel === "alternate")
      .map((element) => [
        element.attributes.hreflang,
        element.attributes.href
      ])
  );
}

function titleText(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
}

function nodeAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

function nodeText(node) {
  if (node.nodeName === "#text") return node.value;
  return (node.childNodes || []).map(nodeText).join("");
}

function findNodes(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  for (const child of node.childNodes || []) {
    findNodes(child, predicate, matches);
  }
  return matches;
}

function visibleBreadcrumb(html, pageUrl) {
  const document = parse5.parse(html);
  const trails = findNodes(document, (node) =>
    node.tagName === "nav" &&
    (nodeAttribute(node, "class") || "").split(/\s+/)
      .includes("document-breadcrumb")
  );
  return trails.map((trail) => ({
    ariaLabel: nodeAttribute(trail, "aria-label"),
    items: (trail.childNodes || [])
      .filter((node) =>
        (node.tagName === "a" || node.tagName === "span") &&
        nodeAttribute(node, "aria-hidden") !== "true"
      )
      .map((node) => ({
        name: nodeText(node).trim(),
        item: node.tagName === "a"
          ? new URL(nodeAttribute(node, "href"), pageUrl).href
          : null,
        current: nodeAttribute(node, "aria-current")
      }))
  }));
}

function assertValidHtml(html, relativeFile) {
  const errors = [];
  parse5.parse(html, {
    onParseError: (error) => {
      errors.push(`${error.code}@${error.startLine}:${error.startCol}`);
    }
  });
  assert.equal(
    errors.length,
    0,
    `${relativeFile} contains malformed HTML: ${errors.join(", ")}`
  );
  for (const tagName of ["html", "head", "body", "main"]) {
    const opening = (html.match(new RegExp(`<${tagName}\\b`, "gi")) || [])
      .length;
    const closing = (
      html.match(new RegExp(`</${tagName}>`, "gi")) || []
    ).length;
    assert.equal(
      opening,
      1,
      `${relativeFile} must contain exactly one <${tagName}>`
    );
    assert.equal(
      closing,
      1,
      `${relativeFile} must contain exactly one </${tagName}>`
    );
  }
}

function jsonLdDocuments(html, filename) {
  return [...html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )].map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${filename} contains invalid JSON-LD: ${error.message}`);
    }
  });
}

function jsonLdNodes(documents) {
  return documents.flatMap((document) =>
    Array.isArray(document["@graph"]) ? document["@graph"] : [document]
  );
}

const breadcrumbTrails = new Map([
  ["/ai-collaboration-history", [
    ["/", "Home", "首页"],
    ["/ai-collaboration-history", "AI collaboration history", "AI 协作历史"]
  ]],
  ["/compare", [
    ["/", "Home", "首页"],
    ["/compare", "Compare", "回看方式对比"]
  ]],
  ["/getting-started", [
    ["/", "Home", "首页"],
    ["/getting-started", "Get started", "开始使用"]
  ]],
  ["/integrations", [
    ["/", "Home", "首页"],
    ["/integrations", "Integrations", "集成"]
  ]],
  ["/integrations/claude-code", [
    ["/", "Home", "首页"],
    ["/integrations", "Integrations", "集成"],
    ["/integrations/claude-code", "Claude Code", "Claude Code"]
  ]],
  ["/integrations/codex", [
    ["/", "Home", "首页"],
    ["/integrations", "Integrations", "集成"],
    ["/integrations/codex", "Codex", "Codex"]
  ]],
  ["/privacy", [
    ["/", "Home", "首页"],
    ["/privacy", "Data boundary", "数据边界"]
  ]],
  ["/updates", [
    ["/", "Home", "首页"],
    ["/updates", "Updates", "更新"]
  ]]
]);

function expectedBreadcrumbTrail(pathname) {
  const isChinese = pathname.startsWith("/zh/");
  const englishPath = isChinese ? pathname.slice(3) || "/" : pathname;
  const trail = breadcrumbTrails.get(englishPath) || [];
  return trail.map(([itemPath, englishName, chineseName]) => ({
    path: isChinese
      ? itemPath === "/" ? "/zh/" : `/zh${itemPath}`
      : itemPath,
    name: isChinese ? chineseName : englishName
  }));
}

function normalizePathSeparators(value) {
  return value.replaceAll("\\", "/");
}

function canonicalPath(relativeFile) {
  const normalized = normalizePathSeparators(relativeFile);
  if (normalized === "index.html") {
    return "/";
  }
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"/index.html".length)}/`;
  }
  return `/${normalized.replace(/\.html$/, "")}`;
}

function fileForPublicPath(websiteDir, pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded === "/") {
    return path.join(websiteDir, "index.html");
  }
  const relative = decoded.replace(/^\/+/, "");
  const direct = path.join(websiteDir, relative);
  const candidates = [
    direct,
    `${direct}.html`,
    path.join(direct, "index.html")
  ];
  return candidates.find((candidate) =>
    fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  );
}

function internalReferences(html, pageUrl) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)]
    .map((match) => match[1])
    .filter((reference) =>
      reference &&
      !reference.startsWith("data:") &&
      !reference.startsWith("mailto:")
    )
    .map((reference) => new URL(reference, pageUrl))
    .filter((url) => url.origin === new URL(DEFAULT_BASE_URL).origin);
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim());
}

function sitemapRecords(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const location = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const alternates = new Map(
      [...block.matchAll(/<xhtml:link\b[^>]*>/g)]
        .map((link) => attributes(link[0]))
        .map((link) => [link.hreflang, link.href])
    );
    return { location, alternates };
  });
}

function isGoogleVerificationFile(file) {
  return /^google[a-z0-9_-]+\.html$/i.test(path.basename(file));
}

function indexNowKeyFile(websiteDir) {
  const files = fs.readdirSync(websiteDir)
    .filter((file) => /^[a-f0-9]{32,128}\.txt$/i.test(file));
  assert.equal(files.length, 1, "website must contain one IndexNow key file");
  const filename = files[0];
  assert.equal(
    fs.readFileSync(path.join(websiteDir, filename), "utf8").trim(),
    path.basename(filename, ".txt"),
    "IndexNow key file content must match its filename"
  );
  return filename;
}

function verifyStaticWebsite({
  websiteDir = path.join(root, "website"),
  baseUrl = DEFAULT_BASE_URL
} = {}) {
  const htmlFiles = listFiles(websiteDir, ".html");
  const missingPage = path.join(websiteDir, "404.html");
  assert.ok(fs.existsSync(missingPage), "website/404.html is required");
  indexNowKeyFile(websiteDir);

  const verificationFiles = htmlFiles.filter(isGoogleVerificationFile);
  for (const file of verificationFiles) {
    const filename = path.basename(file);
    assert.equal(
      fs.readFileSync(file, "utf8").trim(),
      `google-site-verification: ${filename}`,
      `${filename} is not a valid Google verification file`
    );
  }

  const indexableFiles = htmlFiles.filter(
    (file) => file !== missingPage && !isGoogleVerificationFile(file)
  );
  const canonicalUrls = new Set();
  const titles = new Set();
  const descriptions = new Set();
  const pageRecords = [];

  for (const file of indexableFiles) {
    const relativeFile = normalizePathSeparators(
      path.relative(websiteDir, file)
    );
    const expectedUrl = new URL(canonicalPath(relativeFile), `${baseUrl}/`).href;
    const isChinese = relativeFile.split("/")[0] === "zh";
    const englishRelativeFile = isChinese
      ? relativeFile.split("/").slice(1).join("/")
      : relativeFile;
    const chineseRelativeFile = isChinese
      ? relativeFile
      : `zh/${relativeFile}`;
    const englishUrl = new URL(
      canonicalPath(englishRelativeFile),
      `${baseUrl}/`
    ).href;
    const chineseUrl = new URL(
      canonicalPath(chineseRelativeFile),
      `${baseUrl}/`
    ).href;
    const html = fs.readFileSync(file, "utf8");
    assertValidHtml(html, relativeFile);
    const title = titleText(html);
    const description = metaContent(html, "name", "description");
    const canonical = canonicalHref(html);
    const alternates = alternateHrefs(html);
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    const robots = metaContent(html, "name", "robots") || "";
    const jsonLd = jsonLdDocuments(html, relativeFile);
    const htmlLanguage = html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1];
    const ids = [...html.matchAll(/\bid="([^"]+)"/gi)]
      .map((match) => match[1]);

    assert.ok(title, `${relativeFile} is missing a title`);
    assert.ok(description, `${relativeFile} is missing a meta description`);
    const titleLength = [...title].length;
    const descriptionLength = [...description].length;
    if (isChinese) {
      assert.ok(
        titleLength >= 8 && titleLength <= 50,
        `${relativeFile} title length must be between 8 and 50 characters`
      );
      assert.ok(
        descriptionLength >= 30 && descriptionLength <= 120,
        `${relativeFile} description length must be between 30 and 120 characters`
      );
    } else {
      assert.ok(
        titleLength >= 20 && titleLength <= 70,
        `${relativeFile} title length must be between 20 and 70 characters`
      );
      assert.ok(
        descriptionLength >= 90 && descriptionLength <= 170,
        `${relativeFile} description length must be between 90 and 170 characters`
      );
    }
    assert.equal(canonical, expectedUrl, `${relativeFile} canonical is stale`);
    assert.equal(
      htmlLanguage,
      isChinese ? "zh-CN" : "en",
      `${relativeFile} has the wrong html language`
    );
    assert.equal(
      alternates.size,
      3,
      `${relativeFile} must declare en, zh-Hans, and x-default alternates`
    );
    assert.equal(
      alternates.get("en"),
      englishUrl,
      `${relativeFile} has the wrong English alternate`
    );
    assert.equal(
      alternates.get("zh-Hans"),
      chineseUrl,
      `${relativeFile} has the wrong Chinese alternate`
    );
    assert.equal(
      alternates.get("x-default"),
      englishUrl,
      `${relativeFile} has the wrong x-default alternate`
    );
    assert.equal(h1Count, 1, `${relativeFile} must contain exactly one H1`);
    assert.doesNotMatch(robots, /noindex/i, `${relativeFile} must be indexable`);
    assert.ok(jsonLd.length > 0, `${relativeFile} is missing JSON-LD`);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${relativeFile} contains duplicate element IDs`
    );
    assert.ok(!titles.has(title), `${relativeFile} reuses the title "${title}"`);
    assert.ok(
      !descriptions.has(description),
      `${relativeFile} reuses a meta description`
    );

    titles.add(title);
    descriptions.add(description);
    canonicalUrls.add(expectedUrl);
    const structuredNodes = jsonLdNodes(jsonLd);
    const structuredPages = structuredNodes.filter(
      (node) => node["@type"] === "WebPage" || node["@type"] === "WebSite"
    );
    assert.ok(
      structuredPages.length > 0,
      `${relativeFile} JSON-LD needs a WebPage or WebSite`
    );
    for (const node of structuredPages) {
      assert.equal(
        node.inLanguage,
        isChinese ? "zh-CN" : "en",
        `${relativeFile} JSON-LD has the wrong language`
      );
    }
    const expectedBreadcrumbs = expectedBreadcrumbTrail(
      new URL(expectedUrl).pathname
    );
    const breadcrumbs = structuredNodes.filter(
      (node) => node["@type"] === "BreadcrumbList"
    );
    const visibleBreadcrumbs = visibleBreadcrumb(html, expectedUrl);
    if (expectedBreadcrumbs.length === 0) {
      assert.equal(
        breadcrumbs.length,
        0,
        `${relativeFile} must not declare a breadcrumb trail`
      );
      assert.equal(
        visibleBreadcrumbs.length,
        0,
        `${relativeFile} must not render a breadcrumb trail`
      );
    } else {
      assert.equal(
        breadcrumbs.length,
        1,
        `${relativeFile} must declare one breadcrumb trail`
      );
      const breadcrumb = breadcrumbs[0];
      assert.equal(
        breadcrumb["@id"],
        `${expectedUrl}#breadcrumb`,
        `${relativeFile} breadcrumb ID is stale`
      );
      const webPage = structuredNodes.find(
        (node) => node["@type"] === "WebPage"
      );
      assert.equal(
        webPage?.breadcrumb?.["@id"],
        breadcrumb["@id"],
        `${relativeFile} WebPage does not reference its breadcrumb`
      );
      assert.deepEqual(
        breadcrumb.itemListElement?.map((item) => ({
          type: item["@type"],
          position: item.position,
          name: item.name,
          item: new URL(item.item).href
        })),
        expectedBreadcrumbs.map((item, index) => ({
          type: "ListItem",
          position: index + 1,
          name: item.name,
          item: new URL(item.path, `${baseUrl}/`).href
        })),
        `${relativeFile} breadcrumb trail is stale`
      );
      assert.equal(
        visibleBreadcrumbs.length,
        1,
        `${relativeFile} must render one breadcrumb trail`
      );
      assert.equal(
        visibleBreadcrumbs[0].ariaLabel,
        isChinese ? "面包屑" : "Breadcrumb",
        `${relativeFile} breadcrumb label is stale`
      );
      assert.deepEqual(
        visibleBreadcrumbs[0].items,
        expectedBreadcrumbs.map((item, index) => ({
          name: item.name,
          item: index === expectedBreadcrumbs.length - 1
            ? null
            : new URL(item.path, `${baseUrl}/`).href,
          current: index === expectedBreadcrumbs.length - 1
            ? "page"
            : undefined
        })),
        `${relativeFile} visible breadcrumb trail is stale`
      );
    }

    const languageLinks = elements(html, "a").filter((element) =>
      (element.attributes.class || "").split(/\s+/).includes("lang-toggle")
    );
    assert.equal(
      languageLinks.length,
      1,
      `${relativeFile} must contain one language switch link`
    );
    const languageLink = languageLinks[0].attributes;
    assert.equal(
      new URL(languageLink.href, expectedUrl).href,
      isChinese ? englishUrl : chineseUrl,
      `${relativeFile} language switch points to the wrong page`
    );
    assert.equal(
      languageLink.hreflang,
      isChinese ? "en" : "zh-Hans",
      `${relativeFile} language switch has the wrong hreflang`
    );
    assert.doesNotMatch(
      html,
      /(?:src="[^"]*i18n\.js|data-lang-toggle)/i,
      `${relativeFile} must use static language URLs`
    );
    if (isChinese) {
      assert.match(
        html,
        /Generated by scripts\/generate-website-locales\.cjs/,
        `${relativeFile} is not a generated locale page`
      );
      assert.doesNotMatch(
        html,
        /\bdata-zh(?:-aria|-alt)?=/,
        `${relativeFile} contains untranslated source attributes`
      );
    }

    pageRecords.push({
      relativeFile,
      expectedUrl,
      englishUrl,
      chineseUrl,
      html,
      jsonLd
    });
  }

  const missingHtml = fs.readFileSync(missingPage, "utf8");
  assertValidHtml(missingHtml, "404.html");
  assert.match(
    metaContent(missingHtml, "name", "robots") || "",
    /noindex/i,
    "404.html must be noindex"
  );
  assert.equal(canonicalHref(missingHtml), undefined);
  assert.equal((missingHtml.match(/<h1\b/gi) || []).length, 1);

  for (const page of pageRecords) {
    for (const reference of internalReferences(page.html, page.expectedUrl)) {
      const referencedFile = fileForPublicPath(websiteDir, reference.pathname);
      assert.ok(
        referencedFile,
        `${page.relativeFile} links to missing ${reference.pathname}`
      );
      if (reference.pathname.endsWith(".html")) {
        assert.fail(
          `${page.relativeFile} uses redirecting .html URL ${reference.pathname}`
        );
      }
      if (reference.hash && referencedFile.endsWith(".html")) {
        const targetHtml = fs.readFileSync(referencedFile, "utf8");
        const targetIds = new Set(
          [...targetHtml.matchAll(/\bid="([^"]+)"/gi)]
            .map((match) => match[1])
        );
        const fragment = decodeURIComponent(reference.hash.slice(1));
        assert.ok(
          targetIds.has(fragment),
          `${page.relativeFile} links to missing fragment ${reference.hash}`
        );
      }
    }
  }

  const sitemapFile = path.join(websiteDir, "sitemap.xml");
  const sitemap = fs.readFileSync(sitemapFile, "utf8");
  const locations = sitemapLocations(sitemap);
  const sitemapPages = sitemapRecords(sitemap);
  assert.match(
    sitemap,
    /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/,
    "sitemap must declare the XHTML namespace for hreflang"
  );
  assert.equal(new Set(locations).size, locations.length);
  assert.deepEqual(
    new Set(locations),
    canonicalUrls,
    "sitemap URLs must exactly match indexable canonical pages"
  );
  assert.ok(
    locations.every((location) => !location.endsWith(".html")),
    "sitemap must use clean canonical URLs"
  );
  assert.equal(sitemapPages.length, pageRecords.length);
  const sitemapByUrl = new Map(
    sitemapPages.map((record) => [record.location, record])
  );
  for (const page of pageRecords) {
    const record = sitemapByUrl.get(page.expectedUrl);
    assert.ok(record, `${page.relativeFile} is missing from sitemap`);
    assert.deepEqual(
      record.alternates,
      new Map([
        ["en", page.englishUrl],
        ["zh-Hans", page.chineseUrl],
        ["x-default", page.englishUrl]
      ]),
      `${page.relativeFile} sitemap alternates are stale`
    );
  }

  const robots = fs.readFileSync(path.join(websiteDir, "robots.txt"), "utf8");
  assert.match(
    robots,
    new RegExp(`Sitemap: ${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml`)
  );

  const llms = fs.readFileSync(path.join(websiteDir, "llms.txt"), "utf8")
    .replace(/\r\n?/g, "\n");
  assert.match(llms, /^# Wayfinder\n\n> /);
  assert.doesNotMatch(llms, /<html/i);
  const llmsWebsiteLinks = [...llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)]
    .map((match) => match[1])
    .filter((url) => new URL(url).origin === new URL(baseUrl).origin);
  assert.equal(llmsWebsiteLinks.length, canonicalUrls.size);
  assert.deepEqual(
    new Set(llmsWebsiteLinks),
    canonicalUrls,
    "llms.txt must link to every canonical page exactly once"
  );
  for (const url of llmsWebsiteLinks) {
    assert.ok(canonicalUrls.has(url), `llms.txt links to non-canonical ${url}`);
  }

  const homes = pageRecords.filter(
    (page) =>
      page.relativeFile === "index.html" ||
      page.relativeFile === "zh/index.html"
  );
  assert.equal(homes.length, 2, "English and Chinese home pages are required");
  for (const home of homes) {
    const homeNodes = jsonLdNodes(home.jsonLd);
    for (const type of ["WebSite", "Organization", "SoftwareApplication"]) {
      assert.ok(
        homeNodes.some((node) => node["@type"] === type),
        `${home.relativeFile} JSON-LD is missing ${type}`
      );
    }
  }
  const home = homes.find((page) => page.relativeFile === "index.html");
  const homeNodes = jsonLdNodes(home.jsonLd);

  const release = JSON.parse(
    fs.readFileSync(path.join(websiteDir, "releases.json"), "utf8")
  );
  const application = homeNodes.find(
    (node) => node["@type"] === "SoftwareApplication"
  );
  assert.equal(application.softwareVersion, release.version);
  assert.ok(application.downloadUrl.includes(release.version));
  assert.ok(
    application.sameAs.includes(
      "https://github.com/StayCurious-Xuan/wayfinder"
    )
  );
  assert.ok(
    application.sameAs.includes(
      "https://www.producthunt.com/products/wayfinder-5?launch=wayfinder-6"
    )
  );
  assert.equal(
    application.subjectOf?.url,
    "https://github.com/jaywcjlove/awesome-mac/pull/2828"
  );
  const historyPage = pageRecords.find(
    (page) => page.relativeFile === "ai-collaboration-history.html"
  );
  assert.ok(
    historyPage.html.includes(application.subjectOf.url),
    "AI collaboration history must show the independent directory evidence"
  );
  const gettingStarted = pageRecords.find(
    (page) => page.relativeFile === "getting-started.html"
  );
  assert.ok(gettingStarted, "website/getting-started.html is required");
  for (const download of Object.values(release.downloads)) {
    assert.ok(
      gettingStarted.html.includes(download),
      `getting-started.html is missing current download ${download}`
    );
  }
  const updates = pageRecords.find(
    (page) => page.relativeFile === "updates.html"
  );
  assert.ok(updates, "website/updates.html is required");
  assert.match(
    updates.html,
    new RegExp(`\\b${release.version.replaceAll(".", "\\.")}\\b`),
    "updates.html is missing the current release version"
  );
  for (const [relativeFile, citation] of [
    [
      "integrations/codex.html",
      "https://developers.openai.com/codex/cli/features/"
    ],
    [
      "integrations/claude-code.html",
      "https://code.claude.com/docs/en/sessions"
    ]
  ]) {
    const page = pageRecords.find(
      (record) => record.relativeFile === relativeFile
    );
    const webPage = jsonLdNodes(page.jsonLd).find(
      (node) => node["@type"] === "WebPage"
    );
    assert.equal(
      webPage.citation,
      citation,
      `${relativeFile} JSON-LD citation is stale`
    );
    assert.ok(
      page.html.includes(citation),
      `${relativeFile} must visibly link its primary source`
    );
  }

  const pagesByUrl = new Map(
    pageRecords.map((page) => [page.expectedUrl, page])
  );
  const reachable = new Set([home.expectedUrl]);
  const queue = [home.expectedUrl];
  while (queue.length > 0) {
    const currentUrl = queue.shift();
    const page = pagesByUrl.get(currentUrl);
    for (const reference of internalReferences(page.html, page.expectedUrl)) {
      if (
        canonicalUrls.has(reference.href) &&
        !reachable.has(reference.href)
      ) {
        reachable.add(reference.href);
        queue.push(reference.href);
      }
    }
  }
  assert.deepEqual(
    reachable,
    canonicalUrls,
    "every canonical page must be reachable from the home page"
  );

  return {
    pages: indexableFiles.length,
    sitemapEntries: locations.length,
    llmsLinks: llmsWebsiteLinks.length
  };
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  return fetchImpl(url, {
    cache: "no-store",
    headers: { "user-agent": "Wayfinder-Discovery-Check/1.0" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs)
  });
}

async function fetchEventually({
  fetchImpl,
  url,
  timeoutMs,
  attempts,
  intervalMs,
  sleep
}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchWithTimeout(fetchImpl, url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(intervalMs);
      }
    }
  }
  throw lastError;
}

async function verifyLiveWebsite({
  baseUrl = DEFAULT_BASE_URL,
  websiteDir = path.join(root, "website"),
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  attempts = DEFAULT_LIVE_ATTEMPTS,
  intervalMs = DEFAULT_LIVE_INTERVAL_MS,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  const staticResult = verifyStaticWebsite({ websiteDir });
  const sitemap = fs.readFileSync(path.join(websiteDir, "sitemap.xml"), "utf8");
  const locations = sitemapLocations(sitemap);
  const indexNowFile = indexNowKeyFile(websiteDir);

  for (const location of locations) {
    const publicUrl = new URL(location);
    const requestUrl = new URL(publicUrl.pathname, `${baseUrl}/`);
    const response = await fetchEventually({
      fetchImpl,
      url: requestUrl,
      timeoutMs,
      attempts,
      intervalMs,
      sleep
    });
    assert.equal(
      response.status,
      200,
      `${requestUrl.href} returned ${response.status}`
    );
    assert.match(
      response.headers.get("content-type") || "",
      /text\/html/i,
      `${requestUrl.href} is not HTML`
    );
    const html = await response.text();
    assert.equal(
      canonicalHref(html),
      publicUrl.href,
      `${requestUrl.href} canonical mismatch`
    );
  }

  for (const [pathname, contentType] of [
    ["/robots.txt", /text\/plain/i],
    ["/sitemap.xml", /(?:application|text)\/xml/i],
    ["/llms.txt", /text\/plain/i],
    [`/${indexNowFile}`, /text\/plain/i]
  ]) {
    const url = new URL(pathname, `${baseUrl}/`);
    const response = await fetchEventually({
      fetchImpl,
      url,
      timeoutMs,
      attempts,
      intervalMs,
      sleep
    });
    assert.equal(response.status, 200, `${url.href} returned ${response.status}`);
    assert.match(
      response.headers.get("content-type") || "",
      contentType,
      `${url.href} has the wrong content type`
    );
  }

  let unknownStatus;
  let unknownError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const unknownUrl = new URL(
      `/definitely-not-a-wayfinder-page-${Date.now()}-${attempt}`,
      `${baseUrl}/`
    );
    try {
      const unknownResponse = await fetchWithTimeout(
        fetchImpl,
        unknownUrl,
        timeoutMs
      );
      unknownStatus = unknownResponse.status;
      unknownError = undefined;
      if (unknownStatus === 404) {
        break;
      }
    } catch (error) {
      unknownError = error;
    }
    if (attempt < attempts) {
      await sleep(intervalMs);
    }
  }
  if (unknownError) {
    throw unknownError;
  }
  assert.equal(unknownStatus, 404, `${baseUrl} must return HTTP 404`);

  return staticResult;
}

async function main() {
  const websiteDir = readArgument("--website-dir") ||
    path.join(root, "website");
  const baseUrl = readArgument("--base-url");
  const result = baseUrl
    ? await verifyLiveWebsite({ baseUrl, websiteDir })
    : verifyStaticWebsite({ websiteDir });
  process.stdout.write(
    `Verified ${result.pages} pages, ${result.sitemapEntries} sitemap URLs, ` +
    `and ${result.llmsLinks} llms.txt links.\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_LIVE_ATTEMPTS,
  DEFAULT_LIVE_INTERVAL_MS,
  alternateHrefs,
  assertValidHtml,
  canonicalPath,
  canonicalHref,
  normalizePathSeparators,
  indexNowKeyFile,
  sitemapLocations,
  sitemapRecords,
  verifyLiveWebsite,
  verifyStaticWebsite
};
