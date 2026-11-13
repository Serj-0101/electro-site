/* ============================================================
   ГЕРМАН — интерактив: прелоадер, курсор, магнитные кнопки,
   меню, scroll-reveal, форма
   ============================================================ */
(() => {
  'use strict';

  const isTouch = !window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';

  /* ---------- Прелоадер ---------- */
  const preloader = document.getElementById('preloader');
  const counter = document.getElementById('preloaderCounter');

  if (preloader && counter) {
    let progress = 0;
    const step = 9 + Math.random() * 8;
    const tick = setInterval(() => {
      progress = Math.min(100, progress + step);
      counter.textContent = Math.floor(progress);
      if (progress >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          preloader.classList.add('preloader--done');
          document.body.classList.remove('is-booting');
          document.body.classList.add('is-loaded');
        }, 350);
      }
    }, 95);
  } else {
    document.body.classList.remove('is-booting');
  }

  /* ---------- Кастомный курсор ---------- */
  if (!isTouch) {
    document.body.classList.add('has-cursor');
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');

    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;

    window.addEventListener('mousemove', (e) => {
      x = e.clientX; y = e.clientY;
      if (dot) dot.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });

    (function follow() {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();

    const hoverables = 'a, button, input, textarea, .card, .work';
    document.querySelectorAll(hoverables).forEach((el) => {
      el.addEventListener('mouseenter', () => ring && ring.classList.add('cursor-ring--hover'));
      el.addEventListener('mouseleave', () => ring && ring.classList.remove('cursor-ring--hover'));
    });
  }

  /* ---------- Магнитные кнопки ---------- */
  if (!isTouch) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (hasGsap) gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4 });
        else el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => {
        if (hasGsap) gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        else el.style.transform = '';
      });
    });

    /* Свечение карточки под курсором (позиция для ::before) */
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Бургер-меню ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');

  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    if (menu) menu.setAttribute('aria-hidden', 'true');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
    }
  };

  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    menu.querySelectorAll('.menu__link').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Scroll-reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Форма заявки ---------- */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // TODO (Этап 6): подключить реальную отправку (Formspree / Telegram-бот)
      const note = form.querySelector('.form__note');
      const success = form.querySelector('.form__success');
      if (note) note.hidden = true;
      if (success) success.hidden = false;
      form.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = true; });
    });
  }

  /* ---------- Фоновая музыка ---------- */
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn) {
    const bgAudio = new Audio('audio/bg.mp3');
    bgAudio.loop = true;
    bgAudio.volume = 0.35;
    let playing = false;
    const setIcon = (on) => {
      soundBtn.classList.toggle('is-on', on);
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
    };
    const start = () => {
      bgAudio.play().then(() => { playing = true; setIcon(true); }).catch(() => { playing = false; setIcon(false); });
    };
    const stop = () => { bgAudio.pause(); playing = false; setIcon(false); };

    let savedOn = true;   // музыка играет по умолчанию
    try {
      const s = localStorage.getItem('herman-sound');
      if (s !== null) savedOn = s === 'on';
    } catch (e) {}
    setIcon(savedOn);
    let unlocked = false;

    soundBtn.addEventListener('click', () => {
      if (playing) { stop(); savedOn = false; }
      else { start(); savedOn = playing; if (playing) unlocked = true; }
      try { localStorage.setItem('herman-sound', savedOn ? 'on' : 'off'); } catch (e) {}
    });

    /* если браузер блокирует автозапуск — включаем после первого касания,
       клика, нажатия клавиши или прокрутки сайта */
    if (savedOn) {
      start();
      let lastTry = 0;
      const events = ['pointerdown', 'touchstart', 'touchmove', 'keydown', 'wheel', 'scroll'];
      const removeTriggers = () => {
        events.forEach((ev) => window.removeEventListener(ev, tryStart));
      };
      const tryStart = () => {
        if (unlocked || !savedOn) return;
        const now = Date.now();
        if (now - lastTry < 500) return;          // не чаще 2 раз в секунду
        lastTry = now;
        if (playing) { unlocked = true; removeTriggers(); return; }
        start();
        unlocked = playing;
        if (unlocked) removeTriggers();
      };
      events.forEach((ev) => window.addEventListener(ev, tryStart, { passive: true }));
    }
  }

  /* ---------- Переключатель «Лёгкая версия» ---------- */
  const modeBtn = document.getElementById('modeToggle');
  if (modeBtn) {
    const narrow = window.matchMedia('(max-width: 520px)').matches;
    const label = (light) => light
      ? (narrow ? 'Полная' : 'Полная версия')
      : (narrow ? 'Лёгкая' : 'Лёгкая версия');
    modeBtn.textContent = label(window.HERMAN_LIGHT === 1);
    modeBtn.setAttribute('aria-pressed', String(window.HERMAN_LIGHT === 1));
    modeBtn.addEventListener('click', () => {
      const toLight = window.HERMAN_LIGHT !== 1;
      try { localStorage.setItem('herman-mode', toLight ? 'light' : 'full'); } catch (e) {}
      location.reload();   // перезагрузка применяет выбранный режим
    });
  }

  /* ---------- Год в подвале ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
