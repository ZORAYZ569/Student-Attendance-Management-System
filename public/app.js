const $ = id => document.getElementById(id);
const today = new Date();
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
$('attDate').value = isoDate(today);
$('reportMonth').value = isoDate(today).slice(0,7);
let students = [];
let attendance = {};
function message(text) { const el=$('message'); el.textContent=text; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3200); }
async function api(url, options={}) {
  const response = await fetch(url, { headers:{'Content-Type':'application/json'}, ...options });
  if (!response.ok) { let e; try{e=await response.json()}catch{e={error:await response.text()}} throw new Error(e.error||'Request failed'); }
  return response;
}
async function loadStudents() { students=await (await api('/api/students')).json(); renderStudents(); await loadDaily(); await updateStats(); }
function renderStudents() {
  $('studentRows').innerHTML = students.map(s=>`<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.department||'')}</td><td><button class="small-btn" data-delete="${s.id}">Delete</button></td></tr>`).join('');
  $('studentCount').textContent=students.length;
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this student and their attendance records?')){try{await api('/api/students/'+b.dataset.delete,{method:'DELETE'});message('Student deleted.');await loadStudents()}catch(e){message(e.message)}}});
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function loadDaily(){
  const date=$('attDate').value;
  const rows=await (await api('/api/attendance?date='+encodeURIComponent(date))).json();
  attendance={};
  rows.forEach(r=>{attendance[r.studentId]??=Array(7).fill('P');attendance[r.studentId][r.period-1]=r.status});
  $('attendanceTable').querySelector('tbody').innerHTML=students.map(s=>{
    const vals=attendance[s.id]||Array(7).fill('P');
    return `<tr data-student="${s.id}"><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.department||'')}</td>`+
      vals.map((v,i)=>`<td><select class="status-select" data-period="${i}"><option value="P" ${v==='P'?'selected':''}>P</option><option value="A" ${v==='A'?'selected':''}>A</option></select></td>`).join('')+'</tr>';
  }).join('');
}
$('attDate').addEventListener('change',()=>loadDaily().catch(e=>message(e.message)));
$('allPresent').onclick=()=>document.querySelectorAll('#attendanceTable select').forEach(s=>s.value='P');
$('allAbsent').onclick=()=>document.querySelectorAll('#attendanceTable select').forEach(s=>s.value='A');
$('saveAttendance').onclick=async()=>{
  const date=$('attDate').value;
  const records=[...document.querySelectorAll('#attendanceTable tbody tr')].map(tr=>({studentId:tr.dataset.student,periods:[...tr.querySelectorAll('select')].map(s=>s.value)}));
  try{const result=await (await api('/api/attendance/bulk',{method:'POST',body:JSON.stringify({date,records})})).json();message(`Saved attendance for ${result.saved} students.`);await updateStats()}catch(e){message(e.message)}
};
$('studentForm').onsubmit=async e=>{
  e.preventDefault();
  try{await api('/api/students',{method:'POST',body:JSON.stringify({roll:$('roll').value,name:$('name').value,department:$('department').value})});e.target.reset();message('Student added.');await loadStudents()}catch(err){message(err.message)}
};
async function updateStats(){
  const month=$('reportMonth').value;
  const report=await (await api('/api/reports/monthly?month='+month)).json();
  $('periodCount').textContent=report.totalRecords;
  $('lowCount').textContent=report.students.filter(s=>s.working>0&&s.percentage<75).length;
}
async function loadReport(){
  const month=$('reportMonth').value;
  const data=await (await api('/api/reports/monthly?month='+encodeURIComponent(month))).json();
  $('reportRows').innerHTML=data.students.map(s=>`<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${s.attended}</td><td>${s.absent}</td><td>${s.working}</td><td><strong>${s.percentage.toFixed(2)}%</strong></td><td>${s.working===0?'No data':s.percentage<75?'<span style="color:#b9382c">Below 75%</span>':'<span style="color:#16744a">Meets threshold</span>'}</td></tr>`).join('');
  await updateStats();
}
$('loadReport').onclick=()=>loadReport().catch(e=>message(e.message));
$('exportCsv').onclick=()=>{location.href='/api/reports/monthly.csv?month='+encodeURIComponent($('reportMonth').value)};
document.querySelectorAll('.nav').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.nav').forEach(n => {
      n.classList.toggle('active', n === b);
    });

    [
      'students',
      'attendance',
      'records',
      'calculation',
      'reports'
    ].forEach(id => {
      const section = $(id);
      if (section) {
        section.classList.toggle('hidden', id !== b.dataset.view);
      }
    });

    if (b.dataset.view === 'reports') {
      loadReport().catch(e => message(e.message));
    }

    if (b.dataset.view === 'calculation') {
      loadCalculation().catch(e => message(e.message));
    }

    if (b.dataset.view === 'records') {
      loadRecords().catch(e => message(e.message));
    }
  };
});
loadStudents().then(loadReport).catch(e=>message(e.message));


async function loadRecords() {
  const dateInput = $('recordsDate');
  const date = dateInput.value;

  if (!date) {
    message('Please select a date first.');
    return;
  }

  const [attendanceResponse, studentsResponse] = await Promise.all([
    api('/api/attendance?date=' + encodeURIComponent(date)),
    api('/api/students')
  ]);

  const attendance = await attendanceResponse.json();
  const students = await studentsResponse.json();

  if (!attendanceResponse.ok) {
    throw new Error(attendance.error || 'Could not load records.');
  }

  const studentList = Array.isArray(students)
    ? students
    : (students.students || []);

  const rows = studentList.map(student => {
    const periods = [];

    for (let p = 1; p <= 7; p++) {
      const record = attendance.find(a =>
        a.studentId === student.id && a.period === p
      );

      periods.push(record ? record.status : '-');
    }

    return `<tr>
      <td>${esc(student.roll)}</td>
      <td>${esc(student.name)}</td>
      <td>${esc(student.department || '-')}</td>
      ${periods.map(value => `<td>${esc(value)}</td>`).join('')}
    </tr>`;
  });

  $('recordsRows').innerHTML = rows.join('');

  if (!rows.length) {
    $('recordsRows').innerHTML =
      '<tr><td colspan="10">No students found.</td></tr>';
  }
}

$('loadRecords').onclick = () =>
  loadRecords().catch(error => message(error.message));

async function loadCalculation() {
  const monthInput = $('calculationMonth');

  if (!monthInput.value) {
    monthInput.value = $('reportMonth').value;
  }

  const month = monthInput.value;
  const response = await api(
    '/api/reports/monthly?month=' + encodeURIComponent(month)
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not calculate attendance.');
  }

  $('calculationRows').innerHTML = data.students.map(s => `
    <tr>
      <td>${esc(s.roll)}</td>
      <td>${esc(s.name)}</td>
      <td>${s.attended}</td>
      <td>${s.absent}</td>
      <td>${s.working}</td>
      <td><strong>${s.percentage.toFixed(2)}%</strong></td>
    </tr>
  `).join('');

  if (!data.students.length) {
    $('calculationRows').innerHTML =
      '<tr><td colspan="6">No attendance data for this month.</td></tr>';
  }
}

$('calculateAttendance').onclick = () =>
  loadCalculation().catch(e => message(e.message));

