(function () {
  if (typeof db === 'undefined' || typeof SEED === 'undefined') return;

  function assignKey(a) {
    if (a && a.assignmentId) return 'id:' + String(a.assignmentId);
    return ['row', a && a.personnel, a && a.task, a && a.dateCompleted, a && a.completionTime, a && a.dateDue, a && a.status].join('|');
  }

  function mergeStore(src) {
    if (!src || typeof src !== 'object') return { people: 0, tasks: 0, rows: 0, cats: 0 };
    if (!Array.isArray(db.personnel)) db.personnel = [];
    if (!Array.isArray(db.tasks)) db.tasks = [];
    if (!Array.isArray(db.assignments)) db.assignments = [];
    if (!Array.isArray(db.categories)) db.categories = [];

    let people = 0, tasks = 0, rows = 0, cats = 0;
    const haveP = new Set(db.personnel.map(p => p.fullName));
    (src.personnel || []).forEach(p => {
      if (!p || !p.fullName) return;
      if (!haveP.has(p.fullName)) {
        db.personnel.push(Object.assign({}, p));
        haveP.add(p.fullName);
        people++;
      } else {
        const dest = db.personnel.find(x => x.fullName === p.fullName);
        ['rank', 'station', 'shift', 'battalion', 'active', 'notes'].forEach(f => {
          if ((!dest[f] || dest[f] === '') && p[f]) dest[f] = p[f];
        });
      }
    });

    const haveT = new Set(db.tasks.map(t => t.taskName));
    (src.tasks || []).forEach(t => {
      if (!t || !t.taskName) return;
      if (!haveT.has(t.taskName)) {
        db.tasks.push(Object.assign({}, t));
        haveT.add(t.taskName);
        tasks++;
      }
    });

    const haveA = new Set(db.assignments.map(assignKey));
    (src.assignments || []).forEach(a => {
      if (!a) return;
      const k = assignKey(a);
      if (!haveA.has(k)) {
        db.assignments.push(Object.assign({}, a));
        haveA.add(k);
        rows++;
      }
    });

    const haveC = new Set(db.categories);
    (src.categories || []).forEach(c => {
      if (c && !haveC.has(c)) {
        db.categories.push(c);
        haveC.add(c);
        cats++;
      }
    });
    return { people: people, tasks: tasks, rows: rows, cats: cats };
  }

  let v1 = null;
  try { v1 = JSON.parse(localStorage.getItem('bgfd-training-app-v1') || 'null'); } catch (e) { v1 = null; }
  const fromV1 = mergeStore(v1);

  const seedByName = {};
  (SEED.personnel || []).forEach(p => { seedByName[p.fullName] = p; });
  (db.personnel || []).forEach(p => {
    const src = seedByName[p.fullName] || {};
    if (p.station == null || p.station === '') p.station = src.station || '';
    if (p.shift == null || p.shift === '') p.shift = src.shift || '';
    if (p.battalion == null || p.battalion === '') p.battalion = src.battalion || '';
  });
  const have = new Set((db.personnel || []).map(p => p.fullName));
  (SEED.personnel || []).forEach(p => {
    if (!have.has(p.fullName)) {
      db.personnel.push(Object.assign({}, p));
      have.add(p.fullName);
    }
  });

  if (typeof save === 'function') save(db);
  if (typeof fillPeople === 'function') fillPeople();

  const note = document.getElementById('save-msg');
  if (note && v1 && (fromV1.rows || fromV1.people || fromV1.tasks)) {
    note.textContent = 'Imported v1 database into v2: ' +
      fromV1.rows + ' assignments, ' + fromV1.people + ' people, ' + fromV1.tasks + ' tasks.';
  }

  window.setPersonForm = function (p) {
    document.getElementById('n-orig-person').value = p ? p.fullName : '';
    document.getElementById('n-name').value = p ? p.fullName : '';
    document.getElementById('n-rank').value = p ? (p.rank || '') : '';
    const st = document.getElementById('n-station');
    const sh = document.getElementById('n-shift');
    const ba = document.getElementById('n-battalion');
    if (st) st.value = p ? (p.station || '') : '';
    if (sh) sh.value = p ? (p.shift || '') : '';
    if (ba) ba.value = p ? (p.battalion || '') : '';
    document.getElementById('n-active').value = p ? (p.active || 'Yes') : 'Yes';
    document.getElementById('n-pnotes').value = p ? (p.notes || '') : '';
    document.getElementById('btn-delete-person').hidden = !p;
    document.getElementById('person-msg').textContent = p ? 'Editing \u201c' + p.fullName + '\u201d. Save to apply, or Delete.' : '';
  };

  window.renderRoster = function () {
    const out = document.getElementById('r-out');
    const people = [...db.personnel].sort((a, b) => a.fullName.localeCompare(b.fullName));
    out.innerHTML = '<p><strong>' + db.personnel.length + '</strong> personnel \u2022 <strong>' + db.tasks.length + '</strong> tasks \u2022 <strong>' + db.assignments.length + '</strong> assignments</p>' +
      '<h2>Personnel</h2>' +
      '<table><thead><tr><th></th><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th><th>Active</th><th>Records</th><th>Notes</th></tr></thead><tbody>' +
      people.map(p => {
        const n = db.assignments.filter(a => a.personnel === p.fullName).length;
        return '<tr>' +
          '<td><button class="btn sm ghost" data-editperson="' + esc(p.fullName) + '">Edit</button></td>' +
          '<td>' + esc(p.fullName) + '</td><td>' + esc(p.rank || '') + '</td>' +
          '<td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td>' +
          '<td>' + esc(p.active || '') + '</td><td>' + n + '</td><td>' + esc(p.notes || '') + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<h2 style="margin-top:22px">Tasks</h2>' +
      '<table><thead><tr><th></th><th>ID</th><th>Task</th><th>Category</th><th>Standard</th><th>Records</th></tr></thead><tbody>' +
      db.tasks.map(t => {
        const n = db.assignments.filter(a => a.task === t.taskName).length;
        return '<tr>' +
          '<td><button class="btn sm ghost" data-edittask="' + esc(t.taskName) + '">Edit</button></td>' +
          '<td>' + esc(t.taskId || '') + '</td><td>' + esc(t.taskName) + '</td>' +
          '<td>' + esc(t.category || '') + '</td><td>' + esc(t.stdTime || '') + '</td><td>' + n + '</td></tr>';
      }).join('') +
      '</tbody></table>';
    out.querySelectorAll('[data-edittask]').forEach(b => {
      b.onclick = function () {
        const t = db.tasks.find(x => x.taskName === b.dataset.edittask);
        if (t) { setTaskForm(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      };
    });
    out.querySelectorAll('[data-editperson]').forEach(b => {
      b.onclick = function () {
        const p = db.personnel.find(x => x.fullName === b.dataset.editperson);
        if (p) { setPersonForm(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      };
    });
  };

  const addBtn = document.getElementById('btn-add-person');
  if (addBtn) {
    addBtn.onclick = function () {
      const name = document.getElementById('n-name').value.trim();
      const orig = document.getElementById('n-orig-person').value;
      const rank = document.getElementById('n-rank').value.trim();
      const station = (document.getElementById('n-station') || {}).value || '';
      const shift = (document.getElementById('n-shift') || {}).value || '';
      const battalion = (document.getElementById('n-battalion') || {}).value || '';
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
        p.station = station.trim();
        p.shift = shift.trim();
        p.battalion = battalion.trim();
        p.active = active;
        p.notes = notes;
        db.assignments.forEach(a => {
          if (a.personnel === orig) {
            a.personnel = name;
            a.rank = rank;
          }
        });
        msg.textContent = 'Updated \u201c' + name + '\u201d and synced assignment rows.';
      } else {
        db.personnel.push({
          fullName: name, lastName: parts.lastName, firstName: parts.firstName,
          rank: rank, station: station.trim(), shift: shift.trim(), battalion: battalion.trim(), active: active, notes: notes
        });
        msg.textContent = 'Added \u201c' + name + '\u201d.';
      }
      save(db); fillPeople(); setPersonForm(null); renderRoster();
    };
  }
})();
