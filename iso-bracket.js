(function () {
  // Inject race styles — responsive so the track fits the viewing window
  if (!document.getElementById('race-styles')) {
    const style = document.createElement('style');
    style.id = 'race-styles';
    style.textContent = `
      .race-container {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: flex-start;
        max-width: 100%;
      }
      .track-wrap {
        flex: 1 1 0;
        min-width: 0;
        width: 100%;
        position: relative;
        background: linear-gradient(#2a4a2a, #1a3a1a);
        border-radius: 10px;
        padding: 16px 36px 16px 16px;
        overflow: hidden;
        box-sizing: border-box;
      }
      .track {
        position: relative;
        height: 36px;
        background: repeating-linear-gradient(90deg, #4a3a2a 0 10px, #5a4a3a 10px 20px);
        border: 2px solid #8b7355;
        border-radius: 4px;
        margin: 6px 0 24px;
        box-sizing: border-box;
      }
      .horse {
        position: absolute;
        top: -8px;
        font-size: 26px;
        transform: translateX(-50%);
        transition: left 0.5s ease;
        white-space: nowrap;
        line-height: 1;
      }
      .horse span {
        position: absolute;
        bottom: -16px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        background: rgba(0,0,0,.75);
        padding: 1px 4px;
        border-radius: 3px;
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .finish {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: #fff;
        box-shadow: 0 0 8px #fff;
      }
      .finish::after {
        content: "\ud83c\udfc1";
        position: absolute;
        right: -8px;
        top: -18px;
        font-size: 18px;
      }
      .winners-circle {
        flex: 0 0 200px;
        max-width: 100%;
        background: var(--panel2);
        border: 2px solid var(--gold);
        border-radius: 12px;
        padding: 14px;
        text-align: center;
        box-sizing: border-box;
      }
      .winners-circle h3 { margin: 0 0 10px; color: var(--gold); font-size: 15px; }
      .winner { display: flex; align-items: center; gap: 6px; margin: 5px 0; font-size: 12px; justify-content: center; }
      .winner .horse-icon { font-size: 20px; }
      @media (max-width: 700px) {
        .race-container { flex-direction: column; }
        .track-wrap { padding: 12px 28px 12px 12px; }
        .winners-circle { flex: 1 1 auto; width: 100%; }
        .horse { font-size: 22px; }
        .horse span { font-size: 8px; max-width: 90px; }
        .track { height: 32px; margin-bottom: 20px; }
      }
    `;
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
  }
  function pct(have, need) {
    if (!need) return 100;
    return Math.min(100, Math.round(100 * (Number(have) || 0) / need));
  }
  function personProgress(p) {
    const eng = (p.Rank || '').toUpperCase().includes('ENGINEER') || (p.Rank || '').toUpperCase().includes('TRAINING INSTRUCTOR');
    const off = /CAPTAIN|CHIEF|BATTALION|ASSISTANT|DEPUTY/i.test(p.Rank || '');
    const cats = [
      { key: 'Company', label: 'Company (192)', have: p.Effective_Company_Hours, need: 192 },
      { key: 'Facility', label: 'Facility (18)', have: p.Facility_Raw, need: 18 },
      { key: 'Driver', label: 'Driver Op', have: p.Driver_Op_Raw, need: eng ? 12 : 0 },
      { key: 'Officer', label: 'Officer', have: p.Officer_Raw, need: off ? 12 : 0 },
      { key: 'HazMat', label: 'HazMat (6)', have: p.HazMat_Raw, need: 6 }
    ];
    const scored = cats.filter(c => c.need > 0).map(c => ({ ...c, pct: pct(c.have, c.need) }));
    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.pct, 0) / scored.length) : 0;
    const complete = scored.every(c => c.pct >= 100);
    return { name: (p.Last_Name || '') + ', ' + (p.First_Name || ''), avg, complete, cats: scored };
  }
  function render() {
    const box = document.getElementById('iso-bracket-out');
    if (!box) return;
    const section = box.closest('section');
    if (section) {
      const h2 = section.querySelector('h2');
      if (h2) h2.textContent = 'Horse Race to Complete ISO Hours';
      const muted = section.querySelector('p.muted');
      if (muted) muted.textContent = 'Every person is a horse racing toward the finish line — 100% of required training hours across all applicable categories. Horses that reach the finish line move to the Winners Circle.';
    }

    const people = (typeof data !== 'undefined' && Array.isArray(data)) ? data.map(personProgress).sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name)) : [];
    if (!people.length) {
      box.innerHTML = '<p class="muted">No ISO data loaded.</p>';
      return;
    }
    const complete = people.filter(p => p.complete);
    const racing = people.filter(p => !p.complete);

    let html = '<div class="race-container">';
    html += '<div class="track-wrap">';
    html += '<h3 style="margin:0 0 8px;color:var(--gold)">The Track</h3>';
    if (racing.length) {
      racing.forEach((p) => {
        const left = Math.max(2, Math.min(98, p.avg));
        html += '<div class="track">';
        html += '<div class="horse" style="left:' + left + '%">\ud83d\udc34<span>' + esc(p.name) + ' (' + p.avg + '%)</span></div>';
        html += '<div class="finish"></div>';
        html += '</div>';
      });
    } else {
      html += '<p class="muted">All horses have finished!</p>';
    }
    html += '</div>';

    html += '<div class="winners-circle">';
    html += '<h3>\ud83c\udfc6 Winners Circle</h3>';
    if (complete.length) {
      complete.forEach(p => {
        html += '<div class="winner"><span class="horse-icon">\ud83d\udc34</span><span>' + esc(p.name) + '</span></div>';
      });
    } else {
      html += '<p class="muted">No finishers yet — keep racing!</p>';
    }
    html += '</div></div>';

    html += '<p class="muted" style="margin-top:12px">Horses are positioned by average percent complete across applicable categories (Company 192, Facility 18, Driver Op if required, Officer if required, HazMat 6). Finish line = all applicable categories met.</p>';
    box.innerHTML = html;
  }
  function wire() {
    const btn = document.querySelector('nav button[data-tab="bracket"]');
    if (btn && !btn._wired) {
      btn._wired = true;
      btn.onclick = function () {
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ['overview','personnel','charts','export','bracket'].forEach(id => {
          const el = document.getElementById('tab-' + id);
          if (el) el.hidden = id !== 'bracket';
        });
        render();
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 800);
})();
