/* global Response */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { URL } = require("node:url");

const {
  verifyLiveWebsite,
  verifyStaticWebsite
} = require("../scripts/verify-website-discovery.cjs");

const root = path.resolve(__dirname, "..");
const websiteDir = path.join(root, "website");

function temporaryWebsite() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "wayfinder-discovery-")
  );
  fs.cpSync(websiteDir, directory, { recursive: true });
  return directory;
}

test("website discovery surface is complete and internally consistent", () => {
  const result = verifyStaticWebsite({ websiteDir });
  assert.deepEqual(result, {
    pages: 5,
    sitemapEntries: 5,
    llmsLinks: 5
  });
});

test("discovery verifier rejects a stale sitemap", () => {
  const directory = temporaryWebsite();
  try {
    const sitemapFile = path.join(directory, "sitemap.xml");
    const sitemap = fs.readFileSync(sitemapFile, "utf8")
      .replace(
        "https://wayfinder-ai.pages.dev/integrations/codex",
        "https://wayfinder-ai.pages.dev/integrations/missing"
      );
    fs.writeFileSync(sitemapFile, sitemap);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /sitemap URLs must exactly match/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier rejects a missing canonical URL", () => {
  const directory = temporaryWebsite();
  try {
    const pageFile = path.join(directory, "ai-collaboration-history.html");
    const html = fs.readFileSync(pageFile, "utf8")
      .replace(
        '  <link rel="canonical" href="https://wayfinder-ai.pages.dev/ai-collaboration-history">\n',
        ""
      );
    fs.writeFileSync(pageFile, html);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /canonical is stale/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier requires the Cloudflare 404 page", () => {
  const directory = temporaryWebsite();
  try {
    fs.rmSync(path.join(directory, "404.html"));
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /website\/404\.html is required/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier accepts an authentic Search Console HTML file", () => {
  const directory = temporaryWebsite();
  try {
    const filename = "google0123456789abcdef.html";
    fs.writeFileSync(
      path.join(directory, filename),
      `google-site-verification: ${filename}\n`
    );
    const result = verifyStaticWebsite({ websiteDir: directory });
    assert.equal(result.pages, 5);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier rejects a malformed Search Console HTML file", () => {
  const directory = temporaryWebsite();
  try {
    fs.writeFileSync(
      path.join(directory, "google0123456789abcdef.html"),
      "<html>pretend verification</html>\n"
    );
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /is not a valid Google verification file/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function liveResponse(url, { soft404 = false } = {}) {
  const parsed = new URL(url);
  if (parsed.pathname.startsWith("/definitely-not-a-wayfinder-page-")) {
    return new Response("Not found", {
      status: soft404 ? 200 : 404,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  }
  if (parsed.pathname === "/robots.txt" || parsed.pathname === "/llms.txt") {
    return new Response("text", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  if (parsed.pathname === "/sitemap.xml") {
    return new Response("<urlset></urlset>", {
      status: 200,
      headers: { "content-type": "application/xml" }
    });
  }
  return new Response(
    `<link rel="canonical" href="${parsed.href}">`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    }
  );
}

test("live discovery verifier accepts canonical pages and a real 404", async () => {
  const result = await verifyLiveWebsite({
    websiteDir,
    fetchImpl: async (url) => liveResponse(url)
  });
  assert.equal(result.pages, 5);
});

test("live discovery verifier rejects a soft 404", async () => {
  await assert.rejects(
    verifyLiveWebsite({
      websiteDir,
      fetchImpl: async (url) => liveResponse(url, { soft404: true })
    }),
    /must return HTTP 404/
  );
});
