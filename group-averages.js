(function () {
  const SORT_FIELDS = [
    ['task', 'Task'],
    ['station', 'Station'],
    ['battalion', 'Battalion'],
    ['shift', 'Shift'],
    ['category', 'Category'],
    ['personnel', 'Personnel'],
    ['rank', 'Rank']
  ];
  function sortOptions(selected) {
    return SORT_FIELDS.map(pair => '<option value="' + pair[0] + '"' + (pair[0] === selected ? ' selected' : '') + '>' + pair[1] + '</option>').join('');
  }
  (function ensureGroupFilters() {
    const tab = document.getElementById('tab-groups');
    if (!tab) return;
    const catSel = document.getElementById('g-cat');
    if (catSel) {
      const lab = catSel.previousElementSibling;
      if (lab && lab.tagName === 'LABEL') lab.textContent = 'Task filter';
    }
    if (!document.getElementById('g-by')) {
      const box = document.createElement('div');
      box.className = 'grid';
      box.style.maxWidth = '980px';
      box.innerHTML =
        '<div><label>Group by</label><select id="g-by">' +
        '<option value="">All (shift, station, battalion)</option>' +
        '<option value="shift">By shift</option>' +
        '<option value="station">By station</option>' +
        '<option value="battalion">By battalion</option></select></div>' +
        '<div><label>Group</label><select id="g-value"><option value="">All groups</option></select></div>';
      const existing = tab.querySelector('.grid');
      if (existing) tab.insertBefore(box, existing);
      else tab.insertBefore(box, tab.children[1] || null);
    }
    if (!document.getElementById('g-s1')) {
      const box = document.createElement('div');
      box.className = 'grid';
      box.style.maxWidth = '980px';
      box.style.marginTop = '8px';
      box.innerHTML =
        '<div><label>Sort 1</label><select id="g-s1">' + sortOptions('task') + '</select></div>' +
        '<div><label>Sort 2</label><select id="g-s2"><option value="">None</option>' + sortOptions('station') + '</select></div>' +
        '<div><label>Sort 3</label><select id="g-s3"><option value="">None</option>' + sortOptions('battalion') + '</select></div>';
      const out = document.getElementById('g-out');
      if (out) tab.insertBefore(box, out);
      else tab.appendChild(box);
    }
  })();

  function personMeta(name) {
    return db.personnel.find(p => p.fullName === name) || {};
  }
  function fieldValue(assignment, field) {
    if (!field) return '';
    const p = personMeta(assignment.personnel);
    if (field === 'task') return assignment.task || 'Unassigned';
    if (field === 'category') return (typeof catOf === 'function' ? catOf(assignment) : assignment.category) || 'Other';
    if (field === 'personnel') return assignment.personnel || 'Unassigned';
    if (field === 'rank') return String(p.rank || assignment.rank || '').trim() || 'Unassigned';
    const v = String(p[field] || '').trim();
    return v || 'Unassigned';
  }
  function groupKey(assignment, field) {
    return fieldValue(assignment, field);
  }
  function sortGroupKeys(keys, field) {
    return keys.sort((a, b) => cmpKey(a, b, field));
  }
  function cmpKey(a, b, field) {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    const na = Number(a), nb = Number(b);
    if (field !== 'shift' && field !== 'task' && field !== 'personnel' && field !== 'category' && field !== 'rank' && !isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  }
  function labelFor(field, key) {
    if (!field || !key) return '';
    if (key === 'Unassigned') return 'Unassigned';
    if (field === 'shift') return 'Shift ' + key;
    if (field === 'battalion') return 'Battalion ' + key;
    if (field === 'station') return (String(key).match(/^\d+$/) ? 'Station ' : '') + key;
    return key;
  }
  function allValues(field) {
    const set = new Set();
    (db.personnel || []).forEach(p => {
      const v = String(p[field] || '').trim();
      set.add(v || 'Unassigned');
    });
    return sortGroupKeys([...set], field);
  }
  function timedRows(taskFilter, field, value) {
    return db.assignments.filter(a => {
      if (timeToSec(a.completionTime) == null) return false;
      if (taskFilter && a.task !== taskFilter) return false;
      if (field && value && groupKey(a, field) !== value) return false;
      return true;
    });
  }
  function avgMinutes(rows) {
    const secs = rows.map(r => timeToSec(r.completionTime)).filter(s => s != null);
    if (!secs.length) return null;
    return secs.reduce((a, b) => a + b, 0) / secs.length / 60;
  }
  function statsOf(list) {
    const people = new Set(list.map(r => r.personnel));
    const judged = list.filter(r => r.metStandard === 'Yes' || r.metStandard === 'No');
    const met = judged.filter(r => r.metStandard === 'Yes').length;
    return {
      n: list.length,
      people: people.size,
      avg: avgMinutes(list),
      pctMet: judged.length ? (100 * met / judged.length) : null
    };
  }
  function groupStats(field, taskFilter, value) {
    const rows = timedRows(taskFilter, field, value);
    const buckets = {};
    rows.forEach(r => {
      const k = groupKey(r, field);
      (buckets[k] ||= []).push(r);
    });
    const keys = sortGroupKeys(Object.keys(buckets), field);
    return keys.map(k => {
      const list = buckets[k];
      const byTask = {};
      list.forEach(r => (byTask[r.task] ||= []).push(r));
      return Object.assign({ key: k, tasks: Object.keys(byTask).sort().map(task => ({ task: task, n: byTask[task].length, avg: avgMinutes(byTask[task]) })) }, statsOf(list));
    });
  }
  function tableFor(title, field, taskFilter, value) {
    const stats = groupStats(field, taskFilter, value);
    if (!stats.length) return '<p class="muted">No timed records for ' + esc(title.toLowerCase()) + '.</p>';
    let html = '<div class="cat-block"><h2>' + esc(title) + '</h2>';
    html += '<table><thead><tr><th>' + esc(title.replace(/ averages$/i, '')) + '</th><th>People</th><th>Timed N</th><th>Avg time</th><th>% met</th><th>By task</th></tr></thead><tbody>';
    stats.forEach(s => {
      const taskBits = s.tasks.map(t => esc(t.task) + ' ' + fmtMin(t.avg) + ' (n=' + t.n + ')').join('<br>');
      html += '<tr><td>' + esc(labelFor(field, s.key)) + '</td><td>' + s.people + '</td><td>' + s.n + '</td><td>' + fmtMin(s.avg) + '</td><td>' +
        (s.pctMet == null ? '\u2014' : s.pctMet.toFixed(0) + '%') + '</td><td>' + taskBits + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  function multiSortTable(rows, s1, s2, s3) {
    const keys = [s1, s2, s3].filter(Boolean);
    if (!keys.length) return '';
    const buckets = {};
    rows.forEach(r => {
      const path = keys.map(f => fieldValue(r, f)).join('\u0001');
      (buckets[path] ||= []).push(r);
    });
    const paths = Object.keys(buckets).sort((a, b) => {
      const aa = a.split('\u0001'), bb = b.split('\u0001');
      for (let i = 0; i < keys.length; i++) {
        const c = cmpKey(aa[i] || '', bb[i] || '', keys[i]);
        if (c) return c;
      }
      return 0;
    });
    const titles = keys.map(f => (SORT_FIELDS.find(p => p[0] === f) || [f, f])[1]);
    let html = '<div class="cat-block"><h2>Sorted averages</h2><p class="muted">' + titles.join(' \u2192 ') + '</p>';
    html += '<table><thead><tr>' + titles.map(t => '<th>' + esc(t) + '</th>').join('') +
      '<th>People</th><th>Timed N</th><th>Avg time</th><th>% met</th></tr></thead><tbody>';
    paths.forEach(path => {
      const parts = path.split('\u0001');
      const st = statsOf(buckets[path]);
      html += '<tr>' + parts.map((part, i) => '<td>' + esc(labelFor(keys[i], part)) + '</td>').join('') +
        '<td>' + st.people + '</td><td>' + st.n + '</td><td>' + fmtMin(st.avg) + '</td><td>' +
        (st.pctMet == null ? '\u2014' : st.pctMet.toFixed(0) + '%') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  function drawGroupBar(canvasId, chartKey, field, title, taskFilter, value) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = '';
    const stats = groupStats(field, taskFilter, value);
    destroyChart(chartKey);
    charts[chartKey] = new Chart(el, {
      type: 'bar',
      data: {
        labels: stats.map(s => labelFor(field, s.key)),
        datasets: [{ label: 'Avg minutes', data: stats.map(s => s.avg == null ? 0 : +s.avg.toFixed(3)), backgroundColor: COLORS }]
      },
      options: chartOpts(title)
    });
  }
  function hideChart(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = 'none';
  }
  function fillValueSelect(field) {
    const sel = document.getElementById('g-value');
    if (!sel) return;
    const keep = sel.value;
    if (!field) {
      sel.innerHTML = '<option value="">All groups</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    const vals = allValues(field);
    sel.innerHTML = '<option value="">All ' + field + 's</option>' +
      vals.map(v => '<option value="' + esc(v) + '">' + esc(labelFor(field, v)) + '</option>').join('');
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
  }
  function fillTaskSelect() {
    const sel = document.getElementById('g-cat');
    if (!sel) return '';
    const keep = sel.value;
    const names = (db.tasks || []).map(t => t.taskName).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const extra = [...new Set((db.assignments || []).map(a => a.task).filter(Boolean))];
    extra.forEach(n => { if (names.indexOf(n) < 0) names.push(n); });
    names.sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">All tasks</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
    const lab = sel.previousElementSibling;
    if (lab && lab.tagName === 'LABEL') lab.textContent = 'Task filter';
    return sel.value;
  }
  window.renderGroupAvgs = function () {
    const taskFilter = fillTaskSelect();
    const bySel = document.getElementById('g-by');
    const field = bySel ? bySel.value : '';
    fillValueSelect(field);
    const value = document.getElementById('g-value') ? document.getElementById('g-value').value : '';
    const s1 = (document.getElementById('g-s1') || {}).value || 'task';
    const s2 = (document.getElementById('g-s2') || {}).value || '';
    const s3 = (document.getElementById('g-s3') || {}).value || '';
    const fields = field ? [field] : ['shift', 'station', 'battalion'];
    const ids = { shift: ['chart-g-shift', 'gShift', 'Shift averages'], station: ['chart-g-station', 'gStation', 'Station averages'], battalion: ['chart-g-battalion', 'gBattalion', 'Battalion averages'] };
    Object.keys(ids).forEach(f => {
      if (fields.indexOf(f) >= 0) drawGroupBar(ids[f][0], ids[f][1], f, 'Average minutes by ' + f, taskFilter, value);
      else hideChart(ids[f][0]);
    });
    const out = document.getElementById('g-out');
    if (out) {
      const rows = timedRows(taskFilter, field, value);
      out.innerHTML = multiSortTable(rows, s1, s2, s3) + fields.map(f => tableFor(ids[f][2], f, taskFilter, value)).join('');
    }
  };
  window.renderGroupChartsOnChartsTab = function () {
    drawGroupBar('chart-c-shift', 'cShift', 'shift', 'Charts \u2014 average minutes by shift', '', '');
    drawGroupBar('chart-c-station', 'cStation', 'station', 'Charts \u2014 average minutes by station', '', '');
    drawGroupBar('chart-c-battalion', 'cBattalion', 'battalion', 'Charts \u2014 average minutes by battalion', '', '');
  };
  document.querySelectorAll('nav button').forEach(b => {
    b.onclick = function () {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ['input', 'person', 'personavg', 'dept', 'groups', 'charts', 'cats', 'roster'].forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.hidden = id !== b.dataset.tab;
      });
      if (b.dataset.tab === 'person') renderPersonList();
      if (b.dataset.tab === 'personavg') renderPersonAvg();
      if (b.dataset.tab === 'dept') renderDept();
      if (b.dataset.tab === 'groups') renderGroupAvgs();
      if (b.dataset.tab === 'charts') { renderCharts(); renderGroupChartsOnChartsTab(); }
      if (b.dataset.tab === 'cats' && typeof renderCats === 'function') renderCats();
      if (b.dataset.tab === 'roster') renderRoster();
      if (b.dataset.tab === 'input') renderAllTable();
    };
  });
  ['g-cat', 'g-value', 'g-s1', 'g-s2', 'g-s3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = renderGroupAvgs;
  });
  const gBy = document.getElementById('g-by');
  if (gBy) gBy.onchange = function () { fillValueSelect(gBy.value); renderGroupAvgs(); };
  const cCat = document.getElementById('c-cat');
  if (cCat) {
    cCat.onchange = function () {
      if (typeof renderCharts === 'function') renderCharts();
      renderGroupChartsOnChartsTab();
    };
  }
})();
