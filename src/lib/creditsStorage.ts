const LS_KEY = "creagic_credits_v1";

/** 新用户初始积分 */
export const INITIAL_USER_CREDITS = 100;

export function readCredits(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === null) {
      localStorage.setItem(LS_KEY, String(INITIAL_USER_CREDITS));
      return INITIAL_USER_CREDITS;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      localStorage.setItem(LS_KEY, String(INITIAL_USER_CREDITS));
      return INITIAL_USER_CREDITS;
    }
    return Math.floor(n);
  } catch {
    return INITIAL_USER_CREDITS;
  }
}

export function writeCredits(n: number): void {
  try {
    localStorage.setItem(LS_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    /* ignore */
  }
}
