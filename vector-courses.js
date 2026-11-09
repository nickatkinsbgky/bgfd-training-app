
(function () {
  var courses = [];
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }
  function loadCourses(cb) {
    if (courses.length) { cb(); return; }
    fetch('vector-courses.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { courses = data || []; cb(); })
      .catch(function () { courses = []; cb(); });
  }
  function renderList(list) {
    var box = document.getElementById('vectorResults');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="muted">No courses match your search.</p>';
      return;
    }
    var html = list.map(function (c) {
      return '<article class="vector-card">' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<p class="meta"><strong>ID:</strong> ' + esc(c.id || '—') +
        ' &nbsp; <strong>Category:</strong> ' + esc(c.category || '—') +
        ' &nbsp; <strong>Hours:</strong> ' + esc(c.hours || '—') + '</p>' +
        '<p class="desc">' + esc(c.description || 'No description available.') + '</p>' +
        '</article>';
    }).join('');
    box.innerHTML = html;
  }
  function applyFilter() {
    var qName = (document.getElementById('vectorName').value || '').toLowerCase().trim();
    var qId = (document.getElementById('vectorId').value || '').toLowerCase().trim();
    var qCat = document.getElementById('vectorCat').value || '';
    var list = courses.filter(function (c) {
      if (qName && c.name.toLowerCase().indexOf(qName) === -1) return false;
      if (qId && String(c.id || '').toLowerCase().indexOf(qId) === -1) return false;
      if (qCat && c.category !== qCat) return false;
      return true;
    });
    renderList(list);
    var count = document.getElementById('vectorCount');
    if (count) count.textContent = list.length + ' course' + (list.length === 1 ? '' : 's');
  }
  function fillCategories() {
    var sel = document.getElementById('vectorCat');
    if (!sel) return;
    var cats = {};
    courses.forEach(function (c) { if (c.category) cats[c.category] = 1; });
    var list = Object.keys(cats).sort();
    sel.innerHTML = '<option value="">All categories</option>' +
      list.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  }
  function showVector() {
    loadCourses(function () {
      fillCategories();
      applyFilter();
      var main = document.getElementById('mainLayout');
      if (main) main.hidden = true;
      document.getElementById('personView').hidden = true;
      document.getElementById('focusView').hidden = true;
      document.getElementById('deptView').hidden = true;
      var app = document.getElementById('app');
      if (app) app.hidden = true;
      var bracket = document.getElementById('bracketView');
      if (bracket) bracket.hidden = true;
      var view = document.getElementById('vectorView');
      if (view) view.hidden = false;
    });
  }
  function wire() {
    var btn = document.getElementById('landVector');
    if (btn && !btn._vectorWired) {
      btn._vectorWired = true;
      btn.onclick = showVector;
    }
    var back = document.getElementById('vectorBack');
    if (back && !back._vectorWired) {
      back._vectorWired = true;
      back.onclick = function (e) {
        e.preventDefault();
        document.getElementById('vectorView').hidden = true;
        var main = document.getElementById('mainLayout');
        if (main) main.hidden = false;
      };
    }
    ['vectorName', 'vectorId', 'vectorCat'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._vectorWired) {
        el._vectorWired = true;
        el.addEventListener('input', applyFilter);
        el.addEventListener('change', applyFilter);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 500);
})();
