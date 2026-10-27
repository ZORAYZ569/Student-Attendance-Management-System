const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ students: [], attendance: [] }, null, 2));
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { students: [], attendance: [] };
  }
}
function writeStore(store) {
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}
function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Student Attendance Management System' }));

app.get('/api/students', (_req, res) => res.json(readStore().students));

app.post('/api/students', (req, res) => {
  const roll = String(req.body.roll || '').trim();
  const name = String(req.body.name || '').trim();
  const department = String(req.body.department || '').trim();
  if (!roll || !name) return res.status(400).json({ error: 'Roll number and name are required.' });
  const store = readStore();
  if (store.students.some(s => s.roll.toLowerCase() === roll.toLowerCase())) {
    return res.status(409).json({ error: 'A student with this roll number already exists.' });
  }
  const student = { id: Date.now().toString() + Math.random().toString(16).slice(2, 6), roll, name, department };
  store.students.push(student);
  writeStore(store);
  res.status(201).json(student);
});

app.put('/api/students/:id', (req, res) => {
  const store = readStore();
  const student = store.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  const roll = String(req.body.roll || '').trim();
  const name = String(req.body.name || '').trim();
  if (!roll || !name) return res.status(400).json({ error: 'Roll number and name are required.' });
  if (store.students.some(s => s.id !== student.id && s.roll.toLowerCase() === roll.toLowerCase())) {
    return res.status(409).json({ error: 'A student with this roll number already exists.' });
  }
  student.roll = roll;
  student.name = name;
  student.department = String(req.body.department || '').trim();
  writeStore(store);
  res.json(student);
});

app.delete('/api/students/:id', (req, res) => {
  const store = readStore();
  const exists = store.students.some(s => s.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Student not found.' });
  store.students = store.students.filter(s => s.id !== req.params.id);
  store.attendance = store.attendance.filter(a => a.studentId !== req.params.id);
  writeStore(store);
  res.json({ deleted: true });
});

app.get('/api/attendance', (req, res) => {
  const date = String(req.query.date || '');
  if (date && !validDate(date)) return res.status(400).json({ error: 'Use date format YYYY-MM-DD.' });
  const store = readStore();
  res.json(date ? store.attendance.filter(a => a.date === date) : store.attendance);
});

app.post('/api/attendance/bulk', (req, res) => {
  const date = String(req.body.date || '');
  const records = req.body.records;
  if (!validDate(date)) return res.status(400).json({ error: 'A valid date is required.' });
  if (!Array.isArray(records)) return res.status(400).json({ error: 'Records must be an array.' });
  const store = readStore();
  for (const r of records) {
    if (!store.students.some(s => s.id === r.studentId)) return res.status(400).json({ error: 'Unknown student ID.' });
    if (!Array.isArray(r.periods) || r.periods.length !== 7 || r.periods.some(v => !['P', 'A'].includes(v))) {
      return res.status(400).json({ error: 'Each student must have seven P/A values.' });
    }
  }
  for (const r of records) {
    for (let period = 1; period <= 7; period++) {
      const existing = store.attendance.find(a => a.studentId === r.studentId && a.date === date && a.period === period);
      const value = r.periods[period - 1];
      if (existing) existing.status = value;
      else store.attendance.push({ studentId: r.studentId, date, period, status: value });
    }
  }
  writeStore(store);
  res.json({ saved: records.length, date });
});

app.get('/api/reports/monthly', (req, res) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Use month format YYYY-MM.' });
  const store = readStore();
  const monthRecords = store.attendance.filter(a => a.date.startsWith(month));
  const report = store.students.map(s => {
    const rows = monthRecords.filter(a => a.studentId === s.id);
    const attended = rows.filter(a => a.status === 'P').length;
    const absent = rows.filter(a => a.status === 'A').length;
    const working = attended + absent;
    return { roll: s.roll, name: s.name, department: s.department, attended, absent, working,
      percentage: working ? Math.round((attended / working) * 10000) / 100 : 0 };
  });
  res.json({ month, students: report, totalRecords: monthRecords.length });
});

app.get('/api/reports/monthly.csv', (req, res) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).send('Use month format YYYY-MM.');
  const store = readStore();
  const records = store.attendance.filter(a => a.date.startsWith(month));
  const rows = [['Roll Number','Name','Department','Periods Attended','Periods Absent','Working Periods','Attendance Percentage']];
  store.students.forEach(s => {
    const mine = records.filter(a => a.studentId === s.id);
    const p = mine.filter(a => a.status === 'P').length;
    const absent = mine.filter(a => a.status === 'A').length;
    const total = p + absent;
    rows.push([s.roll, s.name, s.department, p, absent, total, total ? ((p / total) * 100).toFixed(2) : '0.00']);
  });
  const csv = rows.map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.csv"`);
  res.send(csv);
});

app.listen(PORT, () => console.log(`Attendance app running at http://localhost:${PORT}`));
