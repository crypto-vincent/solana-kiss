import { withErrorContext } from "../data/Error";
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
import {
  IdlTypePrefix,
  idlTypePrefixDefaultEnum,
  idlTypePrefixDefaultOption,
} from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/** Bytemuck layout result: alignment, total size, and padded {@link IdlTypeFull}. */
export type IdlTypeFullBytemuck = {
  alignment: number;
  size: number;
  value: IdlTypeFull;
};

type IdlTypeFullFieldsBytemuck = {
  alignment: number;
  size: number;
  value: IdlTypeFullFields;
};

// TODO (repr) - figure out how to handle discriminator alignment/offset
// TODO (repr) - support Repr modifiers (packed, align(N))
// TODO (repr) - support for transparent/custom

/**
 * Computes bytemuck layout for a typedef, applying `repr` to choose C or Rust layout rules.
 * @param self - Fully-resolved typedef to analyse.
 * @returns Bytemuck layout with alignment, size, and padded type.
 */
export function idlTypeFullTypedefBytemuck(
  self: IdlTypeFullTypedef,
): IdlTypeFullBytemuck {
  return withErrorContext(`Bytemuck: Typedef: ${self.name}`, () => {
    let contentPod;
    if (self.repr === undefined) {
      contentPod = bytemuckRust(self.content);
    } else if (self.repr === "c") {
      contentPod = bytemuckC(self.content);
    } else if (self.repr === "rust") {
      contentPod = bytemuckRust(self.content);
    } else if (self.repr === "transparent") {
      contentPod = bytemuckRust(self.content);
    } else {
      throw new Error(`Bytemuck: Unsupported repr: ${self.repr}`);
    }
    return {
      alignment: contentPod.alignment,
      size: contentPod.size,
      value: IdlTypeFull.typedef({
        name: self.name,
        repr: self.repr,
        content: contentPod.value,
      }),
    };
  });
}

function bytemuckC(self: IdlTypeFull): IdlTypeFullBytemuck {
  return self.traverse(visitorBytemuckC, null, null, null);
}

function bytemuckRust(self: IdlTypeFull): IdlTypeFullBytemuck {
  return self.traverse(visitorBytemuckRust, null, null, null);
}

function bytemuckFields(
  self: IdlTypeFullFields,
  prefixSize: number,
  rustReorder: boolean,
): IdlTypeFullFieldsBytemuck {
  return self.traverse(visitorBytemuckFields, prefixSize, rustReorder, null);
}

const visitorBytemuckC = {
  typedef: (self: IdlTypeFullTypedef): IdlTypeFullBytemuck => {
    return idlTypeFullTypedefBytemuck(self);
  },
  option: (self: IdlTypeFullOption): IdlTypeFullBytemuck => {
    const contentPod = bytemuckC(self.content);
    const prefix = self.prefix ?? idlTypePrefixDefaultOption;
    const alignment = Math.max(
      alignemntFromPrefix(prefix),
      contentPod.alignment,
    );
    const size = alignment + contentPod.size;
    const value = IdlTypeFull.padded({
      before: 0,
      minSize: size,
      content: IdlTypeFull.option({
        prefix: prefixFromAlignment(alignment),
        content: contentPod.value,
      }),
    });
    return { alignment, size, value };
  },
  vec: (_self: IdlTypeFullVec): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(C): Vec is not supported");
  },
  loop: (_self: IdlTypeFullLoop): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(C): Loop is not supported");
  },
  array: (self: IdlTypeFullArray): IdlTypeFullBytemuck => {
    const itemsPod = bytemuckC(self.items);
    const alignment = itemsPod.alignment;
    const size = itemsPod.size * self.length;
    const value = IdlTypeFull.array({
      items: itemsPod.value,
      length: self.length,
    });
    return { alignment, size, value };
  },
  string: (_self: IdlTypeFullString): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(C): String is not supported");
  },
  struct: (self: IdlTypeFullStruct): IdlTypeFullBytemuck => {
    const fieldsPod = bytemuckFields(self.fields, 0, false);
    return {
      alignment: fieldsPod.alignment,
      size: fieldsPod.size,
      value: IdlTypeFull.struct({ fields: fieldsPod.value }),
    };
  },
  enum: (self: IdlTypeFullEnum): IdlTypeFullBytemuck => {
    if (self.variants.length === 0) {
      return { alignment: 1, size: 0, value: IdlTypeFull.enum(self) };
    }
    const prefix = self.prefix ?? idlTypePrefixDefaultEnum;
    let alignment = Math.max(4, alignemntFromPrefix(prefix));
    let size = 0;
    const variantsReprC = [];
    for (const variant of self.variants) {
      const variantFieldsPod = withErrorContext(
        `Bytemuck: Repr(C): Enum Variant: ${variant.name}`,
        () => bytemuckFields(variant.fields, 0, false),
      );
      alignment = Math.max(alignment, variantFieldsPod.alignment);
      size = Math.max(size, variantFieldsPod.size);
      variantsReprC.push({
        name: variant.name,
        code: variant.code,
        fields: variantFieldsPod.value,
      });
    }
    size += alignment;
    return {
      alignment,
      size,
      value: IdlTypeFull.padded({
        before: 0,
        minSize: size,
        content: IdlTypeFull.enum({
          prefix: prefixFromAlignment(alignment),
          mask: self.mask,
          indexByName: self.indexByName,
          indexByCodeBigInt: self.indexByCodeBigInt,
          indexByCodeString: self.indexByCodeString,
          fieldless: self.fieldless,
          variants: variantsReprC,
        }),
      }),
    };
  },
  padded: (self: IdlTypeFullPadded): IdlTypeFullBytemuck => {
    const contentPod = bytemuckC(self.content);
    return {
      alignment: 1,
      size: self.before + Math.max(contentPod.size, self.minSize),
      value: IdlTypeFull.padded({
        before: self.before,
        minSize: self.minSize,
        content: contentPod.value,
      }),
    };
  },
  blob: (_self: IdlTypeFullBlob): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(C): Blob is not supported");
  },
  primitive: (self: IdlTypePrimitive): IdlTypeFullBytemuck => {
    return fromPrimitive(self);
  },
};

const visitorBytemuckRust = {
  typedef: (self: IdlTypeFullTypedef): IdlTypeFullBytemuck => {
    return idlTypeFullTypedefBytemuck(self);
  },
  option: (self: IdlTypeFullOption): IdlTypeFullBytemuck => {
    const contentPod = bytemuckRust(self.content);
    const prefix = self.prefix ?? idlTypePrefixDefaultOption;
    const alignment = Math.max(
      alignemntFromPrefix(prefix),
      contentPod.alignment,
    );
    const size = alignment + contentPod.size;
    const value = IdlTypeFull.padded({
      before: 0,
      minSize: size,
      content: IdlTypeFull.option({
        prefix: prefixFromAlignment(alignment),
        content: contentPod.value,
      }),
    });
    return { alignment, size, value };
  },
  vec: (_self: IdlTypeFullVec): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(Rust): Vec is not supported");
  },
  loop: (_self: IdlTypeFullLoop): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(Rust): Loop is not supported");
  },
  array: (self: IdlTypeFullArray): IdlTypeFullBytemuck => {
    const itemsPod = bytemuckRust(self.items);
    const alignment = itemsPod.alignment;
    const size = itemsPod.size * self.length;
    const value = IdlTypeFull.array({
      items: itemsPod.value,
      length: self.length,
    });
    return { alignment, size, value };
  },
  string: (_self: IdlTypeFullString): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(Rust): String is not supported");
  },
  struct: (self: IdlTypeFullStruct): IdlTypeFullBytemuck => {
    const fieldsPod = bytemuckFields(self.fields, 0, true);
    return {
      alignment: fieldsPod.alignment,
      size: fieldsPod.size,
      value: IdlTypeFull.struct({
        fields: fieldsPod.value,
      }),
    };
  },
  enum: (self: IdlTypeFullEnum): IdlTypeFullBytemuck => {
    if (self.variants.length === 0) {
      return { alignment: 1, size: 0, value: IdlTypeFull.enum(self) };
    }
    const prefix = self.prefix ?? idlTypePrefixDefaultEnum;
    const prefixAlignment = alignemntFromPrefix(prefix);
    let alignment = prefixAlignment;
    let size = alignment;
    const variantsReprRust = [];
    for (const variant of self.variants) {
      const variantFieldsPod = withErrorContext(
        `Bytemuck: Repr(Rust): Enum Variant: ${variant.name}`,
        () => bytemuckFields(variant.fields, prefixAlignment, true),
      );
      alignment = Math.max(alignment, variantFieldsPod.alignment);
      size = Math.max(size, variantFieldsPod.size);
      variantsReprRust.push({
        name: variant.name,
        code: variant.code,
        fields: variantFieldsPod.value,
      });
    }
    size += internalAlignmentPaddingNeeded(size, alignment);
    return {
      alignment,
      size,
      value: IdlTypeFull.padded({
        before: 0,
        minSize: size,
        content: IdlTypeFull.enum({
          prefix: self.prefix,
          mask: self.mask,
          indexByName: self.indexByName,
          indexByCodeBigInt: self.indexByCodeBigInt,
          indexByCodeString: self.indexByCodeString,
          fieldless: self.fieldless,
          variants: variantsReprRust,
        }),
      }),
    };
  },
  padded: (self: IdlTypeFullPadded): IdlTypeFullBytemuck => {
    const contentPod = bytemuckRust(self.content);
    return {
      alignment: 1,
      size: self.before + Math.max(contentPod.size, self.minSize),
      value: IdlTypeFull.padded({
        before: self.before,
        minSize: self.minSize,
        content: contentPod.value,
      }),
    };
  },
  blob: (_self: IdlTypeFullBlob): IdlTypeFullBytemuck => {
    throw new Error("Bytemuck: Repr(Rust): Blob is not supported");
  },
  primitive: (self: IdlTypePrimitive): IdlTypeFullBytemuck => {
    return fromPrimitive(self);
  },
};

const visitorBytemuckFields = {
  nothing: (
    _self: Array<never>,
    _prefixSize: number,
    _rustReorder: boolean,
  ): IdlTypeFullFieldsBytemuck => {
    return {
      alignment: 1,
      size: 0,
      value: IdlTypeFullFields.nothing(),
    };
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    prefixSize: number,
    rustReorder: boolean,
  ): IdlTypeFullFieldsBytemuck => {
    const fieldsInfosPods = self.map((field, index) => {
      const contentPod = withErrorContext(
        `Bytemuck: Field: ${field.name}`,
        () => bytemuckRust(field.content),
      );
      return {
        index: index,
        alignment: contentPod.alignment,
        size: contentPod.size,
        meta: field.name,
        type: contentPod.value,
      };
    });
    if (rustReorder) {
      internalVerifyUnstableOrder(prefixSize, fieldsInfosPods.length);
    }
    const fieldsInfosPadded = internalFieldsInfoAligned(
      prefixSize,
      fieldsInfosPods,
    );
    return {
      alignment: fieldsInfosPadded.alignment,
      size: fieldsInfosPadded.size,
      value: IdlTypeFullFields.named(
        fieldsInfosPadded.value.map((fieldInfo) => ({
          name: fieldInfo.meta,
          content: fieldInfo.type,
        })),
      ),
    };
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    prefixSize: number,
    rustReorder: boolean,
  ): IdlTypeFullFieldsBytemuck => {
    const fieldsInfosPods = self.map((field, index) => {
      const contentPod = withErrorContext(
        `Bytemuck: Field: Unamed: ${index}`,
        () => bytemuckRust(field.content),
      );
      return {
        index: index,
        alignment: contentPod.alignment,
        size: contentPod.size,
        meta: null,
        type: contentPod.value,
      };
    });
    if (rustReorder) {
      internalVerifyUnstableOrder(prefixSize, fieldsInfosPods.length);
    }
    const fieldsInfosPadded = internalFieldsInfoAligned(
      prefixSize,
      fieldsInfosPods,
    );
    return {
      alignment: fieldsInfosPadded.alignment,
      size: fieldsInfosPadded.size,
      value: IdlTypeFullFields.unnamed(
        fieldsInfosPadded.value.map((fieldInfo) => ({
          content: fieldInfo.type,
        })),
      ),
    };
  },
};

function internalFieldsInfoAligned<T>(
  prefixSize: number,
  fieldsInfo: Array<{
    index: number;
    alignment: number;
    size: number;
    meta: T;
    type: IdlTypeFull;
  }>,
) {
  let alignment = prefixSize;
  let size = prefixSize;
  const lastFieldIndex = fieldsInfo.length - 1;
  const fieldsInfoPadded = [];
  for (const fieldInfo of fieldsInfo) {
    const {
      index: fieldIndex,
      alignment: fieldAlignment,
      size: fieldSize,
      meta: fieldMeta,
      type: fieldType,
    } = fieldInfo;
    alignment = Math.max(alignment, fieldAlignment);
    const paddingBefore = internalAlignmentPaddingNeeded(size, fieldAlignment);
    size += paddingBefore + fieldSize;
    let paddingAfter = 0;
    if (fieldIndex === lastFieldIndex) {
      paddingAfter = internalAlignmentPaddingNeeded(size, alignment);
    }
    size += paddingAfter;
    if (paddingBefore === 0 && paddingAfter === 0) {
      fieldsInfoPadded.push({ meta: fieldMeta, type: fieldType });
    } else {
      fieldsInfoPadded.push({
        meta: fieldMeta,
        type: IdlTypeFull.padded({
          before: paddingBefore,
          minSize: fieldSize + paddingAfter,
          content: fieldType,
        }),
      });
    }
  }
  return { alignment, size, value: fieldsInfoPadded };
}

function internalAlignmentPaddingNeeded(
  offset: number,
  alignment: number,
): number {
  const missalignment = offset % alignment;
  if (missalignment === 0) {
    return 0;
  }
  return alignment - missalignment;
}

function internalVerifyUnstableOrder(prefixSize: number, fieldsCount: number) {
  if (prefixSize === 0 && fieldsCount <= 2) {
    return;
  }
  if (fieldsCount <= 1) {
    return;
  }
  throw new Error(
    "Bytemuck: Repr(Rust): Structs/Enums/Tuples fields ordering is compiler-dependent. Use Repr(C) instead.",
  );
}

function prefixFromAlignment(alignment: number): IdlTypePrefix {
  const prefix = prefixByKnownSize.get(alignment);
  if (prefix === undefined) {
    throw new Error(`Bytemuck: Unknown alignment: ${alignment}`);
  }
  return prefix;
}

function alignemntFromPrefix(prefix: IdlTypePrefix): number {
  const alignment = knownSizeByPrefix.get(prefix);
  if (alignment === undefined) {
    throw new Error(`Bytemuck: Unknown prefix: ${prefix}`);
  }
  return alignment;
}

const prefixByKnownSize: Map<number, IdlTypePrefix> = new Map([
  [1, "u8"],
  [2, "u16"],
  [4, "u32"],
  [8, "u64"],
  [16, "u128"],
]);

const knownSizeByPrefix: Map<IdlTypePrefix, number> = new Map(
  Array.from(prefixByKnownSize.entries()).map(([size, prefix]) => [
    prefix,
    size,
  ]),
);

function fromPrimitive(primitive: IdlTypePrimitive): IdlTypeFullBytemuck {
  const alignment = knownAlignmentByPrimitive.get(primitive);
  if (alignment === undefined) {
    throw new Error(`Bytemuck: Unknown primitive alignment: ${primitive}`);
  }
  const size = knownSizeByPrimitive.get(primitive);
  if (size === undefined) {
    throw new Error(`Bytemuck: Unknown primitive size: ${primitive}`);
  }
  const value = IdlTypeFull.primitive(primitive);
  return { alignment, size, value };
}

const knownSizeByPrimitive: Map<IdlTypePrimitive, number> = new Map([
  ["u8", 1],
  ["u16", 2],
  ["u32", 4],
  ["u64", 8],
  ["u128", 16],
  ["i8", 1],
  ["i16", 2],
  ["i32", 4],
  ["i64", 8],
  ["i128", 16],
  ["f32", 4],
  ["f64", 8],
  ["bool", 1],
  ["pubkey", 32],
]);

const knownAlignmentByPrimitive: Map<IdlTypePrimitive, number> = new Map([
  ["u8", 1],
  ["u16", 2],
  ["u32", 4],
  ["u64", 8],
  ["u128", 16],
  ["i8", 1],
  ["i16", 2],
  ["i32", 4],
  ["i64", 8],
  ["i128", 16],
  ["f32", 4],
  ["f64", 8],
  ["bool", 1],
  ["pubkey", 1],
]);
