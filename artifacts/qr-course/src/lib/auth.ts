import { useQuery } from "@tanstack/react-query";

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
