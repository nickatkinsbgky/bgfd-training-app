(function () {
  function renderTaskSort() {
    const out = document.getElementById('task-sort-out');
    if (!out) return;
    const rows = (db.assignments || []).slice().sort((a, b) => {
      const t = String(a.task || '').localeCompare(String(b.task || ''), undefined, { numeric: true });
      if (t) return t;
      const p = String(a.personnel || '').localeCompare(String(b.personnel || ''));
      if (p) return p;
      return String(a.dateCompleted || '').localeCompare(String(b.dateCompleted || ''));
    });
    if (!rows.length) {
      out.innerHTML = '<p class="muted">No assignments found.</p>';
      return;
    }
    let html = '<div class="cat-block"><h2>Sorted by Task</h2><p class="muted">' + rows.length + ' records</p>';
    html += '<table><thead><tr><th>Task</th><th>Personnel</th><th>Date Completed</th><th>Status</th><th>Category</th></tr></thead><tbody>';
    let lastTask = null;
    rows.forEach(r => {
      const task = r.task || 'Unassigned';
      const showTask = task !== lastTask;
      lastTask = task;
      html += '<tr>' +
        '<td>' + (showTask ? esc(task) : '') + '</td>' +
        '<td>' + esc(r.personnel || '') + '</td>' +
        '<td>' + esc(r.dateCompleted || '') + '</td>' +
        '<td>' + esc(r.status || '') + '</td>' +
        '<td>' + esc((typeof catOf === 'function' ? catOf(r) : r.category) || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    out.innerHTML = html;
  }

  // Hook into tab switching
  function attach() {
    const buttons = document.querySelectorAll('nav button');
    buttons.forEach(b => {
      const orig = b.onclick;
      b.onclick = function () {
        if (typeof orig === 'function') orig.call(this);
        document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const tab = b.dataset.tab;
        ['input', 'person', 'personavg', 'dept', 'groups', 'charts', 'cats', 'roster', 'tasksort'].forEach(id => {
          const el = document.getElementById('tab-' + id);
          if (el) el.hidden = id !== tab;
        });
        if (tab === 'tasksort') renderTaskSort();
        if (tab === 'person' && typeof renderPersonList === 'function') renderPersonList();
        if (tab === 'personavg' && typeof renderPersonAvg === 'function') renderPersonAvg();
        if (tab === 'dept' && typeof renderDept === 'function') renderDept();
        if (tab === 'groups' && typeof renderGroupAvgs === 'function') renderGroupAvgs();
        if (tab === 'charts') {
          if (typeof renderCharts === 'function') renderCharts();
          if (typeof renderGroupChartsOnChartsTab === 'function') renderGroupChartsOnChartsTab();
        }
        if (tab === 'cats' && typeof renderCats === 'function') renderCats();
        if (tab === 'roster' && typeof renderRoster === 'function') renderRoster();
        if (tab === 'input' && typeof renderAllTable === 'function') renderAllTable();
      };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
  window.renderTaskSort = renderTaskSort;
})();
