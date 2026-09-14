/* global Response */
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_ENDPOINT,
  indexNowKey,
  sitemapUrls,
  submitIndexNow
} = require("../scripts/submit-indexnow.cjs");

const root = path.resolve(__dirname, "..");
const websiteDir = path.join(root, "website");
const baseUrl = "https://wayfinder-ai.pages.dev";

test("IndexNow key and URL list match the static website", () => {
  const key = indexNowKey(websiteDir);
  const urls = sitemapUrls(websiteDir, baseUrl);
  assert.match(key.key, /^[a-f0-9]{32}$/);
  assert.equal(key.filename, `${key.key}.txt`);
  assert.equal(urls.length, 18);
  assert.ok(urls.includes(`${baseUrl}/zh/getting-started`));
});

test("IndexNow submission verifies the deployed key and posts every URL", async () => {
  const local = indexNowKey(websiteDir);
  let submitted;
  const result = await submitIndexNow({
    baseUrl,
    websiteDir,
    attempts: 1,
    fetchImpl: async (url, options) => {
      const target = String(url);
      if (target === `${baseUrl}/${local.filename}`) {
        assert.equal(options.redirect, "follow");
        return new Response(`${local.key}\n`, {
          status: 200,
          headers: { "content-type": "text/plain" }
        });
      }
      assert.equal(target, DEFAULT_ENDPOINT);
      assert.equal(options.method, "POST");
      assert.equal(
        options.headers["content-type"],
        "application/json; charset=utf-8"
      );
      submitted = JSON.parse(options.body);
      return new Response("", { status: 202 });
    }
  });

  assert.equal(result.status, 202);
  assert.equal(result.submittedUrls, 18);
  assert.equal(submitted.host, "wayfinder-ai.pages.dev");
  assert.equal(submitted.key, local.key);
  assert.equal(submitted.keyLocation, `${baseUrl}/${local.filename}`);
  assert.deepEqual(submitted.urlList, sitemapUrls(websiteDir, baseUrl));
});

test("IndexNow submission retries a transient API failure", async () => {
  const local = indexNowKey(websiteDir);
  let submissions = 0;
  let sleeps = 0;
  const result = await submitIndexNow({
    baseUrl,
    websiteDir,
    attempts: 2,
    intervalMs: 1,
    sleep: async (milliseconds) => {
      assert.equal(milliseconds, 1);
      sleeps += 1;
    },
    fetchImpl: async (url) => {
      if (String(url) === `${baseUrl}/${local.filename}`) {
        return new Response(local.key, { status: 200 });
      }
      submissions += 1;
      return new Response("", { status: submissions === 1 ? 429 : 200 });
    }
  });

  assert.equal(result.status, 200);
  assert.equal(submissions, 2);
  assert.equal(sleeps, 1);
});

test("IndexNow submission rejects an undeployed key", async () => {
  const local = indexNowKey(websiteDir);
  await assert.rejects(
    submitIndexNow({
      baseUrl,
      websiteDir,
      attempts: 1,
      fetchImpl: async (url) => {
        if (String(url) === `${baseUrl}/${local.filename}`) {
          return new Response("stale", { status: 200 });
        }
        throw new Error("IndexNow must not run before key verification");
      }
    }),
    /deployed IndexNow key does not match/
  );
});
