(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function readiness(person) {
    // Approximate readiness: % of categories met. Relies on global helpers if present.
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
  function buildBracket() {
    var people = (window.db && window.db.people) ? window.db.people.slice() : [];
    var ranked = people.map(function (p) {
      var r = readiness(p);
      return { name: p.name, exp: p.exp || '', pct: r.pct, met: r.met, total: r.total, ready: r.ready };
    }).filter(function (p) { return p.total > 0; }).sort(function (a, b) {
      return b.pct - a.pct || a.name.localeCompare(b.name);
    });
    return ranked;
  }
  function renderBracket() {
    var box = document.getElementById('bracket-out');
    if (!box) return;
    var ranked = buildBracket();
    if (!ranked.length) {
      box.innerHTML = '<p class="muted">No personnel with cycle data loaded yet.</p>';
      return;
    }
    var ready = ranked.filter(function (p) { return p.ready; });
    var notReady = ranked.filter(function (p) { return !p.ready; });
    var html = '<div class="bracket-wrap">';
    html += '<div class="bracket-col">';
    html += '<h3 style="color:var(--gold);margin:0 0 8px">Field</h3>';
    notReady.slice(0, 16).forEach(function (p) {
      html += '<div class="bracket-slot">' + esc(p.name) + '<small>' + p.pct + '% · ' + p.met + '/' + p.total + '</small></div>';
    });
    if (notReady.length > 16) html += '<div class="bracket-slot muted">+' + (notReady.length - 16) + ' more</div>';
    html += '</div>';
    html += '<div class="bracket-col">';
    html += '<h3 style="color:var(--gold);margin:0 0 8px">In the hunt</h3>';
    notReady.slice(0, 8).forEach(function (p) {
      html += '<div class="bracket-slot">' + esc(p.name) + '<small>' + p.pct + '%</small></div>';
    });
    html += '</div>';
    html += '<div class="bracket-col">';
    html += '<h3 style="color:var(--gold);margin:0 0 8px">Final four</h3>';
    notReady.slice(0, 4).forEach(function (p) {
      html += '<div class="bracket-slot">' + esc(p.name) + '<small>' + p.pct + '%</small></div>';
    });
    html += '</div>';
    html += '<div class="bracket-col champ">';
    html += '<h3 style="color:#7dcea0;margin:0 0 8px">Ready to Recertify</h3>';
    if (ready.length) {
      ready.forEach(function (p) {
        html += '<div class="bracket-slot ready">' + esc(p.name) + '<small>100%</small></div>';
      });
    } else {
      html += '<div class="bracket-slot muted">No one fully ready yet</div>';
    }
    html += '</div>';
    html += '</div>';
    html += '<p class="muted" style="margin-top:12px">Ranked by percent of required categories met in the current cycle. Top of the field are closest to the finish line.</p>';
    box.innerHTML = html;
  }
  function wire() {
    var btn = document.getElementById('landBracket');
    if (btn && !btn.onclick) {
      btn.onclick = function () {
        document.getElementById('landing').hidden = true;
        document.getElementById('personView').hidden = true;
        document.getElementById('focusView').hidden = true;
        document.getElementById('deptView').hidden = true;
        document.getElementById('app').hidden = true;
        var view = document.getElementById('bracketView');
        if (view) { view.hidden = false; renderBracket(); }
      };
    }
    var back = document.getElementById('bracketBack');
    if (back && !back.onclick) {
      back.onclick = function (e) {
        e.preventDefault();
        document.getElementById('bracketView').hidden = true;
        document.getElementById('landing').hidden = false;
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  // Also try after a short delay in case EMS script loads later
  setTimeout(wire, 1500);
})();
