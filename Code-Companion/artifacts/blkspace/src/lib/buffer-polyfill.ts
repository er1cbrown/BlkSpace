/**
 * bip39 (recovery phrase) expects Node's Buffer. Vite / Tauri WebView /
 * emergency bun builds do not provide it. Prefer the classic script
 * `public/buffer-polyfill.js` (loads first); this module is the fallback
 * when auth is imported without that script (tests, late chunks).
 */

type BufCtor = {
  from(data: ArrayBuffer | ArrayLike<number> | string, enc?: string): Uint8Array & {
    toString(enc?: string): string;
  };
  isBuffer(x: unknown): boolean;
  alloc(n: number): Uint8Array;
};

type BufferHost = typeof globalThis & {
  Buffer?: BufCtor;
  global?: typeof globalThis;
};

function installFallback(g: BufferHost): BufCtor {
  const asBytes = (data: ArrayBuffer | ArrayLike<number> | string, enc?: string) => {
    if (typeof data === "string") {
      if (enc === "hex") {
        const hex = data.replace(/^0x/i, "");
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) {
          out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
      }
      if (enc === "base64") {
        const bin = atob(data);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      return new TextEncoder().encode(data);
    }
    return new Uint8Array(data as ArrayBuffer);
  };

  function Buf(data: ArrayBuffer | ArrayLike<number> | string, enc?: string) {
    const view = new Uint8Array(asBytes(data, enc));
    Object.setPrototypeOf(view, Buf.prototype);
    return view as Uint8Array & { toString(enc?: string): string };
  }
  Buf.prototype = Object.create(Uint8Array.prototype);
  Buf.from = (data: ArrayBuffer | ArrayLike<number> | string, enc?: string) =>
    Buf(data, enc);
  Buf.alloc = (n: number) => Buf(new Uint8Array(n));
  Buf.isBuffer = (x: unknown) => x instanceof Buf;
  Buf.prototype.toString = function (this: Uint8Array, enc?: string) {
    if (enc === "hex") {
      return Array.from(this)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    if (enc === "base64") {
      let s = "";
      this.forEach((b) => {
        s += String.fromCharCode(b);
      });
      return btoa(s);
    }
    return new TextDecoder().decode(this);
  };
  g.Buffer = Buf as unknown as BufCtor;
  return g.Buffer;
}

export function installBufferPolyfill(): BufCtor {
  const g = globalThis as BufferHost;
  if (typeof g.Buffer === "undefined") {
    installFallback(g);
  }
  if (typeof g.global === "undefined") {
    g.global = g;
  }
  return g.Buffer as BufCtor;
}

installBufferPolyfill();
