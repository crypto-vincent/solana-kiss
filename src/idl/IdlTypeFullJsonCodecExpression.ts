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
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/**
 * Generates a TypeScript expression string for the JSON codec of the given IDL type.
 * @param self - Full IDL type to generate an expression string for.
 * @param dependencies - Optional set to collect import names.
 * @returns TypeScript expression string.
 */
export function idlTypeFullJsonCodecExpression(
  self: IdlTypeFull,
  dependencies?: Set<string>,
): string {
  return expression(self, { dependencies });
}

function expression(typeFull: IdlTypeFull, context: GenContext): string {
  return typeFull.traverse(visitorExpression, context, null, null);
}

function expressionFields(
  typeFullFields: IdlTypeFullFields,
  context: GenContext,
): string {
  return typeFullFields.traverse(visitorExpressionFields, context, null, null);
}

function expressionArray(items: IdlTypeFull, context: GenContext): string {
  if (items.isPrimitive("u8")) {
    return stringFunctionCall(context, "jsonCodecArrayToBytes");
  }
  return stringFunctionCall(context, "jsonCodecArrayToArray", [
    expression(items, context),
  ]);
}

const visitorExpression = {
  typedef: (self: IdlTypeFullTypedef, context: GenContext) => {
    return expression(self.content, context);
  },
  option: (self: IdlTypeFullOption, context: GenContext) => {
    return stringFunctionCall(context, "jsonCodecNullable", [
      expression(self.content, context),
    ]);
  },
  vec: (self: IdlTypeFullVec, context: GenContext) => {
    return expressionArray(self.items, context);
  },
  loop: (self: IdlTypeFullLoop, context: GenContext) => {
    return expressionArray(self.items, context);
  },
  array: (self: IdlTypeFullArray, context: GenContext) => {
    return expressionArray(self.items, context);
  },
  string: (_self: IdlTypeFullString, context: GenContext) => {
    return stringFunctionCall(context, "jsonCodecString");
  },
  struct: (self: IdlTypeFullStruct, context: GenContext) => {
    return expressionFields(self.fields, context);
  },
  enum: (self: IdlTypeFullEnum, context: GenContext) => {
    if (self.variants.length === 0) {
      return stringFunctionCall(context, "jsonCodecConst", ["null"]);
    }
    if (self.fieldless) {
      const names = self.variants.map((variant) => `"${variant.name}"`);
      return stringFunctionCall(context, "jsonCodecConst", names);
    }
    const variants = self.variants.map((variant) => {
      return {
        key: variant.name,
        value: expressionFields(variant.fields, context),
      };
    });
    return stringFunctionCall(context, "jsonCodecObjectToEnum", [
      stringObject(variants),
    ]);
  },
  padded: (self: IdlTypeFullPadded, context: GenContext) => {
    return expression(self.content, context);
  },
  blob: (_self: IdlTypeFullBlob, context: GenContext) => {
    return stringFunctionCall(context, "jsonCodecConst", ["null"]);
  },
  primitive: (self: IdlTypePrimitive, context: GenContext) => {
    const functionName = visitorExpressionPrimitive[self](context);
    return stringFunctionCall(context, functionName);
  },
};

const visitorExpressionFields = {
  nothing: (_self: Array<never>, context: GenContext) => {
    return stringFunctionCall(context, "jsonCodecConst", ["null"]);
  },
  named: (self: Array<IdlTypeFullFieldNamed>, context: GenContext) => {
    const entries = [];
    for (const field of self) {
      const value = expression(field.content, context);
      if (value !== "jsonCodecConst(null)") {
        entries.push({ key: field.name, value });
      }
    }
    return stringFunctionCall(context, "jsonCodecObjectToObject", [
      stringObject(entries),
    ]);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, context: GenContext) => {
    return stringFunctionCall(context, "jsonCodecArrayToTuple", [
      stringArray(self.map((field) => expression(field.content, context))),
    ]);
  },
};

const visitorExpressionPrimitive: {
  [K in IdlTypePrimitive]: (context: GenContext) => string;
} = {
  varint: () => `jsonCodecBigInt`,
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
  context: GenContext,
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

type GenContext = { dependencies: Set<string> | undefined };
