import {
  JsonValue,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
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
  idlUtilsAnchorDiscriminator,
  idlUtilsBytesJsonDecoder,
  idlUtilsExpectBlobAt,
} from "./IdlUtils";

/** Parsed IDL event definition. */
export type IdlEvent = {
  /** camelCase event name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Discriminator bytes at the start of event data. */
  discriminator: Uint8Array;
  /** Unresolved flat type of the event's data layout. */
  typeFlat: IdlTypeFlat;
  /** Fully-resolved type for encoding and decoding. */
  typeFull: IdlTypeFull;
};

/**
 * Encodes an event payload into binary, prepending the discriminator.
 * @param self - IDL event definition.
 * @param eventPayload - Payload to encode as JSON.
 * @returns Object with encoded `eventData` bytes.
 */
export function idlEventEncode(self: IdlEvent, eventPayload: JsonValue) {
  return {
    eventData: idlTypeFullEncode(self.typeFull, eventPayload, {
      discriminator: self.discriminator,
    }),
  };
}

/**
 * Decodes raw event data bytes into an event payload, validating the discriminator.
 * @param self - IDL event definition.
 * @param eventData - Raw event data bytes.
 * @returns Object with decoded `eventPayload`.
 */
export function idlEventDecode(self: IdlEvent, eventData: Uint8Array) {
  idlEventCheck(self, eventData);
  const [_, eventPayload] = idlTypeFullDecode(
    self.typeFull,
    new DataView(eventData.buffer),
    self.discriminator.length,
  );
  return { eventPayload };
}

/**
 * Validates that event data starts with the expected discriminator.
 * @param self - IDL event definition.
 * @param eventData - Raw event data bytes.
 */
export function idlEventCheck(self: IdlEvent, eventData: Uint8Array): void {
  idlUtilsExpectBlobAt(0, self.discriminator, eventData);
}

/**
 * Parses an IDL event definition from its raw JSON representation.
 * @param eventValue - Raw JSON value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlEvent}.
 */
export function idlEventParse(
  eventName: string,
  eventValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlEvent {
  const decoded = jsonDecoder(eventValue);
  const discriminator =
    decoded.discriminator ?? idlUtilsAnchorDiscriminator(`event:${eventName}`);
  const typeFlat = idlTypeFlatParseIsPossible(eventValue)
    ? idlTypeFlatParse(eventValue)
    : idlTypeFlatParse(eventName);
  const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), typedefsIdls);
  return {
    name: eventName,
    docs: decoded.docs,
    discriminator,
    typeFlat,
    typeFull,
  };
}

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderNullable(idlUtilsBytesJsonDecoder),
});
