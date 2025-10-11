import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlInstructionAddressesFind,
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramParse,
  jsonCodecObjectRaw,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyToBytes,
  RpcHttp,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  utf8Encode,
} from "../src";

it("run", async () => {
  // Create the endpoint
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  // Choosing our programAddress
  const programAddress = pubkeyFromBase58(
    "crdszSnZQu7j36KfsMJ4VEmMUTJgrNYXwoPVHUANpAu",
  );
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_anchor_26.json"));
  // Read the global market state content using the IDL
  const globalMarketStateAddress = pubkeyFindPdaAddress(programAddress, [
    utf8Encode("credix-marketplace"),
  ]);
  await assertAccountInfo(
    rpcHttp,
    programIdl,
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
    rpcHttp,
    programIdl,
    programStateAddress,
    "ProgramState",
    "credix_multisig_key",
    "Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
  );
  // Read the market admins content using the IDL
  const marketAdminsAddress = pubkeyFindPdaAddress(programAddress, [
    pubkeyToBytes(globalMarketStateAddress),
    utf8Encode("admins"),
  ]);
  await assertAccountInfo(
    rpcHttp,
    programIdl,
    marketAdminsAddress,
    "MarketAdmins",
    "multisig",
    "Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL",
  );
  // Check that we could indeed find the right accounts programatically
  const instructionAddresses = idlInstructionAddressesFind(
    expectDefined(programIdl.instructions.get("initialize_market")),
    {
      instructionProgramAddress: programAddress,
      instructionAddresses: new Map(),
      instructionPayload: { global_market_seed: "credix-marketplace" },
    },
  );
  expect(instructionAddresses.get("global_market_state")).toStrictEqual(
    globalMarketStateAddress,
  );
  expect(instructionAddresses.get("program_state")).toStrictEqual(
    programStateAddress,
  );
  expect(instructionAddresses.get("market_admins")).toStrictEqual(
    marketAdminsAddress,
  );
});

async function assertAccountInfo(
  rpcHttp: RpcHttp,
  programIdl: IdlProgram,
  accountAddress: Pubkey,
  accountName: string,
  accountStateKey: string,
  accountStateValue: JsonValue,
) {
  const { accountInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    accountAddress,
  );
  const accountIdl = expectDefined(
    idlProgramGuessAccount(programIdl, accountInfo.data),
  );
  const accountState = idlAccountDecode(accountIdl, accountInfo.data);
  expect(accountIdl.name).toStrictEqual(accountName);
  expect(
    jsonCodecObjectRaw.decoder(accountState)[accountStateKey],
  ).toStrictEqual(accountStateValue);
}
