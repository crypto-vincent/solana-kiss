export class Sha256Hasher {
  private readonly state = new Int32Array(8);
  private readonly temp = new Int32Array(64);
  private readonly buffer = new Uint8Array(128);
  private bufferLen = 0;
  private bytesHashed = 0;

  constructor() {
    this.clear();
  }

  clear() {
    this.state[0] = 0x6a09e667;
    this.state[1] = 0xbb67ae85;
    this.state[2] = 0x3c6ef372;
    this.state[3] = 0xa54ff53a;
    this.state[4] = 0x510e527f;
    this.state[5] = 0x9b05688c;
    this.state[6] = 0x1f83d9ab;
    this.state[7] = 0x5be0cd19;
    this.bufferLen = 0;
    this.bytesHashed = 0;
  }

  update(blob: Uint8Array) {
    let dataPos = 0;
    let dataLen = blob.length;
    this.bytesHashed += dataLen;
    if (this.bufferLen > 0) {
      while (this.bufferLen < 64 && dataLen > 0) {
        this.buffer[this.bufferLen++] = blob[dataPos++]!;
        dataLen--;
      }
      if (this.bufferLen === 64) {
        sha256HashBlock(this.temp, this.state, this.buffer, 0, 64);
        this.bufferLen = 0;
      }
    }
    if (dataLen >= 64) {
      dataPos = sha256HashBlock(this.temp, this.state, blob, dataPos, dataLen);
      dataLen %= 64;
    }
    while (dataLen > 0) {
      this.buffer[this.bufferLen++] = blob[dataPos++]!;
      dataLen--;
    }
  }

  digest(): Uint8Array {
    const hash = new Uint8Array(32);
    const bytesHashed = this.bytesHashed;
    const left = this.bufferLen;
    const bitLenHi = (bytesHashed / 0x20000000) | 0;
    const bitLenLo = bytesHashed << 3;
    const padLength = bytesHashed % 64 < 56 ? 64 : 128;
    this.buffer[left] = 0x80;
    for (let index = left + 1; index < padLength - 8; index++) {
      this.buffer[index] = 0;
    }
    this.buffer[padLength - 8] = (bitLenHi >>> 24) & 0xff;
    this.buffer[padLength - 7] = (bitLenHi >>> 16) & 0xff;
    this.buffer[padLength - 6] = (bitLenHi >>> 8) & 0xff;
    this.buffer[padLength - 5] = (bitLenHi >>> 0) & 0xff;
    this.buffer[padLength - 4] = (bitLenLo >>> 24) & 0xff;
    this.buffer[padLength - 3] = (bitLenLo >>> 16) & 0xff;
    this.buffer[padLength - 2] = (bitLenLo >>> 8) & 0xff;
    this.buffer[padLength - 1] = (bitLenLo >>> 0) & 0xff;
    sha256HashBlock(this.temp, this.state, this.buffer, 0, padLength);
    for (let index = 0; index < 8; index++) {
      const state = this.state[index]!;
      hash[index * 4 + 0] = (state >>> 24) & 0xff;
      hash[index * 4 + 1] = (state >>> 16) & 0xff;
      hash[index * 4 + 2] = (state >>> 8) & 0xff;
      hash[index * 4 + 3] = (state >>> 0) & 0xff;
    }
    this.clear();
    return hash;
  }
}

const sha256Hasher = new Sha256Hasher();
export function sha256Hash(blobs: Array<Uint8Array>): Uint8Array {
  for (const blob of blobs) {
    sha256Hasher.update(blob);
  }
  return sha256Hasher.digest();
}

const k = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256HashBlock(
  temp: Int32Array,
  state: Int32Array,
  buffer: Uint8Array,
  pos: number,
  len: number,
): number {
  let a: number;
  let b: number;
  let c: number;
  let d: number;
  let e: number;
  let f: number;
  let g: number;
  let h: number;
  let u: number;
  let i: number;
  let j: number;
  let t1: number;
  let t2: number;
  while (len >= 64) {
    a = state[0]!;
    b = state[1]!;
    c = state[2]!;
    d = state[3]!;
    e = state[4]!;
    f = state[5]!;
    g = state[6]!;
    h = state[7]!;
    for (i = 0; i < 16; i++) {
      j = pos + i * 4;
      temp[i] =
        ((buffer[j]! & 0xff) << 24) |
        ((buffer[j + 1]! & 0xff) << 16) |
        ((buffer[j + 2]! & 0xff) << 8) |
        (buffer[j + 3]! & 0xff);
    }
    for (i = 16; i < 64; i++) {
      u = temp[i - 2]!;
      t1 =
        ((u >>> 17) | (u << (32 - 17))) ^
        ((u >>> 19) | (u << (32 - 19))) ^
        (u >>> 10);
      u = temp[i - 15]!;
      t2 =
        ((u >>> 7) | (u << (32 - 7))) ^
        ((u >>> 18) | (u << (32 - 18))) ^
        (u >>> 3);
      temp[i] = ((t1 + temp[i - 7]!) | 0) + ((t2 + temp[i - 16]!) | 0);
    }
    for (i = 0; i < 64; i++) {
      t1 =
        ((((((e >>> 6) | (e << (32 - 6))) ^
          ((e >>> 11) | (e << (32 - 11))) ^
          ((e >>> 25) | (e << (32 - 25)))) +
          ((e & f) ^ (~e & g))) |
          0) +
          ((h + ((k[i]! + temp[i]!) | 0)) | 0)) |
        0;
      t2 =
        ((((a >>> 2) | (a << (32 - 2))) ^
          ((a >>> 13) | (a << (32 - 13))) ^
          ((a >>> 22) | (a << (32 - 22)))) +
          ((a & b) ^ (a & c) ^ (b & c))) |
        0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    state[0]! += a;
    state[1]! += b;
    state[2]! += c;
    state[3]! += d;
    state[4]! += e;
    state[5]! += f;
    state[6]! += g;
    state[7]! += h;
    pos += 64;
    len -= 64;
  }
  return pos;
}
