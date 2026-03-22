import { BlockHash } from "../data/Block";
import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Checks if a block hash is still valid.
 * @param blockHash - Block hash to check.
 * @returns `true` if valid.
 */
export async function rpcHttpIsBlockHashValid(
  self: RpcHttp,
  blockHash: BlockHash,
): Promise<boolean> {
  const result = resultJsonDecoder(
    await self("isBlockhashValid", [blockHash], {}),
  );
  return result.value;
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  context: jsonDecoderObjectToObject({
    slot: jsonCodecNumber.decoder,
  }),
  value: jsonCodecBoolean.decoder,
});
