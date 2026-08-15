import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogIn, Search, X } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const ADMIN_EMAIL = "johnmichaelkuczynski@gmail.com";

export type AuthState = {
  authenticated: boolean;
  user: {
    id: number;
    username: string;
    email: string | null;
    displayName: string | null;
  } | null;
};

export function useAuth() {
  const query = useQuery<AuthState>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/auth/user`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const isAdmin =
    !!query.data?.authenticated &&
    query.data.user?.email?.toLowerCase() === ADMIN_EMAIL;

  return { ...query, auth: query.data, isAdmin };
}

const LOGIN_REQUIRED_EVENT = "bep:login-required";

// Global fetch interceptor: when any API call comes back 401 with
// code "login_required" (the free AI preview is used up), surface the
// sign-in prompt — no matter which page or hook made the call.
let fetchPatched = false;
function patchFetchOnce() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await orig(...args);
    if (res.status === 401) {
      try {
        const data = await res.clone().json();
        if (data && data.code === "login_required") {
          window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT));
        }
      } catch {
        // non-JSON 401 — ignore
      }
    }
    return res;
  };
}

function LoginPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
      <div className="relative w-full max-w-md rounded-xl bg-background border border-border p-8 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-secondary"
          aria-label="Close"
          data-testid="button-close-login-prompt"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-5">
          <Search className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-semibold text-2xl tracking-tight mb-2">
          Enjoying the course?
        </h2>
        <p className="text-muted-foreground mb-6" data-testid="text-login-prompt">
          You've used the free preview of the AI tutor, practice, and grading.
          Sign in with Google to keep going — it's free and takes seconds.
        </p>
        <a
          href={`${basePath}/api/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          data-testid="link-login-prompt-google"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </a>
        <p className="text-xs text-muted-foreground mt-5">
          You can keep reading the lectures without signing in.
        </p>
      </div>
    </div>
  );
}

/**
 * The app is open to everyone — no wall. This gate only listens for the
 * "free preview used up" signal from the server and overlays a Google
 * sign-in prompt when it fires.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [promptOpen, setPromptOpen] = useState(false);
  const { auth } = useAuth();

  useEffect(() => {
    patchFetchOnce();
    const onLoginRequired = () => setPromptOpen(true);
    window.addEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
    return () =>
      window.removeEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
  }, []);

  useEffect(() => {
    if (auth?.authenticated) setPromptOpen(false);
  }, [auth?.authenticated]);

  return (
    <>
      {children}
      {promptOpen && !auth?.authenticated && (
        <LoginPrompt onClose={() => setPromptOpen(false)} />
      )}
    </>
  );
}
