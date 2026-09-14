#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const root = path.resolve(__dirname, "..");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function indexNowKey(websiteDir) {
  const files = fs.readdirSync(websiteDir)
    .filter((file) => /^[a-f0-9]{32,128}\.txt$/i.test(file));
  assert.equal(files.length, 1, "website must contain one IndexNow key file");
  const filename = files[0];
  const key = path.basename(filename, ".txt");
  assert.equal(
    fs.readFileSync(path.join(websiteDir, filename), "utf8").trim(),
    key,
    "IndexNow key file content must match its filename"
  );
  return { filename, key };
}

function sitemapUrls(websiteDir, baseUrl) {
  const sitemap = fs.readFileSync(
    path.join(websiteDir, "sitemap.xml"),
    "utf8"
  );
  const expectedOrigin = new URL(baseUrl).origin;
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim());
  assert.ok(urls.length > 0, "sitemap must contain canonical URLs");
  assert.equal(new Set(urls).size, urls.length, "sitemap URLs must be unique");
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.protocol, "https:", "IndexNow URLs must use HTTPS");
    assert.equal(
      url.origin,
      expectedOrigin,
      "IndexNow URLs must belong to the submitted host"
    );
  }
  return urls;
}

async function request(fetchImpl, url, options, timeoutMs) {
  return fetchImpl(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
}

async function submitIndexNow({
  baseUrl,
  websiteDir = path.join(root, "website"),
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = globalThis.fetch,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds))
}) {
  assert.ok(baseUrl, "IndexNow submission requires a base URL");
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const host = new URL(normalizedBase).host;
  const { filename, key } = indexNowKey(websiteDir);
  const keyLocation = new URL(filename, normalizedBase).href;
  const urlList = sitemapUrls(websiteDir, normalizedBase);

  const keyResponse = await request(
    fetchImpl,
    keyLocation,
    {
      cache: "no-store",
      headers: { "user-agent": "Wayfinder-IndexNow/1.0" },
      redirect: "follow"
    },
    timeoutMs
  );
  assert.equal(
    keyResponse.status,
    200,
    `IndexNow key returned ${keyResponse.status}`
  );
  assert.equal(
    (await keyResponse.text()).trim(),
    key,
    "deployed IndexNow key does not match"
  );

  const payload = { host, key, keyLocation, urlList };
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request(
        fetchImpl,
        endpoint,
        {
          method: "POST",
          headers: {
            "content-type": "application/json; charset=utf-8",
            "user-agent": "Wayfinder-IndexNow/1.0"
          },
          body: JSON.stringify(payload)
        },
        timeoutMs
      );
      if (response.status !== 200 && response.status !== 202) {
        throw new Error(`IndexNow returned ${response.status}`);
      }
      return {
        status: response.status,
        keyLocation,
        submittedUrls: urlList.length
      };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(intervalMs);
    }
  }
  throw lastError;
}

async function main() {
  const baseUrl = readArgument("--base-url");
  if (!baseUrl) {
    throw new Error(
      "Usage: submit-indexnow.cjs --base-url https://example.com"
    );
  }
  const result = await submitIndexNow({ baseUrl });
  process.stdout.write(
    `IndexNow accepted ${result.submittedUrls} URLs with status ` +
    `${result.status}.\n`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_ATTEMPTS,
  DEFAULT_ENDPOINT,
  DEFAULT_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  indexNowKey,
  sitemapUrls,
  submitIndexNow
};
