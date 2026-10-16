const GUEST_KEY = 'netcore-academy-guest-id';
const ACTIVE_SESSION_KEY = 'netcore-academy-active-session';
const RESULT_PREFIX = 'netcore-academy-result:';

export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function saveActiveSession(sessionId: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export function getActiveSession() {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function clearActiveSession(sessionId: string) {
  if (getActiveSession() === sessionId) localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function saveResult(sessionId: string, result: unknown) {
  localStorage.setItem(`${RESULT_PREFIX}${sessionId}`, JSON.stringify(result));
}

export function getResult(sessionId: string) {
  const value = localStorage.getItem(`${RESULT_PREFIX}${sessionId}`);
  return value ? JSON.parse(value) : null;
}
