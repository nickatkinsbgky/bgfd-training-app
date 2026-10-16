(function () {
  var params = new URLSearchParams(location.search);
  var isStandalone = params.has('standalone') || params.has('share');
  if (isStandalone) {
    document.querySelectorAll('a.home-link[href="index.html"], a[href="index.html"]').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function fallback(link) {
    window.prompt('Copy this standalone link:', link);
  }

  var header = document.querySelector('header');
  if (header && !document.getElementById('shareBtn')) {
    var btn = document.createElement('button');
    btn.id = 'shareBtn';
    btn.type = 'button';
    btn.textContent = 'Share';
    btn.title = 'Copy standalone share link for this app';
    btn.style.cssText = 'background:#241c0c;color:#d4a017;border:1px solid #d4a017;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;margin-left:8px;';
    var home = header.querySelector('a.home-link');
    if (home && home.parentNode) {
      home.parentNode.insertBefore(btn, home.nextSibling);
    } else {
      header.appendChild(btn);
    }
    btn.onclick = function () {
      var url = new URL(location.href);
      url.searchParams.set('standalone', '1');
      url.searchParams.delete('share');
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
})();
