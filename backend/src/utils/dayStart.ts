// Start of the current calendar day in the given IANA timezone, as a UTC
// instant. Falls back to UTC for an unrecognised timezone name.
export function startOfTodayInTimeZone(timeZone: string, now: Date = new Date()): Date {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(now);
  } catch {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;

  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')) - offsetMs);
}
