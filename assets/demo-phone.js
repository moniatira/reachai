/**
 * Phone booking demo — live tel: link + optional offline preview flow.
 */
(function (global) {
  var simState = 'idle';
  var simBooking = {};

  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function logEl() {
    return document.getElementById('phone-call-log');
  }

  function appendLine(who, text, cls) {
    var box = logEl();
    if (!box) return;
    var line = document.createElement('div');
    line.className = 'call-line ' + (cls || (who === 'AI' ? 'ai' : 'you'));
    line.innerHTML = '<span class="call-who">' + who + '</span> ' + text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function dk(d) {
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function openSlotsForCall() {
    var busyKeys = cfg().calendarConnected ? CPConfig.busyKeysFromSlots(CPConfig.getBusySlots()) : {};
    var slots = [];
    var now = new Date();
    for (var day = 1; day <= 5 && slots.length < 4; day++) {
      var d = new Date(now);
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      [9, 14, 16].forEach(function (h) {
        var dateStr = dk(d);
        var timeStr = String(h).padStart(2, '0') + ':00';
        var key = CPConfig.busyKey(dateStr, timeStr);
        if (!busyKeys[key]) {
          slots.push({
            date: dateStr,
            time: timeStr,
            label:
              d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
              ' at ' +
              (h > 12 ? h - 12 : h) +
              (h >= 12 ? 'pm' : 'am'),
          });
        }
      });
    }
    return slots;
  }

  function resetSim() {
    simState = 'idle';
    simBooking = {};
    var box = logEl();
    if (box) box.innerHTML = '';
    var panel = document.getElementById('phone-sim-actions');
    if (panel) panel.hidden = true;
  }

  function showSimActions(buttons) {
    var panel = document.getElementById('phone-sim-actions');
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = '';
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'demo-btn demo-btn-ghost phone-sim-btn';
      btn.textContent = b.label;
      btn.onclick = b.onClick;
      panel.appendChild(btn);
    });
  }

  function runSimStep() {
    var c = cfg();
    var greet = c.businessName || 'BookRing';
    var phoneIntro =
      c.phoneGreeting && String(c.phoneGreeting).trim()
        ? String(c.phoneGreeting).trim()
        : 'Thanks for calling ' + greet + '. How can I help you today?';

    if (simState === 'idle') {
      appendLine('System', 'Incoming call…', 'sys');
      setTimeout(function () {
        appendLine('AI', phoneIntro);
        simState = 'intent';
        showSimActions([
          {
            label: 'Book an appointment',
            onClick: function () {
              appendLine('Caller', 'I would like to book an appointment.');
              runSimStep();
            },
          },
        ]);
      }, 400);
      return;
    }

    if (simState === 'intent') {
      appendLine('AI', 'Happy to help you book. What is your name?');
      simState = 'name';
      showSimActions([
        {
          label: 'Say: Alex',
          onClick: function () {
            simBooking.name = 'Alex';
            appendLine('Caller', 'Alex.');
            runSimStep();
          },
        },
      ]);
      return;
    }

    if (simState === 'name') {
      var slots = openSlotsForCall();
      if (!slots.length) {
        appendLine('AI', "I don't have any openings this week. Can I take a message or have someone call you back?");
        simState = 'done';
        showSimActions([{ label: 'End call', onClick: resetSim }]);
        return;
      }
      appendLine(
        'AI',
        'Thanks, ' +
          simBooking.name +
          '. I can do ' +
          slots.slice(0, 2).join(' or ') +
          '. Which works?'
      );
      simState = 'slot';
      showSimActions(
        slots.slice(0, 2).map(function (slot) {
          return {
            label: slot.label,
            onClick: function () {
              simBooking.slotLabel = slot.label;
              simBooking.date = slot.date;
              simBooking.time = slot.time;
              appendLine('Caller', slot.label + ' works.');
              runSimStep();
            },
          };
        })
      );
      return;
    }

    if (simState === 'slot') {
      appendLine(
        'AI',
        'Perfect — you are booked for <strong>' +
          simBooking.slotLabel +
          '</strong>. We will send a confirmation shortly.'
      );
      var svcName = (CPConfig.getServices(cfg())[0] && CPConfig.getServices(cfg())[0].name) || 'Phone booking';
      CPConfig.addBookedCall({
        callerName: simBooking.name,
        service: svcName,
        slotLabel: simBooking.slotLabel,
        date: simBooking.date,
        time: simBooking.time,
        channel: 'phone',
      });
      CPConfig.notifyCalendarUi();
      simState = 'done';
      showSimActions([{ label: 'End call', onClick: resetSim }]);
    }
  }

  function formatPhoneDisplay(num) {
    var d = String(num || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '1') {
      return '+' + d[0] + ' (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7);
    }
    return num;
  }

  function telHref(num) {
    var d = String(num || '').replace(/[^\d+]/g, '');
    return d ? 'tel:' + d : '';
  }

  function renderPhoneDemo() {
    var numEl = document.getElementById('phone-demo-display');
    var callBtn = document.getElementById('phone-demo-call');
    var inp = document.getElementById('phone-demo-inp');
    var c = cfg();
    var num = String(c.vapiPhoneNumber || '').trim();

    if (inp && inp !== document.activeElement) inp.value = num;
    if (numEl) {
      if (num) {
        numEl.textContent = formatPhoneDisplay(num);
        numEl.classList.remove('muted');
      } else {
        numEl.textContent = 'Add your booking line below';
        numEl.classList.add('muted');
      }
    }
    if (callBtn) {
      if (num && telHref(num)) {
        callBtn.href = telHref(num);
        callBtn.style.display = 'inline-flex';
      } else {
        callBtn.style.display = 'none';
      }
    }
  }

  function initPhoneDemo() {
    renderPhoneDemo();
    var btnSave = document.getElementById('btn-phone-demo-save');
    var inp = document.getElementById('phone-demo-inp');
    if (btnSave && inp) {
      btnSave.onclick = function () {
        var n = inp.value.trim();
        if (!n) return;
        CPConfig.save({ vapiPhoneNumber: n });
        renderPhoneDemo();
      };
    }
    var btnSim = document.getElementById('btn-phone-sim');
    if (btnSim) {
      btnSim.onclick = function () {
        resetSim();
        runSimStep();
      };
    }
    global.addEventListener('cp-config-change', renderPhoneDemo);
  }

  global.CPDemos = global.CPDemos || {};
  global.CPDemos.initPhoneDemo = initPhoneDemo;
  global.CPDemos.renderPhoneDemo = renderPhoneDemo;
})(typeof window !== 'undefined' ? window : global);
