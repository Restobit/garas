import { expect, test } from "@playwright/test";
import { useFreshUser } from "./helpers";

test.describe("Mobil nézet", () => {
  test.beforeEach(async ({ page }) => {
    await useFreshUser(page);
  });

  test("hamburger menü és blokk oldal elérhető, gyors rögzítés nem", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Menü").click();
    await page.getByRole("button", { name: "Blokk" }).click();
    await expect(page.getByRole("button", { name: "Blokk feltöltése" })).toBeVisible();
    // Mobilon a fotó készítés gomb is látszik
    await expect(page.getByRole("button", { name: "Fotó készítése" })).toBeVisible();
    // A gyors rögzítés gomb desktop-only
    await expect(page.getByRole("button", { name: "Gyors rögzítés" })).toHaveCount(0);
  });
});
