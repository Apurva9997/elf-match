"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import { api, type User } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  // Keep the API client's token getter in sync with Clerk
  useEffect(() => {
    if (isSignedIn) {
      api.setTokenGetter(() => getToken());
    } else {
      api.setTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  // Fetch our local user record whenever Clerk signs in
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn || !clerkUser) {
      setUser(null);
      return;
    }

    setIsFetchingUser(true);
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        // Fall back to Clerk user data so the app stays functional even
        // when the backend /auth/me endpoint is temporarily unavailable.
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          name: clerkUser.fullName,
          avatarUrl: clerkUser.imageUrl ?? null,
        });
      })
      .finally(() => setIsFetchingUser(false));
  }, [clerkLoaded, isSignedIn, clerkUser]);

  const logout = async () => {
    setUser(null);
    api.setTokenGetter(null);
    await signOut();
  };

  const isLoading = !clerkLoaded || (!!isSignedIn && isFetchingUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!isSignedIn,
        login: () => {},
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
