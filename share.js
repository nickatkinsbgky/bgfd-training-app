(function () {
  var params = new URLSearchParams(location.search);
  var isView = params.has('view') || params.has('share') || params.has('standalone');
  var path = (location.pathname || '').toLowerCase();
  var isIso = path.indexOf('iso-class1') >= 0;
  var isFitness = path.indexOf('fitness') >= 0;
  var isTraining = path.indexOf('training') >= 0;
  var isEms = path.indexOf('ems-recert') >= 0;

  function hideEl(el) {
    if (el) el.style.display = 'none';
  }

  function isMutateButton(el) {
    if (!el) return false;
    var id = (el.id || '').toLowerCase();
    var cls = (el.className || '').toLowerCase();
    var text = (el.textContent || '').trim().toLowerCase();
    var mutateIds = ['addperson','saveperson','deleteperson','addclass','sumedit','btn-save-all','btn-push','btn-pull','btn-load','btn-save-token','btn-add','btn-save-local','resetbtn','importbtn','importfile'];
    if (mutateIds.indexOf(id) >= 0) return true;
    if (/\b(edit|del|delete|remove|save|add|import|reset)\b/.test(cls) || /\b(edit|delete|remove|save|add|import|reset)\b/.test(text)) return true;
    if (/pdf|export/.test(cls) || /pdf|export/.test(text)) return false;
    return false;
  }

  var keepVisibleIds = ['landRoster', 'landDept', 'landFocus', 'landVector', 'landBracket'];

  function lockViewMode() {
    if (!isView) return;
    // Hide Home and Share in view-only mode
    document.querySelectorAll('a.home-link, a.back, a[href="index.html"], #shareBtn').forEach(hideEl);
    document.querySelectorAll('button, input, select, textarea').forEach(function (el) {
      if (keepVisibleIds.indexOf(el.id) >= 0) return;
      if (isMutateButton(el)) hideEl(el);
      // Disable any remaining form controls that could change data
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        if (el.id !== 'landSearch' && el.id !== 'landSelect') {
          el.disabled = true;
        }
      }
    });
    var modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
    var drawer = document.getElementById('drawer');
    if (drawer) drawer.style.display = 'none';
    document.body.classList.add('view-only');
    var style = document.createElement('style');
    style.textContent = [
      '.view-only .sync-bar .sync-left, .view-only .sync-bar button#btn-save-all, .view-only .sync-bar button#btn-push, .view-only .sync-bar button#btn-pull, .view-only .sync-bar input, .view-only .sync-bar button#btn-save-token { display:none !important; }',
      '.view-only #landRoster, .view-only #landDept, .view-only #landFocus, .view-only #landVector, .view-only #landBracket { display:inline-block !important; }',
      '.view-only a.home-link, .view-only a.back, .view-only #shareBtn { display:none !important; }',
      '.view-only #drawer, .view-only #edit-modal { display:none !important; }',
      '.view-only button.edit, .view-only button.del, .view-only button.edit-class, .view-only button.del-class, .view-only button.row-btn, .view-only button.tiny { display:none !important; }',
      '.view-only #addPerson, .view-only #savePerson, .view-only #deletePerson, .view-only #addClass, .view-only #sumEdit, .view-only #btn-save-all, .view-only #btn-push, .view-only #btn-pull, .view-only #btn-save-token, .view-only #resetBtn, .view-only #importBtn { display:none !important; }',
      '.view-only input, .view-only select, .view-only textarea { pointer-events:none; }',
      '.view-only #landSearch, .view-only #landSelect { pointer-events:auto; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function forceLoadLatest() {
    if (!isView) return;
    var pull = document.getElementById('btn-pull');
    if (pull && typeof pull.onclick === 'function') {
      try { pull.onclick(); } catch (e) {}
    }
  }

  function appLabel() {
    if (isIso) return 'ISO Class 1';
    if (isFitness) return 'Fitness';
    if (isTraining) return 'Training';
    if (isEms) return 'EMS Recertification';
    return 'this app';
  }

  function addShareButton() {
    if (isView) return;

    var header = document.querySelector('header');
    if (!header || document.getElementById('shareBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'shareBtn';
    btn.type = 'button';
    btn.textContent = 'Share';
    btn.title = 'Copy a view-only link others can use to see the latest ' + appLabel() + ' data (no edits, this app only)';
    btn.style.cssText = 'background:#241c0c;color:#d4a017;border:1px solid #d4a017;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;margin-left:8px;';
    var home = header.querySelector('a.home-link, a.back');
    if (home && home.parentNode) {
      home.parentNode.insertBefore(btn, home.nextSibling);
    } else {
      header.appendChild(btn);
    }
    btn.onclick = function () {
      var url = new URL(location.href);
      url.searchParams.set('view', '1');
      url.searchParams.delete('share');
      url.searchParams.delete('standalone');
      var link = url.toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = orig; }, 1800);
        }).catch(function () { fallback(link); });
      } else {
        fallback(link);
      }
    };
  }

  function fallback(link) {
    var ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    alert('Share link copied:\n' + link);
  }

  function init() {
    addShareButton();
    lockViewMode();
    setTimeout(forceLoadLatest, 600);
    setTimeout(lockViewMode, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
