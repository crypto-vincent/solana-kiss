
import {JsonCodecContent,jsonCodecNumber,jsonCodecArrayToArray,jsonCodecNullable,jsonCodecConst,jsonCodecString,jsonCodecArrayToBytes,jsonCodecArrayToTuple,jsonCodecBigInt,jsonCodecPubkey,jsonCodecBoolean,jsonCodecObjectToObject,jsonCodecObjectToEnum} from "../../src";

export type JsonContent = JsonCodecContent<typeof jsonCodec>;

export const jsonCodec = jsonCodecObjectToObject({field1:jsonCodecNumber,field2:jsonCodecArrayToArray(jsonCodecNumber),field3:jsonCodecNullable(jsonCodecNumber),field4:jsonCodecConst("variant1","variant2"),field5:jsonCodecObjectToEnum({0:jsonCodecArrayToTuple([jsonCodecString,jsonCodecArrayToBytes]),1:jsonCodecArrayToTuple([jsonCodecNumber,jsonCodecBigInt]),Misc:jsonCodecObjectToObject({key:jsonCodecPubkey,bool:jsonCodecBoolean}),Empty:jsonCodecConst(null)}),fieldSnakeCase:jsonCodecNumber});
