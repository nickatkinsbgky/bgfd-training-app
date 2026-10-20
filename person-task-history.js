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
  function peopleWithRecords() {
    var set = {};
    (db.assignments || []).forEach(function (a) {
      if (a.personnel) set[a.personnel] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }
  function tasksForPerson(person) {
    var set = {};
    (db.assignments || []).forEach(function (a) {
      if (a.personnel === person && a.task) set[a.task] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }
  function fillPersonSelect() {
    var sel = document.getElementById('pth-person');
    if (!sel) return;
    var cur = sel.value;
    var people = peopleWithRecords();
    sel.innerHTML = '<option value="">Select personnel</option>' +
      people.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('');
    if (cur && people.indexOf(cur) >= 0) sel.value = cur;
  }
  function fillTaskSelect(person) {
    var sel = document.getElementById('pth-task');
    if (!sel) return;
    var cur = sel.value;
    var tasks = person ? tasksForPerson(person) : [];
    sel.innerHTML = '<option value="">Select a task</option>' +
      tasks.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    if (cur && tasks.indexOf(cur) >= 0) sel.value = cur;
    else sel.value = '';
  }
  function renderDetail(person, task) {
    var out = document.getElementById('pth-out');
    if (!out) return;
    if (!person) {
      out.innerHTML = '<p class="muted">Choose a person to begin.</p>';
      return;
    }
    if (!task) {
      var n = tasksForPerson(person).length;
      out.innerHTML = '<p class="muted">' + n + ' task' + (n === 1 ? '' : 's') + ' with records for ' + esc(person) + '. Choose a task to see the history.</p>';
      return;
    }
    var rows = (db.assignments || []).filter(function (a) {
      return a.personnel === person && (a.task || '') === task;
    }).sort(function (a, b) {
      var da = a.dateCompleted || a.dateDue || '';
      var db_ = b.dateCompleted || b.dateDue || '';
      return String(da).localeCompare(String(db_));
    });
    if (!rows.length) {
      out.innerHTML = '<p class="muted">No records for ' + esc(person) + ' on ' + esc(task) + '.</p>';
      return;
    }
    var pMeta = (db.personnel || []).find(function (p) { return p.fullName === person; }) || {};
    var rank = rows[0].rank || pMeta.rank || '';
    var html = '<h2 style="color:var(--text);margin:8px 0 4px">' + esc(person) + '</h2>';
    html += '<p class="muted">' + esc(task) + (rank ? ' · ' + esc(rank) : '') + ' · ' + rows.length + ' record' + (rows.length === 1 ? '' : 's') + ' (oldest first)</p>';
    html += '<table><thead><tr>'
      + '<th>#</th><th>Date Completed</th><th>Status</th><th>Completion Time</th><th>Standard Time</th>'
      + '<th>Met Standard</th><th>Category</th><th>Notes</th>'
      + '</tr></thead><tbody>';
    rows.forEach(function (a, i) {
      var met = a.metStandard === 'Yes' ? '<span style="color:#3fb950">Yes</span>' : (a.metStandard === 'No' ? '<span style="color:#ff7b72">No</span>' : '—');
      html += '<tr>'
        + '<td>' + (i + 1) + '</td>'
        + '<td>' + esc(fmtDate(a.dateCompleted || a.dateDue)) + '</td>'
        + '<td>' + esc(a.status || '') + '</td>'
        + '<td>' + esc(a.completionTime || '') + '</td>'
        + '<td>' + esc(a.stdTime || '') + '</td>'
        + '<td>' + met + '</td>'
        + '<td>' + esc(a.category || '') + '</td>'
        + '<td>' + esc(a.notes || '') + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    out.innerHTML = html;
  }
  window.renderPersonTaskHistory = function () {
    fillPersonSelect();
    var personSel = document.getElementById('pth-person');
    var taskSel = document.getElementById('pth-task');
    if (!personSel || !taskSel) return;
    if (!personSel.onchange) {
      personSel.onchange = function () {
        fillTaskSelect(personSel.value);
        renderDetail(personSel.value, '');
      };
      taskSel.onchange = function () {
        renderDetail(personSel.value, taskSel.value);
      };
    }
    fillTaskSelect(personSel.value);
    renderDetail(personSel.value, taskSel.value);
  };
  function wireNav() {
    document.querySelectorAll('nav button').forEach(function (b) {
      if (b.dataset.tab !== 'persontask') return;
      var prev = b.onclick;
      b.onclick = function (ev) {
        if (typeof prev === 'function') prev.call(b, ev);
        var mine = document.getElementById('tab-persontask');
        if (mine && !mine.hidden) renderPersonTaskHistory();
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireNav);
  else wireNav();
})();
