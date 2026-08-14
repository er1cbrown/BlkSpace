/**
 * Classic-script Buffer for Yard/SPA before any module runs.
 * bip39 join uses Buffer.from / isBuffer; Vite does not polyfill Node builtins.
 */
(function (g) {
  if (g.Buffer) return;

  function asBytes(data, enc) {
    if (typeof data === "string") {
      if (enc === "hex") {
        var hex = data.replace(/^0x/i, "");
        var hexOut = new Uint8Array(hex.length / 2);
        for (var i = 0; i < hexOut.length; i++) {
          hexOut[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return hexOut;
      }
      if (enc === "base64") {
        var bin = atob(data);
        var b64 = new Uint8Array(bin.length);
        for (var j = 0; j < bin.length; j++) b64[j] = bin.charCodeAt(j);
        return b64;
      }
      return new TextEncoder().encode(data);
    }
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return new Uint8Array(data || 0);
  }

  function Buf(data, enc) {
    var bytes = asBytes(data, enc);
    var view = new Uint8Array(bytes);
    Object.setPrototypeOf(view, Buf.prototype);
    return view;
  }
  Buf.prototype = Object.create(Uint8Array.prototype);
  Buf.prototype.constructor = Buf;
  Buf.from = function (data, enc) {
    return Buf(data, enc);
  };
  Buf.alloc = function (n) {
    return Buf(new Uint8Array(n));
  };
  Buf.allocUnsafe = Buf.alloc;
  Buf.concat = function (list) {
    var total = 0;
    for (var i = 0; i < list.length; i++) total += list[i].length;
    var out = new Uint8Array(total);
    var o = 0;
    for (var k = 0; k < list.length; k++) {
      out.set(list[k], o);
      o += list[k].length;
    }
    return Buf(out);
  };
  Buf.isBuffer = function (x) {
    return x instanceof Buf || (x && x._isBuffer === true);
  };
  Buf.prototype._isBuffer = true;
  Buf.prototype.toString = function (enc) {
    if (enc === "hex") {
      var hex = "";
      for (var i = 0; i < this.length; i++) {
        hex += this[i].toString(16).padStart(2, "0");
      }
      return hex;
    }
    if (enc === "base64") {
      var s = "";
      for (var j = 0; j < this.length; j++) s += String.fromCharCode(this[j]);
      return btoa(s);
    }
    return new TextDecoder().decode(this);
  };

  g.Buffer = Buf;
  if (!g.global) g.global = g;
})(typeof globalThis !== "undefined" ? globalThis : window);
