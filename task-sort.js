(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmtDate(d) {
    if (!d) return '';
    var m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[2] + '/' + m[3] + '/' + m[1] : String(d);
  }
  window.renderTaskSort = function () {
    var out = document.getElementById('tasksort-out');
    if (!out) return;
    var rows = (db.assignments || []).slice().sort(function (a, b) {
      var ta = String(a.task || 'Unassigned');
      var tb = String(b.task || 'Unassigned');
      if (ta !== tb) return ta.localeCompare(tb, undefined, { numeric: true });
      var pa = String(a.personnel || '');
      var pb = String(b.personnel || '');
      if (pa !== pb) return pa.localeCompare(pb, undefined, { numeric: true });
      var da = String(a.dateCompleted || '');
      var dbd = String(b.dateCompleted || '');
      return da.localeCompare(dbd);
    });
    if (!rows.length) {
      out.innerHTML = '<p class="muted">No assignments recorded yet.</p>';
      return;
    }
    var html = '<table class="data"><thead><tr>'
      + '<th>Task</th><th>Personnel</th><th>Rank</th><th>Date Completed</th>'
      + '<th>Status</th><th>Completion Time</th><th>Met Standard</th><th>Category</th><th>Notes</th>'
      + '</tr></thead><tbody>';
    var lastTask = null;
    rows.forEach(function (a) {
      var task = a.task || 'Unassigned';
      var isNew = task !== lastTask;
      lastTask = task;
      html += '<tr' + (isNew ? ' style="border-top:2px solid var(--gold,#d4a017)"' : '') + '>'
        + '<td>' + (isNew ? '<strong>' + esc(task) + '</strong>' : '') + '</td>'
        + '<td>' + esc(a.personnel || '') + '</td>'
        + '<td>' + esc(a.rank || '') + '</td>'
        + '<td>' + esc(fmtDate(a.dateCompleted)) + '</td>'
        + '<td>' + esc(a.status || '') + '</td>'
        + '<td>' + esc(a.completionTime || '') + '</td>'
        + '<td>' + esc(a.metStandard || '') + '</td>'
        + '<td>' + esc(a.category || '') + '</td>'
        + '<td>' + esc(a.notes || '') + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    html += '<p class="note">' + rows.length + ' assignment' + (rows.length === 1 ? '' : 's') + ' sorted by Task, then Personnel, then Date Completed.</p>';
    out.innerHTML = html;
  };

  function wireNav() {
    document.querySelectorAll('nav button').forEach(function (b) {
      if (b.dataset.tab !== 'tasksort') return;
      var prev = b.onclick;
      b.onclick = function (ev) {
        if (typeof prev === 'function') prev.call(b, ev);
        var mine = document.getElementById('tab-tasksort');
        var box = document.getElementById('tasksort-out');
        if (mine && !mine.hidden && box && !box.innerHTML) {
          renderTaskSort();
        }
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireNav);
  else wireNav();
})();
