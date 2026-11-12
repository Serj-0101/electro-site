/* ============================================================
   ГЕРМАН — WebGL-сцена в стиле Active Theory
   Три переплетающихся полупрозрачных провода (белый/синий/красный)
   с бегущими по ним пульсирующими молниями + винтовые плашки,
   управляемые прокруткой страницы
   ============================================================ */
(() => {
  'use strict';

  const canvas = document.getElementById('webgl-scene');
  const hero = document.querySelector('.hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const fallback = () => { if (hero) hero.classList.add('no-webgl'); };
  if (!canvas || !window.THREE || reduceMotion) { fallback(); return; }

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0b, 0.055);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    /* Мягкое свечение (текстура искр/молний) */
    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    /* Скруглённый прямоугольник (для текстуры плашки) */
    const rr = (x, px, py, w, h, r) => {
      x.beginPath();
      x.moveTo(px + r, py);
      x.arcTo(px + w, py, px + w, py + h, r);
      x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r);
      x.arcTo(px, py, px + w, py, r);
      x.closePath();
    };

    /* Текстура декоративной плашки */
    const plateTexture = (accent) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 160;
      const x = c.getContext('2d');
      x.strokeStyle = accent;
      x.globalAlpha = 0.85; x.lineWidth = 3;
      rr(x, 14, 14, 228, 132, 16); x.stroke();
      x.globalAlpha = 0.06; x.fillStyle = accent;
      rr(x, 14, 14, 228, 132, 16); x.fill();
      x.globalAlpha = 0.4; x.fillStyle = '#ffffff';
      x.fillRect(40, 58, 132, 7);
      x.fillRect(40, 76, 100, 7);
      x.fillRect(40, 94, 68, 7);
      return new THREE.CanvasTexture(c);
    };

    /* ============================================================
       ТРИ ПЕРЕПЛЕТАЮЩИХСЯ ПРОВОДА
       Неровная тройная спираль; цикл вращения ≈ 3 сек
       ============================================================ */
    const WIRE_COLORS = [0xffffff, 0x0088ff, 0xff3344]; // белый, синий, красный
    const H = 13;          // высота жгута
    const TWIST = 1.05;    // закрутка
    const CYCLE = 3;       // сек — период цикла вращения
    const wireGroup = new THREE.Group();
    const wires = [];      // { mesh, curve, base }
    const curves = [];

    WIRE_COLORS.forEach((color, w) => {
      const pts = [];
      const N = 140;
      const phase = (w / WIRE_COLORS.length) * Math.PI * 2;
      for (let i = 0; i <= N; i++) {
        const y = -H / 2 + (i / N) * H;
        /* неровная траектория: две наложенные волны угла и радиуса */
        const a = y * TWIST + phase
          + 0.35 * Math.sin(y * 0.7 + w * 2.1)
          + 0.20 * Math.sin(y * 1.9 + w * 4.7);
        const r = 1.15 * (1
          + 0.25 * Math.sin(y * 0.5 + w * 1.3)
          + 0.12 * Math.sin(y * 1.35 + w * 5.9));
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      curves.push(curve);
      const geo = new THREE.TubeGeometry(curve, 260, 0.07, 8, false);
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      wireGroup.add(mesh);
      wires.push({ mesh, curve, phase });
    });
    scene.add(wireGroup);

    /* ============================================================
       МОЛНИИ — импульсы, бегущие вдоль проводов
       У каждой трубки свой цвет; голова импульса ярко-белая
       ============================================================ */
    const HEADS = 3, TRAIL = 7;
    const pulses = [];
    curves.forEach((curve, w) => {
      const count = HEADS * TRAIL;
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({
        size: 0.17, map: glowTex, vertexColors: true,
        transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const obj = new THREE.Points(g, m);
      scene.add(obj);
      pulses.push({
        obj, curve,
        base: [
          [1.0, 1.0, 1.0],     // белый
          [0.25, 0.65, 1.0],   // синий
          [1.0, 0.35, 0.4],    // красный
        ][w],
        heads: Array.from({ length: HEADS }, (_, i) => ({
          u: ((i / HEADS) + w * 0.21) % 1,
          speed: 0.06 + Math.random() * 0.05,
          flash: 0,
        })),
      });
    });

    const updatePulses = (dt) => {
      pulses.forEach((pd) => {
        const pos = pd.obj.geometry.attributes.position.array;
        const col = pd.obj.geometry.attributes.color.array;
        let k = 0;
        pd.heads.forEach((h) => {
          h.u = (h.u + h.speed * dt) % 1;
          if (Math.random() < 0.008) h.flash = 1;
          h.flash = Math.max(0, h.flash - dt * 2.5);
          const bright = 1 + h.flash * 0.8;
          for (let s = 0; s < TRAIL; s++) {
            const uu = ((h.u - s * 0.012) % 1 + 1) % 1;
            const pnt = pd.curve.getPointAt(uu);
            pos[k * 3] = pnt.x; pos[k * 3 + 1] = pnt.y; pos[k * 3 + 2] = pnt.z;
            const f = (1 - s / TRAIL) * bright;
            /* голова белая, хвост — цвет трубки */
            col[k * 3]     = (0.65 + pd.base[0] * 0.35) * f;
            col[k * 3 + 1] = (0.65 + pd.base[1] * 0.35) * f;
            col[k * 3 + 2] = (0.65 + pd.base[2] * 0.35) * f;
            k++;
          }
        });
        pd.obj.geometry.attributes.position.needsUpdate = true;
        pd.obj.geometry.attributes.color.needsUpdate = true;
      });
    };

    /* ============================================================
       ДЕКОРАТИВНЫЕ ПЛАШКИ по винтовой траектории вокруг проводов
       ============================================================ */
    const PLATES = isMobile ? 5 : 8;
    const HELIX_R = 2.6, HELIX_H = 10, TURNS = 1.5;
    const plates = [];
    for (let i = 0; i < PLATES; i++) {
      const accent = i % 4 === 3 ? '#ffb800' : '#00d4ff';
      const mat = new THREE.MeshBasicMaterial({
        map: plateTexture(accent), transparent: true, opacity: 0.45,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), mat);
      plate.userData = {
        theta: (i / PLATES) * Math.PI * 2,
        baseY: -HELIX_H / 2 + (i / (PLATES - 1)) * HELIX_H,
        phase: Math.random() * Math.PI * 2,
      };
      scene.add(plate);
      plates.push(plate);
    }

    /* ============================================================
       ИСКРЫ — атмосферный фон
       ============================================================ */
    const COUNT = isMobile ? 1200 : 3000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [[0, 0.83, 1], [1, 1, 1], [1, 0.72, 0]];
    const weights = [0.55, 0.35, 0.1];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 11;
      let r = Math.random(), pick = 0, acc = 0;
      for (let p = 0; p < weights.length; p++) { acc += weights[p]; if (r <= acc) { pick = p; break; } }
      const c = palette[pick];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sMat = new THREE.PointsMaterial({
      size: isMobile ? 0.07 : 0.05, map: glowTex, vertexColors: true,
      transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sparks = new THREE.Points(sGeo, sMat);
    scene.add(sparks);


    /* ============================================================
       ПРОКРУТКА, МЫШЬ, РЕСАЙЗ, ЦИКЛ РЕНДЕРА
       ============================================================ */
    let targetP = 0, p = 0, mx = 0, my = 0, tmx = 0, tmy = 0;

    const docH = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const onScroll = () => {
      targetP = Math.min(1, Math.max(0, window.scrollY / docH()));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window.addEventListener('mousemove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    let running = true;
    document.addEventListener('visibilitychange', () => {
      const was = running;
      running = !document.hidden;
      if (running && !was) loop();
    });

    const clock = new THREE.Clock();
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* сглаживание прокрутки и мыши */
      p += (targetP - p) * 0.06;
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;

      /* жгут: непрерывное вращение с циклом ≈ 3 сек + доворот скроллом */
      wireGroup.rotation.y = (Math.PI * 2 / CYCLE) * t + p * Math.PI * 2 * 0.5 + mx * 0.18;
      wireGroup.rotation.x = my * 0.07;
      wires.forEach((wd, w) => {
        /* «дыхание» радиуса трубки с периодом ≈ 3 сек, фазы по жгуту */
        const s = 1 + 0.06 * Math.sin((Math.PI * 2 / CYCLE) * t + (w / WIRE_COLORS.length) * Math.PI * 2);
        wd.mesh.scale.set(s, 1, s);
        wd.mesh.material.opacity = 0.2 + 0.04 * Math.sin(t * 2.1 + w * 2.2);
      });

      updatePulses(dt);

      /* плашки: винтовая траектория, доворот скроллом */
      const groupAngle = p * Math.PI * 2 * TURNS;
      const yShift = (p - 0.5) * 4;
      plates.forEach((pl) => {
        const u = pl.userData;
        const a = u.theta + groupAngle + t * 0.05;
        pl.position.set(Math.cos(a) * HELIX_R, u.baseY + yShift + Math.sin(t * 0.9 + u.phase) * 0.18, Math.sin(a) * HELIX_R);
        pl.lookAt(camera.position);
        pl.material.opacity = 0.38 + Math.sin(t * 1.3 + u.phase) * 0.1;
      });

      sparks.rotation.y = t * 0.02 + mx * 0.2;
      sparks.rotation.x = my * 0.12;

      renderer.render(scene, camera);
    }
    loop();
  } catch (err) {
    fallback();
  }
})();

