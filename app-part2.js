  });
  const byDate = {};
  timed.forEach(a => { const d = a.dateCompleted || a.dateDue || 'undated'; (byDate[d] ||= []).push(a); });
  html += '<div class="cat-block"><h2>Timed work by date (department)</h2><table><thead><tr><th>Date</th><th>N</th><th>Avg minutes</th><th>Tasks</th></tr></thead><tbody>';
  Object.keys(byDate).sort().forEach(d => {
    const list = byDate[d];
    const secs = list.map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
    const avg = secs.reduce((a,b)=>a+b,0)/secs.length/60;
    html += `<tr><td>${esc(d)}</td><td>${secs.length}</td><td>${fmtMin(avg)}</td><td>${esc([...new Set(list.map(x=>x.task))].join(', '))}</td></tr>`;
  });
  html += '</tbody></table></div>';
  out.innerHTML = html;
  destroyChart('deptAvg');
  charts.deptAvg = new Chart(document.getElementById('chart-dept-avg'), {
    type: 'bar',
    data: { labels: barLabels, datasets: [{ label: 'Department avg minutes', data: barData, backgroundColor: COLORS }] },
    options: chartOpts('Department average by task (minutes)')
  });
}

function filteredTimed() {
  const person = (document.getElementById('c-person').value||'').trim();
  const cat = document.getElementById('c-cat').value;
  return db.assignments.filter(a => {
    if (timeToSec(a.completionTime) == null) return false;
    if (person && a.personnel !== person) return false;
    if (cat && catOf(a) !== cat) return false;
    return true;
  });
}

function renderCharts() {
  const rows = filteredTimed().slice().sort((a,b) => String(a.dateCompleted||a.dateDue||'').localeCompare(String(b.dateCompleted||b.dateDue||'')));
  const person = (document.getElementById('c-person').value||'').trim();
  const scope = person || 'Department';

  // trend by task over date
  const byTask = {};
  rows.forEach(r => (byTask[r.task] ||= []).push(r));
  const dates = [...new Set(rows.map(r => r.dateCompleted || r.dateDue || ''))].filter(Boolean).sort();
  destroyChart('trend');
  charts.trend = new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: Object.keys(byTask).map((task,i) => ({
        label: task,
        data: dates.map(d => {
          const hits = byTask[task].filter(r => (r.dateCompleted||r.dateDue) === d);
          if (!hits.length) return null;
          const secs = hits.map(h => timeToSec(h.completionTime)).filter(s=>s!=null);
          return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : null;
        }),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length],
        spanGaps: true, tension: 0.2
      }))
    },
    options: chartOpts(scope + ' — time trend by date')
  });

  // compare people (or tasks if person selected)
  destroyChart('compare');
  if (person) {
    const labels = Object.keys(byTask);
    const data = labels.map(t => {
      const secs = byTask[t].map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : 0;
    });
    charts.compare = new Chart(document.getElementById('chart-compare'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avg min', data, backgroundColor: COLORS }] },
      options: chartOpts(person + ' — task comparison')
    });
  } else {
    const people = {};
    rows.forEach(r => (people[r.personnel] ||= []).push(r));
    const labels = Object.keys(people).sort();
    const data = labels.map(n => {
      const secs = people[n].map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : 0;
    });
    charts.compare = new Chart(document.getElementById('chart-compare'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avg min (mixed tasks)', data, backgroundColor: COLORS[1] }] },
      options: chartOpts('People comparison — average minutes')
    });
  }

  destroyChart('status');
  const statuses = ['Completed','In Progress','Not Started','At Risk','Overdue'];
  const pool = person ? rowsFor(person) : db.assignments;
  charts.status = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: {
      labels: statuses,
      datasets: [{ data: statuses.map(s => pool.filter(a => a.status === s).length), backgroundColor: ['#3fb950','#58a6ff','#8b949e','#e3b341','#ff7b72'] }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ title:{display:true,text:scope+' — status mix',color:'#e6edf3'}, legend:{labels:{color:'#e6edf3'}} } }
  });

  destroyChart('met');
  const yes = pool.filter(a => a.metStandard==='Yes').length;
  const no = pool.filter(a => a.metStandard==='No').length;
  const unk = pool.filter(a => a.metStandard!=='Yes' && a.metStandard!=='No').length;
  charts.met = new Chart(document.getElementById('chart-met'), {
    type: 'doughnut',
    data: { labels: ['Met standard','Missed','No standard / not timed'], datasets: [{ data:[yes,no,unk], backgroundColor:['#3fb950','#ff7b72','#8b949e'] }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ title:{display:true,text:scope+' — standard time',color:'#e6edf3'}, legend:{labels:{color:'#e6edf3'}} } }
  });
}
document.getElementById('c-person').oninput = renderCharts;
document.getElementById('c-person').onchange = renderCharts;
document.getElementById('c-cat').onchange = renderCharts;

let pendingDeleteCat = null;
function renderCats() {
  const box = document.getElementById('cat-list');
  box.innerHTML = db.categories.sort().map(c => {
    const nT = db.tasks.filter(t => t.category === c).length;
    const nA = db.assignments.filter(a => catOf(a) === c).length;
    return `<div class="tag">
      <strong>${esc(c)}</strong>
      <span class="muted">${nT} tasks / ${nA} records</span>
      <button class="btn sm ghost" data-ren="${esc(c)}">Rename</button>
      <button class="btn sm" data-del="${esc(c)}">Delete</button>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-ren]').forEach(b => b.onclick = () => renameCat(b.dataset.ren));
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => startDeleteCat(b.dataset.del));
}
function renameCat(oldName) {
  const neu = prompt('Rename category', oldName);
  if (!neu || neu === oldName) return;
  if (db.categories.includes(neu)) { alert('That category already exists.'); return; }
  db.categories = db.categories.map(c => c === oldName ? neu : c);
  db.tasks.forEach(t => { if (t.category === oldName) t.category = neu; });
  db.assignments.forEach(a => { if (a.category === oldName) a.category = neu; });
  save(db); fillCats(); renderCats();
}
function startDeleteCat(name) {
  pendingDeleteCat = name;
  const nT = db.tasks.filter(t => t.category === name).length;
  const nA = db.assignments.filter(a => catOf(a) === name).length;
  document.getElementById('dlg-del-msg').textContent = `"${name}" has ${nT} tasks and ${nA} assignments. Choose a category to move them into.`;
  fillSelect(document.getElementById('dlg-move-to'), db.categories.filter(c => c !== name));
  document.getElementById('dlg-del-cat').showModal();
}
document.getElementById('dlg-cancel-del').onclick = () => document.getElementById('dlg-del-cat').close();
document.getElementById('dlg-confirm-del').onclick = () => {
  const name = pendingDeleteCat;
  const dest = document.getElementById('dlg-move-to').value || 'Other';
  if (!db.categories.includes(dest)) db.categories.push(dest);
  db.tasks.forEach(t => { if (t.category === name) t.category = dest; });
  db.assignments.forEach(a => { if (a.category === name) a.category = dest; });
  db.categories = db.categories.filter(c => c !== name);
  save(db); fillCats(); renderCats();
  document.getElementById('dlg-del-cat').close();
};
document.getElementById('btn-add-cat').onclick = () => {
  const name = document.getElementById('cat-new').value.trim();
  if (!name) return;
  if (db.categories.includes(name)) { alert('Already exists.'); return; }
  db.categories.push(name);
  save(db); fillCats(); renderCats();
  document.getElementById('cat-new').value = '';
};

function setTaskForm(t) {
  document.getElementById('n-orig-task').value = t ? t.taskName : '';
  document.getElementById('n-task').value = t ? t.taskName : '';
  document.getElementById('n-cat').value = t ? (t.category || '') : document.getElementById('n-cat').value;
  document.getElementById('n-std').value = t ? (t.stdTime || '') : '';
  document.getElementById('n-tid').value = t ? (t.taskId || '') : '';
  document.getElementById('btn-delete-task').hidden = !t;
  document.getElementById('task-msg').textContent = t ? 'Editing “' + t.taskName + '”. Save to apply, or Delete.' : '';
}
function setPersonForm(p) {
  document.getElementById('n-orig-person').value = p ? p.fullName : '';
  document.getElementById('n-name').value = p ? p.fullName : '';
  document.getElementById('n-rank').value = p ? (p.rank || '') : '';
  document.getElementById('n-active').value = p ? (p.active || 'Yes') : 'Yes';
  document.getElementById('n-pnotes').value = p ? (p.notes || '') : '';
  document.getElementById('btn-delete-person').hidden = !p;
  document.getElementById('person-msg').textContent = p ? 'Editing “' + p.fullName + '”. Save to apply, or Delete.' : '';
}
function splitName(name) {
  const parts = name.split(',');
  return { lastName: (parts[0]||'').trim(), firstName: (parts.slice(1).join(',')||'').trim() };
}
function renderRoster() {
  const out = document.getElementById('r-out');
  const people = [...db.personnel].sort((a,b) => a.fullName.localeCompare(b.fullName));
  out.innerHTML = `<p><strong>${db.personnel.length}</strong> personnel • <strong>${db.tasks.length}</strong> tasks</p>
    <h2>Personnel</h2>
    <table><thead><tr><th></th><th>Name</th><th>Rank</th><th>Active</th><th>Records</th><th>Notes</th></tr></thead><tbody>
    ${people.map(p => {
      const n = db.assignments.filter(a => a.personnel === p.fullName).length;
      return `<tr>
        <td><button class="btn sm ghost" data-editperson="${esc(p.fullName)}">Edit</button></td>
        <td>${esc(p.fullName)}</td><td>${esc(p.rank||'')}</td>
        <td>${esc(p.active||'')}</td><td>${n}</td><td>${esc(p.notes||'')}</td></tr>`;
    }).join('')}
    </tbody></table>
    <h2 style="margin-top:22px">Tasks</h2>
    <table><thead><tr><th></th><th>ID</th><th>Task</th><th>Category</th><th>Standard</th><th>Records</th></tr></thead><tbody>
    ${db.tasks.map(t => {
      const n = db.assignments.filter(a => a.task === t.taskName).length;
      return `<tr>
        <td><button class="btn sm ghost" data-edittask="${esc(t.taskName)}">Edit</button></td>
        <td>${esc(t.taskId||'')}</td><td>${esc(t.taskName)}</td>
        <td>${esc(t.category||'')}</td><td>${esc(t.stdTime||'')}</td><td>${n}</td></tr>`;
    }).join('')}
    </tbody></table>`;
  out.querySelectorAll('[data-edittask]').forEach(b => {
    b.onclick = () => {
      const t = db.tasks.find(x => x.taskName === b.dataset.edittask);
      if (t) { setTaskForm(t); window.scrollTo({top:0,behavior:'smooth'}); }
    };
  });
  out.querySelectorAll('[data-editperson]').forEach(b => {
    b.onclick = () => {
      const p = db.personnel.find(x => x.fullName === b.dataset.editperson);
      if (p) { setPersonForm(p); window.scrollTo({top:0,behavior:'smooth'}); }
    };
  });
}
document.getElementById('btn-reset-person').onclick = () => setPersonForm(null);
document.getElementById('btn-add-person').onclick = () => {
  const name = document.getElementById('n-name').value.trim();
  const orig = document.getElementById('n-orig-person').value;
  const rank = document.getElementById('n-rank').value.trim();
  const active = document.getElementById('n-active').value || 'Yes';
  const notes = document.getElementById('n-pnotes').value;
  const msg = document.getElementById('person-msg');
  if (!name) { msg.textContent = 'Name is required (Last, First).'; return; }
  const clash = db.personnel.find(p => p.fullName.toLowerCase() === name.toLowerCase() && p.fullName !== orig);
  if (clash) { msg.textContent = 'Another person already uses that name.'; return; }
  const parts = splitName(name);
  if (orig) {
    const p = db.personnel.find(x => x.fullName === orig);
    if (!p) return;
    p.fullName = name;
    p.lastName = parts.lastName;
    p.firstName = parts.firstName;
    p.rank = rank;
    p.active = active;
    p.notes = notes;
    db.assignments.forEach(a => {
      if (a.personnel === orig) {
        a.personnel = name;
        a.rank = rank;
      }
    });
    msg.textContent = 'Updated “' + name + '” and synced assignment rows.';
  } else {
    db.personnel.push({ fullName:name, lastName:parts.lastName, firstName:parts.firstName, rank, active, notes });
    msg.textContent = 'Added “' + name + '”.';
  }
  save(db); fillPeople(); setPersonForm(null); renderRoster();
};
let pendingDeletePerson = null;
document.getElementById('btn-delete-person').onclick = () => {
  const orig = document.getElementById('n-orig-person').value;
  if (!orig) return;
  pendingDeletePerson = orig;
  const n = db.assignments.filter(a => a.personnel === orig).length;
  document.getElementById('dlg-del-person-msg').textContent = '“' + orig + '” has ' + n + ' assignment row(s). Move those rows to another person, or leave blank to delete them.';
  const others = peopleNames().filter(n => n !== orig);
  const sel = document.getElementById('dlg-person-move');
  sel.innerHTML = '<option value="">(delete those assignment rows)</option>' + others.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  document.getElementById('dlg-del-person').showModal();
};
document.getElementById('dlg-cancel-del-person').onclick = () => document.getElementById('dlg-del-person').close();
document.getElementById('dlg-confirm-del-person').onclick = () => {
  const name = pendingDeletePerson;
  const dest = document.getElementById('dlg-person-move').value;
  if (dest) {
    const pDest = db.personnel.find(p => p.fullName === dest);
    db.assignments.forEach(a => {
      if (a.personnel === name) {
        a.personnel = dest;
        if (pDest) a.rank = pDest.rank || a.rank;
      }
    });
  } else {
    db.assignments = db.assignments.filter(a => a.personnel !== name);
  }
  db.personnel = db.personnel.filter(p => p.fullName !== name);
  save(db); fillPeople(); setPersonForm(null); renderRoster(); renderAllTable();
  document.getElementById('dlg-del-person').close();
  document.getElementById('person-msg').textContent = 'Deleted “' + name + '”.';
};
document.getElementById('btn-reset-task').onclick = () => setTaskForm(null);
document.getElementById('btn-add-task').onclick = () => {
  const name = document.getElementById('n-task').value.trim();
  const orig = document.getElementById('n-orig-task').value;
  const cat = document.getElementById('n-cat').value || 'Other';
  const std = document.getElementById('n-std').value.trim();
  const tid = document.getElementById('n-tid').value.trim();
  if (!name) { document.getElementById('task-msg').textContent = 'Task name is required.'; return; }
  const clash = db.tasks.find(t => t.taskName === name && t.taskName !== orig);
  if (clash) { document.getElementById('task-msg').textContent = 'Another task already uses that name.'; return; }
  if (orig) {
    const t = db.tasks.find(x => x.taskName === orig);
    if (!t) return;
    const oldName = t.taskName, oldStd = t.stdTime, oldId = t.taskId, oldCat = t.category;
    t.taskName = name; t.category = cat; t.stdTime = std; t.taskId = tid || t.taskId;
    db.assignments.forEach(a => {
      if (a.task === oldName) {
        a.task = name;
        if (t.taskId) a.taskId = t.taskId;
        a.category = cat;
        if (a.stdTime === oldStd || !a.stdTime) a.stdTime = std;
        if (a.completionTime && a.stdTime) {
          const x = timeToSec(a.completionTime), y = timeToSec(a.stdTime);
          if (x != null && y != null) a.metStandard = x <= y ? 'Yes' : 'No';
        }
      }
    });
    document.getElementById('task-msg').textContent = 'Updated task “' + name + '” and synced assignment rows.';
  } else {
    db.tasks.push({ taskId: tid || ('T-X'+String(db.tasks.length+1).padStart(2,'0')), taskName:name, category:cat, stdTime:std, active:'Yes' });
    document.getElementById('task-msg').textContent = 'Added task “' + name + '”.';
  }
  save(db); fillPeople(); setTaskForm(null); renderRoster();
};
let pendingDeleteTask = null;
document.getElementById('btn-delete-task').onclick = () => {
  const orig = document.getElementById('n-orig-task').value;
  if (!orig) return;
  pendingDeleteTask = orig;
  const n = db.assignments.filter(a => a.task === orig).length;
  document.getElementById('dlg-del-task-msg').textContent = '“' + orig + '” is used on ' + n + ' assignment row(s). Move those rows to another task, or choose “(delete rows)” to remove them.';
  const others = db.tasks.filter(t => t.taskName !== orig).map(t => t.taskName);
  const sel = document.getElementById('dlg-task-move');
  sel.innerHTML = '<option value="">(delete those assignment rows)</option>' + others.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  document.getElementById('dlg-del-task').showModal();
};
document.getElementById('dlg-cancel-del-task').onclick = () => document.getElementById('dlg-del-task').close();
document.getElementById('dlg-confirm-del-task').onclick = () => {
  const name = pendingDeleteTask;
  const dest = document.getElementById('dlg-task-move').value;
  if (dest) {
    const tDest = db.tasks.find(t => t.taskName === dest);
    db.assignments.forEach(a => {
      if (a.task === name) {
        a.task = dest;
        if (tDest) {
          a.taskId = tDest.taskId || a.taskId;
          a.category = tDest.category || a.category;
          if (tDest.stdTime) a.stdTime = tDest.stdTime;
        }
      }
    });
  } else {
    db.assignments = db.assignments.filter(a => a.task !== name);
  }
  db.tasks = db.tasks.filter(t => t.taskName !== name);
  save(db); fillPeople(); setTaskForm(null); renderRoster(); renderAllTable();
  document.getElementById('dlg-del-task').close();
  document.getElementById('task-msg').textContent = 'Deleted task “' + name + '”.';
};

fillPeople();
renderAllTable();
