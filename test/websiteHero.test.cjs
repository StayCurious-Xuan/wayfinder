const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "website/index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "website/styles.css"), "utf8");
const script = fs.readFileSync(path.join(root, "website/app.js"), "utf8");

test("hero labels share the route SVG coordinate system", () => {
  const svg = html.match(
    /<svg class="hero-route-map"[\s\S]*?<\/svg>/
  )?.[0];
  assert.ok(svg);
  const titles = [...svg.matchAll(
    /class="route-note-title"[^>]*>([^<]+)</g
  )].map((match) => match[1]);
  assert.deepEqual(titles, [
    "Set the goal",
    "Keep branches",
    "Open the record",
    "Keep the lesson"
  ]);
  assert.equal((svg.match(/class="route-note /g) || []).length, 4);
  assert.equal((svg.match(/class="route-note-leader"/g) || []).length, 4);
  assert.doesNotMatch(html.replace(svg, ""), /class="route-note /);
  // Chinese labels stay available through the runtime language toggle.
  assert.match(svg, /data-zh="确认目标"/);
  assert.match(svg, /data-zh="保留分叉"/);
  assert.match(svg, /data-zh="查看记录"/);
  assert.match(svg, /data-zh="沉淀经验"/);
  assert.match(svg, /data-zh="把同一件事的对话和操作放进一条航程"/);
  assert.match(svg, /Click a waypoint to see the chat, file changes,/);
});

test("successful voyage stays at the endpoint and triggers a restrained burst", () => {
  assert.match(html, /class="hero-celebration"/);
  assert.equal((html.match(/class="celebration-ray"/g) || []).length, 9);
  assert.equal((html.match(/class="celebration-piece /g) || []).length, 10);
  assert.match(script, /function renderCelebration\(arrival\)/);
  assert.match(script, /renderCelebration\(frame\.arrival\)/);
  assert.doesNotMatch(script, /const dock|dock \* 58|dock \* 12/);
  assert.match(
    script,
    /translate\(\$\{point\.x \+ bump \* 10 - bowOffset\},\$\{point\.y - Math\.abs\(bump\) \* 12\}\)/
  );
});

test("phone voyage has its own complete scene and animation state", () => {
  const svg = html.match(
    /<svg class="mobile-route-map"[\s\S]*?<\/svg>/
  )?.[0];
  assert.ok(svg);
  assert.match(svg, /id="mobile-course-main"/);
  assert.match(svg, /id="mobile-course-failure"/);
  assert.match(svg, /id="mobile-course-success"/);
  assert.equal(
    (svg.match(/class="mobile-route-label /g) || []).length,
    4
  );
  assert.match(svg, /<tspan>01<\/tspan> <tspan data-zh="确认目标">Set goal<\/tspan>/);
  assert.match(svg, /<tspan>02<\/tspan> <tspan data-zh="保留分叉">Branches<\/tspan>/);
  assert.match(svg, /<tspan>03<\/tspan> <tspan data-zh="查看记录">Record<\/tspan>/);
  assert.match(svg, /<tspan>04<\/tspan> <tspan data-zh="沉淀经验">Lesson<\/tspan>/);
  assert.match(svg, /class="mobile-coast-land"/);
  assert.match(svg, /class="mobile-reef"/);
  assert.match(svg, /class="mobile-map-node mobile-success-marker"/);
  assert.match(svg, /class="mobile-vessel"/);
  assert.equal(
    (svg.match(/class="mobile-celebration-ray"/g) || []).length,
    8
  );
  assert.equal(
    (svg.match(/class="mobile-celebration-piece /g) || []).length,
    6
  );
  assert.match(script, /function renderMobileHeroVoyage\(elapsed\)/);
  assert.match(script, /renderMobileHeroVoyage\(time - startedAt\)/);
  assert.match(script, /renderMobileCelebration\(frame\.arrival\)/);
});

test("homepage footer metadata is part of the final dark section", () => {
  assert.doesNotMatch(html, /<footer[\s>]/);
  assert.match(html, /href="\.\/ai-collaboration-history"/);
  assert.match(
    html,
    /class="final-copy"[\s\S]*?class="final-meta"[\s\S]*?<\/section>/
  );
  assert.match(html, /class="final-meta" role="group"/);
  assert.match(html, /<span>Wayfinder<\/span>/);
  assert.match(html, /<span data-zh="本地优先 · 开源">Local-first · open source<\/span>/);
  assert.match(styles, /\.final-meta\s*\{[\s\S]*?color: #ffffff/);
  assert.match(styles, /\.final-meta a\s*\{[\s\S]*?color: #ffffff/);
  assert.match(html, /class="final-route-phone"/);
  assert.match(
    html,
    /class="final-copy"[\s\S]*?class="final-route-phone"[\s\S]*?class="download-grid final-downloads"/
  );
});
