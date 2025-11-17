import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsDecode,
  idlInstructionArgsDecode,
  idlProgramGuessInstruction,
  idlProgramParse,
  rpcHttpFromUrl,
  rpcHttpGetTransaction,
  signatureFromBase58,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_29.json"));
  // Download an arbitrary instruction we should be able to decode
  const { transactionRequest } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "tBmH82bM3G5a7q8UFVPs9a3qbogwFzAXsbqnM29VYXYYWDkR8j2dbKP6sexNKTrtR9cWP4iBwFuj1Su2ui4QdY3",
      ),
    ),
  );
  // Check we can decode the instruction correctly
  const instructionRequest = expectDefined(
    transactionRequest.instructionsRequests[2],
  );
  const instructionIdl = expectDefined(
    idlProgramGuessInstruction(programIdl, instructionRequest),
  );
  expect(instructionIdl.name).toStrictEqual("redeem_phase_one");
  // Check instruction inputs decoding
  const { instructionAddresses } = idlInstructionAccountsDecode(
    instructionIdl,
    instructionRequest.instructionInputs,
  );
  expect(instructionAddresses["user"]).toStrictEqual(
    "6cGTLr9bTCYis6KjsuZPQS7LrcPjyjibr9gFk2JH65Mn",
  );
  // Check instruction data decoding
  const { instructionPayload } = idlInstructionArgsDecode(
    instructionIdl,
    instructionRequest.instructionData,
  );
  expect(instructionPayload).toStrictEqual({
    uctAmount: "100000000000000",
  });
});
