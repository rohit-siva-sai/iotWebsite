import { useSessionStore } from "@/lib/sessionStore";

export function saveSession(session) {
  useSessionStore.getState().setSession(session);
}

export function loadSession() {
  return useSessionStore.getState().session;
}

export function clearSession() {
  useSessionStore.getState().clearSession();
}
