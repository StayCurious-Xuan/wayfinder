// Lightweight bilingual toggle. English is the server-rendered default DOM
// (canonical for search and AI engines); Chinese is a client-side enhancement.
// Each translatable element carries its Chinese text in data-zh; its English
// text stays as the visible textContent and is captured into data-en on first
// switch. No dependencies, no network, no tracking.
(function () {
  var STORAGE_KEY = "wayfinder-lang";
  var root = document.documentElement;

  function readLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (error) {
      /* localStorage may be unavailable; fall back to default. */
    }
    return "en";
  }

  function apply(lang) {
    var nodes = document.querySelectorAll("[data-zh]");
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node.getAttribute("data-en") === null) {
        node.setAttribute("data-en", node.textContent);
      }
      node.textContent = lang === "zh"
        ? node.getAttribute("data-zh")
        : node.getAttribute("data-en");
    }
    var ariaNodes = document.querySelectorAll("[data-zh-aria]");
    for (var j = 0; j < ariaNodes.length; j += 1) {
      var el = ariaNodes[j];
      if (el.getAttribute("data-en-aria") === null) {
        el.setAttribute("data-en-aria", el.getAttribute("aria-label") || "");
      }
      el.setAttribute(
        "aria-label",
        lang === "zh"
          ? el.getAttribute("data-zh-aria")
          : el.getAttribute("data-en-aria")
      );
    }
    root.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    var toggles = document.querySelectorAll("[data-lang-toggle]");
    for (var k = 0; k < toggles.length; k += 1) {
      // Show the language the click will switch to.
      toggles[k].textContent = lang === "zh" ? "EN" : "中文";
      toggles[k].setAttribute(
        "aria-label",
        lang === "zh" ? "Switch to English" : "切换到中文"
      );
    }
  }

  function setLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      /* Ignore storage failures; the choice still applies for this view. */
    }
    apply(lang);
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest
      ? event.target.closest("[data-lang-toggle]")
      : null;
    if (!toggle) return;
    event.preventDefault();
    var next = readLang() === "zh" ? "en" : "zh";
    setLang(next);
  });

  apply(readLang());
})();
