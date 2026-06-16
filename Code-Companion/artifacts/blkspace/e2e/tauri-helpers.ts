import type { TauriPage } from "@srsholmes/tauri-playwright";

/** Client-side route change without a full Vite reload (works better with wouter). */
export async function navigateTo(tauriPage: TauriPage, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  await tauriPage.evaluate(`
    (function() {
      window.history.pushState({}, '', ${JSON.stringify(normalized)});
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    })()
  `);
}