import { it } from "@jest/globals";
import {
  idlInstructionDecode,
  idlProgramGuessInstruction,
  idlProgramParse,
  rpcHttpFromUrl,
  rpcHttpWaitForTransaction,
  signatureFromBase58,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_29.json"));
  // Download an arbitrary instruction we should be able to decode
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromBase58(
      "tBmH82bM3G5a7q8UFVPs9a3qbogwFzAXsbqnM29VYXYYWDkR8j2dbKP6sexNKTrtR9cWP4iBwFuj1Su2ui4QdY3",
    ),
    0,
  );
  // Check we can decode the instruction correctly
  const instruction = transactionExecution.message.instructions[2]!;
  const instructionIdl = idlProgramGuessInstruction(programIdl, instruction);
  expect(instructionIdl?.name).toStrictEqual("redeem_phase_one");
  const instructionDecoded = idlInstructionDecode(instructionIdl!, instruction);
  expect(instructionDecoded.instructionAddresses.get("user")).toStrictEqual(
    "6cGTLr9bTCYis6KjsuZPQS7LrcPjyjibr9gFk2JH65Mn",
  );
  expect(instructionDecoded.instructionPayload).toStrictEqual({
    uct_amount: "100000000000000",
  });
});
