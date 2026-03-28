import { withErrorContext } from "../data/Error";
import {
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonCodecArray,
  jsonCodecObject,
  jsonCodecString,
  jsonPreview,
  JsonValue,
} from "../data/Json";
import { utf8Encode } from "../data/Utf8";
import { objectGetOwnProperty, objectGuessIntendedKey } from "../data/Utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullEnumVariant,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullLoop,
  IdlTypeFullOption,
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTrial,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import {
  idlTypePrefixDefaultEnum,
  idlTypePrefixDefaultOption,
  idlTypePrefixDefaultString,
  idlTypePrefixDefaultVec,
  idlTypePrefixEncode,
} from "./IdlTypePrefix";
import { IdlTypePrimitive, idlTypePrimitiveEncode } from "./IdlTypePrimitive";
import { idlUtilsBytesJsonDecoder } from "./IdlUtils";

/**
 * Encodes a JSON value into binary using the given IDL type.
 * @param self - IDL type describing the binary layout.
 * @param value - Value to encode.
 * @param options.discriminator - Optional bytes to prepend.
 * @param options.blobMode - If true, default to zero-length prefix (default: false).
 * @returns Encoded binary.
 */
export function idlTypeFullEncode(
  self: IdlTypeFull,
  value: JsonValue,
  options?: { discriminator?: Uint8Array; blobMode?: boolean },
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  if (options?.discriminator !== undefined) {
    blobs.push(options.discriminator);
  }
  withErrorContext(`Idl: Encode`, () => {
    visit(self, value, blobs, !options?.blobMode);
  });
  return blobsFlatten(blobs);
}

function visit(
  self: IdlTypeFull,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  self.traverse(visitor, value, blobs, prefixed);
}

function visitFields(
  self: IdlTypeFullFields,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  self.traverse(visitorFields, value, blobs, prefixed);
}

const visitor = {
  typedef: (
    self: IdlTypeFullTypedef,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    withErrorContext(`Typedef: ${self.name}`, () => {
      return visit(self.content, value, blobs, prefixed);
    });
  },
  option: (
    self: IdlTypeFullOption,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const prefix =
      self.prefix ?? (prefixed ? idlTypePrefixDefaultOption : "u0");
    if (value === null) {
      idlTypePrefixEncode(prefix, 0n, blobs);
      return;
    }
    idlTypePrefixEncode(prefix, 1n, blobs);
    visit(self.content, value, blobs, prefixed);
  },
  vec: (
    self: IdlTypeFullVec,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const prefix = self.prefix ?? (prefixed ? idlTypePrefixDefaultVec : "u0");
    if (self.items.isPrimitive("u8")) {
      const bytes = idlUtilsBytesJsonDecoder(value);
      idlTypePrefixEncode(prefix, BigInt(bytes.length), blobs);
      blobs.push(bytes);
      return;
    }
    const array = jsonCodecArray.decoder(value);
    idlTypePrefixEncode(prefix, BigInt(array.length), blobs);
    for (const item of array) {
      visit(self.items, item, blobs, prefixed);
    }
  },
  loop: (
    self: IdlTypeFullLoop,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const array = jsonCodecArray.decoder(value);
    for (const item of array) {
      visit(self.items, item, blobs, prefixed);
    }
    if (self.stop !== "end") {
      visit(self.items, self.stop.value, blobs, prefixed);
    }
  },
  array: (
    self: IdlTypeFullArray,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.items.isPrimitive("u8")) {
      const bytes = idlUtilsBytesJsonDecoder(value);
      if (bytes.length != self.length) {
        throw new Error(
          `Expected an array of size: ${self.length}, found: ${bytes.length}`,
        );
      }
      blobs.push(bytes);
      return;
    }
    const array = jsonCodecArray.decoder(value);
    if (array.length != self.length) {
      throw new Error(
        `Expected an array of size: ${self.length}, found: ${array.length}`,
      );
    }
    for (const item of array) {
      visit(self.items, item, blobs, prefixed);
    }
  },
  string: (
    self: IdlTypeFullString,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const prefix =
      self.prefix ?? (prefixed ? idlTypePrefixDefaultString : "u0");
    const bytes = utf8Encode(jsonCodecString.decoder(value));
    idlTypePrefixEncode(prefix, BigInt(bytes.length), blobs);
    blobs.push(bytes);
  },
  struct: (
    self: IdlTypeFullStruct,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    visitFields(self.fields, value, blobs, prefixed);
  },
  enum: (
    self: IdlTypeFullEnum,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.variants.length === 0) {
      if (value !== null && value !== undefined) {
        throw new Error("Expected value to be null for empty enum");
      }
      return;
    }
    function enumVariantEncode(
      variant: IdlTypeFullEnumVariant,
      value: JsonValue,
    ) {
      withErrorContext(`Enum Variant: ${variant.name}`, () => {
        const prefix =
          self.prefix ?? (prefixed ? idlTypePrefixDefaultEnum : "u0");
        idlTypePrefixEncode(prefix, variant.code, blobs);
        visitFields(variant.fields, value, blobs, prefixed);
      });
    }
    const number = jsonAsNumber(value);
    if (number !== undefined) {
      const variantIndex = self.indexByCodeString.get(String(number));
      if (variantIndex === undefined) {
        throw new Error(`Could not find enum variant with code: ${value}`);
      }
      return enumVariantEncode(self.variants[variantIndex]!, null);
    }
    const string = jsonAsString(value);
    if (string !== undefined) {
      let variantIndex =
        self.indexByName.get(string) ?? self.indexByCodeString.get(string);
      if (variantIndex === undefined) {
        throw new Error(
          `Could not find enum variant with name or code: ${value}`,
        );
      }
      return enumVariantEncode(self.variants[variantIndex]!, null);
    }
    const object = jsonAsObject(value);
    if (object !== undefined) {
      for (const variant of self.variants) {
        const valueAtName = objectGetOwnProperty(object, variant.name);
        if (valueAtName !== undefined) {
          return enumVariantEncode(variant, valueAtName);
        }
      }
      for (const variant of self.variants) {
        const valueAtCode = objectGetOwnProperty(object, String(variant.code));
        if (valueAtCode !== undefined) {
          return enumVariantEncode(variant, valueAtCode);
        }
      }
      throw new Error("Could not guess enum variant from object key");
    }
    throw new Error(
      `Expected enum value to be: number, string or object (found: ${jsonPreview(value)})`,
    );
  },
  trial: (
    self: IdlTypeFullTrial,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const object = jsonCodecObject.decoder(value);
    for (const candidate of self.candidates) {
      const candidateValue = objectGetOwnProperty(object, candidate.name);
      if (candidateValue === undefined) {
        continue;
      }
      withErrorContext(`Trial: Candidate: ${candidate.name}`, () => {
        visit(candidate.content, candidateValue, blobs, prefixed);
      });
      return;
    }
    throw new Error("Could not guess candidate from object key");
  },
  padded: (
    self: IdlTypeFullPadded,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.before) {
      blobs.push(new Uint8Array(self.before));
    }
    let contentSize = 0;
    const contentBlobs = new Array<Uint8Array>();
    visit(self.content, value, contentBlobs, prefixed);
    for (const contentBlob of contentBlobs) {
      blobs.push(contentBlob);
      contentSize += contentBlob.length;
    }
    if (self.minSize > contentSize) {
      blobs.push(new Uint8Array(self.minSize - contentSize));
    }
  },
  blob: (self: IdlTypeFullBlob, value: JsonValue, blobs: Array<Uint8Array>) => {
    if (value !== null) {
      throw new Error("Expected value to be null for blob type");
    }
    blobs.push(self.bytes);
  },
  primitive: (
    self: IdlTypePrimitive,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    _prefixed: boolean,
  ) => {
    idlTypePrimitiveEncode(self, value, blobs);
  },
};

const visitorFields = {
  nothing: (
    _self: Array<never>,
    value: JsonValue,
    _blobs: Array<Uint8Array>,
  ) => {
    if (value !== null) {
      throw new Error("Expected value to be null for empty fields");
    }
    return;
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const object = jsonCodecObject.decoder(value);
    for (const field of self) {
      const fieldName = objectGuessIntendedKey(object, field.name);
      const fieldValue = objectGetOwnProperty(object, fieldName);
      withErrorContext(`Field: ${fieldName}`, () => {
        visit(field.content, fieldValue ?? null, blobs, prefixed);
      });
    }
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const array = jsonCodecArray.decoder(value);
    for (let index = 0; index < self.length; index++) {
      const field = self[index]!;
      withErrorContext(`Field: Unamed: ${index}`, () => {
        visit(field.content, array[index] ?? null, blobs, prefixed);
      });
    }
  },
};

function blobsFlatten(blobs: Array<Uint8Array>): Uint8Array {
  let length = 0;
  for (const blob of blobs) {
    length += blob.length;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const blob of blobs) {
    bytes.set(blob, offset);
    offset += blob.length;
  }
  return bytes;
}
