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
  function uniqueTasks() {
    var set = {};
    (db.assignments || []).forEach(function (a) {
      var t = a.task || 'Unassigned';
      set[t] = true;
    });
    (db.tasks || []).forEach(function (t) {
      if (t.taskName) set[t.taskName] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }
  function peopleForTask(task) {
    var set = {};
    (db.assignments || []).forEach(function (a) {
      if ((a.task || 'Unassigned') === task && a.personnel) set[a.personnel] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }
  function fillTaskSelect() {
    var sel = document.getElementById('tasksort-task');
    if (!sel) return;
    var cur = sel.value;
    var tasks = uniqueTasks();
    sel.innerHTML = '<option value="">Select a task</option>' +
      tasks.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    if (cur && tasks.indexOf(cur) >= 0) sel.value = cur;
  }
  function fillPersonSelect(task) {
    var sel = document.getElementById('tasksort-person');
    if (!sel) return;
    var cur = sel.value;
    var people = task ? peopleForTask(task) : [];
    sel.innerHTML = '<option value="">Select personnel</option>' +
      people.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('');
    if (cur && people.indexOf(cur) >= 0) sel.value = cur;
    else sel.value = '';
  }
  function renderDetail(task, person) {
    var out = document.getElementById('tasksort-out');
    if (!out) return;
    if (!task) {
      out.innerHTML = '<p class="muted">Choose a task to begin.</p>';
      return;
    }
    if (!person) {
      var n = peopleForTask(task).length;
      out.innerHTML = '<p class="muted">' + n + ' person' + (n === 1 ? '' : 's') + ' have records for ' + esc(task) + '. Choose a person to see details.</p>';
      return;
    }
    var rows = (db.assignments || []).filter(function (a) {
      return (a.task || 'Unassigned') === task && a.personnel === person;
    }).sort(function (a, b) {
      return String(a.dateCompleted || '').localeCompare(String(b.dateCompleted || ''));
    });
    if (!rows.length) {
      out.innerHTML = '<p class="muted">No records for ' + esc(person) + ' on ' + esc(task) + '.</p>';
      return;
    }
    var pMeta = (db.personnel || []).find(function (p) { return p.fullName === person; }) || {};
    var rank = rows[0].rank || pMeta.rank || '';
    var html = '<h2 style="color:var(--text);margin:8px 0 4px">' + esc(person) + '</h2>';
    html += '<p class="muted">' + esc(task) + (rank ? ' · ' + esc(rank) : '') + ' · ' + rows.length + ' record' + (rows.length === 1 ? '' : 's') + '</p>';
    html += '<table class="data"><thead><tr>'
      + '<th>Date Completed</th><th>Status</th><th>Completion Time</th><th>Standard Time</th>'
      + '<th>Met Standard</th><th>Category</th><th>Notes</th>'
      + '</tr></thead><tbody>';
    rows.forEach(function (a) {
      html += '<tr>'
        + '<td>' + esc(fmtDate(a.dateCompleted)) + '</td>'
        + '<td>' + esc(a.status || '') + '</td>'
        + '<td>' + esc(a.completionTime || '') + '</td>'
        + '<td>' + esc(a.stdTime || '') + '</td>'
        + '<td>' + esc(a.metStandard || '') + '</td>'
        + '<td>' + esc(a.category || '') + '</td>'
        + '<td>' + esc(a.notes || '') + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    out.innerHTML = html;
  }
  window.renderTaskSort = function () {
    fillTaskSelect();
    var taskSel = document.getElementById('tasksort-task');
    var personSel = document.getElementById('tasksort-person');
    if (!taskSel || !personSel) return;
    if (!taskSel.onchange) {
      taskSel.onchange = function () {
        fillPersonSelect(taskSel.value);
        renderDetail(taskSel.value, '');
      };
      personSel.onchange = function () {
        renderDetail(taskSel.value, personSel.value);
      };
    }
    fillPersonSelect(taskSel.value);
    renderDetail(taskSel.value, personSel.value);
  };
  function wireNav() {
    document.querySelectorAll('nav button').forEach(function (b) {
      if (b.dataset.tab !== 'tasksort') return;
      var prev = b.onclick;
      b.onclick = function (ev) {
        if (typeof prev === 'function') prev.call(b, ev);
        var mine = document.getElementById('tab-tasksort');
        if (mine && !mine.hidden) renderTaskSort();
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireNav);
  else wireNav();
})();
