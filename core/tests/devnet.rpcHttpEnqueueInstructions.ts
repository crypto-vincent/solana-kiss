import { it } from "@jest/globals";
import {
  pubkeyDefault,
  pubkeyNewDummy,
  rpcHttpFromUrl,
  rpcHttpGetLatestBlockInfo,
  rpcHttpGetTransaction,
} from "../src";
import { signerFromSecret } from "../src/data/signer";
import { rpcHttpSendInstructions } from "../src/rpc/rpcHttpSendInstructions";

const secret = new Uint8Array([
  96, 11, 209, 132, 49, 92, 144, 135, 105, 211, 34, 171, 125, 156, 217, 148, 65,
  233, 239, 86, 149, 37, 180, 226, 120, 139, 152, 126, 199, 116, 104, 184, 10,
  85, 215, 5, 230, 110, 192, 255, 29, 27, 96, 27, 203, 56, 119, 189, 226, 99,
  13, 150, 68, 70, 138, 190, 182, 126, 125, 69, 25, 66, 190, 239,
]);

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com", {
    commitment: "confirmed",
  });
  const programAddress = pubkeyDefault();
  const payerSigner = await signerFromSecret(secret);
  const receiverAddress = pubkeyNewDummy();
  console.log("payer", payerSigner.address);
  console.log("receiver", receiverAddress);
  const recentBlockInfo = await rpcHttpGetLatestBlockInfo(rpcHttp);
  console.log("recentBlockInfo", recentBlockInfo);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const transactionKey = await rpcHttpSendInstructions(
    rpcHttp,
    payerSigner,
    [
      {
        programAddress: programAddress,
        inputs: [
          { address: payerSigner.address, signing: true, writable: true },
          { address: receiverAddress, signing: false, writable: true },
        ],
        data: new Uint8Array([
          0x02, 0x00, 0x00, 0x00, 0x00, 0x98, 0x0d, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]),
      },
    ],
    recentBlockInfo,
    {},
  );
  console.log("transactionKey", transactionKey);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("dudu", await rpcHttpGetTransaction(rpcHttp, transactionKey));
});
