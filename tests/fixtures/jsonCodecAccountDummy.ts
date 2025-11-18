
import {JsonCodecContent,jsonCodecNumber,jsonCodecArray,jsonCodecNullable,jsonCodecConst,jsonCodecString,jsonCodecBytesArray,jsonCodecArrayToTuple,jsonCodecInteger,jsonCodecPubkey,jsonCodecBoolean,jsonCodecObject,jsonCodecObjectToEnum} from "../../src";

export type JsonContent = JsonCodecContent<typeof jsonCodec>;

export const jsonCodec = jsonCodecObject({field1:jsonCodecNumber,field2:jsonCodecArray(jsonCodecNumber),field3:jsonCodecNullable(jsonCodecNumber),field4:jsonCodecConst("variant1","variant2"),field5:jsonCodecObjectToEnum({0:jsonCodecArrayToTuple(jsonCodecString,jsonCodecBytesArray),1:jsonCodecArrayToTuple(jsonCodecNumber,jsonCodecInteger),Misc:jsonCodecObject({key:jsonCodecPubkey,bool:jsonCodecBoolean}),Empty:jsonCodecConst(null)}),fieldSnakeCase:jsonCodecNumber});
