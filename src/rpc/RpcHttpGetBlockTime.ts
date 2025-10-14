import { BlockSlot, blockSlotToNumber } from "../data/Block";
import { jsonCodecNumber, jsonDecoderOptional } from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockTime(
  rpcHttp: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{ blockInfo: { time: Date | undefined } }> {
  const result = resultJsonDecoder(
    await rpcHttp("getBlockTime", [blockSlotToNumber(blockSlot)], undefined),
  );
  return { blockInfo: { time: result ? new Date(result * 1000) : undefined } };
}

const resultJsonDecoder = jsonDecoderOptional(jsonCodecNumber.decoder);
