export const LAB_EVENT = "blkspace-lab";
export const WALLET_KEY = "blkspace_wallet_enabled";
export const CRED_KEY = "blkspace_yard_cred";
export const CRED_GATE = 15;

export function labUnlocked(): boolean {
  try {
    const wallet = localStorage.getItem(WALLET_KEY) === "1";
    const cred = Number(localStorage.getItem(CRED_KEY) || "0");
    return wallet || cred >= CRED_GATE;
  } catch {
    return false;
  }
}

export function markWalletEnabled(): void {
  localStorage.setItem(WALLET_KEY, "1");
  window.dispatchEvent(new Event(LAB_EVENT));
}
