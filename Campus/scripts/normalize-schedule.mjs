// scripts/normalize-schedule.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const IN = process.env.SCHEDULE_INPUT || 'schedule_ld_autumn.json';
const OUT_DIR = 'normalized';
const TZ_OFFSET = '+07:00'; // Барнаул (UTC+7)

mkdirSync(OUT_DIR, { recursive: true });
const rows = JSON.parse(readFileSync(IN, 'utf8'));

function normalizeGroup(raw) { return String(raw).trim().toUpperCase(); }

function expandToken(token) {
  token = String(token).trim();
  if (!token) return [];
  const m = token.match(/^(.+?)(\d+)\s*-\s*(\d+)$/);
  if (!m) return [normalizeGroup(token)];
  const prefix = m[1], a = m[2], b = m[3];
  const len = a.length;
  const start = parseInt(a, 10), end = parseInt(b, 10);
  const out = [];
  for (let n = start; n <= end; n++) out.push(prefix + String(n).padStart(len, '0'));
  return out.map(normalizeGroup);
}

function expandGroups(classParsed) {
  if (!classParsed) return [];
  const set = new Set();
  for (const token of String(classParsed).split(',')) {
    for (const g of expandToken(token)) if (g) set.add(g);
  }
  return [...set];
}

function toIso(date, time) {
  if (!date || !time) return null;
  const p = date.split('.');
  return p[2] + '-' + p[1] + '-' + p[0] + 'T' + time + ':00' + TZ_OFFSET;
}

const groupMap = new Map();
const subjectMap = new Map();
const events = [];
let multiGroupRows = 0;
let noTimeRows = 0;

for (const r of rows) {
  if (!r.time_start || !r.time_end) noTimeRows++;
  const groups = expandGroups(r.class_parsed);
  if (!groups.length) continue;
  if (groups.length > 1) multiGroupRows++;

  for (const g of groups) {
    if (!groupMap.has(g)) {
      const enroll = parseInt((g.match(/\d{2}/) || ['0'])[0], 10);
      groupMap.set(g, { enrollment_year: 2000 + enroll, course: 26 - enroll + 1 });
    }
    events.push({
      source_id: r.id,
      group: g,
      date: r.date,
      time_start: r.time_start,
      time_end: r.time_end,
      starts_at: toIso(r.date, r.time_start),
      ends_at: toIso(r.date, r.time_end),
      week_day: r.week_day,
      discipline: r.discipline,
      lesson_topic: r.lesson_topic,
      lesson_type: r.lesson_type,
      hours: r.hours,
      department: r.department,
      department_num: r.departmentNum,
      teacher: r.teacher,
      teacher_replaced: r.teacher_replaced,
      address: r.address,
      room: r.room,
      study_corpus: r.study_corpus,
      note: r.note,
      comment: r.comment
    });
  }

  if (r.discipline && !subjectMap.has(r.discipline)) {
    subjectMap.set(r.discipline, { department: r.department, department_num: r.departmentNum });
  }
}

const groups = [...groupMap.keys()].sort();
const subjects = [...subjectMap.keys()].sort();

const insertValues = groups.map((g) => "('" + g.replace(/'/g, "''") + "')").join(',\n');
writeFileSync(OUT_DIR + '/groups.sql',
  '-- Группы Лечебного дела (ЛД), осенний семестр 2026-2027\n' +
  'insert into public.study_groups (name) values\n' + insertValues + '\n' +
  'on conflict (name) do nothing;\n', 'utf8');

writeFileSync(OUT_DIR + '/groups.json',
  JSON.stringify(groups.map((g) => ({ name: g, ...groupMap.get(g) })), null, 2), 'utf8');

writeFileSync(OUT_DIR + '/subjects.json',
  JSON.stringify(subjects.map((s) => ({ name: s, ...subjectMap.get(s) })), null, 2), 'utf8');

writeFileSync(OUT_DIR + '/events_flat.json', JSON.stringify(events, null, 2), 'utf8');

const cols = ['source_id','group','date','time_start','time_end','week_day','discipline',
  'lesson_type','hours','department','teacher','address','room','note','starts_at','ends_at'];
const esc = (v) => '"' + (v == null ? '' : String(v)).replace(/"/g, '""') + '"';
const csv = [cols.join(';')].concat(events.map((e) => cols.map((c) => esc(e[c])).join(';'))).join('\r\n');
writeFileSync(OUT_DIR + '/events_flat.csv', '\uFEFF' + csv, 'utf8');

console.log('=== Нормализация расписания ===');
console.log('Исходных строк: ' + rows.length);
console.log('Строк с несколькими группами (потоки): ' + multiGroupRows);
console.log('Строк без времени: ' + noTimeRows);
console.log('Итого событий (по группам): ' + events.length);
console.log('Уникальных групп: ' + groups.length);
console.log('Уникальных дисциплин: ' + subjects.length);
const byCourse = {};
for (const g of groups) { const c = groupMap.get(g).course; byCourse[c] = (byCourse[c] || 0) + 1; }
console.log('Групп по курсам (курс: кол-во): ' + JSON.stringify(byCourse));
console.log('Не-ЛД группы (если есть): ' + JSON.stringify(groups.filter((g) => !g.startsWith('ЛД'))));
console.log('Файлы сохранены в папку ' + OUT_DIR + '/');