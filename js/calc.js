/* ============================================================
   ГЕРМАН — калькулятор стоимости: рендер и пересчёт из
   window.HERMAN_PRICES (цены лежат в js/prices.js)
   ============================================================ */
(() => {
  'use strict';

  const P = window.HERMAN_PRICES;
  const listEl = document.getElementById('calcList');
  const detailEl = document.getElementById('calcDetails');
  const sumEl = document.getElementById('calcSum');
  if (!P || !listEl || !detailEl || !sumEl) return;

  const fmt = (n) => n.toLocaleString('ru-RU') + ' ' + P.currency;
  const qty = {};

  /* Строки работ */
  listEl.innerHTML = P.items.map((it) => `
    <div class="calc-row" data-id="${it.id}">
      <div class="calc-row__name">
        <h3>${it.title}</h3>
        ${it.hint ? `<p>${it.hint}</p>` : ''}
      </div>
      <div class="calc-row__price">${fmt(it.price)} / ${it.unit}</div>
      <div class="calc-stepper">
        <button type="button" data-d="-1" aria-label="Убрать одну ${it.unit}">−</button>
        <output id="q-${it.id}">0</output>
        <button type="button" data-d="1" aria-label="Добавить одну ${it.unit}">+</button>
      </div>
    </div>`).join('');

  const total = () => P.items.reduce((s, it) => s + (qty[it.id] || 0) * it.price, 0);

  const update = () => {
    P.items.forEach((it) => {
      const out = document.getElementById('q-' + it.id);
      if (out) out.textContent = qty[it.id] || 0;
    });
    const lines = P.items
      .filter((it) => qty[it.id] > 0)
      .map((it) => `
        <div class="calc-total__row">
          <span>${it.title} × ${qty[it.id]}</span>
          <span>${fmt(qty[it.id] * it.price)}</span>
        </div>`)
      .join('');
    detailEl.innerHTML = lines || '<div class="calc-total__empty">Выберите работы слева — сумма посчитается автоматически</div>';
    sumEl.textContent = fmt(total());
  };

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-d]');
    if (!btn) return;
    const row = btn.closest('.calc-row');
    const it = P.items.find((x) => x.id === row.dataset.id);
    if (!it) return;
    const d = Number(btn.dataset.d);
    qty[it.id] = Math.min(it.max, Math.max(0, (qty[it.id] || 0) + d));
    update();
  });

  update();
})();
