/* ============================================================
   Electro Diamante — main.js  (IIFE, sin módulos, sin dependencias)
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.__ED__ || {};
  var doc = document;
  var root = doc.documentElement;

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.warn("[ED] " + name + " falló:", e); }
  }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Datos del negocio (config.js) ---------- */
  function initConfig() {
    var num = String(CFG.whatsapp || "").replace(/\D/g, "");
    if (num) {
      $all("[data-wa]").forEach(function (a) {
        var msg = a.getAttribute("data-wa") || CFG.mensaje || "";
        a.href = "https://wa.me/" + num + (msg ? "?text=" + encodeURIComponent(msg) : "");
      });
    }
    var map = { "[data-phone]": CFG.telefonoVisible, "[data-address]": CFG.direccion, "[data-locality]": CFG.localidad, "[data-hours]": CFG.horario };
    Object.keys(map).forEach(function (sel) {
      if (!map[sel]) return;
      $all(sel).forEach(function (el) { el.textContent = map[sel]; });
    });
    $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    if (CFG.email) $all("[data-email]").forEach(function (el) { el.textContent = CFG.email; el.href = "mailto:" + CFG.email; });
    // Oculta del footer los datos que queden vacíos en config.js
    $all("[data-if]").forEach(function (li) { if (!String(CFG[li.getAttribute("data-if")] || "").trim()) li.hidden = true; });
  }

  /* ---------- Nav ---------- */
  function initNav() {
    var nav = doc.querySelector(".nav");
    var btn = doc.querySelector(".nav__toggle");
    var fab = doc.querySelector(".wa-float");
    if (!nav) return;

    var onScroll = function () {
      var y = window.scrollY || window.pageYOffset;
      nav.classList.toggle("is-scrolled", y > 24);
      // El menú toma la versión oscura cuando pasa por encima de una sección oscura
      var probe = nav.offsetHeight / 2;
      var onDark = $all(".hero--dark, .section--ink, .contact, .footer").some(function (sec) {
        var r = sec.getBoundingClientRect();
        return r.top <= probe && r.bottom > probe;
      });
      nav.classList.toggle("is-dark", onDark);
      if (fab) fab.classList.add("is-visible"); // visible desde el hero
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var brand = nav.querySelector(".brand");
    if (brand) brand.addEventListener("click", function (e) {
      if (brand.getAttribute("href") !== "#top") return; // en sub páginas vuelve al inicio del sitio
      e.preventDefault();
      nav.classList.remove("is-open");
      doc.body.style.overflow = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    });

    $all(".footer__top").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    });

    if (!btn) return;
    var close = function () {
      nav.classList.remove("is-open");
      $all(".mm__group.is-expanded").forEach(function (g) { g.classList.remove("is-expanded"); g.querySelector(".mm__toggle").setAttribute("aria-expanded", "false"); });
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Abrir menú");
      doc.body.style.overflow = "";
    };
    btn.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      doc.body.style.overflow = open ? "hidden" : "";
      if (open) markCurrent();
    });
    $all(".nav__links a, .mmenu a").forEach(function (a) { a.addEventListener("click", close); });
    // "Inicio" vuelve arriba de todo
    $all(".nav__links [data-top], .mmenu [data-top]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" });
        if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      });
    });
    // Desplegables de Servicios y Productos
    $all(".mm__toggle").forEach(function (t) {
      t.addEventListener("click", function () {
        var g = t.parentElement, open = !g.classList.contains("is-expanded");
        $all(".mm__group.is-expanded").forEach(function (o) {
          if (o !== g) { o.classList.remove("is-expanded"); o.querySelector(".mm__toggle").setAttribute("aria-expanded", "false"); }
        });
        g.classList.toggle("is-expanded", open);
        t.setAttribute("aria-expanded", String(open));
      });
    });
    // Resalta la sección en la que está el usuario
    function markCurrent() {
      var ids = ["nosotros", "servicios", "productos", "faq"], cur = doc.body.getAttribute("data-page-sec") || "top";
      if (doc.body.getAttribute("data-page-sec")) ids = [];
      ids.forEach(function (id) {
        var el = doc.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) cur = id;
      });
      $all(".mmenu [data-sec]").forEach(function (el) { el.classList.toggle("is-current", el.getAttribute("data-sec") === cur); });
    }
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- Título del hero ---------- */
  function initHeroTitle() {
    var t = doc.querySelector(".hero__title");
    if (!t) return;
    setTimeout(function () { t.classList.add("is-in"); }, 120);
  }

  /* ---------- Reveal al scrollear ---------- */
  function initReveal() {
    // Cascada: cada hijo de un grupo entra un poco después que el anterior
    [".svc", ".about__bento", ".faq__list", ".info"].forEach(function (g) {
      $all(g).forEach(function (box) {
        $all(".reveal", box).forEach(function (el, k) { el.style.setProperty("--i", k); });
      });
    });
    var els = $all(".reveal");
    if (!("IntersectionObserver" in window)) {
      root.classList.add("no-io");
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) {
      // Los elementos del hero entran apenas carga la página
      if (el.closest(".hero")) {
        setTimeout(function () { el.classList.add("is-in"); }, 350);
      } else { io.observe(el); }
    });
    // Seguro: a los 6s mostramos todo lo que ya pasó por pantalla o quedó oculto
    setTimeout(function () {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add("is-in");
      });
    }, 6000);
  }

  /* ---------- Cómo trabajamos: pasos que se activan al scrollear ---------- */
  function initHow() {
    var list = doc.querySelector(".how__steps");
    if (!list) return;
    var steps = $all(".hstep", list);
    var scenes = $all(".how__card .scene");
    var bars = $all(".how__prog b");
    var cap = doc.querySelector("[data-cap]");
    var count = doc.querySelector("[data-count]");
    var current = -1, ticking = false;

    function setActive(i) {
      if (i === current) return;
      current = i;
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      scenes.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      if (cap) { var h = steps[i].querySelector("h3"); if (h) cap.textContent = h.textContent; }
      if (count) count.textContent = ("0" + (i + 1)).slice(-2);
    }

    function update() {
      ticking = false;
      var mobile = window.innerWidth <= 760;
      var focus = window.innerHeight * (mobile ? 0.72 : 0.5);
      var active = 0;
      var stacked = getComputedStyle(steps[0]).position === "sticky";
      steps.forEach(function (s, k) {
        if (stacked) {
          // Con tarjetas apiladas, el paso activo es el que llegó arriba de la pila
          if (s.getBoundingClientRect().top <= parseFloat(getComputedStyle(s).top) + 40) active = k;
        } else if (s.getBoundingClientRect().top + (mobile ? 0 : 40) <= focus) active = k;
      });
      setActive(active);

      // Progreso dentro de cada paso para las barras
      steps.forEach(function (s, k) {
        var r = s.getBoundingClientRect();
        var f = (focus - r.top) / Math.max(1, r.height);
        f = Math.max(0, Math.min(1, f));
        if (k < active) f = 1;
        if (k > active) f = 0;
        if (k === steps.length - 1 && k === active) f = Math.max(f, 0.15);
        if (bars[k]) bars[k].style.setProperty("--f", f.toFixed(3));
      });

      // Línea vertical
      var lr = list.getBoundingClientRect();
      var lp = (focus - lr.top) / Math.max(1, lr.height);
      list.style.setProperty("--line-p", Math.max(0, Math.min(1, lp)).toFixed(3));
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    setActive(0);
    update();
  }


  /* ---------- Preguntas frecuentes ---------- */
  function initFaq() {
    $all(".faq__item").forEach(function (item) {
      var btn = item.querySelector(".faq__q");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var open = !item.classList.contains("is-open");
        $all(".faq__item.is-open").forEach(function (o) {
          if (o !== item) { o.classList.remove("is-open"); var b = o.querySelector(".faq__q"); if (b) b.setAttribute("aria-expanded", "false"); }
        });
        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* ---------- Delight: luz de servicios y llave de luz ---------- */
  function initSpotlight() {
    $all(".svc__item, .about__card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
      card.addEventListener("pointerleave", function () { card.style.setProperty("--my", "-40%"); card.style.setProperty("--mx", "50%"); });
    });
  }


  function initLightSwitch() {
    var btn = doc.querySelector(".switch");
    var sec = doc.querySelector(".contact");
    var label = doc.querySelector(".switch__label");
    if (!btn || !sec) return;
    btn.addEventListener("click", function () {
      var on = !sec.classList.contains("is-lit");
      sec.classList.toggle("is-lit", on);
      doc.body.classList.toggle("lights-on", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", on ? "Apagar la luz" : "Prender la luz");
      if (label) label.textContent = label.getAttribute(on ? "data-on" : "data-off");
    });
  }

  /* ---------- Opiniones: carrusel infinito (velocidad en px/seg, pausa al pasar el mouse) ---------- */
  function initMovingCards() {
    var SPEED = { slow: 26, normal: 44, fast: 74 };
    $all(".imc").forEach(function (root) {
      var viewport = root.querySelector(".imc__viewport");
      var track = root.querySelector(".imc__track");
      if (!viewport || !track || track.getAttribute("data-ready")) return;
      track.setAttribute("data-ready", "1");
      var originals = $all(".imc__card", track);
      if (originals.length <= 1) return;
      var dir = root.getAttribute("data-direction") === "right" ? "right" : "left";
      var pxs = SPEED[root.getAttribute("data-speed")] || SPEED.normal;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      var single = 0, x = 0, hovered = false, last = 0, visible = true, factor = 1;

      function clone(el) { var c = el.cloneNode(true); c.setAttribute("aria-hidden", "true"); return c; }
      // Arma un "set" que cubra el ancho visible y lo duplica para el loop
      function build() {
        $all(".imc__card", track).forEach(function (el, i) { if (i >= originals.length) el.remove(); });
        var one = originals.reduce(function (w, el) { return w + el.offsetWidth + gap; }, 0);
        var reps = Math.max(1, Math.ceil(viewport.clientWidth / one));
        for (var r = 1; r < reps * 2; r++) originals.forEach(function (el) { track.appendChild(clone(el)); });
        single = one * reps;
        if (dir === "right") x = -single;
      }
      build();
      var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 150); });

      // Solo con mouse real: en celular un toque no debe dejarlo "trabado" en modo hover
      root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovered = true; });
      root.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hovered = false; });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(root);
      }
      // Si el sistema pide "reducir movimiento" (muy común en celulares), no se frena: va más lento
      var base = reduce ? 0.45 : 1;

      function frame(t) {
        var delta = last ? Math.min(t - last, 64) : 16; last = t;
        // Al pasar el mouse no se frena: baja suavemente al 25% de la velocidad
        var target = (hovered ? 0.25 : 1) * base;
        factor += (target - factor) * Math.min(1, delta / 250);
        if (visible && single > 0) {
          var v = pxs * factor * (delta / 1000);
          x += dir === "left" ? -v : v;
          if (dir === "left" && x <= -single) x += single;
          if (dir === "right" && x >= 0) x -= single;
          track.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- Tablet/celular: tarjetas apiladas al scrollear ---------- */
  function initStack() {
    var mq = window.matchMedia("(max-width: 1024px)");
    var groups = $all(".svc:not(.svc--mini)").map(function (g) { return $all(".svc__item", g); });
    groups.forEach(function (cards) { cards.forEach(function (c, i) { c.style.setProperty("--si", i); }); });
    var ticking = false;
    function update() {
      ticking = false;
      groups.forEach(function (cards) {
        cards.forEach(function (c, i) {
          if (!mq.matches) { c.style.removeProperty("--sc"); c.style.removeProperty("--br"); c.classList.remove("is-stacked"); return; }
          var next = cards[i + 1];
          var p = 0;
          if (next) {
            var a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
            // cuánto avanzó la siguiente tarjeta sobre esta (0 a 1)
            p = Math.max(0, Math.min(1, (a.bottom - b.top) / a.height));
          }
          c.style.setProperty("--sc", (1 - p * 0.06).toFixed(4));
          c.style.setProperty("--br", (1 - p * 0.35).toFixed(3));
          c.classList.toggle("is-stacked", p > 0);
        });
        // Tablet y celular: la tarjeta que está al frente muestra el borde de color (como el hover en desktop)
        var live = -1;
        if (mq.matches) {
          var lim = window.innerHeight * 0.6;
          cards.forEach(function (c, i) { var r = c.getBoundingClientRect(); if (r.top <= lim && r.bottom > 80) live = i; });
        }
        cards.forEach(function (c, i) { c.classList.toggle("is-live", i === live); });
      });
    }
    // Todas las tarjetas de un grupo con la misma altura, así la de arriba tapa por completo a la de abajo
    function equalize() {
      groups.forEach(function (cards) {
        cards.forEach(function (c) { c.style.minHeight = ""; });
        if (!mq.matches) return;
        var h = cards.reduce(function (m, c) { return Math.max(m, c.offsetHeight); }, 0);
        cards.forEach(function (c) { c.style.minHeight = h + "px"; });
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", function () { equalize(); update(); });
    window.addEventListener("load", function () { equalize(); update(); });
    equalize();
    update();
  }


  /* ---------- Hero: indicador de scroll ---------- */
  function initScrollCue() {
    var el = document.querySelector(".scroll-cue");
    if (!el) return;
    function upd() { el.classList.toggle("is-hidden", window.scrollY > 60); }
    window.addEventListener("scroll", upd, { passive: true });
    upd();
    el.addEventListener("click", function (e) {
      var t = document.querySelector(el.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      var smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      t.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    });
  }

  /* ---------- Nosotros: contador animado del +30 ---------- */
  function initCountUp() {
    $all("[data-count-to]").forEach(function (el) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      if (!("IntersectionObserver" in window)) return;
      var done = false;
      new IntersectionObserver(function (en, obs) {
        if (done || !en[0].isIntersecting) return;
        done = true; obs.disconnect();
        var t0 = performance.now(), dur = 1400;
        (function tick(t) {
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      }, { threshold: 0.4 }).observe(el);
    });
  }

  /* ---------- Grilla de puntos reactiva al mouse (hero) ---------- */
  var GRID_T0 = performance.now();
  function initGrid() { $all(".hero__grid").forEach(gridOn); }
  function gridOn(c) {
    if (!c || !c.getContext) return;
    var fade = parseFloat(c.getAttribute("data-fade")) || 0;
    var ctx = c.getContext("2d");
    var hero = c.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, pts = [], gap = 30;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var running = false, visible = true, t0 = GRID_T0;

    function build() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = W < 760 ? 24 : 30;
      pts = [];
      // Alinea la grilla con la de la sección anterior (coordenadas de página)
      var absTop = r.top + (window.scrollY || window.pageYOffset);
      var y0 = gap / 2 - (absTop % gap); if (y0 < 0) y0 += gap;
      for (var y = y0; y < H; y += gap) {
        for (var x = gap / 2; x < W; x += gap) pts.push(x, y);
      }
    }

    function frame(now) {
      if (!visible) { running = false; return; }
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;
      var t = (now - t0) / 1000;
      // Onda de corriente que barre en diagonal cada ~6s
      var wave = ((t % 6) / 6) * (W + H) * 1.4 - H * 0.4;
      ctx.clearRect(0, 0, W, H);
      var R = 150, R2 = R * R;
      for (var i = 0; i < pts.length; i += 2) {
        var x = pts[i], y = pts[i + 1];
        var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
        var m = d2 < R2 ? 1 - Math.sqrt(d2) / R : 0;
        var wd = Math.abs((x + y) - wave);
        var w = wd < 90 ? (1 - wd / 90) * 0.55 : 0;
        var k = Math.max(m, w);
        var px = x, py = y;
        if (m > 0) { px -= dx * m * 0.18; py -= dy * m * 0.18; }
        var s = 1 + k * 2.2;
        // Color base del punto: claro sobre fondo oscuro; en secciones que pasan a claro (data-fade) se oscurece
        var br = 243, bgc = 242, bb = 238, ba = 1;
        if (fade > 0) {
          var f = Math.max(0, Math.min(1, y / fade));
          br = Math.round(243 - 229 * f); bgc = Math.round(242 - 228 * f); bb = Math.round(238 - 226 * f);
          ba = 1 + f * 0.6;
        }
        if (k > 0.05) {
          ctx.fillStyle = m >= w
            ? "rgba(" + Math.round(br + (92 - br) * m) + "," + Math.round(bgc + (157 - bgc) * m) + "," + Math.round(bb + (255 - bb) * m) + "," + (0.25 + m * 0.75) + ")"
            : "rgba(" + br + "," + bgc + "," + bb + "," + (0.14 + w * 0.45) * ba + ")";
        } else {
          ctx.fillStyle = "rgba(" + br + "," + bgc + "," + bb + "," + (0.09 * ba) + ")";
        }
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
      requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }

    build();
    window.addEventListener("resize", function () { build(); });
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    });
    hero.addEventListener("pointerleave", function () { mouse.tx = -9999; mouse.ty = -9999; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start();
      }, { threshold: 0 }).observe(hero);
    }
    start();
  }

  /* ---------- Botones magnéticos ---------- */
  function initMagnetic() {
    if (window.matchMedia && !window.matchMedia("(hover: hover)").matches) return;
    $all(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.32;
        b.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }


  /* ---------- Al entrar a una página, empezar siempre desde arriba (hero) ---------- */
  function initScrollTop() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var toTop = function () {
      if (location.hash && doc.querySelector(location.hash)) return; // respeta links a una sección (#faq, etc.)
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      doc.documentElement.scrollTop = 0; doc.body.scrollTop = 0;
      root.style.scrollBehavior = "";
    };
    toTop();
    window.addEventListener("load", toTop);
    window.addEventListener("pageshow", function (e) { if (e.persisted) toTop(); });
  }

  function boot() {
    safe(initScrollTop, "scrollTop");
    safe(initConfig, "config");
    safe(initNav, "nav");
    safe(initHeroTitle, "heroTitle");
    safe(initReveal, "reveal");
    safe(initHow, "how");
    safe(initFaq, "faq");
    safe(initMovingCards, "movingCards");
    safe(initStack, "stack");
    safe(initCountUp, "countUp");
    safe(initSpotlight, "spotlight");
    safe(initLightSwitch, "lightSwitch");
    safe(initGrid, "grid");
    safe(initMagnetic, "magnetic");
    safe(initScrollCue, "scrollCue");
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
