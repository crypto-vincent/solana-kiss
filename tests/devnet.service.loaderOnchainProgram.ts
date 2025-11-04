import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Service,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  const service = new Service(rpcHttpFromUrl(urlPublicRpcDevnet));
  const programIdl = await service.getOrLoadProgramIdl(
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
  );
  expect(programIdl.metadata.name).toStrictEqual("psyche_crowd_funding");
  expect(programIdl.metadata.address).toStrictEqual(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  expect(programIdl.typedefs.size).toStrictEqual(9);
  expect(programIdl.accounts.size).toStrictEqual(3);
  expect(programIdl.instructions.size).toStrictEqual(6);
  expect(programIdl.errors.size).toStrictEqual(5);
  expect(programIdl.events.size).toStrictEqual(0);
});
