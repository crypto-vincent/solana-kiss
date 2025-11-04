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
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl(urlPublicRpcDevnet);
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
  const instruction = expectDefined(transactionRequest.instructions[1]);
  const instructionIdl = expectDefined(
    idlProgramGuessInstruction(programIdl, instruction),
  );
  expect(instructionIdl.name).toStrictEqual("pledge_deposit");
  // Check instruction inputs decoding
  const instructionAddresses = idlInstructionAccountsDecode(
    instructionIdl,
    instruction.inputs,
  );
  expect(instructionAddresses["user"]).toStrictEqual(
    "99ywHQcPAYZ2te68Dah5CiSapqptNXvwGUqC1wP2qsi2",
  );
  // Check instruction data decoding
  const instructionPayload = idlInstructionArgsDecode(
    instructionIdl,
    instruction.data,
  );
  expect(instructionPayload).toStrictEqual({
    params: { collateral_amount: "0" },
  });
});
