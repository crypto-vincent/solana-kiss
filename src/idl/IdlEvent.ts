import {
  JsonValue,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeValue,
} from "../data/Json";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParse,
  idlTypeFlatParseIsPossible,
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
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlEvent {
  const info = infoJsonDecoder(eventValue);
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
    docs: info.docs,
    discriminator:
      info.discriminator ?? idlUtilsDiscriminator(`event:${eventName}`),
    infoTypeFlat,
    infoTypeFull,
  };
}

const infoJsonDecoder = jsonDecoderObject((key) => key, {
  docs: jsonTypeValue.decoder,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonType.decoder),
});
