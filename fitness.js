(function () {
  var KEY = 'bgfd-fitness-app-v1';
  var TRAIN_KEY = 'bgfd-training-app-v2';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
    });
  }
  function seedPeople() {
    return [].concat(window.SEED_PERSONNEL || [], window.SEED_PERSONNEL_A || [], window.SEED_PERSONNEL_B || []).filter(function (p) { return p && p.fullName; });
  }
  function trainingPeople() {
    try {
      var raw = localStorage.getItem(TRAIN_KEY) || localStorage.getItem('bgfd-training-app-v1');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return (parsed.personnel || []).filter(function (p) { return p && p.fullName; });
    } catch (e) { return []; }
  }
  function mergePeople(into, extra) {
    var have = {};
    into.forEach(function (p) { if (p && p.fullName) have[p.fullName] = p; });
    extra.forEach(function (p) {
      if (!p || !p.fullName) return;
      if (!have[p.fullName]) {
        into.push({ fullName: p.fullName, lastName: p.lastName || '', firstName: p.firstName || '', rank: p.rank || '', station: p.station || '', shift: p.shift || '', battalion: p.battalion || '', active: p.active || 'Yes', notes: p.notes || '' });
        have[p.fullName] = into[into.length - 1];
      }
    });
    return into;
  }
  function save(store) { localStorage.setItem(KEY, JSON.stringify(store)); db = store; }
  function load() {
    var store = { personnel: [], tasks: [], results: [] };
    try { var raw = localStorage.getItem(KEY); if (raw) store = JSON.parse(raw); } catch (e) {}
    store.personnel = store.personnel || [];
    store.tasks = store.tasks || [];
    store.results = store.results || [];
    var seed = window.SEED_FITNESS || { tasks: [], results: [], personnel: [] };
    (seed.tasks || []).forEach(function (t) {
      if (t && t.name && !store.tasks.some(function (x) { return x.name === t.name; })) store.tasks.push({ name: t.name, standard: t.standard || '', unit: t.unit || '' });
    });
    var haveId = {};
    store.results.forEach(function (r) { if (r && r.id) haveId[r.id] = true; });
    (seed.results || []).forEach(function (r) {
      if (r && r.id && !haveId[r.id]) { store.results.push(r); haveId[r.id] = true; }
    });
    var before = store.personnel.length;
    mergePeople(store.personnel, seed.personnel || []);
    mergePeople(store.personnel, seedPeople());
    mergePeople(store.personnel, trainingPeople());
    store.personnel.sort(function (a, b) { return String(a.fullName).localeCompare(String(b.fullName)); });
    if (store.personnel.length !== before || (seed.results || []).length) save(store);
    return store;
  }
  var db = load();
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? '' : v; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fillSelect(id, items, extra) {
    var el = document.getElementById(id); if (!el) return; var cur = el.value;
    el.innerHTML = (extra || '') + items.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    if ([].slice.call(el.options).some(function (o) { return o.value === cur; })) el.value = cur;
  }
  function names() { return db.personnel.map(function (p) { return p.fullName; }).sort(function (a, b) { return a.localeCompare(b); }); }
  function nextId() {
    var nums = db.results.map(function (r) { return parseInt(String(r.id || '').replace(/\D/g, ''), 10); }).filter(function (n) { return !isNaN(n); });
    return 'F-' + String((Math.max(0, nums.length ? Math.max.apply(null, nums) : 0) + 1)).padStart(4, '0');
  }
  function personOf(name) { return db.personnel.filter(function (p) { return p.fullName === name; })[0] || {}; }
  function renderLog() {
    fillSelect('f-person', names(), '<option value="">Select personnel</option>');
    fillSelect('f-task', db.tasks.map(function (t) { return t.name; }), '<option value="">Select task</option>');
    var hint = document.getElementById('form-hint');
    if (hint) hint.textContent = db.personnel.length + ' personnel \u2022 ' + db.tasks.length + ' fitness tasks \u2022 ' + db.results.length + ' results.';
    var box = document.getElementById('all-table');
    if (!box) return;
    box.innerHTML = '<table><thead><tr><th></th><th>Date</th><th>Personnel</th><th>Station</th><th>Shift</th><th>Battalion</th><th>Task</th><th>Result</th><th>Met</th></tr></thead><tbody>' +
      db.results.slice().reverse().map(function (r) {
        var p = personOf(r.personnel);
        return '<tr><td><button type="button" class="btn ghost" data-edit="' + esc(r.id) + '">Edit</button></td><td>' + esc(r.date) + '</td><td>' + esc(r.personnel) + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td><td>' + esc(r.task) + '</td><td>' + esc(r.result) + '</td><td>' + esc(r.met || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
    box.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { loadResult(b.getAttribute('data-edit')); }; });
  }
  function renderCatalog() {
    var out = document.getElementById('r-out'); if (!out) return;
    var people = db.personnel.slice().sort(function (a, b) { return a.fullName.localeCompare(b.fullName); });
    out.innerHTML = '<p><strong>' + people.length + '</strong> personnel \u2022 <strong>' + db.tasks.length + '</strong> fitness tasks</p><h2>Personnel</h2><table><thead><tr><th></th><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td><button type="button" class="btn ghost" data-editperson="' + esc(p.fullName) + '">Edit</button></td><td>' + esc(p.fullName) + '</td><td>' + esc(p.rank || '') + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td></tr>'; }).join('') +
      '</tbody></table><h2 style="margin-top:18px">Fitness tasks</h2>' +
      (db.tasks.length ? '<table><thead><tr><th></th><th>Task</th><th>Standard</th><th>Unit</th></tr></thead><tbody>' + db.tasks.map(function (t) { return '<tr><td><button type="button" class="btn ghost" data-edittask="' + esc(t.name) + '">Edit</button></td><td>' + esc(t.name) + '</td><td>' + esc(t.standard || '') + '</td><td>' + esc(t.unit || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">No fitness tasks yet.</p>');
    out.querySelectorAll('[data-editperson]').forEach(function (b) {
      b.onclick = function () {
        var p = personOf(b.getAttribute('data-editperson'));
        setVal('n-orig-person', p.fullName); setVal('n-name', p.fullName); setVal('n-rank', p.rank || '');
        setVal('n-station', p.station || ''); setVal('n-shift', p.shift || ''); setVal('n-battalion', p.battalion || '');
        setVal('n-active', p.active || 'Yes'); setVal('n-pnotes', p.notes || '');
        document.getElementById('btn-delete-person').hidden = false;
      };
    });
    out.querySelectorAll('[data-edittask]').forEach(function (b) {
      b.onclick = function () {
        var name = b.getAttribute('data-edittask');
        var t = db.tasks.filter(function (x) { return x.name === name; })[0];
        if (!t) return;
        setVal('n-orig-task', t.name); setVal('n-task', t.name); setVal('n-std', t.standard || ''); setVal('n-unit', t.unit || '');
        document.getElementById('btn-delete-task').hidden = false;
      };
    });
  }
  function show(tab) {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    document.getElementById('tab-log').hidden = tab !== 'log';
    document.getElementById('tab-catalog').hidden = tab !== 'catalog';
    if (tab === 'catalog') renderCatalog();
    if (tab === 'log') renderLog();
  }
  function clearResult() {
    setVal('f-id', ''); setVal('f-person', ''); setVal('f-task', ''); setVal('f-done', todayISO()); setVal('f-result', ''); setVal('f-met', ''); setVal('f-notes', '');
    document.getElementById('btn-delete').hidden = true;
    document.getElementById('form-title').textContent = 'Log a fitness result';
  }
  function loadResult(id) {
    var rec = db.results.filter(function (r) { return r.id === id; })[0];
    if (!rec) return;
    setVal('f-id', rec.id); setVal('f-person', rec.personnel); setVal('f-task', rec.task);
    setVal('f-done', rec.date || ''); setVal('f-result', rec.result || ''); setVal('f-met', rec.met || ''); setVal('f-notes', rec.notes || '');
    document.getElementById('btn-delete').hidden = false;
    document.getElementById('form-title').textContent = 'Edit ' + rec.id;
    show('log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('nav button').forEach(function (b) { b.onclick = function () { show(b.getAttribute('data-tab')); }; });
  document.getElementById('btn-save').onclick = function () {
    var person = val('f-person'), task = val('f-task');
    if (!person || !task) { document.getElementById('save-msg').textContent = 'Personnel and task are required. Add a fitness task on Roster / tasks first.'; return; }
    var id = val('f-id') || nextId();
    var row = { id: id, personnel: person, task: task, date: val('f-done') || todayISO(), result: val('f-result'), met: val('f-met'), notes: val('f-notes') };
    var i = -1; db.results.forEach(function (r, idx) { if (r.id === id) i = idx; });
    if (i >= 0) db.results[i] = row; else db.results.push(row);
    save(db);
    document.getElementById('save-msg').textContent = (i >= 0 ? 'Updated ' : 'Added ') + task + ' for ' + person + '.';
    clearResult(); renderLog();
  };
  document.getElementById('btn-reset').onclick = clearResult;
  document.getElementById('btn-delete').onclick = function () {
    var id = val('f-id');
    if (!id || !confirm('Delete result ' + id + '?')) return;
    db.results = db.results.filter(function (r) { return r.id !== id; });
    save(db); document.getElementById('save-msg').textContent = 'Deleted ' + id + '.'; clearResult(); renderLog();
  };
  document.getElementById('btn-add-person').onclick = function () {
    var name = val('n-name');
    if (!name) { document.getElementById('person-msg').textContent = 'Name is required (Last, First).'; return; }
    var orig = val('n-orig-person'); var parts = name.split(',');
    var rec = { fullName: name, lastName: (parts[0] || '').trim(), firstName: (parts.slice(1).join(',') || '').trim(), rank: val('n-rank'), station: val('n-station'), shift: val('n-shift'), battalion: val('n-battalion'), active: val('n-active') || 'Yes', notes: val('n-pnotes') };
    if (orig) {
      var p = personOf(orig); Object.keys(rec).forEach(function (k) { p[k] = rec[k]; });
      db.results.forEach(function (r) { if (r.personnel === orig) r.personnel = name; });
      document.getElementById('person-msg').textContent = 'Updated ' + name + '.';
    } else { db.personnel.push(rec); document.getElementById('person-msg').textContent = 'Added ' + name + '.'; }
    save(db); setVal('n-orig-person', ''); setVal('n-name', ''); setVal('n-pnotes', ''); document.getElementById('btn-delete-person').hidden = true; renderCatalog(); renderLog();
  };
  document.getElementById('btn-delete-person').onclick = function () {
    var orig = val('n-orig-person');
    if (!orig || !confirm('Delete ' + orig + ' and their fitness results?')) return;
    db.personnel = db.personnel.filter(function (p) { return p.fullName !== orig; });
    db.results = db.results.filter(function (r) { return r.personnel !== orig; });
    save(db); document.getElementById('person-msg').textContent = 'Deleted ' + orig + '.'; setVal('n-orig-person', ''); setVal('n-name', ''); document.getElementById('btn-delete-person').hidden = true; renderCatalog();
  };
  document.getElementById('btn-reset-person').onclick = function () {
    ['n-orig-person','n-name','n-rank','n-station','n-shift','n-battalion','n-pnotes'].forEach(function (id) { setVal(id, ''); });
    document.getElementById('btn-delete-person').hidden = true;
  };
  document.getElementById('btn-add-task').onclick = function () {
    var name = val('n-task');
    if (!name) { document.getElementById('task-msg').textContent = 'Task name is required.'; return; }
    var orig = val('n-orig-task');
    var rec = { name: name, standard: val('n-std'), unit: val('n-unit') };
    if (orig) {
      var t = db.tasks.filter(function (x) { return x.name === orig; })[0];
      if (t) { t.name = rec.name; t.standard = rec.standard; t.unit = rec.unit; }
      db.results.forEach(function (r) { if (r.task === orig) r.task = name; });
      document.getElementById('task-msg').textContent = 'Updated ' + name + '.';
    } else if (db.tasks.some(function (t) { return t.name === name; })) {
      document.getElementById('task-msg').textContent = 'That task already exists.'; return;
    } else { db.tasks.push(rec); document.getElementById('task-msg').textContent = 'Added ' + name + '.'; }
    save(db); setVal('n-orig-task', ''); setVal('n-task', ''); setVal('n-std', ''); setVal('n-unit', ''); document.getElementById('btn-delete-task').hidden = true; renderCatalog(); renderLog();
  };
  document.getElementById('btn-delete-task').onclick = function () {
    var orig = val('n-orig-task');
    if (!orig || !confirm('Delete fitness task "' + orig + '"?')) return;
    db.tasks = db.tasks.filter(function (t) { return t.name !== orig; });
    save(db); document.getElementById('task-msg').textContent = 'Deleted ' + orig + '.'; setVal('n-orig-task', ''); setVal('n-task', ''); document.getElementById('btn-delete-task').hidden = true; renderCatalog(); renderLog();
  };
  document.getElementById('btn-reset-task').onclick = function () {
    setVal('n-orig-task', ''); setVal('n-task', ''); setVal('n-std', ''); setVal('n-unit', '');
    document.getElementById('btn-delete-task').hidden = true;
  };
  clearResult(); renderLog();
})();
