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
  const codecExpression = idlTypeFullJsonCodecExpression(self, dependencies);
  const importNames = [...dependencies].join(",");
  const lines = [];
  lines.push(`import {${importNames}} from "${importPath ?? "solana-kiss"}";`);
  lines.push("");
  lines.push(`export const ${exportName} = ${codecExpression};`);
  lines.push("");
  return lines.join("\n");
}

export function idlTypeFullJsonCodecExpression(
  self: IdlTypeFull,
  dependencies?: Set<string>,
): string {
  return codec({ dependencies }, self);
}

type CodecContext = { dependencies: Set<string> | undefined };

function codec(context: CodecContext, typeFull: IdlTypeFull): string {
  return typeFull.traverse(visitor, context, undefined, undefined);
}

function codecFields(
  context: CodecContext,
  typeFullFields: IdlTypeFullFields,
): string {
  return typeFullFields.traverse(visitorFields, context, undefined, undefined);
}

function codecArray(items: IdlTypeFull, context: CodecContext): string {
  if (items.isPrimitive(IdlTypePrimitive.u8)) {
    return stringFunctionCall(context, "jsonCodecBytesArray");
  }
  return stringFunctionCall(context, "jsonCodecArray", [codec(context, items)]);
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef, context: CodecContext) => {
    return codec(context, self.content);
  },
  option: (self: IdlTypeFullOption, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecOptional", [
      codec(context, self.content),
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
    return codecFields(context, self.fields);
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
        value: codecFields(context, variant.fields),
      });
    }
    return stringFunctionCall(context, "jsonCodecObjectToEnum", [
      stringObjectEntries(context, entries),
    ]);
  },
  pad: (self: IdlTypeFullPad, context: CodecContext) => {
    return codec(context, self.content);
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
        value: codec(context, field.content),
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
      self.map((field) => codec(context, field.content)),
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
