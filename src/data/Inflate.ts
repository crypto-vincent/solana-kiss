// @ts-nocheck
// TODO - clean this up

var B = {
  readUshort: function (buff, p) {
    return buff[p] | (buff[p + 1] << 8);
  },
  writeUshort: function (buff, p, n) {
    buff[p] = n & 255;
    buff[p + 1] = (n >> 8) & 255;
  },
  readUint: function (buff, p) {
    return (
      buff[p + 3] * (256 * 256 * 256) +
      ((buff[p + 2] << 16) | (buff[p + 1] << 8) | buff[p])
    );
  },
  readASCII: function (buff, p, l) {
    var s = "";
    for (var i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]);
    return s;
  },
  pad: function (n) {
    return n.length < 2 ? "0" + n : n;
  },
  readIBM: function (buff, p, l) {
    var codes = [
      0xc7, 0xfc, 0xe9, 0xe2, 0xe4, 0xe0, 0xe5, 0xe7, 0xea, 0xeb, 0xe8, 0xef,
      0xee, 0xec, 0xc4, 0xc5, 0xc9, 0xe6, 0xc6, 0xf4, 0xf6, 0xf2, 0xfb, 0xf9,
      0xff, 0xd6, 0xdc, 0xa2, 0xa3, 0xa5, 0xa7, 0x192, 0xe1, 0xed, 0xf3, 0xfa,
      0xf1, 0xd1, 0xaa, 0xba, 0xbf, 0x2310, 0xac, 0xbd, 0xbc, 0xa1, 0xab, 0xbb,
    ];
    var out = "";
    for (var i = 0; i < l; i++) {
      var cc = buff[p + i];
      if (cc < 0x80) cc = cc;
      else if (cc < 0xb0) cc = codes[cc - 0x80];
      else return null;
      out += String.fromCharCode(cc);
    }
    return out;
  },
  readUTF8: function (buff, p, l) {
    var s = "",
      ns;
    for (var i = 0; i < l; i++) s += "%" + B.pad(buff[p + i].toString(16));
    try {
      ns = decodeURIComponent(s);
    } catch (e) {
      return B.readASCII(buff, p, l);
    }
    return ns;
  },
};

var crc = {
  table: (function () {
    var tab = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      tab[n] = c;
    }
    return tab;
  })(),
  update: function (c, buf, off, len) {
    for (var i = 0; i < len; i++)
      c = crc.table[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
    return c;
  },
};

function parseTar(data) {
  var off = 0,
    out = {};
  while (off + 1024 < data.length) {
    var no = off;
    while (data[no] != 0) no++;
    var nam = B.readASCII(data, off, no - off);
    off += 100;
    off += 24;
    var sz = parseInt(B.readASCII(data, off, 12), 8);
    off += 12;
    var tm = parseInt(B.readASCII(data, off, 12), 8);
    off += 12;
    // console.log(nam, sz, tm);
    off += 8 + 1 + 100;
    off += 6 + 2 + 32 + 32 + 8 + 8 + 155 + 12;

    out[nam] = data.slice(off, off + sz);
    off += sz;

    var ex = off & 0x1ff;
    if (ex != 0) off += 512 - ex;
  }
  return out;
}

function parse(buf, onlyNames) {
  // ArrayBuffer
  var rUs = B.readUshort,
    rUi = B.readUint,
    o = 0,
    out = {};
  var data = new Uint8Array(buf);
  if (data.length > 257 + 6 && B.readASCII(data, 257, 6) == "ustar ")
    return parseTar(data);
  //if(B.readASCII(data,0,2)=="7z") return parse7z(data);

  var eocd = data.length - 4;

  while (rUi(data, eocd) != 0x06054b50) eocd--;

  var o = eocd;
  o += 4; // sign  = 0x06054b50
  o += 4; // disks = 0;
  var cnu = rUs(data, o);
  o += 2;
  var cnt = rUs(data, o);
  o += 2;

  var csize = rUi(data, o);
  o += 4;
  var coffs = rUi(data, o);
  o += 4;

  o = coffs;
  for (var i = 0; i < cnu; i++) {
    var sign = rUi(data, o);
    o += 4;
    o += 4; // versions;
    o += 4; // flag + compr
    var time = _readTime(data, o);
    o += 4; // time

    var crc32 = rUi(data, o);
    o += 4;
    var csize = rUi(data, o);
    o += 4;
    var usize = rUi(data, o);
    o += 4;

    var nl = rUs(data, o),
      el = rUs(data, o + 2),
      cl = rUs(data, o + 4);
    o += 6; // name, extra, comment
    o += 8; // disk, attribs
    var roff = rUi(data, o);
    o += 4;

    o += nl;

    var lo = 0;
    while (lo < el) {
      var id = rUs(data, o + lo);
      lo += 2;
      var sz = rUs(data, o + lo);
      lo += 2;
      if (id == 1) {
        // Zip64
        if (usize == 0xffffffff) {
          usize = rUi(data, o + lo);
          lo += 8;
        }
        if (csize == 0xffffffff) {
          csize = rUi(data, o + lo);
          lo += 8;
        }
        if (roff == 0xffffffff) {
          roff = rUi(data, o + lo);
          lo += 8;
        }
      } else lo += sz;
    }

    o += el + cl;

    _readLocal(data, roff, out, csize, usize, onlyNames);
  }
  //console.log(out);
  return out;
}

function _readTime(data, o) {
  var time = B.readUshort(data, o),
    date = B.readUshort(data, o + 2);
  var year = 1980 + (date >>> 9);
  var mont = (date >>> 5) & 15;
  var day = date & 31;
  //console.log(year,mont,day);

  var hour = time >>> 11;
  var minu = (time >>> 5) & 63;
  var seco = 2 * (time & 31);

  var stamp = new Date(year, mont, day, hour, minu, seco).getTime();

  //console.log(date,time);
  return stamp;
}

function _readLocal(data, o, out, csize, usize, onlyNames) {
  var rUs = B.readUshort,
    rUi = B.readUint;
  var sign = rUi(data, o);
  o += 4;
  var ver = rUs(data, o);
  o += 2;
  var gpflg = rUs(data, o);
  o += 2;
  //if((gpflg&8)!=0) throw "unknown sizes";
  var cmpr = rUs(data, o);
  o += 2;

  var time = _readTime(data, o);
  o += 4;

  var crc32 = rUi(data, o);
  o += 4;
  //var csize = rUi(data, o);  o+=4;
  //var usize = rUi(data, o);  o+=4;
  o += 8;

  var nlen = rUs(data, o);
  o += 2;
  var elen = rUs(data, o);
  o += 2;

  var name =
    (gpflg & 2048) == 0 ? B.readIBM(data, o, nlen) : B.readUTF8(data, o, nlen);
  if (name == null) name = B.readUTF8(data, o, nlen);
  o += nlen; //console.log(name);
  o += elen;

  //console.log(sign.toString(16), ver, gpflg, cmpr, crc32.toString(16), "csize, usize", csize, usize, nlen, elen, name, o);
  if (onlyNames) {
    out[name] = { size: usize, csize: csize };
    return;
  }
  var file = new Uint8Array(data.buffer, o);
  if (gpflg & 1) {
    out[name] = new Uint8Array(0);
    alert("ZIPs with a password are not supported.", 3000);
  } else if (cmpr == 0)
    out[name] = new Uint8Array(file.buffer.slice(o, o + csize));
  else if (cmpr == 8) {
    var buf = new Uint8Array(usize);
    inflateRaw(file, buf);
    /*var nbuf = pako["inflateRaw"](file);
			if(usize>8514000) {
				//console.log(PUtils.readASCII(buf , 8514500, 500));
				//console.log(PUtils.readASCII(nbuf, 8514500, 500));
			}
			for(var i=0; i<buf.length; i++) if(buf[i]!=nbuf[i]) {  console.log(buf.length, nbuf.length, usize, i);  throw "e";  }
			*/
    out[name] = buf;
  } else if (cmpr == 14 && window["LZMA"]) {
    var vsn = rUs(file, 0);
    var siz = rUs(file, 2);
    if (siz != 5) throw "unknown LZMA header";

    var prp = file[4];
    var dictSize = rUi(file, 5);
    var lc = prp % 9;
    prp = ~~(prp / 9);
    var lp = prp % 5;
    var pb = ~~(prp / 5);
    //console.log(vsn,siz,dictSize,lc,lp,pb);

    //console.log(file);
    var time = Date.now();
    var buf = (out[name] = new Uint8Array(usize));

    var dec = new window["LZMA"]["Decoder"]();
    dec["setProperties"]({ dsz: dictSize, lc: lc, lp: lp, pb: pb });
    dec["decodeBody"](new Uint8Array(data.buffer, o + 9), buf, usize);

    //console.log(Date.now()-time);
  } else throw "unknown compression method: " + cmpr;
}

export function inflate(file, buf) {
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
  var u16 = Uint16Array,
    u32 = Uint32Array;
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
    //rev9 : new u16(  512)
    rev15: new u16(1 << 15),
    lhst: new u32(286),
    dhst: new u32(30),
    ihst: new u32(19),
    lits: new u32(15000),
    strt: new u16(1 << 16),
    prev: new u16(1 << 15),
  };
})();

function makeCodes(tree, MAX_BITS) {
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
function codes2map(tree, MAX_BITS, map) {
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
function revCodes(tree, MAX_BITS) {
  var r15 = U.rev15,
    imb = 15 - MAX_BITS;
  for (var i = 0; i < tree.length; i += 2) {
    var i0 = tree[i] << (MAX_BITS - tree[i + 1]);
    tree[i] = r15[i0] >>> imb;
  }
}

function _bitsE(dt, pos, length) {
  return (
    ((dt[pos >>> 3] | (dt[(pos >>> 3) + 1] << 8)) >>> (pos & 7)) &
    ((1 << length) - 1)
  );
}
function _bitsF(dt, pos, length) {
  return (
    ((dt[pos >>> 3] |
      (dt[(pos >>> 3) + 1] << 8) |
      (dt[(pos >>> 3) + 2] << 16)) >>>
      (pos & 7)) &
    ((1 << length) - 1)
  );
}

function _get17(dt, pos) {
  // return at least 17 meaningful bytes
  return (
    (dt[pos >>> 3] |
      (dt[(pos >>> 3) + 1] << 8) |
      (dt[(pos >>> 3) + 2] << 16)) >>>
    (pos & 7)
  );
}

(function () {
  var len = 1 << 15;
  for (var i = 0; i < len; i++) {
    var x = i;
    x = ((x & 0xaaaaaaaa) >>> 1) | ((x & 0x55555555) << 1);
    x = ((x & 0xcccccccc) >>> 2) | ((x & 0x33333333) << 2);
    x = ((x & 0xf0f0f0f0) >>> 4) | ((x & 0x0f0f0f0f) << 4);
    x = ((x & 0xff00ff00) >>> 8) | ((x & 0x00ff00ff) << 8);
    U.rev15[i] = ((x >>> 16) | (x << 16)) >>> 17;
  }

  function pushV(tgt, n, sv) {
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
  /*
		var i = 0;
		for(; i<=143; i++) U.fltree.push(0,8);
		for(; i<=255; i++) U.fltree.push(0,9);
		for(; i<=279; i++) U.fltree.push(0,7);
		for(; i<=287; i++) U.fltree.push(0,8);
		*/
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
  /*
		for(var i=0; i< 19; i++) U.itree.push(0,0);
		for(var i=0; i<286; i++) U.ltree.push(0,0);
		for(var i=0; i< 30; i++) U.dtree.push(0,0);
		for(var i=0; i<320; i++) U.ttree.push(0,0);
		*/
})();

export function inflateRaw(data, buf) {
  var u8 = Uint8Array;
  if (data[0] == 3 && data[1] == 0) return buf ? buf : new u8(0);
  //var F=UZIP.F, bitsF = F._bitsF, bitsE = F._bitsE, decodeTiny = F._decodeTiny, makeCodes = F.makeCodes, codes2map=F.codes2map, get17 = F._get17;

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
    //console.log(BFINAL, BTYPE);

    if (BTYPE == 0) {
      if ((pos & 7) != 0) pos += 8 - (pos & 7);
      var p8 = (pos >>> 3) + 4,
        len = data[p8 - 4] | (data[p8 - 3] << 8); //console.log(len);//bitsF(data, pos, 16),
      if (noBuf) buf = _check(buf, off + len);
      buf.set(new u8(data.buffer, data.byteOffset + p8, len), off);
      //for(var i=0; i<len; i++) buf[off+i] = data[p8+i];
      //for(var i=0; i<len; i++) if(buf[off+i] != data[p8+i]) throw "e";
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

        //var o0 = off-dst, stp = Math.min(end-off, dst);
        //if(stp>20) while(off<end) {  buf.copyWithin(off, o0, o0+stp);  off+=stp;  }  else
        //if(end-dst<=off) buf.copyWithin(off, off-dst, end-dst);  else
        //if(dst==1) buf.fill(buf[off-1], off, end);  else
        if (noBuf) buf = _check(buf, off + (1 << 17));
        while (off < end) {
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
          buf[off] = buf[off++ - dst];
        }
        off = end;
        //while(off!=end) {  buf[off]=buf[off++-dst];  }
      }
    }
    //console.log(off-ooff, (pos-opos)>>>3);
  }
  //console.log(UZIP.F.dst);
  //console.log(tlen, dlen, off-tlen+tcnt);
  return buf.length == off ? buf : buf.slice(0, off);
}
function _check(buf, len) {
  var bl = buf.length;
  if (len <= bl) return buf;
  var nbuf = new Uint8Array(Math.max(bl << 1, len));
  nbuf.set(buf, 0);
  //for(var i=0; i<bl; i+=4) {  nbuf[i]=buf[i];  nbuf[i+1]=buf[i+1];  nbuf[i+2]=buf[i+2];  nbuf[i+3]=buf[i+3];  }
  return nbuf;
}

function _decodeTiny(lmap, LL, len, data, pos, tree) {
  //var bitsE = UZIP.F._bitsE, get17 = UZIP.F._get17;
  var i = 0;
  while (i < len) {
    var code = lmap[_get17(data, pos) & LL];
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
function _copyOut(src, off, len, tree) {
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
