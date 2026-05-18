/**
 * demo.html tab routing
 */
(function (global) {
  var panels = ['calendar', 'chat', 'phone'];
  var aliases = { connect: 'calendar', book: 'chat', phone: 'phone', calendar: 'calendar', chat: 'chat' };

  function resolveDemoId(raw) {
    return aliases[String(raw || '').toLowerCase().trim()] || String(raw || '').toLowerCase().trim();
  }

  function readDemoId() {
    var q = resolveDemoId(
      new URLSearchParams(location.search).get('tab') || new URLSearchParams(location.search).get('demo')
    );
    if (panels.indexOf(q) >= 0) return q;
    var h = resolveDemoId((location.hash || '').replace(/^#/, ''));
    if (panels.indexOf(h) >= 0) return h;
    return 'calendar';
  }

  function showDemo(id, opts) {
    opts = opts || {};
    id = resolveDemoId(id);
    if (panels.indexOf(id) < 0) id = 'calendar';
    panels.forEach(function (p) {
      var el = document.getElementById('demo-' + p);
      var tab = document.getElementById('tab-' + p);
      if (el) el.classList.toggle('on', p === id);
      if (tab) tab.classList.toggle('on', p === id);
    });
    if (id === 'calendar' && global.CPDemos && CPDemos.initCalendarDemo) CPDemos.initCalendarDemo();
    if (id === 'phone') {
      if (global.CPDemos && CPDemos.initPhoneDemo) CPDemos.initPhoneDemo();
      if (global.CPVapiDemo && CPVapiDemo.initVapiDemo) CPVapiDemo.initVapiDemo();
    }
    if (id === 'chat' && global.CPChatDemo && CPChatDemo.initChatDemo) CPChatDemo.initChatDemo();
    if (!opts.skipHash && location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }
  }

  function initRouter() {
    document.querySelectorAll('.demo-tab').forEach(function (btn) {
      btn.onclick = function () {
        showDemo(btn.getAttribute('data-demo'));
      };
    });
    document.querySelectorAll('.demo-jump-chat').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        showDemo('chat');
      };
    });
    document.querySelectorAll('a[href^="demo.html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var m = (a.getAttribute('href') || '').match(/#([a-z]+)/i);
        if (!m) return;
        var target = resolveDemoId(m[1]);
        if (panels.indexOf(target) < 0) return;
        if (location.pathname.replace(/\\/g, '/').split('/').pop() === 'demo.html') {
          e.preventDefault();
          showDemo(target);
        }
      });
    });

    function applyRoute() {
      showDemo(readDemoId(), { skipHash: true });
    }

    applyRoute();
    global.addEventListener('hashchange', applyRoute);
    global.addEventListener('popstate', applyRoute);
  }

  global.CPDemoRouter = { showDemo: showDemo, initRouter: initRouter };
})(typeof window !== 'undefined' ? window : global);
