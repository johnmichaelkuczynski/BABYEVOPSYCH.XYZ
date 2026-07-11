import React from "react";
import { useQuery } from "@tanstack/react-query";
import { LogIn, Search } from "lucide-react";

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

function SignInWall({ error }: { error?: boolean }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-6">
          <Search className="w-7 h-7" />
        </div>
        <h1 className="font-serif font-semibold text-3xl tracking-tight mb-3">
          Basic Evolutionary Psychology
        </h1>
        <p className="text-muted-foreground mb-8">
          This course requires a Google account. Sign in to continue.
        </p>
        {error && (
          <p className="text-sm text-destructive mb-4" data-testid="text-auth-error">
            Could not verify your session. Please sign in.
          </p>
        )}
        <a
          href={`${basePath}/api/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          data-testid="link-signin-wall-google"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </a>
        <p className="text-xs text-muted-foreground mt-6">
          You will be redirected to Google to choose an account.
        </p>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { auth, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking sign-in…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return <SignInWall error />;
  }

  if (!auth?.authenticated) {
    return <SignInWall />;
  }

  return <>{children}</>;
}
