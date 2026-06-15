// Test setup for Vitest
import { vi } from "vitest";

// Create a proper localStorage mock that persists across calls
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
})();

// Replace the global localStorage with our mock
const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

if (descriptor && descriptor.configurable) {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
} else {
  // Fallback: replace the getter
  Object.defineProperty(window, "localStorage", {
    get: () => localStorageMock,
    configurable: true,
  });
}

// @ts-ignore
globalThis.localStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});