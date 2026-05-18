/**
 * Chat booking demo — name → service → pick date → pick time on that date.
 */
(function (global) {
  var state = 'name';
  var booking = { name: '', service: '', date: '', time: '' };
  var busyKeys = {};

  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function dk(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function mergeBusy() {
    busyKeys = {};
    var c = cfg();
    var slots = [];
    if (c.calendarConnected) {
      slots = CPConfig.getBusySlots();
    } else if (Array.isArray(c.calendarBusySlots) && c.calendarBusySlots.length) {
      slots = c.calendarBusySlots;
    }
    busyKeys = CPConfig.busyKeysFromSlots(slots);
  }

  function openSlots() {
    var slots = [];
    var now = new Date();
    for (var day = 1; day <= 10; day++) {
      var d = new Date(now);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      [9, 10, 11, 14, 15, 16].forEach(function (h) {
        var timeStr = String(h).padStart(2, '0') + ':00';
        var key = dk(d) + '|' + timeStr;
        if (!busyKeys[key]) {
          slots.push({
            date: dk(d),
            time: timeStr,
            timeLabel: (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am'),
            dateLabel: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            label:
              d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
              ' · ' +
              (h > 12 ? h - 12 : h) +
              (h >= 12 ? 'pm' : 'am'),
          });
        }
      });
    }
    return slots;
  }

  function slotsForDate(dateStr) {
    return openSlots().filter(function (s) {
      return s.date === dateStr;
    });
  }

  function datesWithOpenings() {
    var seen = {};
    var out = [];
    openSlots().forEach(function (s) {
      if (seen[s.date]) return;
      seen[s.date] = true;
      out.push({ date: s.date, label: s.dateLabel });
    });
    return out;
  }

  function msgsEl() {
    return document.getElementById('chat-demo-msgs');
  }

  function scrollEnd() {
    var box = msgsEl();
    if (box) box.scrollTop = box.scrollHeight;
  }

  function addAi(html) {
    var box = msgsEl();
    if (!box) return;
    var d = document.createElement('div');
    d.className = 'bbl-demo ai';
    d.innerHTML = html;
    box.appendChild(d);
    scrollEnd();
  }

  function addUser(text) {
    var box = msgsEl();
    if (!box) return;
    var d = document.createElement('div');
    d.className = 'bbl-demo user';
    d.textContent = text;
    box.appendChild(d);
    scrollEnd();
  }

  function updateChatHeader() {
    var sub = document.getElementById('chat-hdr-sub');
    if (!sub) return;
    var c = cfg();
    sub.textContent = c.tagline && String(c.tagline).trim() ? c.tagline : "We're here to help you book";
  }

  function wireServiceButtons(root) {
    if (!root) return;
    root.querySelectorAll('.svc-pick').forEach(function (btn) {
      btn.onclick = function () {
        booking.service = btn.getAttribute('data-svc');
        addUser(booking.service);
        afterServicePicked();
      };
    });
  }

  function afterServicePicked() {
    state = 'date';
    var dates = datesWithOpenings();
    if (!dates.length) {
      addAi("I don't see any openings this week. Would you like to try another day, or should I have someone call you back?");
      return;
    }
    addAi('Which day works best for your <strong>' + booking.service + '</strong>?');
    renderDatePicker(dates);
    renderSidebar();
  }

  function buildDateGridHtml(dates) {
    var html = '<div class="slot-grid-demo chat-date-grid">';
    dates.forEach(function (d) {
      html +=
        '<button type="button" class="slot-btn-demo date-pick" data-date="' +
        d.date +
        '" data-label="' +
        d.label.replace(/"/g, '&quot;') +
        '">' +
        d.label +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function buildTimeGridHtml(slots) {
    if (!slots.length) {
      return '<p class="chat-no-slots">No times left on that day. Pick another date.</p>';
    }
    var html = '<div class="slot-grid-demo chat-time-grid">';
    slots.forEach(function (s) {
      html +=
        '<button type="button" class="slot-btn-demo time-pick" data-date="' +
        s.date +
        '" data-time="' +
        s.time +
        '" data-label="' +
        s.label.replace(/"/g, '&quot;') +
        '">' +
        s.timeLabel +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function wireDateButtons(root) {
    if (!root) return;
    root.querySelectorAll('.date-pick').forEach(function (btn) {
      btn.onclick = function () {
        onDatePicked(btn.getAttribute('data-date'), btn.getAttribute('data-label') || btn.textContent);
      };
    });
  }

  function wireTimeButtons(root) {
    if (!root) return;
    root.querySelectorAll('.time-pick').forEach(function (btn) {
      btn.onclick = function () {
        booking.date = btn.getAttribute('data-date');
        booking.time = btn.getAttribute('data-time');
        addUser(btn.textContent.trim());
        goConfirm();
      };
    });
  }

  function onDatePicked(dateStr, label) {
    booking.date = dateStr;
    booking.time = '';
    addUser(label);
    state = 'time';
    var slots = slotsForDate(dateStr);
    addAi('Here are open times on <strong>' + label + '</strong>:' + buildTimeGridHtml(slots));
    wireTimeButtons(msgsEl());
    renderSidebar();
  }

  function renderDatePicker(dates) {
    dates = dates || datesWithOpenings();
    var html = buildDateGridHtml(dates);
    addAi(html);
    wireDateButtons(msgsEl());
  }

  function goConfirm() {
    state = 'confirm';
    var slotLabel = booking.date + ' ' + booking.time;
    addAi(
      'Perfect — <strong>' +
        booking.service +
        '</strong> on <strong>' +
        slotLabel +
        '</strong> for <strong>' +
        booking.name +
        '</strong>. Reply <strong>yes</strong> to confirm.'
    );
  }

  function renderSidebar() {
    var weekEl = document.getElementById('chat-demo-week');
    var slotsEl = document.getElementById('chat-demo-slots');
    var note = document.getElementById('chat-side-note');
    if (!weekEl) return;

    var dates = datesWithOpenings();
    var daysWithOpen = {};
    dates.forEach(function (d) {
      daysWithOpen[d.date] = slotsForDate(d.date).length;
    });

    weekEl.innerHTML = '';
    var now = new Date();
    var clickable = state === 'date' || state === 'time';

    for (var i = 0; i < 5; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() + i + 1);
      var dateKey = dk(d);
      var count = daysWithOpen[dateKey] || 0;
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'chat-week-day' + (count ? ' has-open' : '') + (booking.date === dateKey ? ' sel' : '');
      cell.disabled = !clickable || !count;
      cell.innerHTML =
        '<span class="chat-week-dow">' +
        d.toLocaleDateString(undefined, { weekday: 'short' }) +
        '</span><span class="chat-week-num">' +
        d.getDate() +
        '</span>' +
        (count && clickable ? '<span class="chat-week-open">' + count + ' open</span>' : '');
      if (clickable && count) {
        cell.onclick = function (key, lbl) {
          return function () {
            onDatePicked(key, lbl);
          };
        }(dateKey, d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
      }
      weekEl.appendChild(cell);
    }

    if (slotsEl) {
      slotsEl.innerHTML = '';
      if (state === 'time' && booking.date) {
        var daySlots = slotsForDate(booking.date);
        if (daySlots.length) {
          slotsEl.innerHTML = daySlots
            .map(function (s) {
              return (
                '<button type="button" class="chat-side-slot time-pick" data-date="' +
                s.date +
                '" data-time="' +
                s.time +
                '">' +
                s.timeLabel +
                '</button>'
              );
            })
            .join('');
          wireTimeButtons(slotsEl);
        } else {
          slotsEl.innerHTML = '<p class="chat-no-slots">No times on this day.</p>';
        }
      }
    }

    if (note) {
      if (state === 'name' || state === 'service') {
        note.textContent = 'Pick what you need in the chat first — then choose a date.';
      } else if (state === 'date') {
        note.textContent = 'Tap a highlighted day to see open times.';
      } else if (state === 'time') {
        note.textContent = 'Choose a time for the day you selected.';
      } else {
        note.textContent = 'Highlighted days have openings.';
      }
    }
    updateChatHeader();
  }

  function startChat() {
    state = 'name';
    booking = { name: '', service: '', date: '', time: '' };
    var box = msgsEl();
    if (box) box.innerHTML = '';
    mergeBusy();
    renderSidebar();

    var c = cfg();
    var biz = c.businessName || 'BookRing';
    var intro = c.chatWelcome && String(c.chatWelcome).trim()
      ? String(c.chatWelcome).trim()
      : 'Hi! I am the ' + biz + ' assistant. What is your name?';
    if (!c.chatWelcome && c.tagline) {
      intro += '<br><span style="font-size:12px;color:#7a9488;margin-top:6px;display:block">' + c.tagline + '</span>';
    }
    addAi(intro);
  }

  function handleInput(text) {
    text = String(text || '').trim();
    if (!text) return;
    addUser(text);

    if (state === 'name') {
      booking.name = text;
      state = 'service';
      var svcs = CPConfig.getServices(cfg());
      var html = 'Nice to meet you, ' + text + '. What would you like to book?';
      if (svcs.length) {
        html += '<div class="slot-grid-demo" style="margin-top:8px">';
        svcs.forEach(function (s) {
          html +=
            '<button type="button" class="slot-btn-demo svc-pick" data-svc="' +
            s.name +
            '">' +
            s.name +
            '</button>';
        });
        html += '</div>';
      }
      addAi(html);
      wireServiceButtons(msgsEl());
      renderSidebar();
      return;
    }

    if (state === 'service') {
      booking.service = text;
      afterServicePicked();
      return;
    }

    if (state === 'confirm') {
      if (/^(y|yes|ok|confirm)/i.test(text)) {
        state = 'done';
        CPConfig.addBookedCall({
          callerName: booking.name,
          service: booking.service,
          slotLabel: booking.date + ' ' + booking.time,
          date: booking.date,
          time: booking.time,
          channel: 'chat',
        });
        mergeBusy();
        renderSidebar();
        CPConfig.notifyCalendarUi();
        addAi(
          "You're all set! <strong>" +
            booking.service +
            '</strong> on <strong>' +
            booking.date +
            ' ' +
            booking.time +
            '</strong>. We will send a confirmation shortly.'
        );
      } else {
        state = 'date';
        booking.date = '';
        booking.time = '';
        addAi('No problem — pick another day:');
        renderDatePicker();
        renderSidebar();
      }
    }
  }

  function initChatDemo() {
    mergeBusy();
    updateChatHeader();
    renderSidebar();

    var inp = document.getElementById('chat-demo-inp');
    var send = document.getElementById('chat-demo-send');
    function go() {
      if (!inp) return;
      var t = inp.value;
      inp.value = '';
      handleInput(t);
    }
    if (send) send.onclick = go;
    if (inp) {
      inp.onkeydown = function (e) {
        if (e.key === 'Enter') go();
      };
    }
    var reset = document.getElementById('chat-demo-reset');
    if (reset) reset.onclick = startChat;
    global.addEventListener('cp-config-change', function () {
      mergeBusy();
      renderSidebar();
    });
    if (!msgsEl() || !msgsEl().children.length) startChat();
  }

  global.CPChatDemo = { initChatDemo: initChatDemo, startChat: startChat };
})(typeof window !== 'undefined' ? window : global);
