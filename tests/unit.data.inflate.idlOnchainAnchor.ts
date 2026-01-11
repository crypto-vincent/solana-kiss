import { it } from "@jest/globals";
import { promises as fsp } from "fs";
import { inflate as referenceInflate } from "uzip";
import { idlProgramParse, inflate, utf8Decode } from "../src";

it("run", async () => {
  const idlOnchainAnchorPath = `./tests/fixtures/idl_onchain_anchor.dump`;
  const idlOnchainAnchorBytes = await fsp.readFile(idlOnchainAnchorPath);
  const idlOnchainAnchorDeflated = idlOnchainAnchorBytes.subarray(44);

  const expectedJsonBytes = referenceInflate(idlOnchainAnchorDeflated);
  const foundJsonBytes = inflate(idlOnchainAnchorDeflated, null);
  expect(foundJsonBytes).toStrictEqual(expectedJsonBytes);

  const programIdl = idlProgramParse(JSON.parse(utf8Decode(foundJsonBytes)));
  expect(programIdl.metadata.address).toStrictEqual(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  expect(programIdl.instructions.size).toStrictEqual(6);
  expect(programIdl.accounts.size).toStrictEqual(2);
  expect(programIdl.errors.size).toStrictEqual(5);
  expect(programIdl.events.size).toStrictEqual(0);
  expect(programIdl.constants.size).toStrictEqual(0);
  expect(programIdl.typedefs.size).toStrictEqual(9);
});
