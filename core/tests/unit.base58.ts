import { expect, it } from '@jest/globals';
import { base58Decode, base58Encode } from '../src/base58';

it('run', async () => {
  let datas = [
    [1, 2, 3, 4, 5],
    [],
    [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [255, 255, 255, 255, 255],
  ];
  for (let data of datas) {
    let array = new Uint8Array(data);
    let encoded = base58Encode(array);
    let decoded = base58Decode(encoded);
    expect(decoded).toStrictEqual(array);
  }
});
