import { BlockHash } from "../data/Block";
import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

/**
 * Checks if a given block hash is valid at this point in time.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param blockHash - The block hash to validate.
 * @returns A boolean indicating whether the block hash is valid.
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
