import {
  jsonCodecArray,
  jsonCodecArrayToTuple,
  jsonCodecBoolean,
  jsonCodecBytesArray,
  jsonCodecConst,
  jsonCodecInteger,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecObjectToEnum,
  jsonCodecOptional,
  jsonCodecPubkey,
  jsonCodecString,
} from "../../src";

export const jsonCodecAccountDummy = jsonCodecObject({
  field1: jsonCodecNumber,
  field2: jsonCodecArray(jsonCodecNumber),
  field3: jsonCodecOptional(jsonCodecNumber),
  field4: jsonCodecConst("variant1", "variant2"),
  field5: jsonCodecObjectToEnum({
    0: jsonCodecArrayToTuple(jsonCodecString, jsonCodecBytesArray),
    1: jsonCodecArrayToTuple(jsonCodecNumber, jsonCodecInteger),
    Misc: jsonCodecObject({ key: jsonCodecPubkey, bool: jsonCodecBoolean }),
    Empty: jsonCodecConst(null),
  }),
});
