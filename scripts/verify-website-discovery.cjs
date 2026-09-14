#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://wayfinder-ai.pages.dev";
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

function titleText(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
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

function canonicalPath(relativeFile) {
  const normalized = relativeFile.split(path.sep).join("/");
  if (normalized === "index.html") {
    return "/";
  }
  return `/${normalized.replace(/\.html$/, "").replace(/\/index$/, "")}`;
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
      !reference.startsWith("#") &&
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

function isGoogleVerificationFile(file) {
  return /^google[a-z0-9_-]+\.html$/i.test(path.basename(file));
}

function verifyStaticWebsite({
  websiteDir = path.join(root, "website"),
  baseUrl = DEFAULT_BASE_URL
} = {}) {
  const htmlFiles = listFiles(websiteDir, ".html");
  const missingPage = path.join(websiteDir, "404.html");
  assert.ok(fs.existsSync(missingPage), "website/404.html is required");

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
    const relativeFile = path.relative(websiteDir, file);
    const expectedUrl = new URL(canonicalPath(relativeFile), `${baseUrl}/`).href;
    const html = fs.readFileSync(file, "utf8");
    const title = titleText(html);
    const description = metaContent(html, "name", "description");
    const canonical = canonicalHref(html);
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    const robots = metaContent(html, "name", "robots") || "";
    const jsonLd = jsonLdDocuments(html, relativeFile);

    assert.ok(title, `${relativeFile} is missing a title`);
    assert.ok(description, `${relativeFile} is missing a meta description`);
    assert.equal(canonical, expectedUrl, `${relativeFile} canonical is stale`);
    assert.equal(h1Count, 1, `${relativeFile} must contain exactly one H1`);
    assert.doesNotMatch(robots, /noindex/i, `${relativeFile} must be indexable`);
    assert.ok(jsonLd.length > 0, `${relativeFile} is missing JSON-LD`);
    assert.ok(!titles.has(title), `${relativeFile} reuses the title "${title}"`);
    assert.ok(
      !descriptions.has(description),
      `${relativeFile} reuses a meta description`
    );

    titles.add(title);
    descriptions.add(description);
    canonicalUrls.add(expectedUrl);
    pageRecords.push({ relativeFile, expectedUrl, html, jsonLd });
  }

  const missingHtml = fs.readFileSync(missingPage, "utf8");
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
    }
  }

  const sitemapFile = path.join(websiteDir, "sitemap.xml");
  const sitemap = fs.readFileSync(sitemapFile, "utf8");
  const locations = sitemapLocations(sitemap);
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
  for (const url of llmsWebsiteLinks) {
    assert.ok(canonicalUrls.has(url), `llms.txt links to non-canonical ${url}`);
  }

  const home = pageRecords.find((page) => page.relativeFile === "index.html");
  assert.ok(home, "website/index.html is required");
  const homeNodes = jsonLdNodes(home.jsonLd);
  for (const type of ["WebSite", "Organization", "SoftwareApplication"]) {
    assert.ok(
      homeNodes.some((node) => node["@type"] === type),
      `index.html JSON-LD is missing ${type}`
    );
  }

  const release = JSON.parse(
    fs.readFileSync(path.join(websiteDir, "releases.json"), "utf8")
  );
  const application = homeNodes.find(
    (node) => node["@type"] === "SoftwareApplication"
  );
  assert.equal(application.softwareVersion, release.version);
  assert.ok(application.downloadUrl.includes(release.version));

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
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs)
  });
}

async function verifyLiveWebsite({
  baseUrl = DEFAULT_BASE_URL,
  websiteDir = path.join(root, "website"),
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000
} = {}) {
  const staticResult = verifyStaticWebsite({ websiteDir });
  const sitemap = fs.readFileSync(path.join(websiteDir, "sitemap.xml"), "utf8");
  const locations = sitemapLocations(sitemap);

  for (const location of locations) {
    const publicUrl = new URL(location);
    const requestUrl = new URL(publicUrl.pathname, `${baseUrl}/`);
    const response = await fetchWithTimeout(fetchImpl, requestUrl, timeoutMs);
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
    ["/llms.txt", /text\/plain/i]
  ]) {
    const url = new URL(pathname, `${baseUrl}/`);
    const response = await fetchWithTimeout(fetchImpl, url, timeoutMs);
    assert.equal(response.status, 200, `${url.href} returned ${response.status}`);
    assert.match(
      response.headers.get("content-type") || "",
      contentType,
      `${url.href} has the wrong content type`
    );
  }

  const unknownUrl = new URL(
    `/definitely-not-a-wayfinder-page-${Date.now()}`,
    `${baseUrl}/`
  );
  const unknownResponse = await fetchWithTimeout(
    fetchImpl,
    unknownUrl,
    timeoutMs
  );
  assert.equal(
    unknownResponse.status,
    404,
    `${unknownUrl.href} must return HTTP 404`
  );

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
  canonicalHref,
  sitemapLocations,
  verifyLiveWebsite,
  verifyStaticWebsite
};
