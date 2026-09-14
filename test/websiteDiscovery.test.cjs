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
    pages: 18,
    sitemapEntries: 18,
    llmsLinks: 18
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
        /\s*<link rel="canonical" href="https:\/\/wayfinder-ai\.pages\.dev\/ai-collaboration-history">\r?\n/,
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

test("discovery verifier rejects a Chinese page canonicalized to English", () => {
  const directory = temporaryWebsite();
  try {
    const pageFile = path.join(directory, "zh", "compare.html");
    const html = fs.readFileSync(pageFile, "utf8")
      .replace(
        'rel="canonical" href="https://wayfinder-ai.pages.dev/zh/compare"',
        'rel="canonical" href="https://wayfinder-ai.pages.dev/compare"'
      );
    fs.writeFileSync(pageFile, html);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /zh.compare\.html canonical is stale/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier requires reciprocal language alternates", () => {
  const directory = temporaryWebsite();
  try {
    const pageFile = path.join(directory, "zh", "integrations", "codex.html");
    const html = fs.readFileSync(pageFile, "utf8")
      .replace(
        'hreflang="en" href="https://wayfinder-ai.pages.dev/integrations/codex"',
        'hreflang="en" href="https://wayfinder-ai.pages.dev/zh/integrations/codex"'
      );
    fs.writeFileSync(pageFile, html);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /wrong English alternate/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier rejects a mismatched document language", () => {
  const directory = temporaryWebsite();
  try {
    const pageFile = path.join(directory, "zh", "privacy.html");
    const html = fs.readFileSync(pageFile, "utf8")
      .replace('<html lang="zh-CN">', '<html lang="en">');
    fs.writeFileSync(pageFile, html);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /wrong html language/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier rejects stale sitemap alternates", () => {
  const directory = temporaryWebsite();
  try {
    const sitemapFile = path.join(directory, "sitemap.xml");
    const sitemap = fs.readFileSync(sitemapFile, "utf8")
      .replace(
        'hreflang="zh-Hans" href="https://wayfinder-ai.pages.dev/zh/compare"',
        'hreflang="zh-Hans" href="https://wayfinder-ai.pages.dev/compare"'
      );
    fs.writeFileSync(sitemapFile, sitemap);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /sitemap alternates are stale/
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
    assert.equal(result.pages, 18);
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

test("discovery verifier rejects a malformed IndexNow key file", () => {
  const directory = temporaryWebsite();
  try {
    const keyFile = fs.readdirSync(directory)
      .find((file) => /^[a-f0-9]{32,128}\.txt$/i.test(file));
    fs.writeFileSync(path.join(directory, keyFile), "wrong-key\n");
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /IndexNow key file content must match/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier rejects a stale getting-started download", () => {
  const directory = temporaryWebsite();
  try {
    const pageFile = path.join(directory, "getting-started.html");
    const html = fs.readFileSync(pageFile, "utf8")
      .replace(
        "Wayfinder-Alpha-0.3.17-Windows-x86_64.exe",
        "Wayfinder-Alpha-stale-Windows-x86_64.exe"
      );
    fs.writeFileSync(pageFile, html);
    assert.throws(
      () => verifyStaticWebsite({ websiteDir: directory }),
      /getting-started\.html is missing current download/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery verifier accepts Windows line endings in llms.txt", () => {
  const directory = temporaryWebsite();
  try {
    const llmsFile = path.join(directory, "llms.txt");
    const llms = fs.readFileSync(llmsFile, "utf8")
      .replace(/\r?\n/g, "\r\n");
    fs.writeFileSync(llmsFile, llms);
    const result = verifyStaticWebsite({ websiteDir: directory });
    assert.equal(result.llmsLinks, 18);
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
  if (/^\/[a-f0-9]{32,128}\.txt$/i.test(parsed.pathname)) {
    return new Response(parsed.pathname.slice(1, -4), {
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
    attempts: 1,
    fetchImpl: async (url) => liveResponse(url)
  });
  assert.equal(result.pages, 18);
});

test("live discovery verifier rejects a soft 404", async () => {
  await assert.rejects(
    verifyLiveWebsite({
      websiteDir,
      attempts: 1,
      fetchImpl: async (url) => liveResponse(url, { soft404: true })
    }),
    /must return HTTP 404/
  );
});

test("live discovery verifier tolerates edge propagation for 404s", async () => {
  let unknownRequests = 0;
  let sleeps = 0;
  const result = await verifyLiveWebsite({
    websiteDir,
    attempts: 2,
    intervalMs: 1,
    sleep: async (milliseconds) => {
      assert.equal(milliseconds, 1);
      sleeps += 1;
    },
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/definitely-not-a-wayfinder-page-")) {
        unknownRequests += 1;
        return liveResponse(url, { soft404: unknownRequests === 1 });
      }
      return liveResponse(url);
    }
  });
  assert.equal(result.pages, 18);
  assert.equal(unknownRequests, 2);
  assert.equal(sleeps, 1);
});
