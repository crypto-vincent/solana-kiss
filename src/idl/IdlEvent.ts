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

/**
 * Represents a parsed IDL event definition, including its discriminator
 * and associated type information used for encoding and decoding event data.
 */
export type IdlEvent = {
  name: string;
  docs: IdlDocs;
  discriminator: Uint8Array;
  typeFlat: IdlTypeFlat;
  typeFull: IdlTypeFull;
};

/**
 * Encodes an event payload value into its binary representation,
 * prepending the event's discriminator bytes.
 * @param self - The IDL event definition.
 * @param eventPayload - The event payload to encode as a JSON value.
 * @returns An object containing the encoded `eventData` bytes.
 */
export function idlEventEncode(self: IdlEvent, eventPayload: JsonValue) {
  return {
    eventData: idlTypeFullEncode(
      self.typeFull,
      eventPayload,
      true,
      self.discriminator,
    ),
  };
}

/**
 * Decodes raw event data bytes into a structured event payload value,
 * after first validating the discriminator.
 * @param self - The IDL event definition.
 * @param eventData - The raw event data bytes to decode.
 * @returns An object containing the decoded `eventPayload`.
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
 * Validates that raw event data bytes begin with the expected discriminator.
 * Throws if the discriminator does not match.
 * @param self - The IDL event definition.
 * @param eventData - The raw event data bytes to validate.
 */
export function idlEventCheck(self: IdlEvent, eventData: Uint8Array): void {
  idlUtilsExpectBlobAt(0, self.discriminator, eventData);
}

/**
 * Parses an IDL event definition from its raw JSON representation.
 * Resolves type references using the provided typedef map and derives a
 * discriminator (defaulting to the Anchor `event:<name>` hash if not specified).
 * @param eventName - The name of the event.
 * @param eventValue - The raw JSON value describing the event.
 * @param typedefsIdls - A map of known typedef definitions for type resolution.
 * @returns The parsed {@link IdlEvent}.
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
