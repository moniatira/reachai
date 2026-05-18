export function normalizeBusyEvents(events) {
  return (events || [])
    .map((e) => {
      const start = e.start?.dateTime || e.start?.date || e.start;
      const end = e.end?.dateTime || e.end?.date || e.end;
      if (!start) return null;
      const s = new Date(start);
      const en = end ? new Date(end) : new Date(s.getTime() + 30 * 60000);
      if (isNaN(s.getTime())) return null;
      return {
        title: e.title || e.summary || e.name || 'Busy',
        start: s.toISOString(),
        end: en.toISOString(),
        source: e.source || 'calendar',
      };
    })
    .filter(Boolean);
}

export function rangeIso(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (days || 21));
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}
