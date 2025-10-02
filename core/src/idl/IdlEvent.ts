import {
  jsonDecodeArray,
  jsonDecodeNumber,
  jsonDecodeObject,
  jsonDecodeOptional,
  jsonDecodeValue,
  jsonExpectObject,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../data/Utils";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import {
  idlTypeFlatDefinedDecode,
  idlTypeFlatParseObject,
  idlTypeFlatParseObjectIsPossible,
} from "./IdlTypeFlatDecode";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDeserialize } from "./IdlTypeFullDeserialize";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";
import {
  idlUtilsBytesDecode,
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
  const eventPartial = partialDecode.decode(eventValue);
  const eventObject = jsonExpectObject(eventValue);
  const infoTypeFlat = idlTypeFlatParseObjectIsPossible(eventObject)
    ? idlTypeFlatParseObject(eventObject)
    : idlTypeFlatDefinedDecode(eventName);
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

const partialDecode = jsonDecodeObject({
  docs: jsonDecodeValue,
  space: jsonDecodeOptional(jsonDecodeNumber),
  blobs: jsonDecodeOptional(
    jsonDecodeArray(
      jsonDecodeObject({
        offset: jsonDecodeNumber,
        value: idlUtilsBytesDecode,
      }),
    ),
  ),
  discriminator: jsonDecodeOptional(idlUtilsBytesDecode),
});
