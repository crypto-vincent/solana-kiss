import {
  jsonExpectObject,
  jsonTypeArray,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeOptional,
  jsonTypeValue,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../utils";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParseObject,
  idlTypeFlatParseObjectIsPossible,
  idlTypeFlatParseString,
} from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDeserialize } from "./IdlTypeFullDeserialize";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";
import {
  idlUtilsBytesJsonType,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
} from "./IdlUtils";

export type IdlEvent = {
  name: string;
  docs: JsonValue;
  discriminator: Uint8Array;
  infoTypeFlat: IdlTypeFlat;
  infoTypeFull: IdlTypeFull;
};

export const idlEventUnknown: Immutable<IdlEvent> = {
  name: "Unknown",
  docs: undefined,
  discriminator: new Uint8Array(),
  infoTypeFlat: IdlTypeFlat.structNothing(),
  infoTypeFull: IdlTypeFull.structNothing(),
};

export function idlEventEncode(
  eventIdl: IdlEvent,
  eventPayload: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(eventIdl.discriminator);
  idlTypeFullSerialize(eventIdl.infoTypeFull, eventPayload, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlEventDecode(
  eventIdl: IdlEvent,
  eventData: Uint8Array,
): JsonValue {
  idlEventCheck(eventIdl, eventData);
  const [, eventPayload] = idlTypeFullDeserialize(
    eventIdl.infoTypeFull,
    new DataView(eventData.buffer),
    eventIdl.discriminator.length,
  );
  return eventPayload;
}

export function idlEventCheck(eventIdl: IdlEvent, eventData: Uint8Array): void {
  idlUtilsExpectBlobAt(0, eventIdl.discriminator, eventData);
}

export function idlEventParse(
  eventName: string,
  eventValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlEvent {
  const eventPartial = partialJsonType.decode(eventValue);
  const eventObject = jsonExpectObject(eventValue);
  const infoTypeFlat = idlTypeFlatParseObjectIsPossible(eventObject)
    ? idlTypeFlatParseObject(eventObject)
    : idlTypeFlatParseString(eventName);
  const infoTypeFull = idlTypeFlatHydrate(
    infoTypeFlat,
    new Map(),
    typedefsIdls,
  );
  return {
    name: eventName,
    docs: eventPartial.docs,
    discriminator:
      eventPartial.discriminator ?? idlUtilsDiscriminator(`event:${eventName}`),
    infoTypeFlat,
    infoTypeFull,
  };
}

const partialJsonType = jsonTypeObject({
  docs: jsonTypeValue(),
  space: jsonTypeOptional(jsonTypeNumber()),
  blobs: jsonTypeOptional(
    jsonTypeArray(
      jsonTypeObject({
        offset: jsonTypeNumber(),
        value: idlUtilsBytesJsonType,
      }),
    ),
  ),
  discriminator: jsonTypeOptional(idlUtilsBytesJsonType),
});
