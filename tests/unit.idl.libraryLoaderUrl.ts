import { expect, it } from "@jest/globals";
import { pubkeyFromBase58, rpcHttpFromUrl, Service } from "../src";

it("run", async () => {
  const service = new Service(rpcHttpFromUrl(""));
  const programIdl = await service.getOrLoadProgramIdl(
    pubkeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  );
  expect(programIdl.metadata.name).toStrictEqual("spl_token");
  expect(programIdl.metadata.address).toStrictEqual(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
});
