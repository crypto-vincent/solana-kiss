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
  IdlTypeFullPad,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { idlTypePrefixEncode } from "./IdlTypePrefix";
import { IdlTypePrimitive, idlTypePrimitiveEncode } from "./IdlTypePrimitive";
import { idlUtilsBytesJsonDecoder } from "./IdlUtils";

/** Encodes a JSON value to binary using a full IDL type. */

export function idlTypeFullEncode(
  self: IdlTypeFull,
  value: JsonValue,
  prefixed: boolean,
  discriminator?: Uint8Array,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  if (discriminator !== undefined) {
    blobs.push(discriminator);
  }
  typeFullEncode(self, value, prefixed, blobs);
  return blobsFlatten(blobs);
}

/** Encodes a JSON value to binary using full IDL type fields. */

export function idlTypeFullFieldsEncode(
  self: IdlTypeFullFields,
  value: JsonValue,
  prefixed: boolean,
  discriminator?: Uint8Array,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  if (discriminator !== undefined) {
    blobs.push(discriminator);
  }
  typeFullFieldsEncode(self, value, prefixed, blobs);
  return blobsFlatten(blobs);
}

function typeFullEncode(
  self: IdlTypeFull,
  value: JsonValue,
  prefixed: boolean,
  blobs: Array<Uint8Array>,
) {
  self.traverse(visitorEncode, value, blobs, prefixed);
}

function typeFullFieldsEncode(
  self: IdlTypeFullFields,
  value: JsonValue,
  prefixed: boolean,
  blobs: Array<Uint8Array>,
) {
  self.traverse(visitorFieldsEncode, value, blobs, prefixed);
}

const visitorEncode = {
  typedef: (
    self: IdlTypeFullTypedef,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    withErrorContext(`Encode: Typedef: ${self.name}`, () => {
      return typeFullEncode(self.content, value, prefixed, blobs);
    });
  },
  option: (
    self: IdlTypeFullOption,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (value === null) {
      if (prefixed) {
        idlTypePrefixEncode(self.prefix, 0n, blobs);
      }
      return;
    }
    if (prefixed) {
      idlTypePrefixEncode(self.prefix, 1n, blobs);
    }
    typeFullEncode(self.content, value, prefixed, blobs);
  },
  vec: (
    self: IdlTypeFullVec,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      const bytes = idlUtilsBytesJsonDecoder(value);
      if (prefixed) {
        idlTypePrefixEncode(self.prefix, BigInt(bytes.length), blobs);
      }
      blobs.push(bytes);
      return;
    }
    const array = jsonCodecArray.decoder(value);
    if (prefixed) {
      idlTypePrefixEncode(self.prefix, BigInt(array.length), blobs);
    }
    for (const item of array) {
      typeFullEncode(self.items, item, prefixed, blobs);
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
      typeFullEncode(self.items, item, prefixed, blobs);
    }
    if (self.stop !== "end") {
      typeFullEncode(self.items, self.stop.value, prefixed, blobs);
    }
  },
  array: (
    self: IdlTypeFullArray,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
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
      typeFullEncode(self.items, item, prefixed, blobs);
    }
  },
  string: (
    self: IdlTypeFullString,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const bytes = utf8Encode(jsonCodecString.decoder(value));
    if (prefixed) {
      idlTypePrefixEncode(self.prefix, BigInt(bytes.length), blobs);
    }
    blobs.push(bytes);
  },
  struct: (
    self: IdlTypeFullStruct,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    typeFullFieldsEncode(self.fields, value, prefixed, blobs);
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
      withErrorContext(`Encode: Enum Variant: ${variant.name}`, () => {
        idlTypePrefixEncode(self.prefix, variant.code, blobs);
        typeFullFieldsEncode(variant.fields, value, prefixed, blobs);
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
  pad: (
    self: IdlTypeFullPad,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.before) {
      blobs.push(new Uint8Array(self.before));
    }
    let contentSize = 0;
    const contentBlobs = new Array<Uint8Array>();
    typeFullEncode(self.content, value, prefixed, contentBlobs);
    for (const contentBlob of contentBlobs) {
      blobs.push(contentBlob);
      contentSize += contentBlob.length;
    }
    if (self.end > contentSize) {
      blobs.push(new Uint8Array(self.end - contentSize));
    }
  },
  blob: (
    self: IdlTypeFullBlob,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    _prefixed: boolean,
  ) => {
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

const visitorFieldsEncode = {
  nothing: (
    _self: null,
    value: JsonValue,
    _blobs: Array<Uint8Array>,
    _prefixed: boolean,
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
      withErrorContext(`Encode: Field: ${fieldName}`, () => {
        typeFullEncode(field.content, fieldValue ?? null, prefixed, blobs);
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
      withErrorContext(`Encode: Field: Unamed: ${index}`, () => {
        typeFullEncode(field.content, array[index] ?? null, prefixed, blobs);
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
