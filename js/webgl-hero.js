/* ============================================================
   ГЕРМАН — WebGL-сцена Hero: «живая электрическая энергия»
   Частицы-искры + электрические связи между ними (Three.js)
   ============================================================ */
(() => {
  'use strict';

  const canvas = document.getElementById('webgl-hero');
  const hero = document.querySelector('.hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Fallback: нет WebGL, нет Three.js или пользователь просил меньше движения
  const fallback = () => { if (hero) hero.classList.add('no-webgl'); };
  if (!canvas || !window.THREE || reduceMotion || window.HERMAN_LIGHT) { fallback(); return; }

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0b, 0.09);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 7;

    // Мягкая «искры»-текстура (генерируется на canvas, без внешних файлов)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const gctx = glowCanvas.getContext('2d');
    const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    // ---- Частицы ----
    const COUNT = isMobile ? 1800 : 5000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [
      [0.0, 0.83, 1.0],   // циан-искра
      [1.0, 1.0, 1.0],    // белый
      [1.0, 0.72, 0.0],   // тёплый жёлтый
    ];
    const weights = [0.55, 0.35, 0.10];

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      let r = Math.random(), pick = 0, acc = 0;
      for (let p = 0; p < weights.length; p++) { acc += weights[p]; if (r <= acc) { pick = p; break; } }
      const c = palette[pick];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: isMobile ? 0.07 : 0.055,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ---- «Электрические связи» между близкими частицами ----
    const LINE_COUNT = isMobile ? 50 : 130;
    const linePos = new Float32Array(LINE_COUNT * 6);
    for (let l = 0; l < LINE_COUNT; l++) {
      const a = Math.floor(Math.random() * COUNT) * 3;
      const b = Math.floor(Math.random() * COUNT) * 3;
      linePos.set([positions[a], positions[a+1], positions[a+2],
                   positions[b], positions[b+1], positions[b+2]], l * 6);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // ---- Мышь ----
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener('mousemove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    // ---- Ресайз ----
    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    // ---- Пауза в фоновой вкладке ----
    let running = true;
    document.addEventListener('visibilitychange', () => {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) loop();
    });

    const clock = new THREE.Clock();
    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;

      points.rotation.y = t * 0.03 + mx * 0.28;
      points.rotation.x = Math.sin(t * 0.1) * 0.05 + my * 0.16;
      lines.rotation.copy(points.rotation);

      // Лёгкое «мерцание» сети, как электрический разряд
      lineMat.opacity = 0.06 + Math.abs(Math.sin(t * 1.7)) * 0.05 + (Math.random() < 0.004 ? 0.12 : 0);

      renderer.render(scene, camera);
    }
    loop();
  } catch (err) {
    fallback();
  }
})();
