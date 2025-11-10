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
  const dependencies = new Set<string>();
  const codec = idlTypeFullJsonCodecValue(self, dependencies);
  const lines = [];
  const importNames = [...dependencies].join(",");
  lines.push(`import {${importNames}} from "${importPath ?? "solana-kiss"}";`);
  lines.push("");
  lines.push(`export const ${exportName} = ${codec};`);
  lines.push("");
  return lines.join("\n");
}

export function idlTypeFullJsonCodecValue(
  self: IdlTypeFull,
  dependencies?: Set<string>,
): string {
  return codec(self, { dependencies });
}

type CodecContext = { dependencies: Set<string> | undefined };

function codec(typeFull: IdlTypeFull, context: CodecContext): string {
  return typeFull.traverse(visitor, context, undefined, undefined);
}

function codecFields(
  typeFullFields: IdlTypeFullFields,
  context: CodecContext,
): string {
  return typeFullFields.traverse(visitorFields, context, undefined, undefined);
}

function codecArray(items: IdlTypeFull, context: CodecContext): string {
  if (items.isPrimitive(IdlTypePrimitive.u8)) {
    return stringFunctionCall(context, "jsonCodecBytesArray");
  }
  return stringFunctionCall(context, "jsonCodecArray", [codec(items, context)]);
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef, context: CodecContext) => {
    return codec(self.content, context);
  },
  option: (self: IdlTypeFullOption, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecOptional", [
      codec(self.content, context),
    ]);
  },
  vec: (self: IdlTypeFullVec, context: CodecContext) => {
    return codecArray(self.items, context);
  },
  loop: (self: IdlTypeFullLoop, context: CodecContext) => {
    return codecArray(self.items, context);
  },
  array: (self: IdlTypeFullArray, context: CodecContext) => {
    return codecArray(self.items, context);
  },
  string: (_self: IdlTypeFullString, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecString");
  },
  struct: (self: IdlTypeFullStruct, context: CodecContext) => {
    return codecFields(self.fields, context);
  },
  enum: (self: IdlTypeFullEnum, context: CodecContext) => {
    const variantsNames = new Array<string>();
    let hasFields = false;
    for (const variant of self.variants) {
      variantsNames.push(`"${variant.name}"`);
      if (!variant.fields.isNothing()) {
        hasFields = true;
      }
    }
    if (!hasFields) {
      return stringFunctionCall(context, "jsonCodecConst", variantsNames);
    }
    const entries = [];
    for (const variant of self.variants) {
      entries.push({
        key: variant.name,
        value: codecFields(variant.fields, context),
      });
    }
    return stringFunctionCall(context, "jsonCodecObjectToEnum", [
      stringObjectEntries(context, entries),
    ]);
  },
  pad: (self: IdlTypeFullPad, dependencies: CodecContext) => {
    return codec(self.content, dependencies);
  },
  blob: (_self: IdlTypeFullBlob, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecConst", ["undefined"]);
  },
  primitive: (self: IdlTypePrimitive, context: CodecContext) => {
    return stringFunctionCall(
      context,
      self.traverse(visitorPrimitive, undefined, undefined),
    );
  },
};

const visitorFields = {
  nothing: (_self: null, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecConst", ["null"]);
  },
  named: (self: Array<IdlTypeFullFieldNamed>, context: CodecContext) => {
    const entries = [];
    for (const field of self) {
      let fieldName = field.name;
      const fieldNameCamel = casingConvertToCamel(field.name);
      const fieldNameSnake = casingConvertToSnake(fieldNameCamel);
      if (fieldName === fieldNameSnake) {
        fieldName = fieldNameCamel;
      }
      entries.push({
        key: fieldName,
        value: codec(field.content, context),
      });
    }
    return stringFunctionCall(context, "jsonCodecObject", [
      stringObjectEntries(context, entries),
    ]);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, context: CodecContext) => {
    return stringFunctionCall(
      context,
      "jsonCodecArrayToTuple",
      self.map((field) => codec(field.content, context)),
    );
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

function stringFunctionCall(
  context: CodecContext,
  functionName: string,
  functionParams?: Array<string>,
) {
  if (context.dependencies !== undefined) {
    context.dependencies.add(functionName);
  }
  if (functionParams === undefined) {
    return `${functionName}`;
  }
  return `${functionName}(${functionParams.join(",")})`;
}

function stringObjectEntries(
  _context: CodecContext,
  objectEntries: Array<{ key: string; value: string }>,
): string {
  return `{${objectEntries.map(({ key, value }) => `${key}:${value}`).join(",")}}`;
}
