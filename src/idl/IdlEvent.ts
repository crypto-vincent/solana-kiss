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
  typeFlat: IdlTypeFlat;
  typeFull: IdlTypeFull;
};

export function idlEventEncode(
  eventIdl: IdlEvent,
  eventPayload: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(eventIdl.discriminator);
  idlTypeFullEncode(eventIdl.typeFull, eventPayload, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlEventDecode(
  eventIdl: IdlEvent,
  eventData: Uint8Array,
): JsonValue {
  idlEventCheck(eventIdl, eventData);
  const [_, eventPayload] = idlTypeFullDecode(
    eventIdl.typeFull,
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
  const typeFlat = idlTypeFlatParseIsPossible(eventValue)
    ? idlTypeFlatParse(eventValue)
    : idlTypeFlatParse(eventName);
  const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), typedefsIdls);
  return {
    name: eventName,
    docs: decoded.docs,
    discriminator:
      decoded.discriminator ?? idlUtilsDiscriminator(`event:${eventName}`),
    typeFlat: typeFlat,
    typeFull: typeFull,
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecoder),
});
