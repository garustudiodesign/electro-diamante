/*!
 * hero-waves.js — Fondo animado (ondas + puntos de luz) en WebGL para el HERO.
 * JS vanilla, sin dependencias ni build. Expone una sola función global:
 *
 *   initHeroWaves(containerSelector [, opciones])
 *
 * Devuelve { destroy() } o null si no encuentra el contenedor.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // AJUSTES POR DEFECTO (se pueden pisar con el 2º parámetro de initHeroWaves)
  // ---------------------------------------------------------------------------
  var DEFAULTS = {
    intensity: 0.6,          // opacidad general de líneas y puntos (0 – 1)
    speed: 0.12,             // velocidad global (overallSpeed). 0.06 = más lento
    lineColor: '#0166FC',    // azul de marca  → líneas
    dotColor: '#5C9DFF',     // azul suave     → puntos de luz
    bgFrom: '#0E0E0C',       // fondo izquierda
    bgTo: '#08162E',         // fondo derecha
    hShift: 0.12,            // posición horizontal del pico de ondulación (0.12 = a la derecha; 0 = centrado)
    rightBias: 1.0,          // 1 = las ondas suben hacia la derecha en desktop; 0 = parejas (hero centrado)
    waveY: 0.22,             // altura del centro de las ondas (0 = abajo, 1 = arriba)
    linesDesktop: 16,
    linesMobile: 8,
    mobileBreakpoint: 768,   // < 768px = mobile
    maxDpr: 1.5,             // tope de devicePixelRatio
    staticTime: 6.0          // "fotograma" que se muestra con prefers-reduced-motion
  };

  var VERTEX_SRC =
    'attribute vec2 aPos;' +
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  // Shader basado en el componente original, sin grilla y con colores de marca.
  // La velocidad se aplica desde JS (iTime ya llega multiplicado por speed).
  var FRAGMENT_SRC = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2  iResolution;',
    'uniform float iTime;',
    'uniform vec3  uLineColor;',
    'uniform vec3  uDotColor;',
    'uniform vec3  uBg1;',
    'uniform vec3  uBg2;',
    'uniform float uIntensity;',
    'uniform float uWaveY;',
    'uniform float uRight;',
    'uniform float uShift;', // 1.0 desktop (ondas suben hacia la derecha), 0.0 mobile

    'const float scale = 5.0;',
    'const float smoothW = 0.015;',
    'const float minLineWidth = 0.01;',
    'const float maxLineWidth = 0.2;',
    'const float lineSpeed = 1.0;',
    'const float lineAmplitude = 1.0;',
    'const float lineFrequency = 0.2;',
    'const float warpSpeed = 0.2;',
    'const float warpFrequency = 0.5;',
    'const float warpAmplitude = 1.0;',
    'const float offsetFrequency = 0.5;',
    'const float offsetSpeed = 1.33;',
    'const float minOffsetSpread = 0.6;',
    'const float maxOffsetSpread = 2.0;',
    'const float squash = 1.5;', // comprime la banda de ondas en vertical

    'float rnd(float t){ return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0; }',
    'float smoothLine(float p, float hw, float t){ return 1.0 - smoothstep(0.0, hw, abs(p - t)); }',
    'float crispLine(float p, float hw, float t){ return 1.0 - smoothstep(hw, hw + smoothW, abs(p - t)); }',
    'float circleMask(vec2 p, float r, vec2 c){ return 1.0 - smoothstep(r, r + smoothW, length(c - p)); }',
    'float plasmaY(float x, float hf, float off){',
    '  return rnd(x * lineFrequency + iTime * lineSpeed) * hf * lineAmplitude + off;',
    '}',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / iResolution.xy;',
    // Centro de las ondas: abajo a la izquierda, sube hacia la derecha.
    '  float centerY = uWaveY + uv.x * uv.x * 0.28 * uRight;',
    '  vec2 space = vec2(gl_FragCoord.x - 0.5 * iResolution.x,',
    '                    gl_FragCoord.y - centerY * iResolution.y) / iResolution.x * 2.0 * scale;',
    '  space.y *= squash;',

    // Zona de máxima ondulación desplazada hacia la derecha (pico en x≈0.62).
    '  float hf = 1.0 - (cos((uv.x - uShift) * 6.2832) * 0.5 + 0.5);',
    '  space.y += rnd(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + hf);',
    '  space.x += rnd(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * hf;',

    '  vec3 lines = vec3(0.0);',
    '  vec3 dots  = vec3(0.0);',
    '  float offsetTime = iTime * offsetSpeed;',
    '  for (int l = 0; l < LINES; l++) {',
    '    float nli = float(l) / float(LINES);',
    '    float offPos = float(l) + space.x * offsetFrequency;',
    '    float r = rnd(offPos + offsetTime) * 0.5 + 0.5;',
    '    float hw = mix(minLineWidth, maxLineWidth, r * hf) / 2.0;',
    '    float off = rnd(offPos + offsetTime * (1.0 + nli)) * mix(minOffsetSpread, maxOffsetSpread, hf);',
    '    float lp = plasmaY(space.x, hf, off);',
    '    float line = smoothLine(lp, hw, space.y) / 2.0 + crispLine(lp, hw * 0.15, space.y);',
    '    float cx = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;',
    '    vec2 cp = vec2(cx, plasmaY(cx, hf, off));',
    '    float d = circleMask(cp, 0.012, space) * 4.0;',
    '    lines += line * r * uLineColor;',
    '    dots  += d * r * uDotColor;',
    '  }',

    // Máscara: ondas plenas en el tercio inferior y a la derecha; casi nada arriba a la izquierda.
    '  float bottomZone = 1.0 - smoothstep(0.2, 0.75, uv.y);',
    '  float rightZone  = smoothstep(0.4, 0.9, uv.x) * uRight;',
    '  float zone = mix(0.08, 1.0, clamp(max(bottomZone, rightZone), 0.0, 1.0));',
    // Fundido en los bordes superior/inferior para que el hero empalme con la sección siguiente.
    '  float edge = smoothstep(0.0, 0.1, uv.y) * (1.0 - smoothstep(0.9, 1.0, uv.y));',

    '  vec3 col = mix(uBg1, uBg2, uv.x);',
    '  col += (lines + dots) * uIntensity * zone * edge;',
    '  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);',
    '}'
  ].join('\n');

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  function hexToVec3(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function onMQ(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function offMQ(mq, fn) {
    if (mq.removeEventListener) mq.removeEventListener('change', fn);
    else if (mq.removeListener) mq.removeListener(fn);
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[hero-waves] Error de shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------
  function initHeroWaves(containerSelector, options) {
    var container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) {
      console.warn('[hero-waves] No se encontró el contenedor:', containerSelector);
      return null;
    }
    if (container.__heroWaves) return container.__heroWaves;

    var o = extend({}, DEFAULTS, options);
    container.classList.add('hw-host');

    // Canvas y overlay: usa los del HTML si existen; si no, los crea.
    var canvas = container.querySelector('canvas.hw-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'hw-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      container.insertBefore(canvas, container.firstChild);
    }
    if (!container.querySelector('.hw-overlay')) {
      var ov = document.createElement('div');
      ov.className = 'hw-overlay';
      ov.setAttribute('aria-hidden', 'true');
      canvas.parentNode.insertBefore(ov, canvas.nextSibling);
    }

    function useFallback() {
      canvas.classList.add('hw-fallback');
      container.classList.add('hw-no-webgl');
      var c = { destroy: function () { delete container.__heroWaves; } };
      container.__heroWaves = c;
      return c;
    }

    var ctxOpts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
    var gl = null;
    try {
      gl = canvas.getContext('webgl', ctxOpts) || canvas.getContext('experimental-webgl', ctxOpts);
    } catch (e) { gl = null; }
    if (!gl) return useFallback();

    var mqMobile = window.matchMedia('(max-width: ' + (o.mobileBreakpoint - 1) + 'px)');
    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var program = null, buffer = null, loc = {}, currentLines = 0;
    var rafId = 0, last = 0, elapsed = 0;
    var inView = true, pageVisible = !document.hidden, reduced = mqReduce.matches, lost = false;

    function buildProgram(lineCount) {
      if (program) gl.deleteProgram(program);
      program = null;
      var vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
      var fs = compile(gl, gl.FRAGMENT_SHADER, '#define LINES ' + lineCount + '\n' + FRAGMENT_SRC);
      if (!vs || !fs) return false;
      var p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('[hero-waves] Error de link:', gl.getProgramInfoLog(p));
        return false;
      }
      program = p;
      currentLines = lineCount;
      gl.useProgram(p);

      loc.pos = gl.getAttribLocation(p, 'aPos');
      ['iResolution', 'iTime', 'uLineColor', 'uDotColor', 'uBg1', 'uBg2', 'uIntensity', 'uWaveY', 'uRight', 'uShift']
        .forEach(function (n) { loc[n] = gl.getUniformLocation(p, n); });

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc.pos);
      gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform3fv(loc.uLineColor, hexToVec3(o.lineColor));
      gl.uniform3fv(loc.uDotColor, hexToVec3(o.dotColor));
      gl.uniform3fv(loc.uBg1, hexToVec3(o.bgFrom));
      gl.uniform3fv(loc.uBg2, hexToVec3(o.bgTo));
      gl.uniform1f(loc.uIntensity, o.intensity);
      gl.uniform1f(loc.uWaveY, o.waveY);
      return true;
    }

    function setup() {
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      return buildProgram(mqMobile.matches ? o.linesMobile : o.linesDesktop);
    }

    function shaderTime() {
      return o.staticTime + (reduced ? 0 : elapsed * o.speed);
    }

    function draw() {
      if (!program || lost) return;
      gl.uniform2f(loc.iResolution, canvas.width, canvas.height);
      gl.uniform1f(loc.iTime, shaderTime());
      gl.uniform1f(loc.uRight, mqMobile.matches ? 0.0 : o.rightBias);
      gl.uniform1f(loc.uShift, o.hShift);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function frame(now) {
      if (!last) last = now;
      elapsed += Math.min((now - last) / 1000, 0.1); // evita saltos al volver de una pausa
      last = now;
      draw();
      rafId = requestAnimationFrame(frame);
    }

    function update() {
      var shouldRun = !reduced && inView && pageVisible && !lost && !!program;
      if (shouldRun && !rafId) {
        last = 0;
        rafId = requestAnimationFrame(frame);
      } else if (!shouldRun && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function resize() {
      if (lost) return;
      var dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
      var w = Math.max(1, Math.round(container.clientWidth * dpr));
      var h = Math.max(1, Math.round(container.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      var wanted = mqMobile.matches ? o.linesMobile : o.linesDesktop;
      if (wanted !== currentLines && !buildProgram(wanted)) {
        destroy();
        useFallback();
        return;
      }
      if (!rafId) draw(); // sin animación activa: redibuja un frame estático
    }

    if (!setup()) return useFallback();

    // --- Observadores y eventos ---
    var ro = null, io = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(resize);
      ro.observe(container);
    } else {
      window.addEventListener('resize', resize);
    }

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        update();
      }, { rootMargin: '50px' });
      io.observe(container);
    }

    function onVisibility() { pageVisible = !document.hidden; update(); }
    function onReduce(e) { reduced = e.matches; update(); if (!rafId) draw(); }
    function onMobile() { resize(); }
    function onLost(e) { e.preventDefault(); lost = true; update(); }
    function onRestored() { lost = false; if (setup()) { resize(); update(); } }

    document.addEventListener('visibilitychange', onVisibility);
    onMQ(mqReduce, onReduce);
    onMQ(mqMobile, onMobile);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    function destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      offMQ(mqReduce, onReduce);
      offMQ(mqMobile, onMobile);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      delete container.__heroWaves;
    }

    resize();
    update();

    var controller = { destroy: destroy };
    container.__heroWaves = controller;
    return controller;
  }

  window.initHeroWaves = initHeroWaves;
})();
