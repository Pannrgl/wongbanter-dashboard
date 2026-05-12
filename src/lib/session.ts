export type Session = {
  email: string;
  fullName?: string;
  createdAt: number;
};

const KEY = "wbc.session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const s = parsed as Partial<Session>;
    if (!s.email || typeof s.email !== "string") return null;
    const createdAt = typeof s.createdAt === "number" ? s.createdAt : Date.now();
    return { email: s.email, fullName: typeof s.fullName === "string" ? s.fullName : undefined, createdAt };
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return getSession() !== null;
}

export function setSession(next: { email: string; fullName?: string }) {
  const s: Session = { email: next.email, fullName: next.fullName, createdAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
