import { it } from "@jest/globals";
import { Keypair } from "../src/data/keypair";

it("run", async () => {
  const keyPair = await Keypair.generate();

  console.log("publicKey", keyPair.pubkey);

  const message = new TextEncoder().encode("Hello, World!");
  const signature = await keyPair.sign(message);
  console.log("signature", signature);
  const isValid = await keyPair.verify(message, signature);
  console.log("isValid", isValid);
  expect(isValid).toBe(true);
});
