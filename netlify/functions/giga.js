/* ============================================================
   Netlify Function: ИИ-калькулятор на GigaChat (бесплатный GIGACHAT_API_PERS).
   Ключи задаются в Netlify UI → Site configuration → Environment variables:
     GIGA_CLIENT_ID, GIGA_CLIENT_SECRET  (developers.sber.ru → проект GigaChat)
   Дополнительно (не обязательно): GIGA_SCOPE (по умолчанию GIGACHAT_API_PERS),
   GIGA_MODEL (по умолчанию GigaChat).
   ЦЕНЫ НИЖЕ — синхронизировать с prices.json и js/prices.js!
   ============================================================ */
const https = require('https');
const crypto = require('crypto');

/* Корневой сертификат «Russian Trusted Root CA» (Минцифры) — API Сбера
   использует сертификаты, которым Node.js не доверяет по умолчанию */
const RU_CA = [
  '-----BEGIN CERTIFICATE-----',
  'MIIFwjCCA6qgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwcDELMAkGA1UEBhMCUlUx',
  'PzA9BgNVBAoMNlRoZSBNaW5pc3RyeSBvZiBEaWdpdGFsIERldmVsb3BtZW50IGFu',
  'ZCBDb21tdW5pY2F0aW9uczEgMB4GA1UEAwwXUnVzc2lhbiBUcnVzdGVkIFJvb3Qg',
  'Q0EwHhcNMjIwMzAxMjEwNDE1WhcNMzIwMjI3MjEwNDE1WjBwMQswCQYDVQQGEwJS',
  'VTE/MD0GA1UECgw2VGhlIE1pbmlzdHJ5IG9mIERpZ2l0YWwgRGV2ZWxvcG1lbnQg',
  'YW5kIENvbW11bmljYXRpb25zMSAwHgYDVQQDDBdSdXNzaWFuIFRydXN0ZWQgUm9v',
  'dCBDQTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAMfFOZ8pUAL3+r2n',
  'qqE0Zp52selXsKGFYoG0GM5bwz1bSFtCt+AZQMhkWQheI3poZAToYJu69pHLKS6Q',
  'XBiwBC1cvzYmUYKMYZC7jE5YhEU2bSL0mX7NaMxMDmH2/NwuOVRj8OImVa5s1F4U',
  'zn4Kv3PFlDBjjSjXKVY9kmjUBsXQrIHeaqmUIsPIlNWUnimXS0I0abExqkbdrXbX',
  'YwCOXhOO2pDUx3ckmJlCMUGacUTnylyQW2VsJIyIGA8V0xzdaeUXg0VZ6ZmNUr5Y',
  'Ber/EAOLPb8NYpsAhJe2mXjMB/J9HNsoFMBFJ0lLOT/+dQvjbdRZoOT8eqJpWnVD',
  'U+QL/qEZnz57N88OWM3rabJkRNdU/Z7x5SFIM9FrqtN8xewsiBWBI0K6XFuOBOTD',
  '4V08o4TzJ8+Ccq5XlCUW2L48pZNCYuBDfBh7FxkB7qDgGDiaftEkZZfApRg2E+M9',
  'G8wkNKTPLDc4wH0FDTijhgxR3Y4PiS1HL2Zhw7bD3CbslmEGgfnnZojNkJtcLeBH',
  'BLa52/dSwNU4WWLubaYSiAmA9IUMX1/RpfpxOxd4Ykmhz97oFbUaDJFipIggx5sX',
  'ePAlkTdWnv+RWBxlJwMQ25oEHmRguNYf4Zr/Rxr9cS93Y+mdXIZaBEE0KS2iLRqa',
  'OiWBki9IMQU4phqPOBAaG7A+eP8PAgMBAAGjZjBkMB0GA1UdDgQWBBTh0YHlzlpf',
  'BKrS6badZrHF+qwshzAfBgNVHSMEGDAWgBTh0YHlzlpfBKrS6badZrHF+qwshzAS',
  'BgNVHRMBAf8ECDAGAQH/AgEEMA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsF',
  'AAOCAgEAALIY1wkilt/urfEVM5vKzr6utOeDWCUczmWX/RX4ljpRdgF+5fAIS4vH',
  'tmXkqpSCOVeWUrJV9QvZn6L227ZwuE15cWi8DCDal3Ue90WgAJJZMfTshN4OI8cq',
  'W9E4EG9wglbEtMnObHlms8F3CHmrw3k6KmUkWGoa+/ENmcVl68u/cMRl1JbW2bM+',
  '/3A+SAg2c6iPDlehczKx2oa95QW0SkPPWGuNA/CE8CpyANIhu9XFrj3RQ3EqeRcS',
  'AQQod1RNuHpfETLU/A2gMmvn/w/sx7TB3W5BPs6rprOA37tutPq9u6FTZOcG1Oqj',
  'C/B7yTqgI7rbyvox7DEXoX7rIiEqyNNUguTk/u3SZ4VXE2kmxdmSh3TQvybfbnXV',
  '4JbCZVaqiZraqc7oZMnRoWrXRG3ztbnbes/9qhRGI7PqXqeKJBztxRTEVj8ONs1d',
  'WN5szTwaPIvhkhO3CO5ErU2rVdUr89wKpNXbBODFKRtgxUT70YpmJ46VVaqdAhOZ',
  'D9EUUn4YaeLaS8AjSF/h7UkjOibNc4qVDiPP+rkehFWM66PVnP1Msh93tc+taIfC',
  'EYVMxjh8zNbFuoc7fzvvrFILLe7ifvEIUqSVIC/AzplM/Jxw7buXFeGP1qVCBEHq',
  '391d/9RAfaZ12zkwFsl+IKwE/OZxW8AHa9i1p4GO0YSNuczzEm4=',
  '-----END CERTIFICATE-----',
].join('\n');

/* ЦЕНЫ ДЛЯ ИИ (синхронно с prices.json / js/prices.js) */
const PRICES = [
  { title: 'Розетка или выключатель',       hint: 'Установка и подключение',             unit: 'шт.',  price: 650 },
  { title: 'Прокладка кабеля в квартире',   hint: 'Штробление или открыто',              unit: 'м',    price: 180 },
  { title: 'Люстра или светильник',         hint: 'Сборка и монтаж на потолок',          unit: 'шт.',  price: 1300 },
  { title: 'Точечный светильник',           hint: 'Натяжной или гипсокартонный потолок', unit: 'шт.',  price: 800 },
  { title: 'Модуль в электрощите',          hint: 'Автомат, УЗО, реле напряжения',       unit: 'мод.', price: 900 },
  { title: 'Сборка щита под ключ',          hint: 'Разметка, сборка, подключение',       unit: 'шт.',  price: 6000 },
  { title: 'Уличный светильник или фонарь', hint: 'Монтаж и подключение',                unit: 'шт.',  price: 2500 },
  { title: 'Кабель по улице',               hint: 'По фасаду или в земле',               unit: 'м',    price: 220 },
];

const AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const CHAT_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';

const agent = new https.Agent({ ca: RU_CA });
let tokenCache = { token: '', expires: 0 };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const jres = (status, body) => ({
  statusCode: status,
  headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS),
  body: JSON.stringify(body),
});

function req(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const r = https.request(url, {
      method, agent,
      headers: Object.assign(data ? { 'Content-Length': data.length } : {}, headers),
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) { reject(new Error('upstream ' + res.statusCode + ': ' + buf.slice(0, 200))); return; }
        try { resolve(buf ? JSON.parse(buf) : {}); }
        catch (e) { reject(new Error('bad upstream json')); }
      });
    });
    r.on('timeout', () => { r.destroy(new Error('upstream timeout')); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function getToken() {
  const id = process.env.GIGA_CLIENT_ID;
  const secret = process.env.GIGA_CLIENT_SECRET;
  if (!id || !secret) return null;
  const now = Date.now();
  if (tokenCache.token && tokenCache.expires - 60000 > now) return tokenCache.token;
  const basic = Buffer.from(id + ':' + secret).toString('base64');
  const j = await req('POST', AUTH_URL, {
    Authorization: 'Basic ' + basic,
    RqUID: crypto.randomUUID(),
    'Content-Type': 'application/x-www-form-urlencoded',
  }, 'scope=' + (process.env.GIGA_SCOPE || 'GIGACHAT_API_PERS'));
  tokenCache = {
    token: j.access_token,
    expires: j.expires_at ? Number(j.expires_at) : now + 25 * 60 * 1000,
  };
  return tokenCache.token;
}

function systemPrompt() {
  const list = PRICES.map((i) => '- ' + i.title + ' (' + i.hint + '): ' + i.price + ' \u20BD/' + i.unit).join('\n');
  return [
    'Ты — консультант электромонтажной компании «ГЕРМАН» (Майкоп, Республика Адыгея).',
    'Помогаешь клиенту предварительно оценить стоимость электромонтажных работ.',
    'ПРАЙС (единственный источник расчёта, цены в рублях за единицу):',
    list,
    'Правила ответов:',
    '1. Считай ТОЛЬКО по позициям прайса. Если работы нет в прайсе — честно скажи, что оценим на бесплатном выезде.',
    '2. Не хватает данных (метраж кабеля, количество розеток и т.п.) — задай короткий уточняющий вопрос (не больше двух за ответ).',
    '3. В расчёте покажи разбивку по позициям (количество × цена) и итог диапазоном «от … до … ₽» с запасом 10–20%.',
    '4. Отвечай кратко, по-русски, дружелюбно. Без markdown-таблиц — простые списки и абзацы.',
    '5. В конце напомни: выезд электрика и точная смета — бесплатно, гарантия на монтаж 2 года.',
  ].join('\n');
}

/* Простая защита от накрутки: не больше 25 запросов в час с одного IP */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 500) {
    for (const [k, v] of hits) { if (!v.some((t) => now - t < 3600000)) hits.delete(k); }
  }
  return arr.length > 25;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod === 'GET') {
    /* Проверка доступности с фронта: { ok, ready } — ready=false, если ключи не заданы */
    return jres(200, { ok: true, ready: !!(process.env.GIGA_CLIENT_ID && process.env.GIGA_CLIENT_SECRET) });
  }
  if (event.httpMethod !== 'POST') return jres(405, { error: 'Метод не поддерживается' });

  const ip = String(event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'anon');
  if (rateLimited(ip)) return jres(429, { error: 'Слишком много запросов — попробуйте через час' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return jres(400, { error: 'Некорректный запрос' }); }
  const msgs = Array.isArray(body.messages) ? body.messages : null;
  if (!msgs || !msgs.length) return jres(400, { error: 'Пустое сообщение' });
  if (msgs.length > 14) return jres(400, { error: 'Диалог слишком длинный — обновите страницу' });
  for (const m of msgs) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') ||
        typeof m.content !== 'string' || !m.content.trim()) return jres(400, { error: 'Некорректное сообщение' });
    if (m.content.length > 1500) return jres(400, { error: 'Сообщение слишком длинное' });
  }
  if (msgs[msgs.length - 1].role !== 'user') return jres(400, { error: 'Некорректное сообщение' });

  let token;
  try { token = await getToken(); } catch (e) {
    return jres(502, { error: 'Не удалось связаться с GigaChat — попробуйте позже' });
  }
  if (!token) return jres(503, { error: 'ИИ-калькулятор настраивается — попробуйте позже' });

  try {
    const r = await req('POST', CHAT_URL, {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      RqUID: crypto.randomUUID(),
    }, {
      model: process.env.GIGA_MODEL || 'GigaChat',
      messages: [{ role: 'system', content: systemPrompt() }]
        .concat(msgs.map((m) => ({ role: m.role, content: m.content }))),
      temperature: 0.3,
      max_tokens: 1024,
    });
    const content = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
    if (!content) return jres(502, { error: 'Пустой ответ GigaChat — попробуйте ещё раз' });
    return jres(200, { reply: content.trim() });
  } catch (e) {
    return jres(502, { error: 'GigaChat недоступен — попробуйте позже' });
  }
};

