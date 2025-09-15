import { expect, it } from '@jest/globals';
import { base64Decode, base64Encode } from '../src/base64';

it('run', async () => {
  let datas = [
    [1, 2, 3, 4, 5],
    [],
    [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [255, 255, 255, 255, 255],
    [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42],
  ];
  for (const data of datas) {
    const bytes = new Uint8Array(data);
    const encoded = base64Encode(bytes);
    const decoded = base64Decode(encoded);
    expect(decoded).toStrictEqual(bytes);
  }
  let tests = [
    {
      base64: 'SGVsbG8sIFdvcmxkIQ==',
      utf8: 'Hello, World!',
    },
    {
      base64: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
      utf8: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
  ];
  for (const test of tests) {
    const bytes = test.bytes ?? new TextEncoder().encode(test.utf8);
    const encoded = base64Encode(bytes);
    const decoded = base64Decode(encoded);
    expect(test.base64).toStrictEqual(encoded);
    expect(decoded).toStrictEqual(bytes);
  }
});
