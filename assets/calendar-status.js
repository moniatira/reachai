/**
 * Calendar connection status banners (chat + phone demos).
 */
(function (global) {
  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function status() {
    var c = cfg();
    return {
      connected: !!c.calendarConnected,
      provider: c.calendarProvider || '',
      email: c.calendarAccountEmail || '',
      label: c.calendarConnected ? CPConfig.providerLabel(c.calendarProvider) : '',
    };
  }

  function bannerHtml(st) {
    if (st.connected) {
      return (
        '<div class="cal-sync-banner on">' +
        '<span class="cal-sync-dot" aria-hidden="true"></span>' +
        '<span><strong>Calendar connected</strong> · ' +
        (st.label || 'Calendar') +
        (st.email ? ' · ' + st.email : '') +
        ' — live availability in this demo</span>' +
        '</div>'
      );
    }
    return (
      '<div class="cal-sync-banner off">' +
      '<span class="cal-sync-dot" aria-hidden="true"></span>' +
      '<span><strong>Calendar not connected</strong> — ' +
      '<a href="provider.html">Sign in to provider portal</a> or ' +
      '<a href="demo.html#calendar">connect on Calendar tab</a> to sync busy times.</span>' +
      '</div>'
    );
  }

  function renderInto(el) {
    if (!el) return;
    var st = status();
    el.innerHTML = bannerHtml(st);
    el.hidden = false;
  }

  function renderAll() {
    /* Customer chat/phone demos intentionally hide calendar provider details */
  }

  function notify() {
    renderAll();
    try {
      global.dispatchEvent(new CustomEvent('cp-calendar-change', { detail: status() }));
    } catch (e) {}
  }

  global.CPCalendarStatus = {
    status: status,
    renderAll: renderAll,
    renderInto: renderInto,
    notify: notify,
  };

  global.addEventListener('cp-config-change', notify);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})(typeof window !== 'undefined' ? window : global);
