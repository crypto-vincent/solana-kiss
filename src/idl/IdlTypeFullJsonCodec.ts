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

/** Generates a TS module string with a JSON codec for an IDL type. */
export function idlTypeFullJsonCodecModule(
  self: IdlTypeFull,
  importPath?: string,
): string {
  const dependencies = new Set<string>();
  dependencies.add("JsonCodecContent");
  const codecExpression = idlTypeFullJsonCodecExpression(self, dependencies);
  const importNames = [...dependencies].join(",");
  return [
    ``,
    `import {${importNames}} from "${importPath ?? "solana-kiss"}";`,
    ``,
    `export type JsonContent = JsonCodecContent<typeof jsonCodec>;`,
    ``,
    `export const jsonCodec = ${codecExpression};`,
    ``,
  ].join("\n");
}

/** Generates a TS codec expression string for an IDL type. */
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
    return stringFunctionCall(context, "jsonCodecArrayToBytes");
  }
  return stringFunctionCall(context, "jsonCodecArrayToArray", [
    codec(context, items),
  ]);
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef, context: CodecContext) => {
    return codec(context, self.content);
  },
  option: (self: IdlTypeFullOption, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecNullable", [
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
    if (self.variants.length === 0) {
      return stringFunctionCall(context, "jsonCodecConst", ["null"]);
    }
    const variantsNames = new Array<string>();
    let fieldless = true;
    for (const variant of self.variants) {
      variantsNames.push(`"${variant.name}"`);
      if (!variant.fields.isNothing()) {
        fieldless = false;
      }
    }
    if (fieldless) {
      return stringFunctionCall(context, "jsonCodecConst", variantsNames);
    }
    const entries = [];
    for (const variant of self.variants) {
      const variantFields = codecFields(context, variant.fields);
      entries.push({ key: variant.name, value: variantFields });
    }
    return stringFunctionCall(context, "jsonCodecObjectToEnum", [
      stringObject(entries),
    ]);
  },
  pad: (self: IdlTypeFullPad, context: CodecContext) => {
    return codec(context, self.content);
  },
  blob: (_self: IdlTypeFullBlob, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecConst", ["null"]);
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
      const fieldContent = codec(context, field.content);
      if (fieldContent === "jsonCodecConst(null)") {
        continue;
      }
      entries.push({ key: field.name, value: fieldContent });
    }
    return stringFunctionCall(context, "jsonCodecObjectToObject", [
      stringObject(entries),
    ]);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, context: CodecContext) => {
    return stringFunctionCall(context, "jsonCodecArrayToTuple", [
      stringArray(self.map((field) => codec(context, field.content))),
    ]);
  },
};

const visitorPrimitive = {
  u8: () => `jsonCodecNumber`,
  u16: () => `jsonCodecNumber`,
  u32: () => `jsonCodecNumber`,
  u64: () => `jsonCodecBigInt`,
  u128: () => `jsonCodecBigInt`,
  i8: () => `jsonCodecNumber`,
  i16: () => `jsonCodecNumber`,
  i32: () => `jsonCodecNumber`,
  i64: () => `jsonCodecBigInt`,
  i128: () => `jsonCodecBigInt`,
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

function stringObject(entries: Array<{ key: string; value: string }>): string {
  return `{${entries.map(({ key, value }) => `${key}:${value}`).join(",")}}`;
}

function stringArray(items: Array<string>): string {
  return `[${items.join(",")}]`;
}
