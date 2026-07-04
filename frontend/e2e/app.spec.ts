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

  test("termék kategória létrehozása a Beállítások almenüben", async ({ page }) => {
    await page.goto("/beallitasok/termek-kategoria");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("teszt kategória");
    await page.getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "teszt kategória" })).toBeVisible();
  });

  test("fizetési mód a Beállítások alatt: seed lista látszik és bővíthető", async ({ page }) => {
    await page.goto("/beallitasok/fizetesi-mod");
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

    // Törlés két lépésben: előbb megerősítő kérdés, aztán a usage check popup
    await page.getByRole("button", { name: "Törlés" }).first().click();
    await expect(page.getByText("Biztos, hogy törölni szeretné?")).toBeVisible();
    await page.getByRole("button", { name: "Igen" }).click();
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

  test("hierarchikus menü: Utazás a Közlekedés csoportban, Motor/Kerékpár placeholder", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Közlekedés lenyitása").click();
    await page.getByRole("button", { name: "Utazás" }).click();
    await expect(page.getByRole("heading", { name: "Utazás" })).toBeVisible();
    await page.getByRole("button", { name: "Motor", exact: true }).click();
    await expect(page.getByText("Hamarosan")).toBeVisible();
    await page.getByRole("button", { name: "Kerékpár" }).click();
    await expect(page.getByText("Hamarosan")).toBeVisible();
  });

  test("lakhatás kategória: Rezsi és Egyéb almenük, az Egyéb a régi Lakhatás tartalma", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Lakhatás lenyitása").click();
    await page.getByRole("button", { name: "Egyéb" }).click();
    await expect(page.getByRole("heading", { name: "Egyéb" })).toBeVisible();
    // A régi Lakhatás oldal funkciója: hitel/albérlet felvétele
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await expect(page.getByRole("dialog").getByLabel("Típus")).toBeVisible();
  });

  test("beállítások > bolt: seed lista, szerkesztés és törlés megerősítéssel", async ({ page }) => {
    await page.goto("/beallitasok/bolt");
    await expect(page.getByRole("cell", { name: "Spar" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Auchan" })).toBeVisible();

    // Szerkesztés mentése megerősítést kér
    await page.getByRole("row", { name: /Spar/ }).getByRole("button", { name: "Szerkesztés" }).click();
    await page.getByLabel("Név").fill("Spar Market");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByText("Biztos, hogy menti a módosításokat?")).toBeVisible();
    await page.getByRole("button", { name: "Igen" }).click();
    await expect(page.getByRole("cell", { name: "Spar Market" })).toBeVisible();

    // Törlés két lépésben
    await page.getByRole("row", { name: /Tesco/ }).getByRole("button", { name: "Törlés" }).click();
    await expect(page.getByText("Biztos, hogy törölni szeretné?")).toBeVisible();
    await page.getByRole("button", { name: "Igen" }).click();
    await expect(page.getByText("Még nincs sehol használva")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Törlés" }).click();
    await expect(page.getByRole("cell", { name: "Tesco" })).toHaveCount(0);
  });

  test("rezsi kategória lista a Beállítások alatt, a Rezsi ebből választ", async ({ page }) => {
    await page.goto("/beallitasok/rezsi-kategoria");
    await expect(page.getByRole("cell", { name: "Víz" })).toBeVisible();
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Név").fill("Távhő");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "Távhő" })).toBeVisible();

    await page.goto("/rezsi");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Kategória").click();
    await page.getByRole("option", { name: "Távhő" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "Távhő" })).toBeVisible();
  });

  test("bevétel: egyéb tétel felvitele, dashboard szekció saját inkognitóval", async ({ page }) => {
    const year = new Date().getFullYear();
    await page.goto("/bevetel");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Kategória").click();
    await page.getByRole("option", { name: "Egyéb" }).click();
    await page.getByLabel("Forrás").fill("adóvisszatérítés");
    await page.getByLabel("Összeg").fill("50000");
    await page.getByLabel("Dátum").fill(`${year}-01-15`);
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "adóvisszatérítés" })).toBeVisible();

    // Dashboard Bevétel szekció: a globális inkognitó bekapcsolása elrejti,
    // kikapcsolása után viszont rejtve MARAD, míg a saját szemmel fel nem fedik
    await page.goto("/");
    const otherTile = page.getByTestId("income-tile-other");
    await expect(otherTile).toContainText("50");
    await page.getByTestId("incognito-toggle").click();
    await expect(otherTile).toHaveCSS("filter", /blur/);
    await page.getByTestId("incognito-toggle").click();
    await expect(otherTile).toHaveCSS("filter", /blur/);
    await page.getByTestId("income-eye-other").click();
    await expect(otherTile).not.toHaveCSS("filter", /blur/);
  });

  test("ártörténet Fizetés kategória a Bevételben választható", async ({ page }) => {
    await page.goto("/artortenet");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Kategória").click();
    await page.getByRole("option", { name: "Fizetés" }).click();
    await page.getByLabel("Összeg").fill("450000");
    await page.getByLabel("Életbelépés dátuma").fill("2024-01-01");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "2024.01.01" }).first()).toBeVisible();

    await page.goto("/bevetel");
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Cégnév").fill("Acme Kft.");
    await page.getByLabel("Kezdés dátuma").fill("2024-01-01");
    await page.getByLabel("Ár").click();
    await page.getByRole("option", { name: /2024\.01\.01/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "Acme Kft." })).toBeVisible();
  });

  test("havi költség: darab × db/ár kitölti az összeget, összesen sor látszik", async ({ page }) => {
    await page.goto("/havi-koltseg");
    await page.getByRole("button", { name: "Új hónap" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await page.getByRole("button", { name: "Hozzáadás" }).click();
    await page.getByLabel("Mit vettem").fill("energiaital");
    await page.getByLabel("Darab").fill("2");
    await page.getByLabel("db/ár").fill("450");
    await expect(page.getByLabel("Összeg")).toHaveValue("900");
    await page.getByRole("dialog").getByRole("button", { name: "Mentés" }).click();
    await expect(page.getByRole("cell", { name: "energiaital" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Összesen:" })).toBeVisible();
  });
});
