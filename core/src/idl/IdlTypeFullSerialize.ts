import {
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonDecodeArray,
  jsonDecodeObject,
  jsonDecodeString,
  JsonValue,
} from "../data/Json";
import { withContext } from "../data/Utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullEnum,
  IdlTypeFullEnumVariant,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullOption,
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { idlTypePrefixSerialize } from "./IdlTypePrefix";
import {
  IdlTypePrimitive,
  idlTypePrimitiveSerialize,
} from "./IdlTypePrimitive";
import { idlUtilsBytesJsonDecode } from "./IdlUtils";

export function idlTypeFullSerialize(
  typeFull: IdlTypeFull,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  typeFull.traverse(visitorSerialize, value, blobs, prefixed);
}

export function idlTypeFullFieldsSerialize(
  typeFullFields: IdlTypeFullFields,
  value: JsonValue,
  blobs: Array<Uint8Array>,
  prefixed: boolean,
) {
  typeFullFields.traverse(visitorFieldsSerialize, value, blobs, prefixed);
}

const visitorSerialize = {
  typedef: (
    self: IdlTypeFullTypedef,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    withContext(`Serialize: Typedef: ${self.name}`, () => {
      return idlTypeFullSerialize(self.content, value, blobs, prefixed);
    });
  },
  option: (
    self: IdlTypeFullOption,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (value === null) {
      idlTypePrefixSerialize(self.prefix, 0n, blobs);
      return;
    }
    idlTypePrefixSerialize(self.prefix, 1n, blobs);
    idlTypeFullSerialize(self.content, value, blobs, prefixed);
  },
  vec: (
    self: IdlTypeFullVec,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      const blob = idlUtilsBytesJsonDecode(value);
      if (prefixed) {
        idlTypePrefixSerialize(self.prefix, BigInt(blob.length), blobs);
      }
      blobs.push(blob);
      return;
    }
    const array = jsonDecodeArray(value);
    if (prefixed) {
      idlTypePrefixSerialize(self.prefix, BigInt(array.length), blobs);
    }
    for (const item of array) {
      idlTypeFullSerialize(self.items, item, blobs, prefixed);
    }
  },
  array: (
    self: IdlTypeFullArray,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      const blob = idlUtilsBytesJsonDecode(value);
      if (blob.length != self.length) {
        throw new Error(
          `Expected an array of size: ${self.length}, found: ${blob.length}`,
        );
      }
      blobs.push(blob);
      return;
    }
    const array = jsonDecodeArray(value);
    if (array.length != self.length) {
      throw new Error(
        `Expected an array of size: ${self.length}, found: ${array.length}`,
      );
    }
    for (const item of array) {
      idlTypeFullSerialize(self.items, item, blobs, prefixed);
    }
  },
  string: (
    self: IdlTypeFullString,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    const string = jsonDecodeString(value);
    const bytes = new TextEncoder().encode(string);
    if (prefixed) {
      idlTypePrefixSerialize(self.prefix, BigInt(bytes.length), blobs);
    }
    blobs.push(bytes);
  },
  struct: (
    self: IdlTypeFullStruct,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    idlTypeFullFieldsSerialize(self.fields, value, blobs, prefixed);
  },
  enum: (
    self: IdlTypeFullEnum,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.variants.length === 0) {
      if (value !== null) {
        throw new Error("Expected value to be null for empty enum");
      }
      return;
    }
    function serializeEnumVariant(
      variant: IdlTypeFullEnumVariant,
      value: JsonValue,
    ) {
      withContext(`Serialize: Enum Variant: ${variant.name}`, () => {
        idlTypePrefixSerialize(self.prefix, variant.code, blobs);
        idlTypeFullFieldsSerialize(variant.fields, value, blobs, prefixed);
      });
    }
    const number = jsonAsNumber(value);
    if (number !== undefined) {
      const code = BigInt(number);
      for (const variant of self.variants) {
        if (variant.code === code) {
          return serializeEnumVariant(variant, undefined);
        }
      }
      throw new Error(`Could not find enum variant with code: ${value}`);
    }
    const string = jsonAsString(value);
    if (string !== undefined) {
      for (const variant of self.variants) {
        if (variant.name === string) {
          return serializeEnumVariant(variant, undefined);
        }
      }
      throw new Error(`Could not find enum variant with name: ${value}`);
    }
    const object = jsonAsObject(value);
    if (object !== undefined) {
      for (const variant of self.variants) {
        if (object.hasOwnProperty(variant.name)) {
          return serializeEnumVariant(variant, object[variant.name]);
        }
      }
      throw new Error("Could not guess enum variant from object key");
    }
    throw new Error("Expected enum value to be: number/string or object");
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
    idlTypeFullSerialize(self.content, value, contentBlobs, prefixed);
    for (const contentBlob of contentBlobs) {
      blobs.push(contentBlob);
      contentSize += contentBlob.length;
    }
    if (self.minSize && self.minSize > contentSize) {
      blobs.push(new Uint8Array(self.minSize - contentSize));
    }
    if (self.after) {
      blobs.push(new Uint8Array(self.after));
    }
  },
  primitive: (
    self: IdlTypePrimitive,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    _prefixed: boolean,
  ) => {
    idlTypePrimitiveSerialize(self, value, blobs);
  },
};

const visitorFieldsSerialize = {
  nothing: (
    _self: null,
    _value: JsonValue,
    _blobs: Array<Uint8Array>,
    _prefixed: boolean,
  ) => {
    return;
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    value: JsonValue,
    blobs: Array<Uint8Array>,
    prefixed: boolean,
  ) => {
    if (self.length <= 0) {
      return;
    }
    const object = jsonDecodeObject(value);
    for (const field of self) {
      withContext(`Serialize: Field: ${field.name}`, () => {
        idlTypeFullSerialize(
          field.content,
          object[field.name],
          blobs,
          prefixed,
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
    if (self.length <= 0) {
      return;
    }
    const array = jsonDecodeArray(value);
    for (const field of self) {
      withContext(`Serialize: Field: ${field.position}`, () => {
        idlTypeFullSerialize(
          field.content,
          array[field.position],
          blobs,
          prefixed,
        );
      });
    }
  },
};
