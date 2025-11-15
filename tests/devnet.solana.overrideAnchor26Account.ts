import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  jsonCodecObjectValues,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyToBytes,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
  // Choosing our programAddress
  const programAddress = pubkeyFromBase58(
    "crdszSnZQu7j36KfsMJ4VEmMUTJgrNYXwoPVHUANpAu",
  );
  // Parse IDL from file JSON directly
  solana.setProgramIdl(
    programAddress,
    idlProgramParse(require("./fixtures/idl_anchor_26.json")),
  );
  // Read the global market state content using the IDL
  const globalMarketStateAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("credix-marketplace"),
  ]);
  await assertAccountInfo(
    solana,
    globalMarketStateAddress,
    "GlobalMarketState",
    "seed",
    "credix-marketplace",
  );
  // Read the program state content using the IDL
  const programStateAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("program-state"),
  ]);
  await assertAccountInfo(
    solana,
    programStateAddress,
    "ProgramState",
    "credixMultisigKey",
    "Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
  );
  // Read the market admins content using the IDL
  const marketAdminsAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    utf8Encode("admins"),
  ]);
  await assertAccountInfo(
    solana,
    marketAdminsAddress,
    "MarketAdmins",
    "multisig",
    "Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
  );
  // Check that we could indeed find the right accounts programatically
  const { instructionAddresses } = await solana.hydrateInstructionAddresses(
    programAddress,
    "initialize_market",
    { payload: { globalMarketSeed: "credix-marketplace" } },
  );
  expect(instructionAddresses["global_market_state"]).toStrictEqual(
    globalMarketStateAddress,
  );
  expect(instructionAddresses["program_state"]).toStrictEqual(
    programStateAddress,
  );
  expect(instructionAddresses["market_admins"]).toStrictEqual(
    marketAdminsAddress,
  );
});

async function assertAccountInfo(
  solana: Solana,
  accountAddress: Pubkey,
  accountName: string,
  accountStateKey: string,
  accountStateValue: JsonValue,
) {
  const { accountIdl, accountState } =
    await solana.getAndInferAndDecodeAccount(accountAddress);
  expect(accountIdl.name).toStrictEqual(accountName);
  expect(
    jsonCodecObjectValues.decoder(accountState)[accountStateKey],
  ).toStrictEqual(accountStateValue);
}
