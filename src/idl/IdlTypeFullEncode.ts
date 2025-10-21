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
import { objectGetOwnProperty, withErrorContext } from "../data/Utils";
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
  prefixed: boolean,
  discriminator?: Uint8Array,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  if (discriminator !== undefined) {
    blobs.push(discriminator);
  }
  typeFullEncode(typeFull, value, prefixed, blobs);
  return blobsFlatten(blobs);
}

export function idlTypeFullFieldsEncode(
  typeFullFields: IdlTypeFullFields,
  value: JsonValue,
  prefixed: boolean,
  discriminator?: Uint8Array,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  if (discriminator !== undefined) {
    blobs.push(discriminator);
  }
  typeFullFieldsEncode(typeFullFields, value, prefixed, blobs);
  return blobsFlatten(blobs);
}

function typeFullEncode(
  typeFull: IdlTypeFull,
  value: JsonValue,
  prefixed: boolean,
  blobs: Array<Uint8Array>,
) {
  typeFull.traverse(visitorEncode, value, blobs, prefixed);
}

function typeFullFieldsEncode(
  typeFullFields: IdlTypeFullFields,
  value: JsonValue,
  prefixed: boolean,
  blobs: Array<Uint8Array>,
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
    if (value === null || value === undefined) {
      idlTypePrefixEncode(self.prefix, 0n, blobs);
      return;
    }
    idlTypePrefixEncode(self.prefix, 1n, blobs);
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
    const array = jsonCodecArrayRaw.decoder(value);
    if (prefixed) {
      idlTypePrefixEncode(self.prefix, BigInt(array.length), blobs);
    }
    for (const item of array) {
      typeFullEncode(self.items, item, prefixed, blobs);
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
      const codeString = String(number);
      const variantIndex = self.indexByCodeString.get(codeString);
      if (variantIndex === undefined) {
        throw new Error(`Could not find enum variant with code: ${value}`);
      }
      return enumVariantEncode(self.variants[variantIndex]!, undefined);
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
      return enumVariantEncode(self.variants[variantIndex]!, undefined);
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
    typeFullEncode(self.content, value, prefixed, contentBlobs);
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
      withErrorContext(`Encode: Field: ${field.name}`, () => {
        typeFullEncode(
          field.content,
          objectGetOwnProperty(object, field.name),
          prefixed,
          blobs,
        );
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
      withErrorContext(`Encode: Field: ${field.position}`, () => {
        typeFullEncode(field.content, array[field.position], prefixed, blobs);
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
