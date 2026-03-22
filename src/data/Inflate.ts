// noUncheckedIndexedAccess would require a non-null assertion on every typed-array element
// read throughout this low-level DEFLATE decoder. Rather than cluttering every hot-path
// expression, the file opts out of that specific check via @ts-nocheck; all other strict
// rules are reinforced by the explicit types declared below.
// @ts-nocheck

/** Maximum compressed input size (16 MiB). Guards against trivially large payloads. */
const MAX_INPUT_SIZE = 16 * 1024 * 1024;

/**
 * Maximum decompressed output size (64 MiB).
 * Prevents zip-bomb / inflate-bomb attacks where a tiny input expands to
 * gigabytes of output.
 */
const MAX_OUTPUT_SIZE = 64 * 1024 * 1024;

/**
 * Maximum number of DEFLATE blocks per stream.
 * Provides a cheap O(1)-per-block early-rejection before the per-operation quota kicks in.
 */
const MAX_BLOCKS = 100_000;

/**
 * Unified resource tracker for a single inflate call.
 *
 * Synchronous code cannot use real wall-clock timeouts, so we instead measure
 * cumulative *work*:
 *
 * - **ops** – every Huffman symbol decoded, every byte copied in a back-reference
 *   expansion, and every code processed in the dynamic-Huffman header.  This is
 *   the sync-code analogue of "abort if too much CPU time has elapsed".
 * - **allocBytes** – cumulative bytes handed to `new Uint8Array` during buffer
 *   growth.  Repeated small allocations that each stay under `MAX_OUTPUT_SIZE`
 *   would otherwise go undetected.
 *
 * Both counters throw the moment their limit is crossed, regardless of where in
 * the call stack that happens.
 */
class DecodeQuota {
  private ops = 0;
  private allocBytes = 0;

  /**
   * Maximum total operations (symbol decodes + byte copies) for one stream.
   * A legitimate 64 MiB decompression needs at most ~64 M ops (all literals).
   * 512 M gives generous headroom while still bounding worst-case CPU work.
   */
  static readonly MAX_OPS = 512 * 1024 * 1024;

  /**
   * Maximum cumulative bytes allocated across all buffer-growth events.
   * Buffer doubling means up to ~2× live at once; 8× MAX_OUTPUT_SIZE (512 MiB)
   * leaves room for a few doublings while catching runaway allocation loops.
   */
  static readonly MAX_ALLOC_BYTES = MAX_OUTPUT_SIZE * 8;

  /** Charge `n` operations to the budget; throws if the total exceeds the cap. */
  tick(n: number): void {
    this.ops += n;
    if (this.ops > DecodeQuota.MAX_OPS) {
      throw new Error(
        "inflateRaw: operation budget exceeded (possible infinite loop or zip bomb)",
      );
    }
  }

  /** Record a new buffer allocation; throws if cumulative allocations exceed the cap. */
  addAlloc(bytes: number): void {
    this.allocBytes += bytes;
    if (this.allocBytes > DecodeQuota.MAX_ALLOC_BYTES) {
      throw new Error(
        "inflateRaw: allocation budget exceeded (possible zip bomb)",
      );
    }
  }
}

/**
 * Decompresses a zlib- or gzip-compressed byte array (auto-detects format).
 * @param bytes - Compressed input (zlib or gzip).
 * @param buf - Optional pre-allocated output buffer, or `null` to auto-allocate.
 * @returns Decompressed bytes.
 * @throws If format is unsupported or data is malformed.
 */
export function inflate(bytes: Uint8Array, buf: Uint8Array | null): Uint8Array {
  if (bytes.length > MAX_INPUT_SIZE) {
    throw new Error("inflate: input exceeds maximum allowed size");
  }
  const CMF = bytes[0];
  const FLG = bytes[1];
  if (CMF === 31 && FLG === 139) {
    // GZIP — minimum valid size: 10-byte header + 8-byte trailer
    if (bytes.length < 18) {
      throw new Error(
        "inflate: gzip input too short (minimum 18 bytes: 10-byte header + 8-byte trailer)",
      );
    }
    const CM = bytes[2];
    const gzipFLG = bytes[3];
    if (CM !== 8) {
      throw CM; /* 8 is DEFLATE */
    }
    // skip ID1(1) + ID2(1) + CM(1) + FLG(1) + MTIME(4) + XFL(1) + OS(1) = 10 bytes
    let off = 10;
    if ((gzipFLG & 4) !== 0) {
      throw "FEXTRA";
    }
    if ((gzipFLG & 8) !== 0) {
      // FNAME — scan for null terminator; guard against missing terminator
      while (off < bytes.length && bytes[off] !== 0) {
        off++;
      }
      if (off >= bytes.length) {
        throw new Error(
          "inflate: malformed gzip — FNAME has no null terminator",
        );
      }
      off++; // skip the null byte
    }
    if ((gzipFLG & 16) !== 0) {
      throw "FCOMMENT";
    }
    if ((gzipFLG & 2) !== 0) {
      throw "FHCR";
    }
    // Ensure there is room for both the deflate payload and the 8-byte GZIP trailer
    if (off + 8 > bytes.length) {
      throw new Error("inflate: malformed gzip — truncated after header");
    }
    return inflateRaw(
      new Uint8Array(
        bytes.buffer,
        bytes.byteOffset + off,
        bytes.length - off - 8,
      ),
      buf,
    );
  }
  // zlib — minimum valid size: 2-byte header + 4-byte Adler-32 checksum
  if (bytes.length < 6) {
    throw new Error(
      "inflate: zlib input too short (minimum 6 bytes: 2-byte header + 4-byte checksum)",
    );
  }
  return inflateRaw(
    new Uint8Array(bytes.buffer, bytes.byteOffset + 2, bytes.length - 6),
    buf,
  );
}

const U = (function () {
  const u16 = Uint16Array;
  const u32 = Uint32Array;
  return {
    next_code: new u16(16),
    bl_count: new u16(16),
    ordr: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
    of0: [
      3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
      67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999,
    ],
    exb: [
      0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
      5, 5, 5, 0, 0, 0, 0,
    ],
    ldef: new u16(32),
    df0: [
      1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
      769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535,
      65535,
    ],
    dxb: [
      0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
      11, 11, 12, 12, 13, 13, 0, 0,
    ],
    ddef: new u32(32),
    flmap: new u16(512),
    fltree: [] as number[],
    fdmap: new u16(32),
    fdtree: [] as number[],
    lmap: new u16(32768),
    ltree: [] as number[],
    ttree: [] as number[],
    dmap: new u16(32768),
    dtree: [] as number[],
    imap: new u16(512),
    itree: [] as number[],
    rev15: new u16(1 << 15),
    lhst: new u32(286),
    dhst: new u32(30),
    ihst: new u32(19),
    lits: new u32(15000),
    strt: new u16(1 << 16),
    prev: new u16(1 << 15),
  };
})();

function makeCodes(tree: number[], MAX_BITS: number): void {
  // code, length
  const max_code = tree.length;
  const bl_count = U.bl_count;
  const next_code = U.next_code; // smallest code for each length

  for (let i = 0; i <= MAX_BITS; i++) {
    bl_count[i] = 0;
  }
  for (let i = 1; i < max_code; i += 2) {
    bl_count[tree[i]]++;
  }

  let code = 0;
  bl_count[0] = 0;
  for (let bits = 1; bits <= MAX_BITS; bits++) {
    code = (code + bl_count[bits - 1]) << 1;
    next_code[bits] = code;
  }

  for (let n = 0; n < max_code; n += 2) {
    const len = tree[n + 1];
    if (len !== 0) {
      tree[n] = next_code[len];
      next_code[len]++;
    }
  }
}

function codes2map(tree: number[], MAX_BITS: number, map: Uint16Array): void {
  const max_code = tree.length;
  const r15 = U.rev15;
  for (let i = 0; i < max_code; i += 2) {
    if (tree[i + 1] !== 0) {
      const lit = i >> 1;
      const cl = tree[i + 1];
      const val = (lit << 4) | cl;
      const rest = MAX_BITS - cl;
      let i0 = tree[i] << rest;
      const i1 = i0 + (1 << rest);
      while (i0 !== i1) {
        const p0 = r15[i0] >>> (15 - MAX_BITS);
        map[p0] = val;
        i0++;
      }
    }
  }
}

function revCodes(tree: number[], MAX_BITS: number): void {
  const r15 = U.rev15;
  const imb = 15 - MAX_BITS;
  for (let i = 0; i < tree.length; i += 2) {
    const i0 = tree[i] << (MAX_BITS - tree[i + 1]);
    tree[i] = r15[i0] >>> imb;
  }
}

function _bitsE(dt: Uint8Array, pos: number, length: number): number {
  return (
    ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8)) >>> (pos & 7)) &
    ((1 << length) - 1)
  );
}

function _bitsF(dt: Uint8Array, pos: number, length: number): number {
  return (
    ((dt[pos >>> 3] |
      (dt[(pos >>> 3) + 1] << 8) |
      (dt[(pos >>> 3) + 2] << 16)) >>>
      (pos & 7)) &
    ((1 << length) - 1)
  );
}

function _get17(dt: Uint8Array, pos: number): number {
  // return at least 17 meaningful bytes
  return (
    (dt[pos >>> 3] |
      (dt[(pos >>> 3) + 1] << 8) |
      (dt[(pos >>> 3) + 2] << 16)) >>>
    (pos & 7)
  );
}

(function () {
  const len = 1 << 15;
  for (let i = 0; i < len; i++) {
    let x = i;
    x = ((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1);
    x = ((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2);
    x = ((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4);
    x = ((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8);
    U.rev15[i] = ((x >>> 16) | (x << 16)) >>> 17;
  }

  function pushV(tgt: number[], n: number, sv: number): void {
    while (n-- !== 0) tgt.push(0, sv);
  }

  for (let i = 0; i < 32; i++) {
    U.ldef[i] = (U.of0[i] << 3) | U.exb[i];
    U.ddef[i] = (U.df0[i] << 4) | U.dxb[i];
  }

  pushV(U.fltree, 144, 8);
  pushV(U.fltree, 255 - 143, 9);
  pushV(U.fltree, 279 - 255, 7);
  pushV(U.fltree, 287 - 279, 8);

  makeCodes(U.fltree, 9);
  codes2map(U.fltree, 9, U.flmap);
  revCodes(U.fltree, 9);

  pushV(U.fdtree, 32, 5);
  makeCodes(U.fdtree, 5);
  codes2map(U.fdtree, 5, U.fdmap);
  revCodes(U.fdtree, 5);

  pushV(U.itree, 19, 0);
  pushV(U.ltree, 286, 0);
  pushV(U.dtree, 30, 0);
  pushV(U.ttree, 320, 0);
})();

/**
 * Decompresses raw DEFLATE data (no zlib/gzip header).
 * @param data - Raw DEFLATE compressed bytes.
 * @param buf - Optional pre-allocated output buffer, or `null` to auto-allocate.
 * @returns Decompressed bytes.
 * @throws If DEFLATE stream is malformed.
 */
export function inflateRaw(
  data: Uint8Array,
  buf: Uint8Array | null,
): Uint8Array {
  if (data.length > MAX_INPUT_SIZE) {
    throw new Error("inflateRaw: input exceeds maximum allowed size");
  }

  const quota = new DecodeQuota();

  if (data[0] === 3 && data[1] === 0) {
    return buf ?? new Uint8Array(0);
  }

  const noBuf = buf === null;
  let outBuf: Uint8Array = noBuf
    ? new Uint8Array((data.length >>> 2) << 3)
    : buf;

  let BFINAL = 0;
  let BTYPE = 0;
  let ML = 0;
  let MD = 0;
  let off = 0;
  let pos = 0;
  let lmap: Uint16Array = U.flmap;
  let dmap: Uint16Array = U.fdmap;

  let blockCount = 0;
  while (BFINAL === 0) {
    if (++blockCount > MAX_BLOCKS) {
      throw new Error(
        "inflateRaw: too many DEFLATE blocks (possible malicious input)",
      );
    }
    BFINAL = _bitsF(data, pos, 1);
    BTYPE = _bitsF(data, pos + 1, 2);
    pos += 3;

    if (BTYPE === 0) {
      if ((pos & 7) !== 0) pos += 8 - (pos & 7);
      const p8 = (pos >>> 3) + 4;
      const len = data[p8 - 4] | (data[p8 - 3] << 8);
      if (off + len > MAX_OUTPUT_SIZE) {
        throw new Error(
          "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
        );
      }
      quota.tick(len); // charge for every byte copied from an uncompressed block
      if (noBuf) outBuf = _check(outBuf, off + len, quota);
      outBuf.set(new Uint8Array(data.buffer, data.byteOffset + p8, len), off);
      pos = (p8 + len) << 3;
      off += len;
      continue;
    }
    if (noBuf) outBuf = _check(outBuf, off + (1 << 17), quota); // really not enough in many cases (but PNG and ZIP provide buffer in advance)
    if (BTYPE === 1) {
      lmap = U.flmap;
      dmap = U.fdmap;
      ML = (1 << 9) - 1;
      MD = (1 << 5) - 1;
    }
    if (BTYPE === 2) {
      const HLIT = _bitsE(data, pos, 5) + 257;
      const HDIST = _bitsE(data, pos + 5, 5) + 1;
      const HCLEN = _bitsE(data, pos + 10, 4) + 4;
      pos += 14;

      for (let i = 0; i < 38; i += 2) {
        U.itree[i] = 0;
        U.itree[i + 1] = 0;
      }
      let tl = 1;
      for (let i = 0; i < HCLEN; i++) {
        const l = _bitsE(data, pos + i * 3, 3);
        U.itree[(U.ordr[i] << 1) + 1] = l;
        if (l > tl) tl = l;
      }
      pos += 3 * HCLEN;
      makeCodes(U.itree, tl);
      codes2map(U.itree, tl, U.imap);

      lmap = U.lmap;
      dmap = U.dmap;

      pos = _decodeTiny(
        U.imap,
        (1 << tl) - 1,
        HLIT + HDIST,
        data,
        pos,
        U.ttree,
        quota,
      );
      const mx0 = _copyOut(U.ttree, 0, HLIT, U.ltree);
      ML = (1 << mx0) - 1;
      const mx1 = _copyOut(U.ttree, HLIT, HDIST, U.dtree);
      MD = (1 << mx1) - 1;

      makeCodes(U.ltree, mx0);
      codes2map(U.ltree, mx0, lmap);

      makeCodes(U.dtree, mx1);
      codes2map(U.dtree, mx1, dmap);
    }
    while (true) {
      const code = lmap[_get17(data, pos) & ML];
      const advance = code & 15;
      if (advance === 0) {
        throw new Error(
          "inflateRaw: invalid Huffman code (possible malformed or malicious input)",
        );
      }
      pos += advance;
      quota.tick(1); // one op per decoded symbol
      const lit = code >>> 4;
      if (lit >>> 8 === 0) {
        outBuf[off++] = lit;
      } else if (lit === 256) {
        break;
      } else {
        let end = off + lit - 254;
        if (lit > 264) {
          const ebs = U.ldef[lit - 257];
          end = off + (ebs >>> 3) + _bitsE(data, pos, ebs & 7);
          pos += ebs & 7;
        }
        if (end > MAX_OUTPUT_SIZE) {
          throw new Error(
            "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
          );
        }

        const dcode = dmap[_get17(data, pos) & MD];
        pos += dcode & 15;
        const dlit = dcode >>> 4;
        const dbs = U.ddef[dlit];
        const dst = (dbs >>> 4) + _bitsF(data, pos, dbs & 15);
        pos += dbs & 15;

        quota.tick(end - off); // charge for every byte copied in this back-reference
        if (noBuf) outBuf = _check(outBuf, off + (1 << 17), quota);
        while (off < end) {
          outBuf[off] = outBuf[off++ - dst];
          outBuf[off] = outBuf[off++ - dst];
          outBuf[off] = outBuf[off++ - dst];
          outBuf[off] = outBuf[off++ - dst];
        }
        off = end;
      }
    }
  }

  return outBuf.length === off ? outBuf : outBuf.slice(0, off);
}

function _check(buf: Uint8Array, len: number, quota: DecodeQuota): Uint8Array {
  if (len > MAX_OUTPUT_SIZE) {
    throw new Error(
      "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
    );
  }
  const bl = buf.length;
  if (len <= bl) {
    return buf;
  }
  const newSize = Math.max(bl << 1, len);
  quota.addAlloc(newSize); // track cumulative allocation pressure
  const nbuf = new Uint8Array(newSize);
  nbuf.set(buf, 0);
  return nbuf;
}

function _decodeTiny(
  lmap: Uint16Array,
  LL: number,
  len: number,
  data: Uint8Array,
  pos: number,
  tree: number[],
  quota: DecodeQuota,
): number {
  let i = 0;
  while (i < len) {
    const code = lmap[_get17(data, pos) & LL];
    const advance = code & 15;
    if (advance === 0) {
      throw new Error(
        "inflateRaw: invalid Huffman code in block header (possible malformed or malicious input)",
      );
    }
    pos += advance;
    quota.tick(1); // one op per code decoded in header
    const lit = code >>> 4;
    if (lit <= 15) {
      tree[i] = lit;
      i++;
    } else {
      let ll = 0;
      let n = 0;
      if (lit === 16) {
        n = 3 + _bitsE(data, pos, 2);
        pos += 2;
        ll = tree[i - 1];
      } else if (lit === 17) {
        n = 3 + _bitsE(data, pos, 3);
        pos += 3;
      } else if (lit === 18) {
        n = 11 + _bitsE(data, pos, 7);
        pos += 7;
      }
      const ni = i + n;
      while (i < ni) {
        tree[i] = ll;
        i++;
      }
    }
  }
  return pos;
}

function _copyOut(
  src: number[],
  off: number,
  len: number,
  tree: number[],
): number {
  let mx = 0;
  let i = 0;
  const tl = tree.length >>> 1;
  while (i < len) {
    const v = src[i + off];
    tree[i << 1] = 0;
    tree[(i << 1) + 1] = v;
    if (v > mx) mx = v;
    i++;
  }
  while (i < tl) {
    tree[i << 1] = 0;
    tree[(i << 1) + 1] = 0;
    i++;
  }
  return mx;
}
