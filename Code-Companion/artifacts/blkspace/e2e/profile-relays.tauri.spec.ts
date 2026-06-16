import { test, expect } from "./fixtures";
import { navigateTo } from "./tauri-helpers";

test.describe.configure({ mode: "serial" });

async function seedProfileRelayFixture(tauriPage: {
  evaluate: (script: string) => Promise<unknown>;
}) {
  await tauriPage.evaluate(`
    (async function() {
      const { invoke } = window.__TAURI__.core;
      const fixture = await invoke("e2e_prepare_profile_relay_fixture");
      localStorage.setItem("blkspace_session", fixture.sessionToken);
      localStorage.setItem("blkspace_pubkey", fixture.viewerPubkey);
      localStorage.setItem("blkspace_handle", "demo_user");
      localStorage.setItem("blkspace_first_run_complete", "true");
    })()
  `);
}

test.describe("profile NIP-65 relays", () => {
  test("shows another user's relay list and refreshes from network", async ({
    tauriPage,
  }) => {
    await seedProfileRelayFixture(tauriPage);

    // 1. Open /profile/:handle for a user with a linked pubkey
    await navigateTo(tauriPage, "/profile/jane_doe");

    // 2. Confirm the NIP-65 card appears below stats
    await expect(tauriPage.getByText("Jane Doe's relays")).toBeVisible({
      timeout: 15_000,
    });
    await expect(tauriPage.getByText("(NIP-65)")).toBeVisible();
    await expect(tauriPage.getByText("wss://relay.damus.io")).toBeVisible({
      timeout: 15_000,
    });
    await expect(tauriPage.getByText("wss://nos.lol")).toBeVisible();

    // 3. Refresh from network — should still show relays (live fetch or DB fallback)
    const refresh = tauriPage.getByText("Refresh from network");
    await refresh.click();
    await expect(refresh).toHaveText("Refresh from network", { timeout: 20_000 });
    await expect(tauriPage.getByText("wss://relay.damus.io")).toBeVisible({
      timeout: 20_000,
    });
  });
});