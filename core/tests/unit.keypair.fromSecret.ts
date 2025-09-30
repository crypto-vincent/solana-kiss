import { it } from "@jest/globals";
import { Keypair } from "@solana/web3.js";
import { keypairFromSecret } from "../src/data/keypair";

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);

it("run", async () => {
  const referenceKeypair = Keypair.fromSecretKey(secret);
  const currentKeypair = await keypairFromSecret(secret);
  expect(currentKeypair.address).toStrictEqual(
    referenceKeypair.publicKey.toBase58(),
  );
  for (let counter = 0; counter < 10; counter++) {
    const randomized = new Uint8Array(64);
    for (let i = 0; i < randomized.length; i++) {
      randomized[i] = Math.floor(Math.random() * 256);
    }
    const referenceBrokenKeypair = Keypair.fromSecretKey(randomized, {
      skipValidation: true,
    });
    const currentBrokenKeypair = await keypairFromSecret(randomized, {
      skipValidation: true,
    });
    expect(currentBrokenKeypair.address).toStrictEqual(
      referenceBrokenKeypair.publicKey.toBase58(),
    );
  }
});
