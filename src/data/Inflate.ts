/** Maximum compressed input size (16 MiB). Guards against trivially large payloads. */
const MAX_INPUT_SIZE = 16 * 1024 * 1024;

/** Maximum decompressed output size (64 MiB). Prevents zip-bomb attacks. */
const MAX_OUTPUT_SIZE = 64 * 1024 * 1024;

/** Maximum number of DEFLATE blocks per stream. */
const MAX_BLOCKS = 100_000;

/**
 * Tracks cumulative work for one inflate call. Throws if either budget is exceeded,
 * bounding worst-case CPU use (ops) and memory use (allocBytes).
 */
class DecodeQuota {
  private ops = 0;
  private allocBytes = 0;

  /** 512 M is ~8× a 64 MiB all-literal stream — generous headroom while bounding CPU. */
  static readonly MAX_OPS = 512 * 1024 * 1024;

  /** 8× the output cap accommodates several buffer doublings before rejecting. */
  static readonly MAX_ALLOC_BYTES = MAX_OUTPUT_SIZE * 8;

  tick(n: number): void {
    this.ops += n;
    if (this.ops > DecodeQuota.MAX_OPS)
      throw new Error(
        "inflateRaw: operation budget exceeded (possible zip bomb)",
      );
  }

  addAlloc(bytes: number): void {
    this.allocBytes += bytes;
    if (this.allocBytes > DecodeQuota.MAX_ALLOC_BYTES)
      throw new Error(
        "inflateRaw: allocation budget exceeded (possible zip bomb)",
      );
  }
}

// ---- Static lookup tables (initialized once at module load) ----
//
// Array reads use:
//   !   when the index is provably in-range by algorithm invariant
//   ??0 when reading past the stream end is a real possibility (zero = correct DEFLATE padding)

/** REV15[i] = bit_reverse(i) for a 15-bit value. */
const REV15 = new Uint16Array(1 << 15);

/** LDEF[i] = (baseLength << 3) | extraBitCount  for length code 257+i. */
const LDEF = new Uint16Array(32);

/** DDEF[i] = (baseDistance << 4) | extraBitCount  for distance code i. */
const DDEF = new Uint32Array(32);

/** Fixed Huffman literal/length map: 9-bit reversed codes → 512 entries. */
const FLMAP = new Uint16Array(512);

/** Fixed Huffman distance map: 5-bit reversed codes → 32 entries. */
const FDMAP = new Uint16Array(32);

/** Dynamic Huffman maps (rebuilt each type-2 block). */
const LMAP = new Uint16Array(32768);
const DMAP = new Uint16Array(32768);
const IMAP = new Uint16Array(512);

/**
 * Huffman tree scratch buffers, reused across calls.
 * Layout: tree[2*i] = canonical code for symbol i; tree[2*i+1] = bit-length for symbol i.
 */
const LTREE = new Uint16Array(572); // literal/length: 286 symbols × 2
const DTREE = new Uint16Array(64); //  distance: up to 32 symbols × 2
const ITREE = new Uint16Array(38); //  code-length alphabet: 19 symbols × 2

/**
 * Flat bit-length buffer for dynamic block header decoding.
 * decodeLengths() writes HLIT+HDIST raw lengths here (max 286+32 = 318).
 */
const LBUF = new Uint16Array(320);

/** Code-length alphabet symbol re-ordering (RFC 1951 §3.2.7). */
const CLO = new Uint8Array([
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
]);

(function buildTables(): void {
  // 15-bit bit-reversal LUT
  for (let i = 0; i < 1 << 15; i++) {
    let x = i;
    x = ((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1);
    x = ((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2);
    x = ((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4);
    x = ((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8);
    REV15[i] = ((x >>> 16) | (x << 16)) >>> 17;
  }

  // RFC 1951 length/distance base values and extra-bit counts
  const LB = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
    83, 99, 115, 131, 163, 195, 227, 258, 0, 0, 0,
  ];
  const LX = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5,
    5, 5, 5, 0, 0, 0, 0,
  ];
  const DB = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
    769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0,
  ];
  const DX = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
    11, 11, 12, 12, 13, 13, 0, 0,
  ];
  for (let i = 0; i < 32; i++) {
    LDEF[i] = ((LB[i] ?? 0) << 3) | (LX[i] ?? 0);
    DDEF[i] = ((DB[i] ?? 0) << 4) | (DX[i] ?? 0);
  }

  // Fixed literal/length tree: 288 symbols (RFC 1951 §3.2.6)
  const fltree = new Uint16Array(576);
  for (let i = 0; i < 288; i++)
    fltree[i * 2 + 1] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8;
  makeCodes(fltree, 9);
  codes2map(fltree, 9, FLMAP);

  // Fixed distance tree: 32 symbols, all 5-bit codes
  const fdtree = new Uint16Array(64);
  for (let i = 0; i < 32; i++) fdtree[i * 2 + 1] = 5;
  makeCodes(fdtree, 5);
  codes2map(fdtree, 5, FDMAP);
})();

// ---- Huffman table construction ----

/**
 * Assigns canonical Huffman codes to all symbols in the tree.
 * Input:  tree[2*i+1] = bit-length for symbol i (0 = unused symbol).
 * Output: tree[2*i]   = canonical code for symbol i.
 */
function makeCodes(tree: Uint16Array, maxBits: number): void {
  const blCount = new Uint16Array(maxBits + 1);
  for (let i = 1; i < tree.length; i += 2) {
    const len = tree[i]!; // within tree.length by loop bound
    blCount[len] = (blCount[len] ?? 0) + 1;
  }

  blCount[0] = 0; // zero-length symbols are unused; exclude from code assignment

  let code = 0;
  const nextCode = new Uint16Array(maxBits + 1);
  for (let bits = 1; bits <= maxBits; bits++) {
    code = (code + (blCount[bits - 1] ?? 0)) << 1;
    nextCode[bits] = code;
  }

  for (let n = 0; n < tree.length; n += 2) {
    const len = tree[n + 1]!; // within tree.length by loop bound
    if (len !== 0) {
      const nc = nextCode[len] ?? 0;
      tree[n] = nc;
      nextCode[len] = nc + 1;
    }
  }
}

/**
 * Populates a lookup map from a Huffman tree.
 * map[reversedCode] = (symbol << 4) | bitLength for every non-zero-length symbol.
 */
function codes2map(tree: Uint16Array, maxBits: number, map: Uint16Array): void {
  for (let i = 0; i < tree.length; i += 2) {
    const len = tree[i + 1]!; // within tree.length by loop bound
    if (len === 0) continue;
    const sym = i >>> 1;
    const val = (sym << 4) | len;
    const rest = maxBits - len;
    let lo = tree[i]! << rest; // within tree.length by loop bound
    const hi = lo + (1 << rest);
    // lo < (1 << maxBits) <= (1 << 15) = REV15.length; map.length = 1 << maxBits
    while (lo !== hi) {
      map[REV15[lo]! >>> (15 - maxBits)] = val;
      lo++;
    }
  }
}

// ---- Bit-stream helpers ----

/**
 * Reads n bits from the byte stream at bit offset `pos`.
 * Reading past the end of `data` returns 0 — safe DEFLATE zero-padding.
 */
function readBits(data: Uint8Array, pos: number, n: number): number {
  const b = pos >>> 3;
  const w =
    (data[b] ?? 0) | ((data[b + 1] ?? 0) << 8) | ((data[b + 2] ?? 0) << 16);
  return (w >>> (pos & 7)) & ((1 << n) - 1);
}

/**
 * Reads up to 17 unmasked bits at bit offset `pos` for Huffman map lookup.
 * The caller applies the map mask (ML or MD) to isolate the correct number of bits.
 */
function peekBits(data: Uint8Array, pos: number): number {
  const b = pos >>> 3;
  return (
    ((data[b] ?? 0) |
      ((data[b + 1] ?? 0) << 8) |
      ((data[b + 2] ?? 0) << 16)) >>>
    (pos & 7)
  );
}

// ---- Public API ----

/**
 * Decompresses a zlib- or gzip-compressed byte array.
 * @param bytes - The compressed input (zlib or gzip format).
 * @param buf - An optional pre-allocated output buffer, or `null` to allocate automatically.
 * @returns The decompressed bytes.
 * @throws If the compression format is unsupported or the data is malformed.
 */
export function inflate(bytes: Uint8Array, buf: Uint8Array | null): Uint8Array {
  if (bytes.length > MAX_INPUT_SIZE)
    throw new Error("inflate: input exceeds maximum allowed size");

  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;

  if (b0 === 31 && b1 === 139) {
    // GZIP (RFC 1952) — minimum: 10-byte header + 8-byte trailer
    if (bytes.length < 18)
      throw new Error(
        "inflate: gzip input too short (minimum 18 bytes: 10-byte header + 8-byte trailer)",
      );
    if ((bytes[2] ?? 0) !== 8) throw bytes[2] ?? 0; // CM must be 8 = DEFLATE
    const flg = bytes[3] ?? 0;
    let off = 10; // skip ID1 + ID2 + CM + FLG + MTIME(4) + XFL + OS
    if ((flg & 4) !== 0) throw "FEXTRA";
    if ((flg & 8) !== 0) {
      while (off < bytes.length && (bytes[off] ?? 0) !== 0) off++;
      if (off >= bytes.length)
        throw new Error(
          "inflate: malformed gzip — FNAME has no null terminator",
        );
      off++;
    }
    if ((flg & 16) !== 0) throw "FCOMMENT";
    if ((flg & 2) !== 0) throw "FHCR";
    if (off + 8 > bytes.length)
      throw new Error("inflate: malformed gzip — truncated after header");
    return inflateRaw(
      new Uint8Array(
        bytes.buffer,
        bytes.byteOffset + off,
        bytes.length - off - 8,
      ),
      buf,
    );
  }

  // zlib (RFC 1950) — minimum: 2-byte header + deflate data + 4-byte Adler-32
  if (bytes.length < 6)
    throw new Error(
      "inflate: zlib input too short (minimum 6 bytes: 2-byte header + 4-byte checksum)",
    );
  return inflateRaw(
    new Uint8Array(bytes.buffer, bytes.byteOffset + 2, bytes.length - 6),
    buf,
  );
}

/**
 * Decompresses a raw DEFLATE byte array (no zlib/gzip wrapper).
 * @param data - The raw DEFLATE compressed data.
 * @param buf - An optional pre-allocated output buffer, or `null` to allocate automatically.
 * @returns The decompressed bytes.
 * @throws If the DEFLATE stream is malformed.
 */
export function inflateRaw(
  data: Uint8Array,
  buf: Uint8Array | null,
): Uint8Array {
  if (data.length > MAX_INPUT_SIZE)
    throw new Error("inflateRaw: input exceeds maximum allowed size");

  if ((data[0] ?? 0) === 3 && (data[1] ?? 0) === 0)
    return buf ?? new Uint8Array(0);

  const quota = new DecodeQuota();
  const noBuf = buf === null;
  let out = noBuf ? new Uint8Array((data.length >>> 2) << 3) : buf;

  let pos = 0; // bit offset in data
  let off = 0; // byte offset in out
  let lmap: Uint16Array = FLMAP;
  let dmap: Uint16Array = FDMAP;
  let ML = (1 << 9) - 1;
  let MD = (1 << 5) - 1;
  let bFinal = 0;
  let blockCount = 0;

  while (bFinal === 0) {
    if (++blockCount > MAX_BLOCKS)
      throw new Error(
        "inflateRaw: too many DEFLATE blocks (possible malicious input)",
      );

    bFinal = readBits(data, pos, 1);
    const bType = readBits(data, pos + 1, 2);
    pos += 3;

    if (bType === 0) {
      // Uncompressed block
      if ((pos & 7) !== 0) pos += 8 - (pos & 7); // align to byte boundary
      const p8 = (pos >>> 3) + 4;
      const len = (data[p8 - 4] ?? 0) | ((data[p8 - 3] ?? 0) << 8);
      if (off + len > MAX_OUTPUT_SIZE)
        throw new Error(
          "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
        );
      quota.tick(len);
      if (noBuf) out = growBuf(out, off + len, quota);
      out.set(new Uint8Array(data.buffer, data.byteOffset + p8, len), off);
      pos = (p8 + len) << 3;
      off += len;
      continue;
    }

    if (noBuf) out = growBuf(out, off + (1 << 17), quota);

    if (bType === 1) {
      // Fixed Huffman block
      lmap = FLMAP;
      dmap = FDMAP;
      ML = (1 << 9) - 1;
      MD = (1 << 5) - 1;
    }

    if (bType === 2) {
      // Dynamic Huffman block — decode code-length alphabet, then lit/len + dist trees
      const HLIT = readBits(data, pos, 5) + 257;
      const HDIST = readBits(data, pos + 5, 5) + 1;
      const HCLEN = readBits(data, pos + 10, 4) + 4;
      pos += 14;

      ITREE.fill(0);
      let tl = 1;
      for (let i = 0; i < HCLEN; i++) {
        const l = readBits(data, pos + i * 3, 3);
        ITREE[(CLO[i]! << 1) + 1] = l; // i < HCLEN <= 19 = CLO.length
        if (l > tl) tl = l;
      }
      pos += 3 * HCLEN;
      makeCodes(ITREE, tl);
      codes2map(ITREE, tl, IMAP);

      lmap = LMAP;
      dmap = DMAP;

      pos = decodeLengths(IMAP, (1 << tl) - 1, HLIT + HDIST, data, pos, quota);

      const mx0 = copyIntoTree(0, HLIT, LTREE);
      ML = (1 << mx0) - 1;
      makeCodes(LTREE, mx0);
      codes2map(LTREE, mx0, LMAP);

      const mx1 = copyIntoTree(HLIT, HDIST, DTREE);
      MD = (1 << mx1) - 1;
      makeCodes(DTREE, mx1);
      codes2map(DTREE, mx1, DMAP);
    }

    // Decode symbols until end-of-block (symbol 256)
    while (true) {
      // ML = (1 << maxBits) - 1; lmap.length = 1 << maxBits → index always in range
      const code = lmap[peekBits(data, pos) & ML]!;
      const advance = code & 15;
      if (advance === 0)
        throw new Error(
          "inflateRaw: invalid Huffman code (possible malformed or malicious input)",
        );
      pos += advance;
      quota.tick(1);
      const sym = code >>> 4;

      if (sym < 256) {
        // Literal byte
        out[off++] = sym;
      } else if (sym === 256) {
        // End of block
        break;
      } else {
        // Back-reference: decode length then distance
        let end = off + sym - 254;
        if (sym > 264) {
          // sym in [265, 285] → index [8, 28]; LDEF has 32 entries
          const ebs = LDEF[sym - 257]!;
          end = off + (ebs >>> 3) + readBits(data, pos, ebs & 7);
          pos += ebs & 7;
        }
        if (end > MAX_OUTPUT_SIZE)
          throw new Error(
            "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
          );

        // MD = (1 << maxBits) - 1; dmap.length = 1 << maxBits → index always in range
        const dcode = dmap[peekBits(data, pos) & MD]!;
        pos += dcode & 15;
        const dlit = dcode >>> 4;
        const dbs = DDEF[dlit]!; // dlit in [0, 29]; DDEF has 32 entries
        const dst = (dbs >>> 4) + readBits(data, pos, dbs & 15);
        pos += dbs & 15;

        quota.tick(end - off);
        if (noBuf) out = growBuf(out, off + (1 << 17), quota);
        // off - dst >= 0 is a DEFLATE back-reference invariant; ?? 0 guards malformed input
        while (off < end) {
          out[off] = out[off - dst] ?? 0;
          off++;
          out[off] = out[off - dst] ?? 0;
          off++;
          out[off] = out[off - dst] ?? 0;
          off++;
          out[off] = out[off - dst] ?? 0;
          off++;
        }
        off = end;
      }
    }
  }

  return out.length === off ? out : out.slice(0, off);
}

// ---- Internal helpers ----

function growBuf(
  buf: Uint8Array,
  minLen: number,
  quota: DecodeQuota,
): Uint8Array {
  if (minLen > MAX_OUTPUT_SIZE)
    throw new Error(
      "inflateRaw: output exceeds maximum allowed size (possible zip bomb)",
    );
  if (minLen <= buf.length) return buf;
  const newSize = Math.max(buf.length << 1, minLen);
  quota.addAlloc(newSize);
  const next = new Uint8Array(newSize);
  next.set(buf);
  return next;
}

/**
 * Decodes HLIT+HDIST code-lengths using the code-length alphabet (ITREE/IMAP).
 * Writes flat bit-lengths into LBUF[0..count-1].
 * @returns Updated bit position after consuming header bits.
 */
function decodeLengths(
  imap: Uint16Array,
  mask: number,
  count: number,
  data: Uint8Array,
  pos: number,
  quota: DecodeQuota,
): number {
  let i = 0;
  while (i < count) {
    // mask = (1 << tl) - 1; imap.length = 1 << tl (max 512) → index always in range
    const code = imap[peekBits(data, pos) & mask]!;
    const advance = code & 15;
    if (advance === 0)
      throw new Error(
        "inflateRaw: invalid code-length code (malformed DEFLATE header)",
      );
    pos += advance;
    quota.tick(1);
    const sym = code >>> 4;
    if (sym <= 15) {
      LBUF[i++] = sym;
    } else {
      let repeat = 0;
      let fill = 0;
      if (sym === 16) {
        repeat = 3 + readBits(data, pos, 2);
        pos += 2;
        fill = LBUF[i - 1] ?? 0; // previous length; ?? 0 guards malformed i=0
      } else if (sym === 17) {
        repeat = 3 + readBits(data, pos, 3);
        pos += 3;
      } else {
        // sym === 18
        repeat = 11 + readBits(data, pos, 7);
        pos += 7;
      }
      const end = i + repeat;
      while (i < end) LBUF[i++] = fill;
    }
  }
  return pos;
}

/**
 * Converts flat bit-lengths from LBUF[srcOff..srcOff+count-1] into the interleaved
 * (code=0, bitLength) format expected by makeCodes(), stored in `dst`.
 * @returns Maximum bit-length found (= maxBits parameter for makeCodes/codes2map).
 */
function copyIntoTree(srcOff: number, count: number, dst: Uint16Array): number {
  let maxLen = 0;
  const dstSymbols = dst.length >>> 1;
  for (let i = 0; i < count; i++) {
    const v = LBUF[i + srcOff] ?? 0; // i + srcOff < LBUF.length = 320 by caller contract
    dst[i * 2] = 0;
    dst[i * 2 + 1] = v;
    if (v > maxLen) maxLen = v;
  }
  for (let i = count; i < dstSymbols; i++) {
    dst[i * 2] = 0;
    dst[i * 2 + 1] = 0;
  }
  return maxLen;
}
