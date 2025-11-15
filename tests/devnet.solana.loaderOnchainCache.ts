import { it } from "@jest/globals";
import {
  idlProgramParse,
  JsonArray,
  JsonObject,
  pubkeyCreateFromSeed,
  pubkeyDefault,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyNewDummy,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcCounters = new Map<string, number>();

  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const solana = new Solana(
    (method: string, params: JsonArray, config: JsonObject | undefined) => {
      const key = counterKey(method, params);
      const count = rpcCounters.get(key) ?? 0;
      rpcCounters.set(key, count + 1);
      return rpcHttp(method, params, config);
    },
  );

  const knownProgramAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );

  for (const programAddress of [
    knownProgramAddress,
    pubkeyDefault,
    pubkeyNewDummy(),
  ]) {
    const anchorIdlAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );

    solana.setProgramIdl(programAddress, idlProgramParse({}));
    await solana.getOrLoadProgramIdl(programAddress);
    await solana.getOrLoadProgramIdl(programAddress);
    expect(
      rpcCounters.get(counterKey("getAccountInfo", [anchorIdlAddress])),
    ).toBe(undefined);

    solana.setProgramIdl(programAddress, undefined);
    await solana.getOrLoadProgramIdl(programAddress);
    await solana.getOrLoadProgramIdl(programAddress);
    expect(
      rpcCounters.get(counterKey("getAccountInfo", [anchorIdlAddress])),
    ).toBe(1);

    rpcCounters.clear();
  }

  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    knownProgramAddress,
    "Campaign",
  );
  rpcCounters.clear();

  const ownedAccountAddress = accountsAddresses.values().next().value!;
  await solana.getAndInferAndDecodeAccount(ownedAccountAddress);
  await solana.getAndInferAndDecodeAccount(ownedAccountAddress);
  expect(rpcCounters.size).toBe(1);
  expect(
    rpcCounters.get(counterKey("getAccountInfo", [ownedAccountAddress])),
  ).toBe(2);
  rpcCounters.clear();

  const fakeCollateralMint = pubkeyNewDummy();
  const { instructionAddresses } = await solana.hydrateInstructionAddresses(
    knownProgramAddress,
    "campaign_create",
    {
      addresses: { collateralMint: fakeCollateralMint },
      payload: { params: { index: "0" } },
    },
  );
  expect(rpcCounters.size).toBe(0);
  expect(Object.values(instructionAddresses).length).toBe(6);
  expect(instructionAddresses["collateral_mint"]).toStrictEqual(
    fakeCollateralMint,
  );
  expect(instructionAddresses["system_program"]).toStrictEqual(pubkeyDefault);
});

function counterKey(method: string, params: JsonArray): string {
  return `${method}:${JSON.stringify(params)}`;
}
