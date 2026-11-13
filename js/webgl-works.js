/* ============================================================
   ГЕРМАН — «Наши работы»: спираль карточек вокруг трёх переплетённых
   светящихся проводов. Прокрутка раскручивает спираль (Three.js).
   Без WebGL / при reduce-motion остаётся обычная сетка.
   ============================================================ */
(() => {
  'use strict';

  const section = document.getElementById('works');
  const stage = document.getElementById('worksStage');
  const canvas = document.getElementById('works-canvas');
  /* WebGL-сцена включается на любых устройствах; лёгкая версия — только по выбору пользователя */
  if (!section || !stage || !canvas || !window.THREE || window.HERMAN_LIGHT) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  /* ---------- Данные берём из статических сеток (фолбэк) ---------- */
  const PALETTES = {
    'w-1': ['#10303f', '#0a0a0b', '#0d1b26'],
    'w-2': ['#1d3445', '#0a0a0b', '#2a2108'],
    'w-3': ['#161624', '#0a0a0b', '#0f3a4d'],
    'w-4': ['#2a2108', '#0a0a0b', '#10303f'],
    'w-5': ['#0f3a4d', '#0a0a0b', '#161624'],
    'w-6': ['#161624', '#1a3444', '#0a0a0b'],
  };
  const paletteFor = (i) => PALETTES['w-' + ((i % 6) + 1)];
  const cut = (s, n) => { s = s.trim(); return s.length > n ? s.slice(0, n).trimEnd() + '…' : s; };

  /* Услуги */
  const fromServices = [...document.querySelectorAll('.services__grid .card')].map((el, i) => ({
    title: (el.querySelector('.card__title') || el).textContent.trim(),
    sub: cut((el.querySelector('.card__text') || el).textContent, 54) + '…',
    href: el.getAttribute('href') || 'pages/services.html',
    palette: paletteFor(i),
  }));
  /* Преимущества */
  const fromAdv = [...document.querySelectorAll('.advantages__grid .adv')].map((el, i) => ({
    title: (el.querySelector('h3') || el).textContent.trim(),
    sub: cut((el.querySelector('p') || el).textContent, 54) + '…',
    href: '#contacts',
    palette: paletteFor(i + 4),
  }));
  /* Работы */
  const fromWorks = [...document.querySelectorAll('.works__grid .work')].map((el) => {
    const key = [...el.classList].find((c) => /^w-\d$/.test(c)) || 'w-1';
    const label = (el.querySelector('.work__label') || el).textContent.trim();
    const [title, ...rest] = label.split(' · ');
    return { title, sub: rest.join(' · '), href: el.getAttribute('href'), palette: PALETTES[key] };
  });
  const works = [...fromServices, ...fromAdv, ...fromWorks];
  works.forEach((w, i) => { w.seed = i + 1; });
  if (!works.length) return;

  /* ---------- Параметры спирали ---------- */
  const CARDS = works.length;
  /* dy — вертикальный шаг: подобран по проекции так, чтобы нижний правый угол
     плашки касался верхнего левого угла следующей (dy ≈ высота плашки) */
  const CFG = isMobile
    ? { radius: 2.8, width: 2.0, stepDeg: 38, dy: 1.3, camZ: 9.5 }
    : { radius: 4.5, width: 2.6, stepDeg: 30, dy: 1.8, camZ: 11 };
  const STEP = (CFG.stepDeg * Math.PI) / 180;
  const CARD_ASPECT = 1.6;
  const CARD_H = CFG.width / CARD_ASPECT;
  const CYAN = 0x00d4ff;

  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /* ---------- Процедурная «превьюшка» работы ---------- */
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const BOLT = new Path2D('M13 2L4 14h6l-1 8 9-12h-6l1-8z');

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function makeCardTexture(work, index, maxAniso) {
    const W = 1024, H = 640;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rnd = mulberry32(work.seed * 97 + 13);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, work.palette[0]);
    bg.addColorStop(0.55, work.palette[1]);
    bg.addColorStop(1, work.palette[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // «печатная плата»: ломаные под 90° с узлами на концах
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    for (let i = 0; i < 16; i++) {
      const warm = rnd() < 0.18;
      const col = warm ? '255,184,0' : '0,212,255';
      let x = Math.floor(rnd() * (W / 32)) * 32;
      let y = Math.floor(rnd() * (H / 32)) * 32;
      let horizontal = rnd() < 0.5;
      ctx.strokeStyle = `rgba(${col},${0.16 + rnd() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 3 + Math.floor(rnd() * 5);
      for (let s = 0; s < segs; s++) {
        const len = (1 + Math.floor(rnd() * 5)) * 32 * (rnd() < 0.5 ? -1 : 1);
        if (horizontal) x += len; else y += len;
        ctx.lineTo(x, y);
        horizontal = !horizontal;
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${col},0.55)`;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    }

    // молния с мягким свечением
    ctx.save();
    ctx.translate(W * 0.62, H * 0.12);
    ctx.scale(17, 17);
    ctx.shadowColor = 'rgba(0,212,255,0.9)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'rgba(0,212,255,0.16)';
    ctx.fill(BOLT);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.12;
    ctx.strokeStyle = 'rgba(0,212,255,0.7)';
    ctx.stroke(BOLT);
    ctx.restore();

    // нижняя подложка под текст
    const shade = ctx.createLinearGradient(0, H * 0.4, 0, H);
    shade.addColorStop(0, 'rgba(10,10,11,0)');
    shade.addColorStop(1, 'rgba(10,10,11,0.92)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, H * 0.4, W, H * 0.6);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#00D4FF';
    ctx.font = '600 26px Manrope, system-ui, sans-serif';
    ctx.fillText(String((index % works.length) + 1).padStart(2, '0'), 56, 74);

    ctx.fillStyle = '#F5F5F7';
    ctx.font = '600 46px Unbounded, system-ui, sans-serif';
    const lines = wrapText(ctx, work.title, W - 112).slice(0, 2);
    const subY = H - 52;
    const titleY = subY - 22 - (lines.length - 1) * 58;
    lines.forEach((l, i) => ctx.fillText(l, 56, titleY - 6 + i * 58 + 0));
    if (work.sub) {
      ctx.fillStyle = '#9A9AA5';
      ctx.font = '500 28px Manrope, system-ui, sans-serif';
      ctx.fillText(work.sub, 56, subY + 8);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  }

  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- Старт после загрузки шрифтов (текст рисуется на canvas) ---------- */
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([
        document.fonts.load('600 46px Unbounded', 'Квартира-новостройка'),
        document.fonts.load('500 28px Manrope', 'проводка под ключ'),
      ]).catch(() => {})
    : Promise.resolve();

  fontsReady.then(init);

  function init() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, CFG.camZ);

    const glowTex = makeGlowTexture();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const root = new THREE.Group();   // реагирует на мышь
    const helix = new THREE.Group();  // вращается и «скользит» от прокрутки
    scene.add(root);
    root.add(helix);

    /* ----- Три переплетённых провода (коса), вращаются вокруг оси ----- */
    const BRAID_H = 24;
    const BRAID_R = isMobile ? 0.42 : 0.55;
    const TWIST = 1.5;          // рад на единицу высоты
    const PERIOD = 4;           // расстояние между импульсами
    const WRAP = 16;            // кратно PERIOD
    const WIRES = [
      { phase: 0,     color: 0xdd4a4a, speed: 2.4 },              // слегка красная
      { phase: 1 / 3, color: 0x4a7bdd, speed: -1.9 },             // слегка синяя
      { phase: 2 / 3, color: 0xd9b93a, speed: 2.9, stripe: 1 },   // слегка жёлтая + тонкая зелёная полоса
    ];
    const wireAngle = (y, w) => w.phase * Math.PI * 2 + y * TWIST;
    const wireRadius = (y, w) => BRAID_R + 0.14 * Math.sin(y * 0.9 + w.phase * 6);

    const braid = new THREE.Group();
    root.add(braid);
    const wireUniforms = [];

    const wireVertex = `
      varying vec3 vN;
      varying float vY;
      varying vec2 vUv;
      void main() {
        vN = normalize(normalMatrix * normal);
        vY = position.y;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const wireFragment = `
      uniform float uTime, uBase, uGain, uPhase, uSpeed, uPeriod, uWidth, uStripe;
      uniform vec3 uColor;
      varying vec3 vN;
      varying float vY;
      varying vec2 vUv;
      void main() {
        float s = fract((vY - uSpeed * uTime) / uPeriod + uPhase);
        float d = (s - 0.5) * uPeriod;
        float pulse = exp(-d * d / (uWidth * uWidth));
        pulse *= 0.7 + 0.3 * sin(uTime * 9.0 + uPhase * 20.0);
        float rim = 1.0 - abs(vN.z);
        float a = uBase * (0.45 + 0.9 * rim) + pulse * uGain;
        vec3 col = mix(uColor, vec3(1.0), pulse * 0.7) * (1.0 + pulse * 1.4);
        /* тонкая зелёная полоса вдоль всей трубки (uStripe включает) */
        float stripe = uStripe * (1.0 - smoothstep(0.03, 0.055, abs(vUv.y - 0.5)));
        col = mix(col, vec3(0.25, 0.9, 0.45) * (1.0 + pulse * 1.2), stripe);
        a = max(a, stripe * 0.85);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`;

    const makeWireMaterial = (w, base, gain, width) => {
      const u = {
        uTime: { value: 0 }, uBase: { value: base }, uGain: { value: gain },
        uPhase: { value: w.phase }, uSpeed: { value: w.speed }, uPeriod: { value: PERIOD },
        uWidth: { value: width }, uColor: { value: new THREE.Color().setHex(w.color, THREE.LinearSRGBColorSpace) },
        uStripe: { value: w.stripe || 0 },
      };
      wireUniforms.push(u);
      return new THREE.ShaderMaterial({
        uniforms: u, vertexShader: wireVertex, fragmentShader: wireFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
    };

    /* ----- Молнии: случайные ветвящиеся разряды, бегут снизу вверх ----- */
    const wireCurves = [];
    /* ----- Изгибающаяся ось жгута: случайные изгибы вместо прямой линии ----- */
    const axisX = (y) => Math.sin(y * 0.32 + 0.8) * 1.05 + Math.sin(y * 0.13 + 2.1) * 0.7;
    const axisZ = (y) => Math.cos(y * 0.27 + 1.4) * 0.85 + Math.sin(y * 0.11 + 4.2) * 0.55;

    WIRES.forEach((w) => {
      const curve = new THREE.Curve();
      curve.getPoint = (t, target = new THREE.Vector3()) => {
        const y = (t - 0.5) * BRAID_H;
        const a = wireAngle(y, w);
        const r = wireRadius(y, w);
        /* обмотка вокруг изогнутой оси: точка намотки + смещение оси в этой высоте */
        return target.set(Math.cos(a) * r + axisX(y), y, Math.sin(a) * r + axisZ(y));
      };
      wireCurves.push(curve);
      /* сама трубка мягко светится; весь свет несут случайные молнии.
         Диаметр ×4 (радиус 0.05→0.2), ореол также ×4 (0.15→0.6); оси плетения не менялись */
      braid.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 380, 0.2, 8, false), makeWireMaterial(w, 0.34, 0.1, 0.45)));
      braid.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 380, 0.6, 8, false), makeWireMaterial(w, 0.07, 0.04, 0.7)));
    });

    /* ----- Настоящие молнии: фрактальные разряды с хаотичным ветвлением ----- */
    const MAX_SEG = isMobile ? 1100 : 1600;
    const CORE_W = [0.021, 0.0135, 0.0095, 0.0065, 0.005];   // полуширина белой жилы по поколениям
    const GLOW_K = [10, 8, 6.5, 5.5, 5];                 // во сколько раз шире ореол
    const CORE_A = [1, 0.85, 0.7, 0.55, 0.45];
    const GLOW_A = [0.34, 0.26, 0.2, 0.15, 0.12];
    const LEVELS = [5, 4, 3, 2, 2];                      // глубина дробления пути
    const BRANCH_P = [0.45, 0.35, 0.28, 0.18, 0];        // шанс ветви в каждой вершине
    const GLOW_COLORS = [[0.45, 0.62, 1], [0.62, 0.45, 1], [0.3, 0.78, 1]];
    const GROW = 0.96;                                // время пробоя снизу вверх ~1 с (жизнь ×4)
    const BOLT_Y0 = 6.6, BOLT_Y1 = -6.6;

    const lightningVertex = `
      attribute float aSide;
      attribute vec4 aColor;
      attribute float aT;
      attribute float aDepth;
      attribute float aShape;
      varying float vSide;
      varying vec4 vColor;
      varying float vT;
      varying float vDepth;
      varying float vShape;
      void main() {
        vSide = aSide; vColor = aColor; vT = aT; vDepth = aDepth; vShape = aShape;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`;
    const lightningFragment = `
      uniform float uHead, uFlash, uTime;
      varying float vSide;
      varying vec4 vColor;
      varying float vT;
      varying float vDepth;
      varying float vShape;
      void main() {
        float grown = 1.0 - smoothstep(uHead - 0.7, uHead, vT);
        float tip = exp(-pow((uHead - vT) * 1.6, 2.0));
        float s = abs(vSide);
        float prof = vShape > 0.5 ? pow(1.0 - s, 1.5) : pow(1.0 - s, 2.4);
        float fl = 1.0 - vDepth * 0.28 * step(0.55, fract(sin(vT * 37.0 + floor(uTime * 26.0) * 7.31) * 43758.5453));
        float a = vColor.a * prof * grown * fl * uFlash;
        vec3 col = vColor.rgb * (1.0 + tip * 1.6) * (1.0 + uFlash * 0.6);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`;

    const lightning = [];
    const rnd = Math.random;

    const makeBoltSlot = (x, wait) => {
      const quads = MAX_SEG * 2;                       // первая половина — ореол, вторая — жила
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(quads * 12);
      const col = new Float32Array(quads * 16);
      const tt = new Float32Array(quads * 4);
      const dep = new Float32Array(quads * 4);
      const side = new Float32Array(quads * 4);
      const shape = new Float32Array(quads * 4);
      const idx = new Uint32Array(quads * 6);
      for (let q = 0; q < quads; q++) {
        const v = q * 4;
        side.set([1, -1, 1, -1], v);
        shape.fill(q < MAX_SEG ? 0 : 1, v, v + 4);
        idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], q * 6);
      }
      const attrs = {
        position: new THREE.BufferAttribute(pos, 3),
        aColor: new THREE.BufferAttribute(col, 4),
        aT: new THREE.BufferAttribute(tt, 1),
        aDepth: new THREE.BufferAttribute(dep, 1),
        aSide: new THREE.BufferAttribute(side, 1),
        aShape: new THREE.BufferAttribute(shape, 1),
      };
      Object.entries(attrs).forEach(([k, a]) => geo.setAttribute(k, a));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));

      const uniforms = { uHead: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 } };
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms, vertexShader: lightningVertex, fragmentShader: lightningFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      mesh.frustumCulled = false;
      mesh.visible = false;
      braid.add(mesh);

      const makeHalo = () => {
        const h = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, color: 0x6a8cff, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        h.visible = false;
        root.add(h);
        return h;
      };

      const slot = {
        x, wait, active: false, age: 0, maxT: 1, peaks: [], mesh, uniforms, attrs,
        haloTop: makeHalo(), haloMid: makeHalo(),
      };
      lightning.push(slot);
      return slot;
    };

    /* ломаный путь методом смещения середины: каждый раунд делит отрезки пополам и сдвигает середину вбок */
    const jagged = (a, b, levels, disp) => {
      let pts = [a.clone(), b.clone()];
      for (let l = 0; l < levels; l++) {
        const next = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1];
          const mid = p.clone().add(q).multiplyScalar(0.5);
          const dir = q.clone().sub(p).normalize();
          const r = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, (rnd() - 0.5) * 0.5);
          r.addScaledVector(dir, -r.dot(dir));
          mid.addScaledVector(r, disp * 2);
          next.push(p, mid);
        }
        next.push(pts[pts.length - 1]);
        pts = next;
        disp *= 0.55;
      }
      return pts;
    };

    const writeQuad = (slot, quad, s, w, r, g, b, alpha) => {
      const { position, aColor, aT, aDepth } = slot.attrs;
      const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
      const len = Math.hypot(dx, dy, s.b.z - s.a.z) || 1;
      let px = -dy, py = dx;
      const pl = Math.hypot(px, py);
      if (pl < 1e-5) { px = 1; py = 0; } else { px /= pl; py /= pl; }
      const ex = ((s.b.x - s.a.x) / len) * w * 0.5;
      const ey = ((s.b.y - s.a.y) / len) * w * 0.5;
      const ez = ((s.b.z - s.a.z) / len) * w * 0.5;
      const v = quad * 4;
      const set = (k, X, Y, Z, T) => {
        position.setXYZ(v + k, X, Y, Z);
        aColor.setXYZW(v + k, r, g, b, alpha);
        aT.setX(v + k, T);
        aDepth.setX(v + k, s.d);
      };
      set(0, s.a.x - ex + px * w, s.a.y - ey + py * w, s.a.z - ez, s.ta);
      set(1, s.a.x - ex - px * w, s.a.y - ey - py * w, s.a.z - ez, s.ta);
      set(2, s.b.x + ex + px * w, s.b.y + ey + py * w, s.b.z + ez, s.tb);
      set(3, s.b.x + ex - px * w, s.b.y + ey - py * w, s.b.z + ez, s.tb);
    };

    const strikeBolt = (slot) => {
      const segs = [];
      let maxT = 1;

      /* рекурсивный рост ветви: свой бюджет сегментов, чтобы не съесть канал */
      const addPath = (a, b, depth, t0, budget) => {
        const startLen = segs.length;
        const len = a.distanceTo(b);
        const pts = jagged(a, b, LEVELS[depth], len * (depth === 0 ? 0.11 : 0.15));
        const ts = [t0];
        for (let i = 1; i < pts.length; i++) ts.push(ts[i - 1] + pts[i].distanceTo(pts[i - 1]));
        const limit = startLen + budget;
        for (let i = 0; i < pts.length - 1; i++) {
          if (segs.length >= Math.min(MAX_SEG, limit)) return;
          segs.push({ a: pts[i], b: pts[i + 1], d: depth, ta: ts[i], tb: ts[i + 1] });
        }
        maxT = Math.max(maxT, ts[ts.length - 1]);
        if (BRANCH_P[depth] === 0) return;
        for (let i = 1; i < pts.length - 1; i++) {
          if (segs.length >= limit - 2) break;
          if (rnd() >= BRANCH_P[depth]) continue;
          const dirn = pts[i + 1].clone().sub(pts[i - 1]).normalize();
          const sideV = new THREE.Vector3(rnd() - 0.5, (rnd() - 0.5) * (depth === 0 ? 0.4 : 1), (rnd() - 0.5) * 1.0).normalize();
          const bd = dirn.multiplyScalar(0.5).addScaledVector(sideV, 1.1);
          if (depth === 0) bd.y = Math.abs(bd.y) + 0.12;   // ветви основного канала тянутся вверх
          bd.normalize();
          const blen = len * (0.6 + rnd() * 0.9) * (depth === 0 ? 1 : 0.85);
          addPath(pts[i], pts[i].clone().addScaledVector(bd, blen), depth + 1, ts[i], budget * 0.5);
        }
      };

      /* главный канал: вдоль трубки снизу вверх — рождение внутри, отрыв наружу,
         спиральный обход и дрожание. Сначала строится ЦЕЛИКОМ (гарантированная
         длина — свой бюджет), ветви добавляются только из оставшихся сегментов */
      const wIdx = Math.floor(rnd() * WIRES.length);
      const curve = wireCurves[wIdx];
      const K = isMobile ? 10 : 14;
      const u0 = 0.0, u1 = 1.0;              // вся длина трубки — на весь экран
      const spin = rnd() * Math.PI * 2;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const u = u0 + (u1 - u0) * (k / K);
        const p = curve.getPoint(u);
        /* вынос наружу: рождение внутри трубки → спиральный отрыв к поверхности и дальше */
        const e = -0.03 + (k / K) * (0.5 + rnd() * 0.2) + Math.sin(u * 47.9 + k * 3.1) * 0.07;
        p.x += Math.cos(spin + u * 16) * e;
        p.z += Math.sin(spin + u * 16) * e;
        /* дрожание канала — рваная молния */
        p.x += (rnd() - 0.5) * 0.2;
        p.y += (rnd() - 0.5) * 0.16;
        p.z += (rnd() - 0.5) * 0.2;
        pts.push(p);
      }
      const CHANNEL_BUDGET = Math.floor(MAX_SEG * 0.55);   // главный канал — половина бюджета
      let prevT = 0, firstPt = pts[0], midPt = pts[Math.floor(K / 2)];
      const mainTs = [0];
      for (let k = 0; k < K; k++) {
        const a = pts[k], b2 = pts[k + 1];
        const sub = jagged(a, b2, LEVELS[0], a.distanceTo(b2) * 0.11);
        for (let i = 0; i < sub.length - 1; i++) {
          if (segs.length >= CHANNEL_BUDGET) break;
          segs.push({ a: sub[i], b: sub[i + 1], d: 0, ta: prevT, tb: prevT + sub[i].distanceTo(sub[i + 1]) });
          prevT += sub[i].distanceTo(sub[i + 1]);
        }
        mainTs.push(prevT);
        maxT = Math.max(maxT, prevT);
      }
      /* ветви — из оставшегося бюджета, вверх и в стороны */
      const branchBudget = MAX_SEG - CHANNEL_BUDGET;
      for (let i = 1; i < pts.length - 1; i++) {
        if (segs.length >= MAX_SEG - 4) break;
        if (rnd() >= BRANCH_P[0]) continue;
        const dirn = pts[i + 1].clone().sub(pts[i - 1]).normalize();
        const sideV = new THREE.Vector3(rnd() - 0.5, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 1.0).normalize();
        const bd = dirn.multiplyScalar(0.5).addScaledVector(sideV, 1.1);
        bd.y = Math.abs(bd.y) + 0.12;                      // ветви тянутся вверх
        bd.normalize();
        const blen = pts[i + 1].distanceTo(pts[i]) * (0.6 + rnd() * 0.9);
        addPath(pts[i], pts[i].clone().addScaledVector(bd, blen), 1, mainTs[i],
          Math.max(60, branchBudget - (segs.length - CHANNEL_BUDGET)));
      }

      const [gr, gg, gb] = GLOW_COLORS[Math.floor(rnd() * GLOW_COLORS.length)];
      slot.attrs.position.array.fill(0);
      segs.forEach((s, k) => {
        writeQuad(slot, k, s, CORE_W[s.d] * GLOW_K[s.d], gr, gg, gb, GLOW_A[s.d]);
        writeQuad(slot, MAX_SEG + k, s, CORE_W[s.d], 0.93, 0.96, 1, CORE_A[s.d]);
      });
      Object.values(slot.attrs).forEach((a) => { a.needsUpdate = true; });

      slot.haloTop.material.color.setRGB(gr, gg, gb);
      slot.haloMid.material.color.setRGB(gr, gg, gb);
      slot.haloTop.position.set(firstPt.x, firstPt.y - 0.7, firstPt.z);
      slot.haloTop.scale.setScalar(isMobile ? 4 : 5.5);
      slot.haloMid.position.copy(midPt);
      slot.haloMid.scale.setScalar(isMobile ? 6 : 8);

      slot.maxT = maxT;
      slot.age = 0;
      slot.active = true;
      slot.peaks = [0.88 + rnd() * 0.4, 1.8 + rnd() * 0.6];
      if (rnd() < 0.55) slot.peaks.push(2.8 + rnd() * 0.5);
      slot.mesh.visible = true;
      slot.haloTop.visible = true;
      slot.haloMid.visible = true;
    };

    (isMobile ? [-1.2, 0, 1.2] : [-3.6, -0.3, 3.4]).forEach((x, i) => makeBoltSlot(x, 0.1 + i * 0.6));

    const updateLightning = (dt, t) => {
      lightning.forEach((s) => {
        s.uniforms.uTime.value = t;
        if (!s.active) {
          s.wait -= dt;
          if (s.wait <= 0) strikeBolt(s);
          return;
        }
        s.age += dt;
        const g = Math.min(1, s.age / GROW);
        s.uniforms.uHead.value = g < 1 ? s.maxT * (1 - (1 - g) * (1 - g)) : s.maxT + 5;

        let f;
        if (g < 1) {
          f = 1.15;
        } else {
          const a = s.age - GROW;
          f = 0.85 * Math.exp(-a * 0.375);
          s.peaks.forEach((p) => { if (a > p) f += 0.9 * Math.exp(-(a - p) * 13); });
          f *= 0.88 + rnd() * 0.24;
          f *= 1 - smoothstep(6.0, 7.6, a);
        }
        s.uniforms.uFlash.value = f;
        s.haloTop.material.opacity = Math.min(1, f * 0.34);
        s.haloMid.material.opacity = Math.min(1, f * 0.11);

        if (s.age > GROW + 7.6) {
          s.active = false;
          s.mesh.visible = false;
          s.haloTop.visible = false;
          s.haloMid.visible = false;
          s.wait = 0.3 + rnd() * 1.0;
        }
      });
    };

    /* ----- Спираль: рельса + карточки + спицы к хребту ----- */
    const railPts = [];
    const RAIL_SEGMENTS = 260;
    for (let i = 0; i <= RAIL_SEGMENTS; i++) {
      const k = -1 + (i / RAIL_SEGMENTS) * (CARDS + 1);
      railPts.push(new THREE.Vector3(Math.sin(k * STEP) * CFG.radius, -k * CFG.dy, Math.cos(k * STEP) * CFG.radius));
    }
    const rail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(railPts),
      new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    helix.add(rail);

    const cards = [];
    const spokeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(0, 0, CFG.radius * 0.96),
    ]);
    const arc = CFG.width / CFG.radius;
    const cardGeo = new THREE.CylinderGeometry(CFG.radius, CFG.radius, CARD_H, 28, 1, true, -arc / 2, arc);
    const textures = works.map((w, i) => makeCardTexture(w, i, maxAniso));

    for (let i = 0; i < CARDS; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = i * STEP;
      pivot.position.y = -i * CFG.dy;

      const mat = new THREE.MeshBasicMaterial({
        map: textures[i % works.length], side: THREE.DoubleSide, transparent: true,
      });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.userData.index = i;
      pivot.add(mesh);

      pivot.add(new THREE.Line(spokeGeo, new THREE.LineBasicMaterial({
        color: CYAN, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
      })));

      const node = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: CYAN, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      node.scale.setScalar(0.7);
      pivot.add(node);

      helix.add(pivot);
      cards.push({ pivot, mesh, mat, node, angle: i * STEP, y: -i * CFG.dy, scale: 1, pop: 0 });
    }

    /* ----- Космическая пыль вокруг ----- */
    const DUST = isMobile ? 220 : 520;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 26;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.05, map: glowTex, color: 0x6fdcff, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(dust);

    /* ----- Интерфейс ----- */
    const ui = {
      index: document.getElementById('worksIndex'),
      total: document.getElementById('worksTotal'),
      name: document.getElementById('worksName'),
      sub: document.getElementById('worksSub'),
      link: document.getElementById('worksLink'),
      hint: document.getElementById('worksHint'),
      bar: document.getElementById('worksProgress'),
    };
    if (ui.total) ui.total.textContent = String(works.length).padStart(2, '0');

    // Для скринридеров и клавиатуры — список ссылок
    const list = document.createElement('ul');
    list.className = 'sr-only';
    works.forEach((w) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = w.href;
      a.textContent = w.sub ? `${w.title} — ${w.sub}` : w.title;
      li.appendChild(a);
      list.appendChild(li);
    });
    stage.appendChild(list);

    let shownWork = -1;
    const showWork = (n) => {
      if (n === shownWork) return;
      const first = shownWork === -1;
      shownWork = n;
      const w = works[n];
      const apply = () => {
        if (ui.index) ui.index.textContent = String(n + 1).padStart(2, '0');
        if (ui.name) ui.name.textContent = w.title;
        if (ui.sub) ui.sub.textContent = w.sub;
        if (ui.link) { ui.link.href = w.href; ui.link.classList.remove('is-swapping'); }
      };
      if (first || !ui.link) { apply(); return; }
      ui.link.classList.add('is-swapping');
      setTimeout(apply, 180);
    };
    showWork(0);

    /* ----- Мышь, наведение, клик ----- */
    const ring = document.getElementById('cursorRing');
    const pointer = new THREE.Vector2(9, 9);
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let hovered = -1;
    const raycaster = new THREE.Raycaster();

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      tmx = pointer.x; tmy = pointer.y;
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => { pointer.set(9, 9); tmx = 0; tmy = 0; });
    canvas.addEventListener('click', () => {
      if (hovered > -1) window.location.href = works[hovered % works.length].href;
    });

    /* ----- Размер ----- */
    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = camera.aspect < 0.8 ? Math.max(CFG.camZ, 9.5) : CFG.camZ;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    /* ----- Прогресс прокрутки внутри секции ----- */
    const getTarget = () => {
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };
    let progress = getTarget();
    let visible = false;
    let rafId = 0;

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && !rafId && !document.hidden) loop();
    }, { rootMargin: '10% 0px' }).observe(stage);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && visible && !rafId) loop();
    });

    const clock = new THREE.Clock();

    function loop() {
      if (!visible || document.hidden) { rafId = 0; return; }
      rafId = requestAnimationFrame(loop);

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const target = getTarget();
      const velocity = target - progress;
      progress += velocity * 0.045;                     // очень мягкое сглаживание

      const f = progress * (CARDS - 1);                 // «номер» карточки в центре
      helix.rotation.y = -f * STEP;
      helix.position.y = f * CFG.dy;

      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      root.rotation.y = mx * 0.12;
      root.rotation.x = my * 0.06;
      dust.rotation.y = t * 0.02 + progress * 0.8;
      dust.position.y = progress * 1.5;

      // провода вращаются, прокрутка добавляет оборотов; молнии бьют сверху вниз
      braid.rotation.y = t * 0.45 + progress * Math.PI * 8;
      wireUniforms.forEach((u) => { u.uTime.value = t; });
      updateLightning(dt, t);

      // яркость и прозрачность каждой карточки по положению
      const activeFloat = f;
      const activeIdx = Math.max(0, Math.min(CARDS - 1, Math.round(activeFloat)));
      cards.forEach((c, i) => {
        const worldAngle = c.angle + helix.rotation.y;
        const facing = Math.cos(worldAngle);                      // 1 — лицом к камере
        const worldY = c.y + helix.position.y;
        const bright = 0.22 + 0.78 * smoothstep(-0.35, 0.95, facing);
        c.mat.color.setScalar(bright);
        c.mat.opacity = 1 - smoothstep(2.8, 5.6, Math.abs(worldY));
        c.mesh.visible = c.mat.opacity > 0.01;
        c.node.material.opacity = 0.35 + 0.65 * Math.max(0, 1 - Math.abs(activeFloat - i) * 0.6);

        /* «всплытие»: центральная (+ под курсором) плашка +20% и выдвигается к зрителю */
        const wantPop = (i === activeIdx || hovered === i) ? 1 : 0;
        c.pop += (wantPop - c.pop) * 0.08;
        const goal = 1 + 0.2 * c.pop;
        c.scale += (goal - c.scale) * 0.08;
        c.mesh.scale.set(c.scale, c.scale, c.scale);
        c.mesh.position.z = 0.32 * c.pop;
      });

      // наведение: берём только карточки, повёрнутые к камере
      hovered = -1;
      if (Math.abs(pointer.x) <= 1) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(cards.filter((c) => c.mesh.visible).map((c) => c.mesh), false);
        for (const h of hits) {
          const idx = h.object.userData.index;
          const wa = cards[idx].angle + helix.rotation.y;
          if (Math.cos(wa) > 0.3) { hovered = idx; break; }
        }
      }
      canvas.style.cursor = hovered > -1 ? 'pointer' : '';
      if (ring) ring.classList.toggle('cursor-ring--hover', hovered > -1);

      // подпись текущей работы
      const active = Math.min(CARDS - 1, Math.max(0, Math.round(f)));
      showWork(active % works.length);
      if (ui.bar) ui.bar.style.transform = `scaleY(${progress.toFixed(4)})`;
      if (ui.hint) ui.hint.classList.toggle('is-hidden', progress > 0.03);

      renderer.render(scene, camera);
    }

    section.classList.add('works--3d');
    resize();
    visible = true;
    loop();
  }
})();
