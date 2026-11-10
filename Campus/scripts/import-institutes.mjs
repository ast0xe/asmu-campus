// scripts/import-institutes.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ENDPOINT = 'https://asmu.ru/schedule/schedule_list.php';
const SEMESTER = process.env.SCHEDULE_SEMESTER || '1';
const BATCH = 1000;
const DELAY = 400;
const semLabel = SEMESTER === '2' ? 'spring' : 'autumn';

const INSTITUTES = [
  { id: '2', code: '31.05.02', key: 'педиатри',       label: 'Педиатрия' },
  { id: '3', code: '31.05.03', key: 'стоматолог',     label: 'Стоматология' },
  { id: '4', code: '32.05.01', key: 'профилактическ', label: 'Медпроф' }
];

function loadEnv(path) {
  const map = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0 && !line.trimStart().startsWith('#')) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {}
  return map;
}
const env = loadEnv('.env.local');
const URL = process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

function normalizeGroup(raw) { return String(raw).trim().toUpperCase(); }
function expandToken(token) {
  token = String(token).trim();
  if (!token) return [];
  const m = token.match(/^(.+?)(\d+)\s*-\s*(\d+)$/);
  if (!m) return [normalizeGroup(token)];
  const prefix = m[1], a = m[2], b = m[3], len = a.length;
  const start = parseInt(a, 10), end = parseInt(b, 10);
  const out = [];
  for (let n = start; n <= end; n++) out.push(prefix + String(n).padStart(len, '0'));
  return out.map(normalizeGroup);
}
function expandGroups(cp) {
  if (!cp) return [];
  const set = new Set();
  for (const t of String(cp).split(',')) for (const g of expandToken(t)) if (g) set.add(g);
  return [...set];
}
function courseOf(g) {
  const m = g.match(/^[А-ЯЁA-Z]+\s*(\d{2})/);
  return m ? (26 - parseInt(m[1], 10) + 1) : 1;
}
function toDate(s) { if (!s) return null; const p = s.split('.'); return p[2] + '-' + p[1] + '-' + p[0]; }
function buildRoom(address, room) {
  const a = (address && address !== '-' && address !== '0') ? address : '';
  const r = (room && room !== '-' && room !== '0') ? room : '';
  if (a && r) return a + ', ауд. ' + r;
  if (a) return a;
  if (r) return 'ауд. ' + r;
  return null;
}
const LT = {
  'Лекционные занятия': 'lecture',
  'Практические занятия': 'practice',
  'Семинарские занятия': 'seminar',
  'Клинические практические занятия': 'clinical',
  'Зачёт с оценкой': 'credit',
  'Учебная практика': 'training_practice',
  'Производственная практика': 'production_practice'
};
function mapLessonType(t) { const k = String(t || '').trim(); return LT[k] || 'other'; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(base, page) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const body = new URLSearchParams({ ...base, page: String(page) });
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (campus-schedule-scraper)'
      },
      body: body.toString(),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error('Не JSON'); }
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeInstitute(id) {
  const base = {
    institute: id, department: '0', teacher: '0', keep_replacement: '',
    discipline: '0', lessons_type: '0', group: '0', dayofweek: '0', address: '0',
    select_type: '4', only_payment: '0', schedule_semester: SEMESTER
  };
  const first = await fetchPage(base, 1);
  const pagesCount = Number(first.pagesCount) || 1;
  const rowsCount = Number(first.rowsCount) || 0;
  console.log('  Страниц: ' + pagesCount + ' | Записей: ' + rowsCount);
  const rows = Array.isArray(first.schedule) ? [...first.schedule] : [];
  for (let p = 2; p <= pagesCount; p++) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const d = await fetchPage(base, p);
        rows.push(...(d.schedule || []));
        ok = true;
      } catch (e) {
        if (attempt === 3) throw e;
        console.log('    повтор стр. ' + p + ' (' + e.message + ')');
        await sleep(1500);
      }
    }
    if (p % 10 === 0 || p === pagesCount) console.log('  страница ' + p + '/' + pagesCount + ', собрано ' + rows.length);
    await sleep(DELAY);
  }
  return rows;
}

async function fetchAll(table, columns) {
  const all = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(table + ': ' + error.message);
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function insertBatches(table, rows, size) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(table + ': ' + error.message);
  }
}

const { data: specs } = await sb.from('specialties').select('id,name,code');
const exGroups = await fetchAll('study_groups', 'id,name');
const groupId = new Map(exGroups.map((g) => [g.name, g.id]));
const exSubjects = await fetchAll('subjects', 'id,name');
const subjectId = new Map(exSubjects.map((s) => [s.name, s.id]));
const exGS = await fetchAll('group_subjects', 'group_id,subject_id');
const gsKey = new Set(exGS.map((x) => x.group_id + '|' + x.subject_id));

let totalEvents = 0;

for (const inst of INSTITUTES) {
  console.log('');
  console.log('=== ' + inst.label + ' (institute ' + inst.id + ') ===');
  const spec = (specs || []).find((s) => s.code === inst.code)
    || (specs || []).find((s) => (s.name || '').toLowerCase().includes(inst.key));
  const specialtyId = spec ? spec.id : null;
  console.log('Специальность: ' + (spec ? spec.name + ' (' + spec.code + ')' : 'НЕ НАЙДЕНА — specialty_id будет null'));

  const jsonPath = 'schedule_i' + inst.id + '_' + semLabel + '.json';
  let rows;
  if (existsSync(jsonPath)) {
    console.log('  Файл найден, использую: ' + jsonPath);
    rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } else {
    rows = await scrapeInstitute(inst.id);
    writeFileSync(jsonPath, JSON.stringify(rows), 'utf8');
  }
  if (!rows.length) { console.log('Данных нет, пропуск.'); continue; }

  const groupCourses = new Map();
  const subjectSet = new Set();
  const groupSubjectMap = new Map();
  const events = [];
  let noTime = 0;
  for (const r of rows) {
    const groups = expandGroups(r.class_parsed).filter((g) => courseOf(g) < 7);
    if (!groups.length) continue;
    for (const g of groups) if (!groupCourses.has(g)) groupCourses.set(g, courseOf(g));
    const disc = String(r.discipline || '').trim();
    if (disc) {
      subjectSet.add(disc);
      for (const g of groups) { if (!groupSubjectMap.has(g)) groupSubjectMap.set(g, new Set()); groupSubjectMap.get(g).add(disc); }
    }
    if (!r.time_start || !r.time_end) { noTime++; continue; }
    for (const g of groups) {
      events.push({
        group: g, subject_name: disc || null, event_date: toDate(r.date),
        start_time: r.time_start, end_time: r.time_end, lesson_type: mapLessonType(r.lesson_type),
        teacher: r.teacher || null, room: buildRoom(r.address, r.room),
        replacement_teacher: r.teacher_replaced || null,
        note: (r.note && String(r.note).trim()) || null
      });
    }
  }
  console.log('  Групп: ' + groupCourses.size + ' | Предметов: ' + subjectSet.size + ' | Событий: ' + events.length + ' | Без времени: ' + noTime);

  const newGroups = [];
  for (const [name, course] of groupCourses) if (!groupId.has(name)) newGroups.push({ name: name, course: course, specialty_id: specialtyId });
  if (newGroups.length) {
    const { data: ins, error } = await sb.from('study_groups').insert(newGroups).select('id,name');
    if (error) throw new Error('groups: ' + error.message);
    for (const g of (ins || [])) groupId.set(g.name, g.id);
  }
  console.log('  Добавлено групп: ' + newGroups.length);

  const newSubjects = [...subjectSet].filter((n) => !subjectId.has(n)).map((n) => ({ name: n }));
  if (newSubjects.length) {
    const { data: ins, error } = await sb.from('subjects').insert(newSubjects).select('id,name');
    if (error) throw new Error('subjects: ' + error.message);
    for (const s of (ins || [])) subjectId.set(s.name, s.id);
  }
  console.log('  Добавлено предметов: ' + newSubjects.length);

  const gsRows = [];
  for (const [gname, subs] of groupSubjectMap) {
    const gid = groupId.get(gname); if (!gid) continue;
    for (const sname of subs) {
      const sid = subjectId.get(sname); if (!sid) continue;
      const k = gid + '|' + sid;
      if (!gsKey.has(k)) { gsKey.add(k); gsRows.push({ group_id: gid, subject_id: sid }); }
    }
  }
  if (gsRows.length) await insertBatches('group_subjects', gsRows, BATCH);
  console.log('  Связей группа-предмет: ' + gsRows.length);

  const batchId = randomUUID();
  for (let i = 0; i < events.length; i += BATCH) {
    const chunk = events.slice(i, i + BATCH).map((e) => ({
      group_id: groupId.get(e.group),
      subject_id: subjectId.get(e.subject_name) || null,
      subject_name: e.subject_name,
      event_date: e.event_date,
      start_time: e.start_time,
      end_time: e.end_time,
      lesson_type: e.lesson_type,
      teacher: e.teacher,
      room: e.room,
      replacement_teacher: e.replacement_teacher,
      note: e.note,
      import_batch_id: batchId
    }));
    const { error } = await sb.from('schedule_events').insert(chunk);
    if (error) throw new Error('schedule_events: ' + error.message);
    const done = Math.min(i + BATCH, events.length);
    if (done % 10000 === 0 || done === events.length) console.log('  Событий: ' + done + '/' + events.length);
  }
  totalEvents += events.length;
  console.log('  import_batch_id = ' + batchId);
}

console.log('');
console.log('ГОТОВО. Всего событий по трём институтам: ' + totalEvents);