import { expect, it } from '@jest/globals';
import { base58Decode, base58Encode } from '../src/base58';

it('run', async () => {
  let datas = [
    [1, 2, 3, 4, 5],
    [],
    [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [255, 255, 255, 255, 255],
    [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42],
  ];
  for (let data of datas) {
    let array = new Uint8Array(data);
    let encoded = base58Encode(array);
    let decoded = base58Decode(encoded);
    expect(decoded).toStrictEqual(array);
  }
  let tests = [
    {
      base58: '72k1xXWG59fYdzSNoA',
      utf8: 'Hello, World!',
    },
    {
      base58: '2zuFXTJSTRK6ESktqhM2QDBkCnH1U46CnxaD',
      utf8: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    {
      base58: '1111111QLbz7JHiBTspS962RLKV8GndWFwiEaqKM',
      bytes: new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    },
    {
      base58: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      bytes: new Uint8Array([
        6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121,
        172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0,
        169,
      ]),
    },
    {
      base58: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      bytes: new Uint8Array([
        140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131,
        11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89,
      ]),
    },
    {
      base58: '11111111111111111111111111111111',
      bytes: new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    },
  ];
  for (const test of tests) {
    const bytes = test.bytes ?? new TextEncoder().encode(test.utf8);
    const encoded = base58Encode(bytes);
    const decoded = base58Decode(encoded);
    expect(test.base58).toStrictEqual(encoded);
    expect(decoded).toStrictEqual(bytes);
  }
});
