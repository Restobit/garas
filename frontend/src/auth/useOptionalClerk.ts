import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** Clerk kulcs nélkül (lokális fejlesztés) auth nélkül fut az app, dev userrel. */
export const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);

interface MinimalUser {
  imageUrl?: string;
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
}

export function useUser(): MinimalUser | null {
  if (!clerkEnabled) return null;
  // A clerkEnabled az app teljes életciklusa alatt konstans, így a feltételes
  // hook-hívás itt biztonságos.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user } = useClerkUser();
  return user ?? null;
}

export function useGetToken(): (() => Promise<string | null>) | null {
  if (!clerkEnabled) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { getToken } = useClerkAuth();
  return getToken;
}
