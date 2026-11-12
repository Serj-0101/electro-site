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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!section || !stage || !canvas || !window.THREE || reduceMotion) return;

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
    WIRES.forEach((w) => {
      const curve = new THREE.Curve();
      curve.getPoint = (t, target = new THREE.Vector3()) => {
        const y = (t - 0.5) * BRAID_H;
        const a = wireAngle(y, w);
        const r = wireRadius(y, w);
        return target.set(Math.cos(a) * r, y, Math.sin(a) * r);
      };
      wireCurves.push(curve);
      /* сама трубка мягко светится; весь свет несут случайные молнии */
      braid.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 380, 0.05, 8, false), makeWireMaterial(w, 0.34, 0.1, 0.45)));
      braid.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 380, 0.15, 8, false), makeWireMaterial(w, 0.07, 0.04, 0.7)));
    });

    /* Пул спрайтов: головы и хвосты молний */
    const BOLT_POOL = 120;
    const boltSprites = [];
    for (let i = 0; i < BOLT_POOL; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sp.visible = false;
      braid.add(sp);
      boltSprites.push(sp);
    }
    let spriteCursor = 0;
    const takeSprites = (n) => {
      const arr = [];
      for (let k = 0; k < n; k++) { arr.push(boltSprites[spriteCursor % BOLT_POOL]); spriteCursor++; }
      return arr;
    };

    const TRAIL = 5;         // спрайтов в хвосте одной «нити»
    const bolts = [];
    const spawnBolt = (o = {}) => {
      if (bolts.length > 26) return;                 // защита от перенасыщения
      const wIdx = o.wire !== undefined ? o.wire : Math.floor(Math.random() * WIRES.length);
      const depth = o.depth || 0;
      bolts.push({
        wIdx,
        w: WIRES[wIdx],
        u: o.u !== undefined ? o.u : 0.03 + Math.random() * 0.3,  // рождение внизу трубки
        speed: (o.speed || 0.2 + Math.random() * 0.15) * (1 + depth * 0.18),
        bright: o.bright !== undefined ? o.bright : 1,
        depth,
        gap: 0.006 + Math.random() * 0.01 + depth * 0.004,
        size: (isMobile ? 0.3 : 0.38) * (1 - depth * 0.16),       // ветви — тоньше
        sps: takeSprites(TRAIL).map((sp) => {
          sp.material.color.setHex(WIRES[wIdx].color);
          return { sp, m: sp.material };
        }),
      });
    };

    let nextBolt = 0.6;

    const updateBolts = (dt, t) => {
      /* случайное рождение: очень яркий пучок внизу трубки */
      if (t > nextBolt) {
        nextBolt = t + 0.45 + Math.random() * 1.5;
        spawnBolt();
        if (Math.random() < 0.3) spawnBolt();
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.u += b.speed * dt;                       // всегда снизу вверх
        /* затухание ближе к верху и по времени жизни */
        if (b.u > 0.7) b.bright *= 1 - Math.min(1, 2.2 * dt);
        b.bright *= 1 - 0.1 * dt;
        /* случайное ветвление: пучок делится на 1–2 дочерних */
        if (b.depth < 3 && b.u > 0.08 && b.bright > 0.22 && Math.random() < 0.9 * dt) {
          const kids = 1 + Math.floor(Math.random() * 2);
          for (let k = 0; k < kids; k++) {
            const spread = Math.random() < 0.55
              ? b.wIdx
              : (b.wIdx + (Math.random() < 0.5 ? 1 : WIRES.length - 1)) % WIRES.length;
            spawnBolt({
              wire: spread,
              u: Math.max(0.02, b.u - 0.008 - Math.random() * 0.02),
              speed: b.speed * (0.75 + Math.random() * 0.6),
              bright: b.bright * (0.45 + Math.random() * 0.4),
              depth: b.depth + 1,
            });
          }
          b.bright *= 0.7;                          // энергия делится между пучками
        }
        /* смерть: рассыпался и погас */
        if (b.u > 0.985 || b.bright < 0.05) {
          b.sps.forEach(({ sp }) => { sp.visible = false; });
          bolts.splice(i, 1);
          continue;
        }
        /* хвост: от яркой головы к тоненькой ниточке */
        const fadeIn = Math.min(1, b.u / 0.05);
        b.sps.forEach(({ sp, m }, j) => {
          const uu = Math.max(0.001, b.u - j * b.gap);
          sp.position.copy(wireCurves[b.wIdx].getPoint(uu));
          const f = (1 - j / TRAIL) * b.bright * fadeIn;
          m.opacity = f;
          sp.scale.setScalar(b.size * (1 - (j / TRAIL) * 0.7) * (0.75 + f * 0.5));
          sp.visible = true;
        });
      }
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

      // провода вращаются, прокрутка добавляет оборотов; молнии бегут снизу вверх
      braid.rotation.y = t * 0.45 + progress * Math.PI * 8;
      wireUniforms.forEach((u) => { u.uTime.value = t; });
      updateBolts(dt, t);

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
