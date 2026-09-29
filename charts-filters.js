(function () {
  function personMeta(name) {
    return (db.personnel || []).find(p => p.fullName === name) || {};
  }
  function groupOf(assignment, field) {
    const p = personMeta(assignment.personnel);
    const v = String(p[field] || '').trim();
    return v || 'Unassigned';
  }
  function labelGroup(field, key) {
    if (key === 'Unassigned') return 'Unassigned';
    if (field === 'shift') return 'Shift ' + key;
    if (field === 'battalion') return 'Battalion ' + key;
    if (field === 'station') return (String(key).match(/^\d+$/) ? 'Station ' : '') + key;
    return key;
  }
  function ensureChartFilters() {
    const tab = document.getElementById('tab-charts');
    if (!tab) return;
    let grid = tab.querySelector('.grid');
    if (!grid) return;
    grid.style.maxWidth = '980px';
    const cat = document.getElementById('c-cat');
    if (cat) {
      const lab = cat.previousElementSibling;
      if (lab && lab.tagName === 'LABEL') lab.textContent = 'Task';
    }
    if (!document.getElementById('c-gtype')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<label>Group</label><select id="c-gtype">' +
        '<option value="">All groups</option>' +
        '<option value="shift">By shift</option>' +
        '<option value="station">By station</option>' +
        '<option value="battalion">By battalion</option></select>';
      grid.appendChild(wrap);
    }
    if (!document.getElementById('c-gval')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<label>Group value</label><select id="c-gval"><option value="">All</option></select>';
      grid.appendChild(wrap);
    }
  }
  function fillChartTaskSelect() {
    const sel = document.getElementById('c-cat');
    if (!sel) return;
    const keep = sel.value;
    const names = (db.tasks || []).map(t => t.taskName).filter(Boolean);
    (db.assignments || []).forEach(a => { if (a.task && names.indexOf(a.task) < 0) names.push(a.task); });
    names.sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">All tasks</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
    const lab = sel.previousElementSibling;
    if (lab && lab.tagName === 'LABEL') lab.textContent = 'Task';
  }
  function fillChartGroupValues() {
    const typeEl = document.getElementById('c-gtype');
    const valEl = document.getElementById('c-gval');
    if (!typeEl || !valEl) return;
    const field = typeEl.value;
    const keep = valEl.value;
    if (!field) {
      valEl.innerHTML = '<option value="">All</option>';
      valEl.disabled = true;
      return;
    }
    valEl.disabled = false;
    const set = new Set();
    (db.personnel || []).forEach(p => set.add(String(p[field] || '').trim() || 'Unassigned'));
    const vals = [...set].sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    valEl.innerHTML = '<option value="">All ' + field + 's</option>' +
      vals.map(v => '<option value="' + esc(v) + '">' + esc(labelGroup(field, v)) + '</option>').join('');
    if ([...valEl.options].some(o => o.value === keep)) valEl.value = keep;
  }
  function chartScope() {
    const person = ((document.getElementById('c-person') || {}).value || '').trim();
    const task = ((document.getElementById('c-cat') || {}).value || '').trim();
    const field = ((document.getElementById('c-gtype') || {}).value || '').trim();
    const gval = ((document.getElementById('c-gval') || {}).value || '').trim();
    const bits = [];
    if (person) bits.push(person);
    else bits.push('Department');
    if (field) bits.push(gval ? labelGroup(field, gval) : ('all ' + field + 's'));
    if (task) bits.push(task);
    return bits.join(' • ');
  }
  filteredTimed = function () {
    const person = ((document.getElementById('c-person') || {}).value || '').trim();
    const task = ((document.getElementById('c-cat') || {}).value || '').trim();
    const field = ((document.getElementById('c-gtype') || {}).value || '').trim();
    const gval = ((document.getElementById('c-gval') || {}).value || '').trim();
    return db.assignments.filter(a => {
      if (timeToSec(a.completionTime) == null) return false;
      if (person && a.personnel !== person) return false;
      if (task && a.task !== task) return false;
      if (field && gval && groupOf(a, field) !== gval) return false;
      if (field && !gval) {
        /* keep all values of that group type */
      }
      return true;
    });
  };
  const _renderCharts = renderCharts;
  renderCharts = function () {
    ensureChartFilters();
    fillChartTaskSelect();
    fillChartGroupValues();
    _renderCharts();
    const titleBits = chartScope();
    try {
      if (charts.trend && charts.trend.options && charts.trend.options.plugins) {
        charts.trend.options.plugins.title.text = titleBits + ' — time trend by date';
        charts.trend.update();
      }
    } catch (e) {}
  };
  window.renderGroupChartsOnChartsTab = function () {
    const field = ((document.getElementById('c-gtype') || {}).value || '').trim();
    const task = ((document.getElementById('c-cat') || {}).value || '').trim();
    const gval = ((document.getElementById('c-gval') || {}).value || '').trim();
    const person = ((document.getElementById('c-person') || {}).value || '').trim();
    function rowsForField(f) {
      return db.assignments.filter(a => {
        if (timeToSec(a.completionTime) == null) return false;
        if (person && a.personnel !== person) return false;
        if (task && a.task !== task) return false;
        if (gval && f && groupOf(a, f) !== gval) return false;
        return true;
      });
    }
    function draw(canvasId, key, f, title) {
      const el = document.getElementById(canvasId);
      if (!el || typeof destroyChart !== 'function') return;
      const wrap = el.closest('.chart-wrap');
      if (field && field !== f) {
        if (wrap) wrap.style.display = 'none';
        destroyChart(key);
        return;
      }
      if (wrap) wrap.style.display = '';
      const rows = rowsForField(f);
      const buckets = {};
      rows.forEach(r => {
        const k = groupOf(r, f);
        (buckets[k] ||= []).push(r);
      });
      const labels = Object.keys(buckets).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      const data = labels.map(k => {
        const secs = buckets[k].map(r => timeToSec(r.completionTime)).filter(s => s != null);
        return secs.length ? +(secs.reduce((x, y) => x + y, 0) / secs.length / 60).toFixed(3) : 0;
      });
      destroyChart(key);
      charts[key] = new Chart(el, {
        type: 'bar',
        data: { labels: labels.map(k => labelGroup(f, k)), datasets: [{ label: 'Avg minutes', data: data, backgroundColor: COLORS }] },
        options: chartOpts(title)
      });
    }
    const scope = chartScope();
    draw('chart-c-shift', 'cShift', 'shift', scope + ' — by shift');
    draw('chart-c-station', 'cStation', 'station', scope + ' — by station');
    draw('chart-c-battalion', 'cBattalion', 'battalion', scope + ' — by battalion');
  };
  function refreshCharts() {
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderGroupChartsOnChartsTab === 'function') renderGroupChartsOnChartsTab();
  }
  ensureChartFilters();
  ['c-person', 'c-cat', 'c-gtype', 'c-gval'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = function () {
      if (id === 'c-gtype') fillChartGroupValues();
      refreshCharts();
    };
  });
})();
