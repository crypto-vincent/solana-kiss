import { expect, it } from "@jest/globals";
import {
  expectDefined,
  IdlLibrary,
  idlLibraryLoaderUrl,
  pubkeyFromBase58,
} from "../src";

it("run", async () => {
  const libraryIdl = new IdlLibrary([
    idlLibraryLoaderUrl(
      (programAddress) =>
        `https://raw.githubusercontent.com/crypto-vincent/solana-idls/refs/heads/main/data/${programAddress}.json`,
    ),
  ]);
  const programIdl = expectDefined(
    await libraryIdl.getOrLoadProgramIdl(
      pubkeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    ),
  );
  expect(programIdl.metadata.name).toStrictEqual("spl_token");
  expect(programIdl.metadata.address).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
});
