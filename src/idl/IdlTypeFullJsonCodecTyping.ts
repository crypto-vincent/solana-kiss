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
  IdlTypeFullTrial,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/**
 * Generates a TypeScript type string for the given full IDL type.
 * @param self - Full IDL type to generate a type string for.
 * @param dependencies - Optional set to collect import names.
 * @returns TypeScript type string.
 */
export function idlTypeFullJsonCodecTyping(
  self: IdlTypeFull,
  dependencies?: Set<string>,
): string {
  return visit(self, { dependencies });
}

function visit(typeFull: IdlTypeFull, context: GenContext): string {
  return typeFull.traverse(visitor, context, null, null);
}

function visitFields(
  typeFullFields: IdlTypeFullFields,
  context: GenContext,
): string {
  return typeFullFields.traverse(visitorFields, context, null, null);
}

function visitArray(items: IdlTypeFull, context: GenContext): string {
  if (items.isPrimitive("u8")) {
    return "Uint8Array";
  }
  return `Array<${visit(items, context)}>`;
}

const visitor = {
  typedef: (self: IdlTypeFullTypedef, context: GenContext) => {
    return visit(self.content, context);
  },
  option: (self: IdlTypeFullOption, context: GenContext) => {
    return `null | ${visit(self.content, context)}`;
  },
  vec: (self: IdlTypeFullVec, context: GenContext) => {
    return visitArray(self.items, context);
  },
  loop: (self: IdlTypeFullLoop, context: GenContext) => {
    return visitArray(self.items, context);
  },
  array: (self: IdlTypeFullArray, context: GenContext) => {
    return visitArray(self.items, context);
  },
  string: (_self: IdlTypeFullString, _context: GenContext) => {
    return "string";
  },
  struct: (self: IdlTypeFullStruct, context: GenContext) => {
    return visitFields(self.fields, context);
  },
  enum: (self: IdlTypeFullEnum, context: GenContext) => {
    if (self.variants.length === 0) {
      return "null";
    }
    if (self.fieldless) {
      const names = self.variants.map((variant) => `"${variant.name}"`);
      return names.join("|");
    }
    const variants = self.variants.map((variant) => ({
      key: variant.name,
      value: visitFields(variant.fields, context),
    }));
    if (context.dependencies !== undefined) {
      context.dependencies.add("OneKeyOf");
    }
    return `OneKeyOf<${stringObject(variants)}>`;
  },
  trial: (self: IdlTypeFullTrial, context: GenContext) => {
    const candidates = self.candidates.map((variant) => ({
      key: variant.name,
      value: visit(variant.content, context),
    }));
    if (context.dependencies !== undefined) {
      context.dependencies.add("OneKeyOf");
    }
    return `OneKeyOf<${stringObject(candidates)}>`;
  },
  padded: (self: IdlTypeFullPadded, context: GenContext) => {
    return visit(self.content, context);
  },
  blob: (_self: IdlTypeFullBlob, _context: GenContext) => {
    return "null";
  },
  primitive: (self: IdlTypePrimitive, context: GenContext) => {
    return visitorPrimitive[self](context);
  },
};

const visitorFields = {
  nothing: (_self: Array<never>, _context: GenContext) => {
    return "null";
  },
  named: (self: Array<IdlTypeFullFieldNamed>, context: GenContext) => {
    const entries = [];
    for (const field of self) {
      const fieldTyping = visit(field.content, context);
      if (fieldTyping !== "null") {
        entries.push({ key: field.name, value: fieldTyping });
      }
    }
    return stringObject(entries);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, context: GenContext) => {
    return stringArray(self.map((field) => visit(field.content, context)));
  },
};

const visitorPrimitive: {
  [K in IdlTypePrimitive]: (context: GenContext) => string;
} = {
  uVar: () => `bigint`,
  u8: () => `number`,
  u16: () => `number`,
  u32: () => `number`,
  u64: () => `bigint`,
  u128: () => `bigint`,
  i8: () => `number`,
  i16: () => `number`,
  i32: () => `number`,
  i64: () => `bigint`,
  i128: () => `bigint`,
  f32: () => `number`,
  f64: () => `number`,
  bool: () => `boolean`,
  pubkey: (context: GenContext) => {
    if (context.dependencies !== undefined) {
      context.dependencies.add("Pubkey");
    }
    return "Pubkey";
  },
};

function stringObject(entries: Array<{ key: string; value: string }>): string {
  return `{${entries.map(({ key, value }) => `${key}:${value}`).join(",")}}`;
}

function stringArray(items: Array<string>): string {
  return `[${items.join(",")}]`;
}

type GenContext = { dependencies: Set<string> | undefined };
