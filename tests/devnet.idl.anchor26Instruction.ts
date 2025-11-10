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
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // Download an arbitrary instruction we should be able to decode
  const { transactionRequest } = expectDefined(
    await rpcHttpGetTransaction(
      rpcHttp,
      signatureFromBase58(
        "2nfkyQhqVjS5jmejXfBiZFt97tvopdyRpwXTg8HaXaxBqiTNGm3tUMYohS2es9HFsFePcPYoD3cpcRhxEqJ2mmSU",
      ),
    ),
  );
  // Check we can decode the instruction correctly
  const instruction = expectDefined(transactionRequest.instructions[1]);
  const instructionIdl = expectDefined(
    idlProgramGuessInstruction(programIdl, instruction),
  );
  expect(instructionIdl.name).toStrictEqual("update_tranches_amounts_due");
  // Check instruction inputs decoding
  const instructionAddresses = idlInstructionAccountsDecode(
    instructionIdl,
    instruction.inputs,
  );
  expect(instructionAddresses["deal"]).toStrictEqual(
    "7uZHNgrXDz2NeUBY7g21CUi3LGmCPPn4rFwpnbujA9n4",
  );
  // Check instruction data decoding
  const instructionPayload = idlInstructionArgsDecode(
    instructionIdl,
    instruction.data,
  );
  expect(instructionPayload).toStrictEqual(null);
});
