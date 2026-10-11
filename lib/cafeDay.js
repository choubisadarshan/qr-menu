// "Today" for the cafe, not for the server. Vercel servers run in UTC, so we shift to India time.
const OFFSET_MINUTES = 330; // India Standard Time = UTC+5:30 (change for another country)

export function startOfCafeDay(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MINUTES * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MINUTES * 60000);
}