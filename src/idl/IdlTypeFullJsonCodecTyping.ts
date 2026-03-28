import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullFirst,
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
 * Generates a TypeScript type string for the given full IDL type.
 * @param self - Full IDL type to generate a type string for.
 * @param dependencies - Optional set to collect import names.
 * @returns TypeScript type string.
 */
export function idlTypeFullJsonCodecTyping(
  self: IdlTypeFull,
  dependencies?: Set<string>,
): string {
  return typing(self, { dependencies });
}

function typing(typeFull: IdlTypeFull, context: GenContext): string {
  return typeFull.traverse(visitorTyping, context, null, null);
}

function typingFields(
  typeFullFields: IdlTypeFullFields,
  context: GenContext,
): string {
  return typeFullFields.traverse(visitorTypingFields, context, null, null);
}

function typingArray(items: IdlTypeFull, context: GenContext): string {
  if (items.isPrimitive("u8")) {
    return "Uint8Array";
  }
  return `Array<${typing(items, context)}>`;
}

const visitorTyping = {
  typedef: (self: IdlTypeFullTypedef, context: GenContext) => {
    return typing(self.content, context);
  },
  option: (self: IdlTypeFullOption, context: GenContext) => {
    return `null | ${typing(self.content, context)}`;
  },
  vec: (self: IdlTypeFullVec, context: GenContext) => {
    return typingArray(self.items, context);
  },
  loop: (self: IdlTypeFullLoop, context: GenContext) => {
    return typingArray(self.items, context);
  },
  array: (self: IdlTypeFullArray, context: GenContext) => {
    return typingArray(self.items, context);
  },
  string: (_self: IdlTypeFullString, _context: GenContext) => {
    return "string";
  },
  struct: (self: IdlTypeFullStruct, context: GenContext) => {
    return typingFields(self.fields, context);
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
      value: typingFields(variant.fields, context),
    }));
    if (context.dependencies !== undefined) {
      context.dependencies.add("OneKeyOf");
    }
    return `OneKeyOf<${stringObject(variants)}>`;
  },
  first: (self: IdlTypeFullFirst, context: GenContext) => {
    const candidates = self.candidates.map((variant) => ({
      key: variant.name,
      value: typing(variant.content, context),
    }));
    if (context.dependencies !== undefined) {
      context.dependencies.add("OneKeyOf");
    }
    return `OneKeyOf<${stringObject(candidates)}>`;
  },
  padded: (self: IdlTypeFullPadded, context: GenContext) => {
    return typing(self.content, context);
  },
  blob: (_self: IdlTypeFullBlob, _context: GenContext) => {
    return "null";
  },
  primitive: (self: IdlTypePrimitive, context: GenContext) => {
    return visitorExpressionPrimitive[self](context);
  },
};

const visitorTypingFields = {
  nothing: (_self: Array<never>, _context: GenContext) => {
    return "null";
  },
  named: (self: Array<IdlTypeFullFieldNamed>, context: GenContext) => {
    const entries = [];
    for (const field of self) {
      const fieldTyping = typing(field.content, context);
      if (fieldTyping !== "null") {
        entries.push({ key: field.name, value: fieldTyping });
      }
    }
    return stringObject(entries);
  },
  unnamed: (self: Array<IdlTypeFullFieldUnnamed>, context: GenContext) => {
    return stringArray(self.map((field) => typing(field.content, context)));
  },
};

const visitorExpressionPrimitive: {
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
