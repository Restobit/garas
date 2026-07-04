import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useFreshUser } from "./helpers";

const here = path.dirname(fileURLToPath(import.meta.url));
const receiptImage = path.join(here, "fixtures", "blokk.png");

test.describe("Garas HKR fő folyamatok", () => {
  test.beforeEach(async ({ page }) => {
    await useFreshUser(page);
  });

  test("dashboard betöltődik", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Havi bevétel és kiadás")).toBeVisible();
  });

  test("kategória létrehozása a Beállításokban", async ({ page }) => {
    await page.goto("/beallitasok");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("teszt kategória");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "teszt kategória" })).toBeVisible();
  });

  test("fizetési mód seed lista látszik és bővíthető", async ({ page }) => {
    await page.goto("/fizetesi-mod");
    await expect(page.getByRole("cell", { name: "Gránit" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Revolut" })).toBeVisible();
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("OTP");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "OTP" })).toBeVisible();
  });

  test("havi költség: hónap létrehozása és tétel felvitele", async ({ page }) => {
    await page.goto("/havi-koltseg");
    await page.getByRole("button", { name: "Új hónap" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Mit vettem").fill("kenyér");
    await page.getByLabel("Összeg").fill("890");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "kenyér" })).toBeVisible();
  });

  test("ártörténet rögzítés és törlés usage-popuppal", async ({ page }) => {
    await page.goto("/artortenet");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Kategória").click();
    await page.getByRole("option", { name: "Rezsi" }).click();
    await page.getByLabel("Összeg").fill("11000");
    await page.getByLabel("Életbelépés dátuma").fill("2024-02-01");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "2024.02.01" }).first()).toBeVisible();

    // Törlés: sehol nincs használva → ezt jelzi a popup
    await page.getByRole("button", { name: "Törlés" }).first().click();
    await expect(page.getByText("Még nincs sehol használva")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Törlés" }).click();
    await expect(page.getByText("Még nincs sehol használva")).toBeHidden();
  });

  test("alap költség automatikus feltöltése előfizetésből", async ({ page }) => {
    // Előfizetés felvétele
    await page.goto("/elofizetes");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("youtube premium");
    await page.getByLabel("Ár").fill("2300");
    await page.getByLabel("Előfizetés kezdete").fill("2024-06-17");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "youtube premium" })).toBeVisible();

    // Alap költség létrehozása — automatikusan feltöltődik
    await page.goto("/alap-koltseg");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Felhasználás dátuma").fill("2026-06-01");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "youtube premium" })).toBeVisible();
  });

  test("blokk feltöltés és gyors rögzítés desktopon", async ({ page }) => {
    await page.goto("/blokk");
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: "Blokk feltöltése" }).click(),
    ]);
    await chooser.setFiles(receiptImage);
    await expect(page.getByRole("button", { name: "Gyors rögzítés" })).toBeVisible();

    // Gyors rögzítés: bolt egyszer, tételek localStorage-ba, majd Mentés
    await page.getByRole("button", { name: "Gyors rögzítés" }).click();
    await page.getByLabel("Hol vettem").fill("Aldi");
    await page.getByLabel("Név").fill("energiaital");
    await page.getByLabel("Összeg").fill("450");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("chips");
    await page.getByLabel("Összeg").fill("799");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await expect(page.getByRole("cell", { name: "energiaital" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "chips" })).toBeVisible();
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page).toHaveURL(/\/blokk$/);
  });

  test("inkognitó mód elrejti az összegeket", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("incognito-toggle").click();
    const money = page.getByTestId("money").first();
    await expect(money).toHaveCSS("filter", /blur/);
  });
});
