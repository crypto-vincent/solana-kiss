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
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Download an arbitrary instruction we should be able to decode
  const { transactionRequest } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "H8Kx9Qq8XHB8gfoGQ7o1gTRkZc7aRD336PA9Nbvucn3qQbtZFtb78PpdvuPVTSWGnymUoJfZWki9e28xAZVFbt5",
      ),
    ),
  );
  // Check we can decode the instruction correctly
  const instructionRequest = expectDefined(
    transactionRequest.instructionsRequests[1],
  );
  const instructionIdl = expectDefined(
    idlProgramGuessInstruction(programIdl, instructionRequest),
  );
  expect(instructionIdl.name).toStrictEqual("pledge_deposit");
  // Check instruction inputs decoding
  const { instructionAddresses } = idlInstructionAccountsDecode(
    instructionIdl,
    instructionRequest.instructionInputs,
  );
  expect(instructionAddresses["user"]).toStrictEqual(
    "99ywHQcPAYZ2te68Dah5CiSapqptNXvwGUqC1wP2qsi2",
  );
  // Check instruction data decoding
  const { instructionPayload } = idlInstructionArgsDecode(
    instructionIdl,
    instructionRequest.instructionData,
  );
  expect(instructionPayload).toStrictEqual({
    params: { collateralAmount: "0" },
  });
});
