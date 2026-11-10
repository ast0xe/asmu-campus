// scripts/scrape-schedule.mjs
// Выгрузка расписания АГМУ с asmu.ru/schedule/schedule_list.php в JSON + CSV
// Параметры передаются через переменные окружения (задаёт .ps1):
//   SCHEDULE_INSTITUTE  (1 = Лечебное дело)
//   SCHEDULE_SEMESTER   (1 = осенний, 2 = весенний)
import { writeFileSync } from 'node:fs';

const INSTITUTE = process.env.SCHEDULE_INSTITUTE || '1';
const SEMESTER  = process.env.SCHEDULE_SEMESTER  || '1';

const ENDPOINT = 'https://asmu.ru/schedule/schedule_list.php';
const semLabel = SEMESTER === '2' ? 'spring' : 'autumn';

const CONFIG = {
  outputJson: `schedule_ld_${semLabel}.json`,
  outputCsv:  `schedule_ld_${semLabel}.csv`,
  delayMs: 400, // пауза между страницами (вежливость к серверу)
};

const BASE = {
  institute: INSTITUTE,
  department: '0',
  teacher: '0',
  keep_replacement: '',
  discipline: '0',
  lessons_type: '0',
  group: '0',
  dayofweek: '0',
  address: '0',
  select_type: '4', // 4 = Семестр
  only_payment: '0',
  schedule_semester: SEMESTER,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page) {
  const body = new URLSearchParams({ ...BASE, page: String(page) });
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (campus-schedule-scraper)',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} на странице ${page}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Сервер вернул не JSON на странице ' + page + '. Первые 300 символов:\n' + text.slice(0, 300));
  }
}

function toCsv(rows) {
  const cols = ['id','date','time_start','time_end','week_day','class','discipline',
    'lesson_topic','department','lesson_type','hours','teacher','teacher_replaced',
    'address','room','note','is_practice','instID'];
  const esc = (v) => '"' + (v == null ? '' : String(v)).replace(/"/g, '""') + '"';
  const lines = [cols.join(';')];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(';'));
  return lines.join('\r\n');
}

const first = await fetchPage(1);
const pagesCount = Number(first.pagesCount) || 1;
const rowsCount  = Number(first.rowsCount)  || 0;
console.log('Институт: ' + INSTITUTE + ' | Семестр: ' + SEMESTER + ' | Страниц: ' + pagesCount + ' | Записей: ' + rowsCount + ' | Часов: ' + first.sum);

let rows = Array.isArray(first.schedule) ? [...first.schedule] : [];
for (let p = 2; p <= pagesCount; p++) {
  await sleep(CONFIG.delayMs);
  const data = await fetchPage(p);
  rows.push(...(data.schedule || []));
  if (p % 5 === 0 || p === pagesCount) console.log('  ' + p + '/' + pagesCount + ', собрано ' + rows.length);
}

writeFileSync(CONFIG.outputJson, JSON.stringify(rows, null, 2), 'utf8');
writeFileSync(CONFIG.outputCsv, '\uFEFF' + toCsv(rows), 'utf8'); // BOM — Excel откроет кириллицу
console.log('Готово: ' + rows.length + ' строк -> ' + CONFIG.outputJson + ', ' + CONFIG.outputCsv);