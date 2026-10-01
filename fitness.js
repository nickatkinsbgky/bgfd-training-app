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
  function save(store, opts) { localStorage.setItem(KEY, JSON.stringify(store)); db = store; window.db = db; if (!(opts && opts.silent) && typeof window.scheduleFitnessPush === "function") window.scheduleFitnessPush(); }
  function load() {
    var store = { personnel: [], tasks: [], results: [] };
    try { var raw = localStorage.getItem(KEY); if (raw) store = JSON.parse(raw); } catch (e) {}
    store.personnel = store.personnel || [];
    store.tasks = store.tasks || [];
    store.results = store.results || [];
    store.results.forEach(function (r) {
      if (r && (r.personnel === 'Bohn, Dylan' || r.personnel === 'Dylan Bohn')) r.personnel = 'Dylan, Matthew';
    });
    store.personnel = store.personnel.filter(function (p) { return p && p.fullName !== 'Bohn, Dylan' && p.fullName !== 'Dylan Bohn'; });
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
    var ages = window.SEED_FITNESS_AGES || {};
    var year = new Date().getFullYear();
    store.personnel.forEach(function (p) {
      if (!p || !p.fullName || ages[p.fullName] == null) return;
      p.ageBase = ages[p.fullName];
      p.ageBaseYear = 2026;
      p.age = ages[p.fullName] + (year - 2026);
      p.ageAsOf = String(year);
      var note = 'Age as of ' + year;
      p.notes = String(p.notes || '').replace(/Age as of \d{4}/g, '').replace(/\s*·\s*·\s*/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '');
      p.notes = p.notes ? (p.notes + ' · ' + note) : note;
    });
    store.personnel.sort(function (a, b) { return String(a.fullName).localeCompare(String(b.fullName)); });
    if (store.personnel.length !== before || (seed.results || []).length) save(store);
    return store;
  }
  var db = load();
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? '' : v; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function yearOf(date) { var y = String(date || '').slice(0, 4); return /^[0-9]{4}$/.test(y) ? y : ''; }
  function fillYears(selected) {
    var el = document.getElementById('f-year'); if (!el) return;
    var now = new Date().getFullYear();
    var years = {};
    for (var y = 1990; y <= now + 200; y++) years[y] = true;
    (db.results || []).forEach(function (r) { var yy = yearOf(r.date); if (yy) years[yy] = true; });
    if (selected) years[selected] = true;
    var list = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
    el.innerHTML = list.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    el.value = String(selected || now);
  }
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

  function ageYear() { return new Date().getFullYear(); }
  function ageBase(name) {
    var ages = window.SEED_FITNESS_AGES || {};
    if (ages[name] != null) return ages[name];
    var p = personOf(name);
    if (p && p.ageBase != null) return p.ageBase;
    return null;
  }
  function ageOf(name) {
    var base = ageBase(name);
    if (base == null) return '';
    return base + (ageYear() - 2026);
  }
  function ageLabel(name) {
    var age = ageOf(name);
    return age === '' ? '' : (age + ' <span class="muted">as of ' + ageYear() + '</span>');
  }
  function personOf(name) { return db.personnel.filter(function (p) { return p.fullName === name; })[0] || {}; }
  function renderLog() {
    fillSelect('f-person', names(), '<option value="">Select personnel</option>');
    fillSelect('f-task', db.tasks.map(function (t) { return t.name; }), '<option value="">Select task</option>');
    var hint = document.getElementById('form-hint');
    if (hint) hint.textContent = db.personnel.length + ' personnel copied \u2022 ' + db.tasks.length + ' fitness tasks \u2022 ' + db.results.length + ' results. Eval years 2021-2026 are loaded.';
    var box = document.getElementById('all-table');
    if (!box) return;
    box.innerHTML = '<table><thead><tr><th></th><th>Year</th><th>Personnel</th><th>Age</th><th>Station</th><th>Shift</th><th>Battalion</th><th>Task</th><th>Result</th><th>Notes</th></tr></thead><tbody>' +
      db.results.slice().reverse().map(function (r) {
        var p = personOf(r.personnel);
        return '<tr><td><button type="button" class="btn ghost" data-edit="' + esc(r.id) + '">Edit</button></td><td>' + esc(yearOf(r.date)) + '</td><td>' + esc(r.personnel) + '</td><td>' + ageLabel(r.personnel) + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td><td>' + esc(r.task) + '</td><td>' + esc(r.result) + '</td><td>' + esc(r.notes || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
    box.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { loadResult(b.getAttribute('data-edit')); }; });
  }
  function renderCatalog() {
    var out = document.getElementById('r-out'); if (!out) return;
    var people = db.personnel.slice().sort(function (a, b) { return a.fullName.localeCompare(b.fullName); });
    out.innerHTML = '<p><strong>' + people.length + '</strong> personnel \u2022 <strong>' + db.tasks.length + '</strong> fitness tasks</p><h2>Personnel</h2><table><thead><tr><th></th><th>Name</th><th>Age</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td><button type="button" class="btn ghost" data-editperson="' + esc(p.fullName) + '">Edit</button></td><td>' + esc(p.fullName) + '</td><td>' + ageLabel(p.fullName) + '</td><td>' + esc(p.rank || '') + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td></tr>'; }).join('') +
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

  function renderPerson() {
    fillSelect('bp-person', names(), '<option value="">Select personnel</option>');
    var el = document.getElementById('bp-person');
    if (el && !el.dataset.wired) {
      el.dataset.wired = '1';
      el.onchange = renderPerson;
    }
    var box = document.getElementById('bp-out');
    if (!box) return;
    var name = val('bp-person');
    if (!name) { box.innerHTML = '<p class="muted">Select a name.</p>'; return; }
    var p = personOf(name);
    var rows = db.results.filter(function (r) { return r.personnel === name; });
    var years = [];
    rows.forEach(function (r) {
      var y = String(r.date || '').slice(0, 4);
      if (y && years.indexOf(y) < 0) years.push(y);
    });
    years.sort();
    var taskOrder = db.tasks.map(function (t) { return t.name; });
    var tasks = [];
    rows.forEach(function (r) { if (tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    tasks.sort(function (a, b) {
      var ia = taskOrder.indexOf(a), ib = taskOrder.indexOf(b);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || a.localeCompare(b);
    });
    var head = '<p><strong>' + esc(name) + '</strong>' + (ageOf(name) ? ' · Age ' + ageLabel(name) : '') +
      (p.rank ? ' · ' + esc(p.rank) : '') +
      (p.station ? ' · Station ' + esc(p.station) : '') +
      (p.shift ? ' · Shift ' + esc(p.shift) : '') +
      (p.battalion ? ' · Battalion ' + esc(p.battalion) : '') +
      ' · ' + rows.length + ' results</p>';
    if (!rows.length) { box.innerHTML = head + '<p class="muted">No fitness results for this person.</p>'; return; }
    var html = head;
    tasks.forEach(function (task) {
      var unit = (db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '';
      var byYear = {};
      rows.filter(function (r) { return r.task === task; }).forEach(function (r) {
        var y = String(r.date || '').slice(0, 4) || 'Other';
        var cell = esc(r.result || '');
        if (r.notes) cell += '<div class="muted">' + esc(r.notes) + '</div>';
        byYear[y] = (byYear[y] ? byYear[y] + '<br>' : '') + cell;
      });
      html += '<h2 style="margin-top:16px">' + esc(task) + (unit ? ' <span class="muted">(' + esc(unit) + ')</span>' : '') + '</h2>';
      html += '<table><thead><tr>' + years.map(function (y) { return '<th>' + esc(y) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
        years.map(function (y) { return '<td>' + (byYear[y] || '') + '</td>'; }).join('') + '</tr></tbody></table>';
    });
    box.innerHTML = html;
  }

  var deptCharts = [];
  function parseResult(task, raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return null;
    var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
    if (unit === 'time' || s.indexOf(':') >= 0) {
      var bits = s.split(':').map(function (x) { return parseInt(x, 10); });
      if (bits.some(function (n) { return isNaN(n); })) return null;
      if (bits.length === 2) return bits[0] * 60 + bits[1];
      if (bits.length === 3) return bits[0] * 3600 + bits[1] * 60 + bits[2];
    }
    var n = parseFloat(s.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }
  function fmtResult(task, n) {
    if (n == null || isNaN(n)) return '—';
    var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
    if (unit === 'time') {
      var sec = Math.round(n);
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + String(s).padStart(2, '0');
    }
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  }
  function avg(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null; }
  function median(list) {
    if (!list.length) return null;
    var s = list.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function renderDept() {
    deptCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    deptCharts = [];
    var box = document.getElementById('dept-out');
    if (!box) return;
    var taskOrder = db.tasks.map(function (t) { return t.name; });
    var tasks = taskOrder.slice();
    db.results.forEach(function (r) { if (r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    var people = {};
    db.results.forEach(function (r) { if (r.personnel) people[r.personnel] = true; });
    var html = '<div class="kpis"><div class="kpi"><b>' + db.results.length + '</b><span>Results</span></div><div class="kpi"><b>' + Object.keys(people).length + '</b><span>People with results</span></div><div class="kpi"><b>' + tasks.length + '</b><span>Tasks</span></div></div>';
    tasks.forEach(function (task, idx) {
      var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
      var rows = db.results.filter(function (r) { return r.task === task; });
      var nums = [];
      var byYear = {};
      rows.forEach(function (r) {
        var n = parseResult(task, r.result);
        if (n == null) return;
        nums.push(n);
        var y = yearOf(r.date) || 'Other';
        (byYear[y] = byYear[y] || []).push(n);
      });
      var years = Object.keys(byYear).sort();
      var lowerBetter = unit === 'time';
      html += '<h2 style="margin-top:18px">' + esc(task) + (unit ? ' <span class="muted">(' + esc(unit) + ')</span>' : '') + '</h2>';
      html += '<div class="kpis"><div class="kpi"><b>' + nums.length + '</b><span>Records</span></div>';
      html += '<div class="kpi"><b>' + fmtResult(task, avg(nums)) + '</b><span>Average</span></div>';
      html += '<div class="kpi"><b>' + fmtResult(task, median(nums)) + '</b><span>Median</span></div>';
      html += '<div class="kpi"><b>' + fmtResult(task, nums.length ? Math.min.apply(null, nums) : null) + '</b><span>' + (lowerBetter ? 'Best' : 'Low') + '</span></div>';
      html += '<div class="kpi"><b>' + fmtResult(task, nums.length ? Math.max.apply(null, nums) : null) + '</b><span>' + (lowerBetter ? 'Slowest' : 'High') + '</span></div></div>';
      html += '<div class="chart-wrap"><canvas id="dept-chart-' + idx + '"></canvas></div>';
      html += '<table><thead><tr><th>Year</th><th>N</th><th>Average</th><th>Median</th><th>Low</th><th>High</th></tr></thead><tbody>';
      years.forEach(function (y) {
        var list = byYear[y];
        html += '<tr><td>' + esc(y) + '</td><td>' + list.length + '</td><td>' + fmtResult(task, avg(list)) + '</td><td>' + fmtResult(task, median(list)) + '</td><td>' + fmtResult(task, Math.min.apply(null, list)) + '</td><td>' + fmtResult(task, Math.max.apply(null, list)) + '</td></tr>';
      });
      html += '</tbody></table>';
    });
    box.innerHTML = html;
    tasks.forEach(function (task, idx) {
      var canvas = document.getElementById('dept-chart-' + idx);
      if (!canvas || typeof Chart === 'undefined') return;
      var byYear = {};
      db.results.forEach(function (r) {
        if (r.task !== task) return;
        var n = parseResult(task, r.result);
        if (n == null) return;
        var y = yearOf(r.date) || 'Other';
        (byYear[y] = byYear[y] || []).push(n);
      });
      var years = Object.keys(byYear).sort();
      if (!years.length) return;
      var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
      var asMinutes = task === 'Cardio';
      var data = years.map(function (y) {
        var n = avg(byYear[y]);
        return +(asMinutes ? n / 60 : n).toFixed(2);
      });
      deptCharts.push(new Chart(canvas, {
        type: 'bar',
        data: { labels: years, datasets: [{ label: task + ' average', data: data, backgroundColor: '#c62828', borderColor: '#d4a017', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: task + ' — department average by year', color: '#e6edf3' }, legend: { labels: { color: '#e6edf3' } } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }, y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' }, title: { display: true, text: asMinutes ? 'minutes' : (unit === 'time' ? 'seconds' : (unit || 'value')), color: '#8b949e' } } } }
      }));
    });
  }

  var personCharts = [];
  function renderPersonAvg() {
    personCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    personCharts = [];
    fillSelect('pa-person', names(), '<option value="">Select personnel</option>');
    var el = document.getElementById('pa-person');
    if (el && !el.dataset.wired) { el.dataset.wired = '1'; el.onchange = renderPersonAvg; }
    var box = document.getElementById('pa-out');
    if (!box) return;
    var name = val('pa-person');
    if (!name) { box.innerHTML = '<p class="muted">Select a name.</p>'; return; }
    var rows = db.results.filter(function (r) { return r.personnel === name; });
    var taskOrder = db.tasks.map(function (t) { return t.name; });
    var tasks = [];
    rows.forEach(function (r) { if (r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    tasks.sort(function (a, b) {
      var ia = taskOrder.indexOf(a), ib = taskOrder.indexOf(b);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || a.localeCompare(b);
    });
    var html = '<p><strong>' + esc(name) + '</strong> · ' + rows.length + ' results · ' + tasks.length + ' tasks</p>';
    if (!rows.length) { box.innerHTML = html + '<p class="muted">No fitness results for this person.</p>'; return; }
    html += '<table><thead><tr><th>Task</th><th>N</th><th>Average</th><th>Median</th><th>Low</th><th>High</th><th>Latest</th></tr></thead><tbody>';
    tasks.forEach(function (task) {
      var nums = rows.map(function (r) { return r.task === task ? parseResult(task, r.result) : null; }).filter(function (n) { return n != null; });
      var latest = rows.filter(function (r) { return r.task === task; }).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })[0];
      html += '<tr><td>' + esc(task) + '</td><td>' + nums.length + '</td><td>' + fmtResult(task, avg(nums)) + '</td><td>' + fmtResult(task, median(nums)) + '</td><td>' + fmtResult(task, nums.length ? Math.min.apply(null, nums) : null) + '</td><td>' + fmtResult(task, nums.length ? Math.max.apply(null, nums) : null) + '</td><td>' + esc(latest ? latest.result : '') + (latest ? ' <span class="muted">' + esc(yearOf(latest.date)) + '</span>' : '') + '</td></tr>';
    });
    html += '</tbody></table>';
    tasks.forEach(function (task, idx) {
      html += '<h2 style="margin-top:16px">' + esc(task) + '</h2><div class="chart-wrap"><canvas id="pa-chart-' + idx + '"></canvas></div>';
    });
    box.innerHTML = html;
    tasks.forEach(function (task, idx) {
      var canvas = document.getElementById('pa-chart-' + idx);
      if (!canvas || typeof Chart === 'undefined') return;
      var byYear = {};
      rows.forEach(function (r) {
        if (r.task !== task) return;
        var n = parseResult(task, r.result);
        if (n == null) return;
        var y = yearOf(r.date) || 'Other';
        (byYear[y] = byYear[y] || []).push(n);
      });
      var years = Object.keys(byYear).sort();
      if (!years.length) return;
      var asMinutes = task === 'Cardio';
      var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
      var data = years.map(function (y) { var n = avg(byYear[y]); return +(asMinutes ? n / 60 : n).toFixed(2); });
      personCharts.push(new Chart(canvas, {
        type: 'bar',
        data: { labels: years, datasets: [{ label: name + ' — ' + task, data: data, backgroundColor: '#d4a017' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: name + ' — ' + task + ' by year', color: '#e6edf3' }, legend: { labels: { color: '#e6edf3' } } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }, y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' }, title: { display: true, text: asMinutes ? 'minutes' : (unit === 'time' ? 'seconds' : (unit || 'value')), color: '#8b949e' } } } }
      }));
    });
  }

  var compareCharts = [];
  function resultMap(name, task) {
    var map = {};
    db.results.forEach(function (r) {
      if (r.personnel !== name || r.task !== task) return;
      var y = yearOf(r.date) || 'Other';
      var n = parseResult(task, r.result);
      if (!map[y]) map[y] = { text: [], nums: [] };
      if (r.result) map[y].text.push(r.result);
      if (n != null) map[y].nums.push(n);
    });
    return map;
  }
  function renderCompare() {
    compareCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    compareCharts = [];
    fillSelect('cmp-a', names(), '<option value="">Select personnel</option>');
    fillSelect('cmp-b', names(), '<option value="">Select personnel</option>');
    ['cmp-a', 'cmp-b'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.wired) { el.dataset.wired = '1'; el.onchange = renderCompare; }
    });
    var box = document.getElementById('cmp-out');
    if (!box) return;
    var a = val('cmp-a'), b = val('cmp-b');
    if (!a || !b) { box.innerHTML = '<p class="muted">Select two people. For example, Atkins, Nick and Dylan, Matthew.</p>'; return; }
    if (a === b) { box.innerHTML = '<p class="muted">Pick two different people.</p>'; return; }
    var taskOrder = db.tasks.map(function (t) { return t.name; });
    var tasks = [];
    db.results.forEach(function (r) {
      if ((r.personnel === a || r.personnel === b) && r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task);
    });
    tasks.sort(function (x, y) {
      var ia = taskOrder.indexOf(x), ib = taskOrder.indexOf(y);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib;
    });
    var html = '<p><strong>' + esc(a) + '</strong>' + (ageOf(a) ? ' · Age ' + ageLabel(a) : '') + ' compared with <strong>' + esc(b) + '</strong>' + (ageOf(b) ? ' · Age ' + ageLabel(b) : '') + '</p>';
    if (!tasks.length) { box.innerHTML = html + '<p class="muted">Neither person has fitness results.</p>'; return; }
    tasks.forEach(function (task, idx) {
      var ma = resultMap(a, task), mb = resultMap(b, task);
      var years = Object.keys(Object.assign({}, ma, mb)).sort();
      var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
      html += '<h2 style="margin-top:16px">' + esc(task) + (unit ? ' <span class="muted">(' + esc(unit) + ')</span>' : '') + '</h2>';
      html += '<div class="chart-wrap"><canvas id="cmp-chart-' + idx + '"></canvas></div>';
      html += '<table><thead><tr><th>Year</th><th>' + esc(a) + '</th><th>' + esc(b) + '</th><th>Difference (A − B)</th></tr></thead><tbody>';
      years.forEach(function (y) {
        var av = ma[y] && ma[y].nums.length ? avg(ma[y].nums) : null;
        var bv = mb[y] && mb[y].nums.length ? avg(mb[y].nums) : null;
        var diff = (av != null && bv != null) ? fmtResult(task, Math.abs(av - bv)) : '—';
        if (av != null && bv != null) diff = (av === bv ? '0' : ((av > bv ? '+' : '−') + fmtResult(task, Math.abs(av - bv))));
        html += '<tr><td>' + esc(y) + '</td><td>' + esc(ma[y] ? ma[y].text.join(', ') : '') + '</td><td>' + esc(mb[y] ? mb[y].text.join(', ') : '') + '</td><td>' + diff + '</td></tr>';
      });
      html += '</tbody></table>';
    });
    box.innerHTML = html;
    tasks.forEach(function (task, idx) {
      var canvas = document.getElementById('cmp-chart-' + idx);
      if (!canvas || typeof Chart === 'undefined') return;
      var ma = resultMap(a, task), mb = resultMap(b, task);
      var years = Object.keys(Object.assign({}, ma, mb)).sort();
      if (!years.length) return;
      var asMinutes = task === 'Cardio';
      var unit = ((db.tasks.filter(function (t) { return t.name === task; })[0] || {}).unit || '');
      function series(map) {
        return years.map(function (y) {
          if (!map[y] || !map[y].nums.length) return null;
          var n = avg(map[y].nums);
          return +(asMinutes ? n / 60 : n).toFixed(2);
        });
      }
      compareCharts.push(new Chart(canvas, {
        type: 'bar',
        data: { labels: years, datasets: [
          { label: a, data: series(ma), backgroundColor: '#d4a017' },
          { label: b, data: series(mb), backgroundColor: '#c62828' }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: task + ' by year', color: '#e6edf3' }, legend: { labels: { color: '#e6edf3' } } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }, y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' }, title: { display: true, text: asMinutes ? 'minutes' : (unit === 'time' ? 'seconds' : (unit || 'value')), color: '#8b949e' } } } }
      }));
    });
  }

  var compareYearCharts = [];
  function showCompareMode(mode) {
    var names = document.getElementById('cmp-names');
    var years = document.getElementById('cmp-years');
    if (names) names.hidden = mode !== 'names';
    if (years) years.hidden = mode !== 'years';
    var nb = document.getElementById('cmp-tab-names');
    var yb = document.getElementById('cmp-tab-years');
    if (nb) nb.className = mode === 'names' ? 'btn' : 'btn ghost';
    if (yb) yb.className = mode === 'years' ? 'btn' : 'btn ghost';
    if (mode === 'years') renderCompareYears();
  }
  function yearChoices() {
    var years = {};
    db.results.forEach(function (r) { var y = yearOf(r.date); if (y) years[y] = true; });
    var now = new Date().getFullYear();
    for (var y = now - 5; y <= now + 2; y++) years[y] = true;
    return Object.keys(years).sort();
  }
  function renderCompareYears() {
    compareYearCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    compareYearCharts = [];
    fillSelect('cmp-year-person', names(), '<option value="">All personnel</option>');
    var ya = document.getElementById('cmp-year-a');
    var yb = document.getElementById('cmp-year-b');
    if (ya && !ya.dataset.filled) {
      var list = yearChoices();
      ya.innerHTML = list.map(function (y) { return '<option>' + y + '</option>'; }).join('');
      yb.innerHTML = ya.innerHTML;
      ya.value = list.indexOf('2025') >= 0 ? '2025' : list[0];
      yb.value = list.indexOf('2026') >= 0 ? '2026' : list[list.length - 1];
      ya.dataset.filled = '1';
      ya.onchange = renderCompareYears;
      yb.onchange = renderCompareYears;
      var person = document.getElementById('cmp-year-person');
      if (person) person.onchange = renderCompareYears;
    }
    var box = document.getElementById('cmp-year-out');
    if (!box) return;
    var yearA = val('cmp-year-a'), yearB = val('cmp-year-b'), person = val('cmp-year-person');
    if (!yearA || !yearB) { box.innerHTML = '<p class="muted">Select two years.</p>'; return; }
    var taskOrder = db.tasks.map(function (t) { return t.name; });
    var tasks = taskOrder.slice();
    db.results.forEach(function (r) { if (r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    function vals(task, year) {
      return db.results.filter(function (r) {
        return r.task === task && yearOf(r.date) === year && (!person || r.personnel === person);
      }).map(function (r) { return parseResult(task, r.result); }).filter(function (n) { return n != null; });
    }
    var who = person || 'Department';
    var html = '<p><strong>' + esc(who) + '</strong> · ' + esc(yearA) + ' compared with ' + esc(yearB) + '</p>';
    html += '<table><thead><tr><th>Task</th><th>' + esc(yearA) + '</th><th>N</th><th>' + esc(yearB) + '</th><th>N</th><th>Difference (A − B)</th></tr></thead><tbody>';
    tasks.forEach(function (task) {
      var av = vals(task, yearA), bv = vals(task, yearB);
      if (!av.length && !bv.length) return;
      var aa = avg(av), bb = avg(bv);
      var diff = (aa != null && bb != null) ? ((aa === bb ? '0' : ((aa > bb ? '+' : '−') + fmtResult(task, Math.abs(aa - bb))))) : '—';
      html += '<tr><td>' + esc(task) + '</td><td>' + fmtResult(task, aa) + '</td><td>' + av.length + '</td><td>' + fmtResult(task, bb) + '</td><td>' + bv.length + '</td><td>' + diff + '</td></tr>';
    });
    html += '</tbody></table><div class="chart-wrap"><canvas id="cmp-year-chart"></canvas></div>';
    box.innerHTML = html;
    var canvas = document.getElementById('cmp-year-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    var labels = [], dataA = [], dataB = [];
    tasks.forEach(function (task) {
      var av = vals(task, yearA), bv = vals(task, yearB);
      if (!av.length && !bv.length) return;
      labels.push(task);
      var asMinutes = task === 'Cardio';
      dataA.push(av.length ? +((asMinutes ? avg(av) / 60 : avg(av)).toFixed(2)) : null);
      dataB.push(bv.length ? +((asMinutes ? avg(bv) / 60 : avg(bv)).toFixed(2)) : null);
    });
    if (!labels.length) return;
    compareYearCharts.push(new Chart(canvas, {
      type: 'bar',
      data: { labels: labels, datasets: [
        { label: yearA, data: dataA, backgroundColor: '#d4a017' },
        { label: yearB, data: dataB, backgroundColor: '#c62828' }
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: who + ' — ' + yearA + ' vs ' + yearB, color: '#e6edf3' }, legend: { labels: { color: '#e6edf3' } } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }, y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } } } }
    }));
  }
  function show(tab) {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    document.getElementById('tab-log').hidden = tab !== 'log';
    document.getElementById('tab-person').hidden = tab !== 'person';
    document.getElementById('tab-pavg').hidden = tab !== 'pavg';
    document.getElementById('tab-compare').hidden = tab !== 'compare';
    document.getElementById('tab-dept').hidden = tab !== 'dept';
    document.getElementById('tab-catalog').hidden = tab !== 'catalog';
    if (tab === 'catalog') renderCatalog();
    if (tab === 'log') renderLog();
    if (tab === 'person') renderPerson();
    if (tab === 'pavg') renderPersonAvg();
    if (tab === 'compare') { renderCompare(); showCompareMode(document.getElementById('cmp-years') && !document.getElementById('cmp-years').hidden ? 'years' : 'names'); }
    if (tab === 'dept') renderDept();
  }
  function chosenYear() {
    var other = val('f-year-other');
    if (other && /^[0-9]{4}$/.test(other)) return other;
    return val('f-year') || String(new Date().getFullYear());
  }
  function clearResult() {
    setVal('f-id', ''); setVal('f-person', ''); setVal('f-task', ''); setVal('f-year-other', ''); setVal('f-result', ''); setVal('f-notes', '');
    fillYears(new Date().getFullYear());
    document.getElementById('btn-delete').hidden = true;
    document.getElementById('form-title').textContent = 'Log a fitness result';
  }
  function loadResult(id) {
    var rec = db.results.filter(function (r) { return r.id === id; })[0];
    if (!rec) return;
    setVal('f-id', rec.id); setVal('f-person', rec.personnel); setVal('f-task', rec.task);
    fillYears(yearOf(rec.date) || new Date().getFullYear()); setVal('f-year-other', ''); setVal('f-result', rec.result || ''); setVal('f-notes', rec.notes || '');
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
    var year = chosenYear();
    if (!/^[0-9]{4}$/.test(year)) { document.getElementById('save-msg').textContent = 'Enter a 4-digit year.'; return; }
    var row = { id: id, personnel: person, task: task, date: year + '-01-01', result: val('f-result'), met: '', notes: val('f-notes') };
    var i = -1; db.results.forEach(function (r, idx) { if (r.id === id) i = idx; });
    if (i >= 0) db.results[i] = row; else db.results.push(row);
    save(db);
    document.getElementById('save-msg').textContent = (i >= 0 ? 'Updated ' : 'Added ') + task + ' for ' + person + '.';
    var cmpNames = document.getElementById('cmp-tab-names');
  var cmpYears = document.getElementById('cmp-tab-years');
  if (cmpNames) cmpNames.onclick = function () { showCompareMode('names'); };
  if (cmpYears) cmpYears.onclick = function () { showCompareMode('years'); };
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
  var cmpNames = document.getElementById('cmp-tab-names');
  var cmpYears = document.getElementById('cmp-tab-years');
  if (cmpNames) cmpNames.onclick = function () { showCompareMode('names'); };
  if (cmpYears) cmpYears.onclick = function () { showCompareMode('years'); };
  clearResult(); renderLog();
  window.db = db;
  window.saveFitness = save;
})();
