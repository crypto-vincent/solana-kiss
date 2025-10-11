import { it } from "@jest/globals";
import {
  expectDefined,
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
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_30.json"));
  // Download an arbitrary instruction we should be able to decode
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    rpcHttp,
    signatureFromBase58(
      "H8Kx9Qq8XHB8gfoGQ7o1gTRkZc7aRD336PA9Nbvucn3qQbtZFtb78PpdvuPVTSWGnymUoJfZWki9e28xAZVFbt5",
    ),
    0,
  );
  // Check we can decode the instruction correctly
  const instruction = expectDefined(
    transactionExecution.message.instructions[1],
  );
  const instructionIdl = expectDefined(
    idlProgramGuessInstruction(programIdl, instruction),
  );
  expect(instructionIdl.name).toStrictEqual("pledge_deposit");
  const instructionDecoded = idlInstructionDecode(instructionIdl, instruction);
  expect(instructionDecoded.instructionAddresses.get("user")).toStrictEqual(
    "99ywHQcPAYZ2te68Dah5CiSapqptNXvwGUqC1wP2qsi2",
  );
  expect(instructionDecoded.instructionPayload).toStrictEqual({
    params: { collateral_amount: "0" },
  });
});
