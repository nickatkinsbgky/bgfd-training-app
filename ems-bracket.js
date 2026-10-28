(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
  }
  function expYear(person) {
    var raw = person.expDate || person.exp || person.expiration || '';
    var m = String(raw).match(/(\d{4})/);
    return m ? Number(m[1]) : 0;
  }
  function readiness(person) {
    try {
      if (typeof window.emsPersonReport === 'function') {
        var rep = window.emsPersonReport(person.name);
        if (rep && rep.cats) {
          var total = rep.cats.length;
          var met = rep.cats.filter(function (c) { return c.earned >= c.need; }).length;
          return { pct: total ? Math.round(100 * met / total) : 0, met: met, total: total, ready: met === total && total > 0 };
        }
      }
    } catch (e) {}
    return { pct: 0, met: 0, total: 0, ready: false };
  }
  function allPeople() {
    return (window.db && window.db.people) ? window.db.people.slice() : [];
  }
  function availableYears() {
    var years = {};
    allPeople().forEach(function (p) {
      var y = expYear(p);
      if (y >= 2026) years[y] = 1;
    });
    var list = Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
    if (!list.length) list = [2026];
    // Ensure at least 2026 is present and extend a couple years forward for future cycles
    var max = Math.max.apply(null, list);
    for (var y = 2026; y <= Math.max(max, 2028); y++) {
      if (list.indexOf(y) < 0) list.push(y);
    }
    return list.sort(function (a, b) { return a - b; });
  }
  function buildRace(year) {
    return allPeople().map(function (p) {
      var r = readiness(p);
      return { name: p.name, year: expYear(p), pct: r.pct, met: r.met, total: r.total, ready: r.ready };
    }).filter(function (p) {
      return p.total > 0 && p.year === Number(year);
    }).sort(function (a, b) {
      return b.pct - a.pct || a.name.localeCompare(b.name);
    });
  }
  function fillYearSelect() {
    var sel = document.getElementById('raceYear');
    if (!sel) return;
    var years = availableYears();
    var current = sel.value || String(years[0] || 2026);
    sel.innerHTML = years.map(function (y) {
      return '<option value="' + y + '"' + (String(y) === current ? ' selected' : '') + '>' + y + '</option>';
    }).join('');
    if (![].some.call(sel.options, function (o) { return o.value === current; })) {
      sel.value = String(years[0] || 2026);
    }
  }
  function renderBracket() {
    var box = document.getElementById('bracket-out');
    if (!box) return;
    fillYearSelect();
    var year = document.getElementById('raceYear') ? document.getElementById('raceYear').value : '2026';
    var ranked = buildRace(year);
    if (!ranked.length) {
      box.innerHTML = '<p class="muted">No personnel with cycle data for ' + esc(year) + ' yet.</p>';
      return;
    }
    var winners = ranked.filter(function (p) { return p.ready; });
    var racing = ranked.filter(function (p) { return !p.ready; });

    var html = '';
    if (winners.length) {
      html += '<div class="winners-circle">';
      html += '<h3>🏆 Winners Circle — Hours Completed (' + esc(year) + ')</h3>';
      winners.forEach(function (p) {
        html += '<span class="winner">🐴 ' + esc(p.name) + ' (100%)</span>';
      });
      html += '</div>';
    } else {
      html += '<p class="muted">No one has crossed the finish line for ' + esc(year) + ' yet. Keep racing!</p>';
    }

    html += '<div class="finish-line">FINISH LINE →</div>';
    html += '<div class="race-track">';
    racing.forEach(function (p) {
      var width = Math.max(4, Math.min(100, p.pct));
      var horseClass = p.pct >= 100 ? 'horse done' : 'horse';
      html += '<div class="race-lane">';
      html += '<div class="race-name" title="' + esc(p.name) + '">' + esc(p.name) + '</div>';
      html += '<div class="track"><div class="' + horseClass + '" style="width:' + width + '%">🐴</div></div>';
      html += '<div class="race-pct">' + p.pct + '%</div>';
      html += '</div>';
    });
    if (!racing.length) {
      html += '<p class="muted">Everyone is in the winners circle!</p>';
    }
    html += '</div>';
    html += '<p class="muted" style="margin-top:12px">' + esc(year) + ' cycle. Horses move closer to the finish line as more required categories are met. 100% = fully ready to recertify.</p>';
    box.innerHTML = html;
  }
  function wire() {
    var btn = document.getElementById('landBracket');
    if (btn && !btn._raceWired) {
      btn._raceWired = true;
      btn.onclick = function () {
        document.getElementById('landing').hidden = true;
        document.getElementById('personView').hidden = true;
        document.getElementById('focusView').hidden = true;
        document.getElementById('deptView').hidden = true;
        var app = document.getElementById('app');
        if (app) app.hidden = true;
        var view = document.getElementById('bracketView');
        if (view) { view.hidden = false; renderBracket(); }
      };
    }
    var back = document.getElementById('bracketBack');
    if (back && !back._raceWired) {
      back._raceWired = true;
      back.onclick = function (e) {
        e.preventDefault();
        document.getElementById('bracketView').hidden = true;
        document.getElementById('landing').hidden = false;
      };
    }
    var yearSel = document.getElementById('raceYear');
    if (yearSel && !yearSel._raceWired) {
      yearSel._raceWired = true;
      yearSel.addEventListener('change', renderBracket);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 800);
  setTimeout(wire, 2000);
})();
