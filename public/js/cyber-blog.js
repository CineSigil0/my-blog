(() => {
  function initPageContext() {
    const path = window.location.pathname || "/";
    if (path === "/tags/" || path.startsWith("/tags/")) {
      document.documentElement.classList.add("page-tags");
    }
  }

  function getWelcomeHref(baseHref) {
    try {
      const url = new URL(baseHref || "/", window.location.origin);
      url.searchParams.set("welcome", "1");
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
      return "/?welcome=1";
    }
  }

  function initHeaderWelcomeEntry() {
    const mainMenu = document.querySelector(".main-menu");
    if (!mainMenu) return;

    const directAnchors = Array.from(mainMenu.children).filter(
      (element) => element.tagName === "A"
    );
    const brandLink = directAnchors.find(
      (link) => link.classList.contains("truncate") && link.classList.contains("shrink")
    );

    if (!brandLink) return;

    brandLink.setAttribute("href", getWelcomeHref(brandLink.getAttribute("href") || "/"));
    brandLink.setAttribute("aria-label", "进入欢迎页");
  }

  function initHomeDataFlow() {
    const hero = document.querySelector(".relative.flex.flex-col.items-center.justify-center.px-1.py-1.text-center");
    if (!hero || !hero.querySelector(".glitter-lyric")) return;

    hero.classList.add("home-hero-cyber");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const canvas = document.createElement("canvas");
    canvas.className = "home-dataflow-canvas";
    hero.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "01{}[]<>/\\*#%&$+-=アイウエオカキクケコ";
    let width = 0;
    let height = 0;
    let dpr = 1;
    let fontSize = 14;
    let columns = 0;
    let drops = [];
    let rafId = 0;
    let lastTick = 0;
    let isRunning = true;

    const setupCanvas = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      fontSize = width < 680 ? 12 : 14;
      columns = Math.max(1, Math.floor(width / fontSize));
      drops = Array.from({ length: columns }, () => Math.random() * (height / fontSize));
      ctx.fillStyle = "rgba(4, 10, 22, 0.22)";
      ctx.fillRect(0, 0, width, height);
    };

    const draw = (timestamp) => {
      if (!isRunning) return;
      if (timestamp - lastTick < 42) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }
      lastTick = timestamp;

      ctx.fillStyle = "rgba(4, 10, 22, 0.16)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < columns; i += 1) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const alpha = 0.35 + Math.random() * 0.5;

        ctx.fillStyle = `rgba(0, 255, 157, ${alpha})`;
        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] += 0.8 + Math.random() * 0.65;
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    const handleResize = () => {
      window.cancelAnimationFrame(rafId);
      setupCanvas();
      if (isRunning) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        window.cancelAnimationFrame(rafId);
        return;
      }

      if (!isRunning) {
        isRunning = true;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    setupCanvas();
    rafId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
  }

  function initReadingProgress() {
    const article = document.querySelector(".article-content");
    if (!article) return;

    const progressBar = document.createElement("div");
    progressBar.className = "cyber-reading-progress";

    const fill = document.createElement("div");
    fill.className = "cyber-reading-progress__fill";
    progressBar.appendChild(fill);
    document.body.appendChild(progressBar);

    let ticking = false;

    const update = () => {
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = article.offsetHeight;
      const viewportHeight = window.innerHeight;
      const start = articleTop - viewportHeight * 0.18;
      const end = articleTop + articleHeight - viewportHeight * 0.55;
      const progress = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(end - start, 1)));

      fill.style.transform = `scaleX(${progress})`;
      progressBar.classList.toggle("is-visible", progress > 0.01 && progress < 0.995);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  function initReveal() {
    const targets = document.querySelectorAll(
      ".article-link--card, #single_header, .toc-right, .toc-inside"
    );
    if (!targets.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    targets.forEach((element, index) => {
      element.setAttribute("data-cyber-reveal", "true");
      element.style.setProperty("--cyber-delay", `${Math.min(index * 45, 240)}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("cyber-reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("cyber-reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.02,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    targets.forEach((element) => observer.observe(element));
  }

  function initCardPointerGlow() {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFinePointer || reduceMotion) return;

    const cards = document.querySelectorAll(".article-link--card");
    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--pointer-x", `${x}%`);
        card.style.setProperty("--pointer-y", `${y}%`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--pointer-x", "50%");
        card.style.setProperty("--pointer-y", "50%");
      });
    });
  }

  function init() {
    initPageContext();
    initHeaderWelcomeEntry();
    initHomeDataFlow();
    initReadingProgress();
    initReveal();
    initCardPointerGlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
