import type { Page } from "@playwright/test";

/** Minden teszt saját userrel fut, hogy ne zavarják egymás adatait. */
export async function useFreshUser(page: Page): Promise<string> {
  const userId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.addInitScript((id: string) => {
    localStorage.setItem("garas.devUser", id);
  }, userId);
  return userId;
}
