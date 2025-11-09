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

export function idlTypeFullJsonCodecModule(
  self: IdlTypeFull,
  exportName: string,
  importPath?: string,
): string {
  const includes = new Set<string>();
  const codec = idlTypeFullJsonCodecValue(self, includes);
  const lines = [];
  lines.push(
    `import {${[...includes].join(",")}} from "${importPath ?? "solana-kiss"}";`,
  );
  lines.push(`export const ${exportName} = ${codec};`);
  return lines.join("\n");
}

export function idlTypeFullJsonCodecValue(
  typeFull: IdlTypeFull,
  includes?: Set<string>,
): string {
  return typeFull.traverse(visitor, includes, undefined, undefined);
}

function codecFields(
  typeFullFields: IdlTypeFullFields,
  includes?: Set<string>,
): string {
  return typeFullFields.traverse(visitorFields, includes, undefined, undefined);
}

function codecArray(items: IdlTypeFull, includes?: Set<string>): string {
  if (items.isPrimitive(IdlTypePrimitive.u8)) {
    return codecValue("jsonCodecBytesArray", includes);
  }
  return codecValue(
    "jsonCodecArray",
    includes,
    idlTypeFullJsonCodecValue(items, includes),
  );
}

function codecValue(
  codecName: string,
  includes?: Set<string>,
  params?: string,
) {
  if (includes !== undefined) {
    includes.add(codecName);
  }
  if (params === undefined) {
    return `${codecName}`;
  }
  return `${codecName}(${params})`;
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef, includes?: Set<string>) => {
    return idlTypeFullJsonCodecValue(self.content, includes);
  },
  option: (self: IdlTypeFullOption, includes?: Set<string>) => {
    return codecValue(
      "jsonCodecOptional",
      includes,
      idlTypeFullJsonCodecValue(self.content, includes),
    );
  },
  vec: (self: IdlTypeFullVec, includes?: Set<string>) => {
    return codecArray(self.items, includes);
  },
  loop: (self: IdlTypeFullLoop, includes?: Set<string>) => {
    return codecArray(self.items, includes);
  },
  array: (self: IdlTypeFullArray, includes?: Set<string>) => {
    return codecArray(self.items, includes);
  },
  string: (_self: IdlTypeFullString, includes?: Set<string>) => {
    return codecValue("jsonCodecString", includes);
  },
  struct: (self: IdlTypeFullStruct, includes?: Set<string>) => {
    return codecFields(self.fields, includes);
  },
  enum: (self: IdlTypeFullEnum, includes?: Set<string>) => {
    const variantsNames = [];
    const variantsEntries = [];
    let hasFields = false;
    for (const variant of self.variants) {
      variantsNames.push(`"${variant.name}"`);
      variantsEntries.push(
        `${variant.name}:${codecFields(variant.fields, includes)}`,
      );
      if (!variant.fields.isNothing()) {
        hasFields = true;
      }
    }
    if (!hasFields) {
      return codecValue("jsonCodecConst", includes, variantsNames.join(","));
    } else {
      return codecValue(
        "jsonCodecObjectToEnum",
        includes,
        `{${variantsEntries.join(",")}}`,
      );
    }
  },
  pad: (self: IdlTypeFullPad, includes?: Set<string>) => {
    return idlTypeFullJsonCodecValue(self.content, includes);
  },
  blob: (_self: IdlTypeFullBlob, includes?: Set<string>) => {
    return codecValue("jsonCodecConst", includes, "undefined");
  },
  primitive: (self: IdlTypePrimitive, includes?: Set<string>) => {
    return codecValue(
      self.traverse(visitorPrimitive, undefined, undefined),
      includes,
    );
  },
};

const visitorFields = {
  nothing: (_self: null, includes?: Set<string>) => {
    return codecValue("jsonCodecConst", includes, "undefined");
  },
  named: (self: Array<IdlTypeFullFieldNamed>, includes?: Set<string>) => {
    const fields = [];
    for (const field of self) {
      let fieldName = field.name;
      const fieldNameCamel = casingConvertToCamel(field.name);
      const fieldNameSnake = casingConvertToSnake(fieldNameCamel);
      if (fieldName === fieldNameSnake) {
        fieldName = fieldNameCamel;
      }
      fields.push(
        `${fieldName}:${idlTypeFullJsonCodecValue(field.content, includes)}`,
      );
    }
    return codecValue("jsonCodecObject", includes, `{${fields.join(",")}}`);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, includes?: Set<string>) => {
    const fields = [];
    for (const field of self) {
      fields.push(idlTypeFullJsonCodecValue(field.content, includes));
    }
    return codecValue("jsonCodecArrayToTuple", includes, fields.join(","));
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
