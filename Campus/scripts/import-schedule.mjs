// scripts/import-schedule.mjs
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const INPUT = process.env.SCHEDULE_INPUT || 'schedule_ld_autumn.json';
const BATCH = 1000;

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
if (!URL || !KEY) {
  console.error('Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Добавьте в .env.local: SUPABASE_SERVICE_ROLE_KEY=<service_role>.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const rows = JSON.parse(readFileSync(INPUT, 'utf8'));

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
function mapLessonType(t) { const k = String(t || '').trim(); return LT[k] || k || 'lecture'; }

const groupCourses = new Map();
const subjectSet = new Set();
const groupSubjectMap = new Map();
const events = [];
let skippedNoTime = 0;

for (const r of rows) {
  const groups = expandGroups(r.class_parsed).filter((g) => courseOf(g) < 7);;
  if (!groups.length) continue;
  for (const g of groups) if (!groupCourses.has(g)) groupCourses.set(g, courseOf(g));
  const disc = String(r.discipline || '').trim();
  if (disc) {
    subjectSet.add(disc);
    for (const g of groups) {
      if (!groupSubjectMap.has(g)) groupSubjectMap.set(g, new Set());
      groupSubjectMap.get(g).add(disc);
    }
  }
  if (!r.time_start || !r.time_end) { skippedNoTime++; continue; }
  for (const g of groups) {
    events.push({
      group: g,
      subject_name: disc || null,
      event_date: toDate(r.date),
      start_time: r.time_start,
      end_time: r.time_end,
      lesson_type: mapLessonType(r.lesson_type),
      teacher: r.teacher || null,
      room: buildRoom(r.address, r.room),
      replacement_teacher: r.teacher_replaced || null,
      note: (r.note && String(r.note).trim()) || null
    });
  }
}

const byCourse = {};
for (const c of groupCourses.values()) byCourse[c] = (byCourse[c] || 0) + 1;
console.log('Групп: ' + groupCourses.size + ' | Предметов: ' + subjectSet.size + ' | Событий: ' + events.length + ' | Пропущено без времени: ' + skippedNoTime);
console.log('Групп по курсам: ' + JSON.stringify(byCourse));
console.log('Не-ЛД группы: ' + JSON.stringify([...groupCourses.keys()].filter((g) => !g.startsWith('ЛД'))));

// 1) Специальность
let specialtyId = null;
const { data: specs } = await sb.from('specialties').select('id,name,code');
if (specs && specs.length) {
  const found = specs.find((s) => (s.name || '').toLowerCase().includes('лечебное дело'))
    || specs.find((s) => s.code === '31.05.01');
  if (found) { specialtyId = found.id; console.log('Специальность: ' + found.name + (found.code ? ' (' + found.code + ')' : '')); }
  else console.log('ВНИМАНИЕ: специальность "Лечебное дело" не найдена — specialty_id = null');
}

// 2) Группы
const { data: exGroups } = await sb.from('study_groups').select('id,name');
const groupId = new Map();
for (const g of (exGroups || [])) groupId.set(g.name, g.id);
const newGroups = [];
for (const [name, course] of groupCourses) {
  if (!groupId.has(name)) newGroups.push({ name, course, specialty_id: specialtyId });
}
if (newGroups.length) {
  const { data: ins, error: err } = await sb.from('study_groups').insert(newGroups).select('id,name');
  if (err) { console.error('Ошибка вставки групп: ' + err.message); process.exit(1); }
  for (const g of (ins || [])) groupId.set(g.name, g.id);
}
console.log('Добавлено групп: ' + newGroups.length);

// 3) Предметы
const { data: exSubjects } = await sb.from('subjects').select('id,name');
const subjectId = new Map();
for (const s of (exSubjects || [])) subjectId.set(s.name, s.id);
const newSubjects = [...subjectSet].filter((n) => !subjectId.has(n)).map((n) => ({ name: n }));
if (newSubjects.length) {
  const { data: ins, error: err } = await sb.from('subjects').insert(newSubjects).select('id,name');
  if (err) { console.error('Ошибка вставки предметов: ' + err.message); process.exit(1); }
  for (const s of (ins || [])) subjectId.set(s.name, s.id);
}
console.log('Добавлено предметов: ' + newSubjects.length);

// 4) Связи группа-предмет
const { data: exGS } = await sb.from('group_subjects').select('group_id,subject_id');
const gsKey = new Set((exGS || []).map((x) => x.group_id + '|' + x.subject_id));
const gsRows = [];
for (const [gname, subs] of groupSubjectMap) {
  const gid = groupId.get(gname);
  if (!gid) continue;
  for (const sname of subs) {
    const sid = subjectId.get(sname);
    if (!sid) continue;
    const k = gid + '|' + sid;
    if (!gsKey.has(k)) { gsKey.add(k); gsRows.push({ group_id: gid, subject_id: sid }); }
  }
}
for (let i = 0; i < gsRows.length; i += BATCH) {
  const { error } = await sb.from('group_subjects').insert(gsRows.slice(i, i + BATCH));
  if (error) { console.error('Ошибка group_subjects: ' + error.message); process.exit(1); }
}
console.log('Связей группа-предмет: ' + gsRows.length);

// 5) События
const batchId = randomUUID();
const total = events.length;
for (let i = 0; i < total; i += BATCH) {
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
  if (error) { console.error('Ошибка schedule_events (батч ' + (Math.floor(i / BATCH) + 1) + '): ' + error.message); process.exit(1); }
  const done = Math.min(i + BATCH, total);
  if (done % 10000 === 0 || done === total) console.log('Событий вставлено: ' + done + ' / ' + total);
}

console.log('');
console.log('ГОТОВО.');
console.log('import_batch_id = ' + batchId);
console.log('Откат (если нужно):');
console.log("delete from public.schedule_events where import_batch_id = '" + batchId + "';");