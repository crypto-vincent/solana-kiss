import { expect, it } from "@jest/globals";
import {
  idlLoaderFromOnchainNative,
  Pubkey,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const onchainDataFetcher = async (accountAddress: Pubkey) => {
    const { accountData } = await rpcHttpGetAccountWithData(
      rpcHttp,
      accountAddress,
    );
    return accountData;
  };

  // Check that we can fetch a canonical metadata IDL
  const programIdl = await idlLoaderFromOnchainNative(onchainDataFetcher)(
    pubkeyFromBase58("ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S"),
  );
  expect(programIdl.metadata.version).toStrictEqual("1.0.0");
  expect(programIdl.metadata.source?.toString()).toStrictEqual(
    "onchain://solana-program-metadata/canonical",
  );

  // Test fetching IDLs uploaded non-canonical
  const nonCanonicalExampleTester = async (authorityAddress: Pubkey) => {
    const idlLoader = idlLoaderFromOnchainNative(onchainDataFetcher, {
      nonCanonicalAuthorityAddress: authorityAddress,
    });
    const programIdl = await idlLoader(
      pubkeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    );
    expect(programIdl.metadata.name).toBeDefined();
    expect(programIdl.accounts.size).toBeGreaterThan(0);
    expect(programIdl.instructions.size).toBeGreaterThan(0);
    expect(programIdl.metadata.source?.toString()).toStrictEqual(
      `onchain://solana-program-metadata/authority/${authorityAddress}`,
    );
  };

  // Case for: Direct + None
  await nonCanonicalExampleTester(
    pubkeyFromBase58("HnH4ovnkrsEbmjtR7eqxJv8rCweqaT6ANeiowzcohFvh"),
  ); //EMp7EZ5rttw5HcrSNZnr65iDD5DuPLXaC1uiTLTwDDvE

  // Case for: Direct + ZLib
  await nonCanonicalExampleTester(
    pubkeyFromBase58("4EhK6yKokBZjn9aWDCxoH65T3eNyPUJSaGaki5i9RuGh"),
  );

  // Case for: External + Zlib
  await nonCanonicalExampleTester(
    pubkeyFromBase58("6EAYWCvqfrAZ5qWXm5Lhrwh2dMyxwssGhAyEgaTRVMe6"),
  );

  // Case for: External + None
  await nonCanonicalExampleTester(
    pubkeyFromBase58("GAGDk1Cn8RrshKDvGXgtkqMfFbdUrkXSfsPoUAqozNK8"),
  );

  // Case for: URL + Zlib
  await nonCanonicalExampleTester(
    pubkeyFromBase58("Horhk7ZDq1vajnR2243MM3oDhc5G5TGkwCfJGCpbTin"),
  );
});
