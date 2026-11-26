/* ============================================================
   ГЕРМАН — ИИ-калькулятор (GigaChat через Netlify Function /api/giga).
   На хостинге без функций (GitHub Pages) блок остаётся скрытым.
   ============================================================ */
(() => {
  'use strict';
  const root = document.getElementById('gigaChat');
  if (!root) return;
  const log = root.querySelector('.giga-log');
  const form = root.querySelector('.giga-form');
  const input = root.querySelector('.giga-input');
  if (!log || !form || !input) return;

  const API = '/api/giga';
  const history = [];
  let busy = false;

  const addMsg = (role, text) => {
    const div = document.createElement('div');
    div.className = 'giga-msg giga-msg--' + role;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };

  /* Проверяем доступность функции: на Netlify — покажем чат,
     на GitHub Pages (нет функций) — блок остаётся скрытым */
  fetch(API).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !j.ok) return;
    if (!j.ready) {
      addMsg('ai', 'ИИ-калькулятор настраивается — ключи GigaChat ещё не подключены. Пока посчитайте вручную ниже ⚡');
      input.disabled = true;
    } else {
      addMsg('ai', 'Здравствуйте! Опишите задачу — например: «2-комнатная квартира, 20 розеток, 10 точечных светильников, щит на 24 модуля». Посчитаю примерную стоимость по прайсу ГЕРМАН.');
    }
    root.hidden = false;
  }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy || input.disabled) return;
    busy = true;
    input.value = '';
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    const think = addMsg('think', 'Считаю по прайсу…');

    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const j = await r.json().catch(() => ({}));
      think.remove();
      if (r.ok && j.reply) {
        addMsg('ai', j.reply);
        history.push({ role: 'assistant', content: j.reply });
      } else {
        addMsg('err', j.error || 'Не удалось получить ответ — попробуйте ещё раз.');
      }
    } catch (err) {
      think.remove();
      addMsg('err', 'Нет связи — проверьте интернет и попробуйте ещё раз.');
    }
    while (history.length > 12) history.shift();   // ограничиваем контекст диалога
    busy = false;
    if (!input.disabled) input.focus();
  });
})();
