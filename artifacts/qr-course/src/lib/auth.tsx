import { useQuery } from "@tanstack/react-query";
import { LogIn, Search, Loader2 } from "lucide-react";

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
  return useQuery<AuthState>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/auth/user`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function isAdminUser(auth: AuthState | undefined): boolean {
  return (
    !!auth?.authenticated &&
    auth.user?.email?.toLowerCase() === ADMIN_EMAIL
  );
}

export function SignInRequired() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md border border-border rounded-xl bg-card p-8 text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Search className="w-5 h-5" />
          </div>
          <span className="font-serif font-semibold text-xl tracking-tight">
            Basic Evolutionary Psychology
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          This course requires a Google account. Sign in to continue.
        </p>
        <a
          href={`${basePath}/api/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md font-medium bg-primary text-primary-foreground hover:opacity-90"
          data-testid="link-sign-in-google-gate"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !auth?.authenticated) {
    return <SignInRequired />;
  }

  return <>{children}</>;
}
