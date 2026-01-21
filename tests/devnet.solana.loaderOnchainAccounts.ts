import { it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));

  const { accountState: accountState1 } =
    await solana.getAndInferAndDecodeAccount(
      pubkeyFromBase58("6vQ9Yn1wyrWpfHjHAuGwMfvPxsC9KWnNAt4XUxcG4QgG"),
    );
  expect(accountState1).toBeDefined();

  const { accountState: accountState2 } =
    await solana.getAndInferAndDecodeAccount(
      pubkeyFromBase58("8u2RiPsQCfp9BNiDgHZXdnUr6QeZXCpAadBXS6NztMTM"),
    );
  expect(accountState2).toBeDefined();
});
