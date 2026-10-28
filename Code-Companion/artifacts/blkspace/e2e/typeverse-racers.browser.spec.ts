import { test, expect } from "@playwright/test";

test("typeverse racers shows a vehicle, a CPU pace, and a WeixBucks purse", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("blkspace_first_run_complete", "true");
  });
  await page.goto("/typeverse");
  await page.getByRole("button", { name: "racers" }).click();
  await expect(page.getByText("Your racer")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Campus · 40 wpm · 8 WB" }),
  ).toBeVisible();
  await page.getByLabel("Racer name").fill("Nova");
  await page.getByRole("button", { name: "Lowrider" }).click();
  await page.getByRole("button", { name: "Start race" }).click();
  await expect(page.getByLabel("Type the verse to race")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/WeixBucks/).first()).toBeVisible();
  await expect(page.getByText("Nova · Lowrider #09").first()).toBeVisible();
});
