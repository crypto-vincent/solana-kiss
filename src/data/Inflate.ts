// TODO - clean this up
// @ts-nocheck

export function inflate(file: Uint8Array, buf: Uint8Array | null): Uint8Array {
  var CMF = file[0],
    FLG = file[1];
  if (CMF == 31 && FLG == 139) {
    // GZIP
    var CM = file[2],
      FLG = file[3];
    if (CM != 8) throw CM; /* 8 is DEFLATE */
    var off = 4;
    off += 4; // MTIME
    off += 2; // XFL, OS
    if ((FLG & 4) != 0) throw "e"; // FEXTRA
    if ((FLG & 8) != 0) {
      // FNAME
      while (file[off] != 0) off++;
      off++;
    }
    if ((FLG & 16) != 0) throw "e"; // FCOMMENT
    if ((FLG & 2) != 0) throw "e"; // FHCR
    return inflateRaw(
      new Uint8Array(file.buffer, file.byteOffset + off, file.length - off - 8),
      buf,
    );
  }
  var CM = CMF & 15,
    CINFO = CMF >>> 4;
  //console.log(CM, CINFO,CMF,FLG);
  return inflateRaw(
    new Uint8Array(file.buffer, file.byteOffset + 2, file.length - 6),
    buf,
  );
}

var U = (function () {
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
    fltree: [],
    fdmap: new u16(32),
    fdtree: [],
    lmap: new u16(32768),
    ltree: [],
    ttree: [],
    dmap: new u16(32768),
    dtree: [],
    imap: new u16(512),
    itree: [],
    rev15: new u16(1 << 15),
    lhst: new u32(286),
    dhst: new u32(30),
    ihst: new u32(19),
    lits: new u32(15000),
    strt: new u16(1 << 16),
    prev: new u16(1 << 15),
  };
})();

function makeCodes(tree: string | any[], MAX_BITS: number) {
  // code, length
  var max_code = tree.length;
  var code, bits, n, i, len;

  var bl_count = U.bl_count;
  for (var i = 0; i <= MAX_BITS; i++) bl_count[i] = 0;
  for (i = 1; i < max_code; i += 2) bl_count[tree[i]]++;

  var next_code = U.next_code; // smallest code for each length

  code = 0;
  bl_count[0] = 0;
  for (bits = 1; bits <= MAX_BITS; bits++) {
    code = (code + bl_count[bits - 1]) << 1;
    next_code[bits] = code;
  }

  for (n = 0; n < max_code; n += 2) {
    len = tree[n + 1];
    if (len != 0) {
      tree[n] = next_code[len];
      next_code[len]++;
    }
  }
}
function codes2map(
  tree: string | any[],
  MAX_BITS: number,
  map: Uint16Array<ArrayBuffer> | number[],
) {
  var max_code = tree.length;
  var r15 = U.rev15;
  for (var i = 0; i < max_code; i += 2)
    if (tree[i + 1] != 0) {
      var lit = i >> 1;
      var cl = tree[i + 1],
        val = (lit << 4) | cl; // :  (0x8000 | (U.of0[lit-257]<<7) | (U.exb[lit-257]<<4) | cl);
      var rest = MAX_BITS - cl,
        i0 = tree[i] << rest,
        i1 = i0 + (1 << rest);
      //tree[i]=r15[i0]>>>(15-MAX_BITS);
      while (i0 != i1) {
        var p0 = r15[i0] >>> (15 - MAX_BITS);
        map[p0] = val;
        i0++;
      }
    }
}
function revCodes(tree: string | any[], MAX_BITS: number) {
  var r15 = U.rev15,
    imb = 15 - MAX_BITS;
  for (var i = 0; i < tree.length; i += 2) {
    var i0 = tree[i] << (MAX_BITS - tree[i + 1]);
    tree[i] = r15[i0] >>> imb;
  }
}

function _bitsE(dt: number[], pos: number, length: number) {
  return (
    ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8)) >>> (pos & 7)) &
    ((1 << length) - 1)
  );
}
function _bitsF(dt: number[], pos: number, length: number) {
  return (
    ((dt[pos >>> 3] |
      (dt[(pos >>> 3) + 1] << 8) |
      (dt[(pos >>> 3) + 2] << 16)) >>>
      (pos & 7)) &
    ((1 << length) - 1)
  );
}

function _get17(dt: number[], pos: number) {
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

  function pushV(tgt: number[], n: number, sv: number) {
    while (n-- != 0) tgt.push(0, sv);
  }

  for (var i = 0; i < 32; i++) {
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
  //for(i=0;i<32; i++) U.fdtree.push(0,5);
  makeCodes(U.fdtree, 5);
  codes2map(U.fdtree, 5, U.fdmap);
  revCodes(U.fdtree, 5);

  pushV(U.itree, 19, 0);
  pushV(U.ltree, 286, 0);
  pushV(U.dtree, 30, 0);
  pushV(U.ttree, 320, 0);
})();

export function inflateRaw(
  data: Uint8Array,
  buf: Uint8Array | null,
): Uint8Array {
  var u8 = Uint8Array;
  if (data[0] == 3 && data[1] == 0) return buf ? buf : new u8(0);

  var noBuf = buf == null;
  if (noBuf) buf = new u8((data.length >>> 2) << 3);

  var BFINAL = 0,
    BTYPE = 0,
    HLIT = 0,
    HDIST = 0,
    HCLEN = 0,
    ML = 0,
    MD = 0;
  var off = 0,
    pos = 0;
  var lmap, dmap;

  while (BFINAL == 0) {
    BFINAL = _bitsF(data, pos, 1);
    BTYPE = _bitsF(data, pos + 1, 2);
    pos += 3;

    if (BTYPE == 0) {
      if ((pos & 7) != 0) pos += 8 - (pos & 7);
      var p8 = (pos >>> 3) + 4,
        len = data[p8 - 4] | (data[p8 - 3] << 8); //console.log(len);//bitsF(data, pos, 16),
      if (noBuf) buf = _check(buf, off + len);
      buf.set(new u8(data.buffer, data.byteOffset + p8, len), off);

      pos = (p8 + len) << 3;
      off += len;
      continue;
    }
    if (noBuf) buf = _check(buf, off + (1 << 17)); // really not enough in many cases (but PNG and ZIP provide buffer in advance)
    if (BTYPE == 1) {
      lmap = U.flmap;
      dmap = U.fdmap;
      ML = (1 << 9) - 1;
      MD = (1 << 5) - 1;
    }
    if (BTYPE == 2) {
      HLIT = _bitsE(data, pos, 5) + 257;
      HDIST = _bitsE(data, pos + 5, 5) + 1;
      HCLEN = _bitsE(data, pos + 10, 4) + 4;
      pos += 14;

      var ppos = pos;
      for (var i = 0; i < 38; i += 2) {
        U.itree[i] = 0;
        U.itree[i + 1] = 0;
      }
      var tl = 1;
      for (var i = 0; i < HCLEN; i++) {
        var l = _bitsE(data, pos + i * 3, 3);
        U.itree[(U.ordr[i] << 1) + 1] = l;
        if (l > tl) tl = l;
      }
      pos += 3 * HCLEN; //console.log(itree);
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
      );
      var mx0 = _copyOut(U.ttree, 0, HLIT, U.ltree);
      ML = (1 << mx0) - 1;
      var mx1 = _copyOut(U.ttree, HLIT, HDIST, U.dtree);
      MD = (1 << mx1) - 1;

      //var ml = _decodeTiny(U.imap, (1<<tl)-1, HLIT , data, pos, U.ltree); ML = (1<<(ml>>>24))-1;  pos+=(ml&0xffffff);
      makeCodes(U.ltree, mx0);
      codes2map(U.ltree, mx0, lmap);

      //var md = _decodeTiny(U.imap, (1<<tl)-1, HDIST, data, pos, U.dtree); MD = (1<<(md>>>24))-1;  pos+=(md&0xffffff);
      makeCodes(U.dtree, mx1);
      codes2map(U.dtree, mx1, dmap);
    }
    //var ooff=off, opos=pos;
    while (true) {
      var code = lmap[_get17(data, pos) & ML];
      pos += code & 15;
      var lit = code >>> 4; //U.lhst[lit]++;
      if (lit >>> 8 == 0) {
        buf[off++] = lit;
      } else if (lit == 256) {
        break;
      } else {
        var end = off + lit - 254;
        if (lit > 264) {
          var ebs = U.ldef[lit - 257];
          end = off + (ebs >>> 3) + _bitsE(data, pos, ebs & 7);
          pos += ebs & 7;
        }
        //UZIP.F.dst[end-off]++;

        var dcode = dmap[_get17(data, pos) & MD];
        pos += dcode & 15;
        var dlit = dcode >>> 4;
        var dbs = U.ddef[dlit],
          dst = (dbs >>> 4) + _bitsF(data, pos, dbs & 15);
        pos += dbs & 15;

        if (noBuf) buf = _check(buf, off + (1 << 17));
        while (off < end) {
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
        }
        off = end;
      }
    }
  }

  return buf.length == off ? buf : buf.slice(0, off);
}

function _check(buf: string | any[] | ArrayLike<number>, len: number) {
  var bl = buf.length;
  if (len <= bl) return buf;
  var nbuf = new Uint8Array(Math.max(bl << 1, len));
  nbuf.set(buf, 0);
  return nbuf;
}

function _decodeTiny(
  lmap: any[] | Uint16Array<ArrayBuffer>,
  LL: number,
  len: number,
  data: any,
  pos: number,
  tree: number[],
) {
  let i = 0;
  while (i < len) {
    const code = lmap[_get17(data, pos) & LL];
    pos += code & 15;
    var lit = code >>> 4;
    if (lit <= 15) {
      tree[i] = lit;
      i++;
    } else {
      var ll = 0,
        n = 0;
      if (lit == 16) {
        n = 3 + _bitsE(data, pos, 2);
        pos += 2;
        ll = tree[i - 1];
      } else if (lit == 17) {
        n = 3 + _bitsE(data, pos, 3);
        pos += 3;
      } else if (lit == 18) {
        n = 11 + _bitsE(data, pos, 7);
        pos += 7;
      }
      var ni = i + n;
      while (i < ni) {
        tree[i] = ll;
        i++;
      }
    }
  }
  return pos;
}

function _copyOut(
  src: never[],
  off: number,
  len: number,
  tree: string | any[],
) {
  var mx = 0,
    i = 0,
    tl = tree.length >>> 1;
  while (i < len) {
    var v = src[i + off];
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
