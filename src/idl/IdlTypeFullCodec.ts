import { casingConvertToCamel, casingConvertToSnake } from "../data/Casing";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
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
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export function idlTypeFullCodec(
  self: IdlTypeFull,
  exportName: string,
): string {
  return `export const ${exportName} = ${typeCodec(self)};`;
}

function typeCodec(typeFull: IdlTypeFull): string {
  return typeFull.traverse(visitor, undefined, undefined, undefined);
}

function typeCodecFields(typeFullFields: IdlTypeFullFields): string {
  return typeFullFields.traverse(
    visitorFields,
    undefined,
    undefined,
    undefined,
  );
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef) => {
    return typeCodec(self.content);
  },
  option: (self: IdlTypeFullOption) => {
    return `jsonCodecOptional(${typeCodec(self.content)})`;
  },
  vec: (self: IdlTypeFullVec) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      return `jsonCodecBytesArray`;
    }
    return `jsonCodecArray(${typeCodec(self.items)})`;
  },
  loop: (self: IdlTypeFullLoop) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      return `jsonCodecBytesArray`;
    }
    return `jsonCodecArray(${typeCodec(self.items)})`;
  },
  array: (self: IdlTypeFullArray) => {
    if (self.items.isPrimitive(IdlTypePrimitive.u8)) {
      return `jsonCodecBytesArray`;
    }
    return `jsonCodecArray(${typeCodec(self.items)})`;
  },
  string: (_self: IdlTypeFullString) => {
    return `jsonCodecString`;
  },
  struct: (self: IdlTypeFullStruct) => {
    return typeCodecFields(self.fields);
  },
  enum: (self: IdlTypeFullEnum) => {
    const variantsNames = [];
    const variantsEntries = [];
    let hasFields = false;
    for (const variant of self.variants) {
      variantsNames.push(`"${variant.name}"`);
      variantsEntries.push(
        `${variant.name}:${typeCodecFields(variant.fields)}`,
      );
      if (!variant.fields.isNothing()) {
        hasFields = true;
      }
    }
    if (!hasFields) {
      return `jsonCodecConst(${variantsNames.join(",")})`;
    } else {
      return `jsonCodecObjectToEnum({${variantsEntries.join(",")}})`;
    }
  },
  pad: (self: IdlTypeFullPad) => {
    return typeCodec(self.content);
  },
  blob: (_self: IdlTypeFullBlob) => {
    return `jsonCodecConst(undefined)`;
  },
  primitive: (self: IdlTypePrimitive) => {
    return self.traverse(visitorPrimitive, undefined, undefined);
  },
};

const visitorFields = {
  nothing: (_self: null) => {
    return `jsonCodecConst(undefined)`;
  },
  named: (self: Array<IdlTypeFullFieldNamed>) => {
    const fields = [];
    for (const field of self) {
      let fieldName = field.name;
      const fieldNameCamel = casingConvertToCamel(field.name);
      const fieldNameSnake = casingConvertToSnake(fieldNameCamel);
      if (fieldName === fieldNameSnake) {
        fieldName = fieldNameCamel;
      }
      fields.push(`${fieldName}:${typeCodec(field.content)}`);
    }
    return `jsonCodecObject({${fields.join(",")}})`;
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>) => {
    const fields = [];
    for (const field of self) {
      fields.push(typeCodec(field.content));
    }
    return `jsonCodecArrayToTuple(${fields.join(",")})`;
  },
};

const visitorPrimitive = {
  u8: () => `jsonCodecNumber`,
  u16: () => `jsonCodecNumber`,
  u32: () => `jsonCodecNumber`,
  u64: () => `jsonCodecInteger`,
  u128: () => `jsonCodecInteger`,
  i8: () => `jsonCodecNumber`,
  i16: () => `jsonCodecNumber`,
  i32: () => `jsonCodecNumber`,
  i64: () => `jsonCodecInteger`,
  i128: () => `jsonCodecInteger`,
  f32: () => `jsonCodecNumber`,
  f64: () => `jsonCodecNumber`,
  bool: () => `jsonCodecBoolean`,
  pubkey: () => `jsonCodecPubkey`,
};
