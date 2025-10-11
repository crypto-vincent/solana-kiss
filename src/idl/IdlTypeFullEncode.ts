import {
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonCodecArrayRaw,
  jsonCodecObjectRaw,
  jsonCodecString,
  JsonValue,
} from "../data/Json";
import { utf8Encode } from "../data/Utf8";
import { withContext } from "../data/Utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullEnumVariant,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
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

export function idlTypeFullEncode(
  typeFull: IdlTypeFull,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  typeFull.traverse(visitorEncode, value, blobs, prefixed);
}

export function idlTypeFullFieldsEncode(
  typeFullFields: IdlTypeFullFields,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  typeFullFields.traverse(visitorFieldsEncode, value, blobs, prefixed);
}

const visitorEncode = {
  typedef: (
    self: IdlTypeFullTypedef,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    withContext(`Encode: Typedef: ${self.name}`, () => {
      return idlTypeFullEncode(self.content, value, blobs, prefixed);
    });
  },
  option: (
    self: IdlTypeFullOption,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (value === null || value === undefined) {
      idlTypePrefixEncode(self.prefix, 0n, blobs);
      return;
    }
    idlTypePrefixEncode(self.prefix, 1n, blobs);
    idlTypeFullEncode(self.content, value, blobs, prefixed);
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
    const array = jsonCodecArrayRaw.decoder(value);
    if (prefixed) {
      idlTypePrefixEncode(self.prefix, BigInt(array.length), blobs);
    }
    for (const item of array) {
      idlTypeFullEncode(self.items, item, blobs, prefixed);
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
    const array = jsonCodecArrayRaw.decoder(value);
    if (array.length != self.length) {
      throw new Error(
        `Expected an array of size: ${self.length}, found: ${array.length}`,
      );
    }
    for (const item of array) {
      idlTypeFullEncode(self.items, item, blobs, prefixed);
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
    idlTypeFullFieldsEncode(self.fields, value, blobs, prefixed);
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
      withContext(`Encode: Enum Variant: ${variant.name}`, () => {
        idlTypePrefixEncode(self.prefix, variant.code, blobs);
        idlTypeFullFieldsEncode(variant.fields, value, blobs, prefixed);
      });
    }
    const number = jsonAsNumber(value);
    if (number !== undefined) {
      const code = BigInt(number);
      for (const variant of self.variants) {
        if (variant.code === code) {
          return enumVariantEncode(variant, undefined);
        }
      }
      throw new Error(`Could not find enum variant with code: ${value}`);
    }
    const string = jsonAsString(value);
    if (string !== undefined) {
      for (const variant of self.variants) {
        if (variant.name === string) {
          return enumVariantEncode(variant, undefined);
        }
      }
      throw new Error(`Could not find enum variant with name: ${value}`);
    }
    const object = jsonAsObject(value);
    if (object !== undefined) {
      for (const variant of self.variants) {
        if (object.hasOwnProperty(variant.name)) {
          return enumVariantEncode(variant, object[variant.name]);
        }
      }
      throw new Error("Could not guess enum variant from object key");
    }
    throw new Error("Expected enum value to be: number/string or object");
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
    idlTypeFullEncode(self.content, value, contentBlobs, prefixed);
    for (const contentBlob of contentBlobs) {
      blobs.push(contentBlob);
      contentSize += contentBlob.length;
    }
    if (self.minSize > contentSize) {
      blobs.push(new Uint8Array(self.minSize - contentSize));
    }
    if (self.after) {
      blobs.push(new Uint8Array(self.after));
    }
  },
  blob: (
    self: IdlTypeFullBlob,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    _prefixed: boolean,
  ) => {
    if (value !== null && value !== undefined) {
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
    if (value !== null && value !== undefined) {
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
    const object = jsonCodecObjectRaw.decoder(value);
    for (const field of self) {
      withContext(`Encode: Field: ${field.name}`, () => {
        idlTypeFullEncode(field.content, object[field.name], blobs, prefixed);
      });
    }
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const array = jsonCodecArrayRaw.decoder(value);
    for (const field of self) {
      withContext(`Encode: Field: ${field.position}`, () => {
        idlTypeFullEncode(
          field.content,
          array[field.position],
          blobs,
          prefixed,
        );
      });
    }
  },
};
