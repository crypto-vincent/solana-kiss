import { it } from "@jest/globals";
import { pubkeyToVerifier, signerFromSecret, signerGenerate } from "../src";

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);

it("run", async () => {
  const signer1 = await signerFromSecret(secret);
  const signer2 = await signerGenerate();
  const verifier1 = await pubkeyToVerifier(signer1.address);
  const verifier2 = await pubkeyToVerifier(signer2.address);
  const messages = [
    new Uint8Array([]),
    new Uint8Array([1, 2, 3, 4, 5]),
    new Uint8Array(1000).map((_, i) => i % 256),
  ];
  for (const message of messages) {
    const signature1 = await signer1.sign(message);
    const signature2 = await signer2.sign(message);
    expect(await verifier1(signature1, message)).toStrictEqual(true);
    expect(await verifier2(signature2, message)).toStrictEqual(true);
    expect(await verifier1(signature2, message)).toStrictEqual(false);
    expect(await verifier2(signature1, message)).toStrictEqual(false);
  }
});
