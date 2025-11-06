import { expect, it } from "@jest/globals";
import {
  blockHashFromBytes,
  blockSlotFromNumber,
  pubkeyFromBase58,
  signatureFromBase58,
  signerFromSecret,
  transactionCompileAndSign,
  urlExplorerAccount,
  urlExplorerBlock,
  urlExplorerSimulation,
  urlExplorerTransaction,
  urlRpcPublicDevnet,
  urlRpcPublicMainnet,
} from "../src";

it("run", async () => {
  expect(
    urlExplorerBlock(urlRpcPublicMainnet, blockSlotFromNumber(377349811)),
  ).toStrictEqual(
    "https://explorer.solana.com/block/377349811?cluster=mainnet-beta",
  );
  expect(
    urlExplorerBlock("devnet", blockSlotFromNumber(377349811)),
  ).toStrictEqual("https://explorer.solana.com/block/377349811?cluster=devnet");
  expect(
    urlExplorerBlock("https://custom.rpc.url", blockSlotFromNumber(987654321)),
  ).toStrictEqual(
    "https://explorer.solana.com/block/987654321?customUrl=https%3A%2F%2Fcustom.rpc.url",
  );

  expect(
    urlExplorerBlock(urlRpcPublicDevnet, blockSlotFromNumber(418711690)),
  ).toStrictEqual("https://explorer.solana.com/block/418711690?cluster=devnet");
  expect(
    urlExplorerAccount(
      urlRpcPublicDevnet,
      pubkeyFromBase58("4Nd1mY5Z6kR7q8U6z3v5X6ixkmKsg4xX6p6L7m3gH1oN"),
    ),
  ).toStrictEqual(
    "https://explorer.solana.com/address/4Nd1mY5Z6kR7q8U6z3v5X6ixkmKsg4xX6p6L7m3gH1oN?cluster=devnet",
  );
  expect(
    urlExplorerTransaction(
      urlRpcPublicDevnet,
      signatureFromBase58(
        "5AVjDXZskdayztESDeaumG4E8s28Fn6ttEkM7oAVEcG62g8A6te4NMBuQtKNGg8dvxRatp8nw4tkh19AasLQZYFj",
      ),
    ),
  ).toStrictEqual(
    "https://explorer.solana.com/tx/5AVjDXZskdayztESDeaumG4E8s28Fn6ttEkM7oAVEcG62g8A6te4NMBuQtKNGg8dvxRatp8nw4tkh19AasLQZYFj?cluster=devnet",
  );
  const payerSigner = await signerFromSecret(payerSecret);
  const programAddress = pubkeyFromBase58(
    "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
  );
  const transactionPacket = await transactionCompileAndSign([payerSigner], {
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashFromBytes(new Uint8Array(32).fill(1)),
    instructions: [{ programAddress, inputs: [], data: new Uint8Array([42]) }],
  });
  expect(
    urlExplorerSimulation(urlRpcPublicDevnet, transactionPacket),
  ).toStrictEqual(
    "https://explorer.solana.com/tx/inspector?message=AQABAj457ZZiOmUrAI5j%2BXTNkEsnj5JmxVAS2pv6Zs7I5eStC7wPwLtHyi90xBEulKsTz6PGNOXcF%2BrLA80aI81%2BeHwBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAEq&signatures=%5B%225Pk87GxZBwfk41CHdawMJWQNWQQhSUyjqVXzyLzKTXeg3mi3vh5Erq4UQBdmxXt2vimCRs2WDqFsUEaPYzTnXr8F%22%5D&cluster=devnet",
  );
});

const payerSecret = new Uint8Array([
  253, 106, 204, 143, 156, 225, 66, 188, 227, 208, 143, 26, 144, 47, 245, 32,
  217, 222, 212, 216, 243, 147, 179, 91, 179, 79, 3, 159, 237, 186, 36, 177, 62,
  57, 237, 150, 98, 58, 101, 43, 0, 142, 99, 249, 116, 205, 144, 75, 39, 143,
  146, 102, 197, 80, 18, 218, 155, 250, 102, 206, 200, 229, 228, 173,
]);
