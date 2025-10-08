import {
  JsonValue,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParse,
  idlTypeFlatParseIsPossible,
} from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDecode } from "./IdlTypeFullDecode";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import {
  idlUtilsBytesJsonDecoder,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
} from "./IdlUtils";

export type IdlEvent = {
  name: string;
  docs: IdlDocs;
  discriminator: Uint8Array;
  infoTypeFlat: IdlTypeFlat;
  infoTypeFull: IdlTypeFull;
};

export function idlEventEncode(
  eventIdl: IdlEvent,
  eventPayload: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(eventIdl.discriminator);
  idlTypeFullEncode(eventIdl.infoTypeFull, eventPayload, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlEventDecode(
  eventIdl: IdlEvent,
  eventData: Uint8Array,
): JsonValue {
  idlEventCheck(eventIdl, eventData);
  const [_, eventPayload] = idlTypeFullDecode(
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
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlEvent {
  const decoded = jsonDecoder(eventValue);
  const infoTypeFlat = idlTypeFlatParseIsPossible(eventValue)
    ? idlTypeFlatParse(eventValue)
    : idlTypeFlatParse(eventName);
  const infoTypeFull = idlTypeFlatHydrate(
    infoTypeFlat,
    new Map(),
    typedefsIdls,
  );
  return {
    name: eventName,
    docs: decoded.docs,
    discriminator:
      decoded.discriminator ?? idlUtilsDiscriminator(`event:${eventName}`),
    infoTypeFlat,
    infoTypeFull,
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecoder),
});
