import { expect, it } from '@jest/globals';
import { base64Decode, base64Encode } from '../src/base64';

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
    let encoded = base64Encode(array);
    let decoded = base64Decode(encoded);
    expect(decoded).toStrictEqual(array);
  }
});
