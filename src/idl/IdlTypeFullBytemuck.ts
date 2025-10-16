import { withContext } from "../data/Utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullOption,
  IdlTypeFullPad,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { IdlTypePrefix, idlTypePrefixBySize } from "./IdlTypePrefix";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

type IdlTypeFullPod = {
  alignment: number;
  size: number;
  value: IdlTypeFull;
};

type IdlTypeFullPodFields = {
  alignment: number;
  size: number;
  value: IdlTypeFullFields;
};

// TODO (repr) - figure out how to handle discriminator alignment/offset
// TODO (repr) - support Repr modifiers (packed, align(N))
// TODO (repr) - support for transparent/custom
export function idlTypeFullTypedefBytemuck(
  typeFullTypedef: IdlTypeFullTypedef,
): IdlTypeFullPod {
  return withContext(`Bytemuck: Typedef: ${typeFullTypedef.name}`, () => {
    let contentPod;
    if (typeFullTypedef.repr === undefined) {
      contentPod = bytemuckRust(typeFullTypedef.content);
    } else if (typeFullTypedef.repr === "c") {
      contentPod = bytemuckC(typeFullTypedef.content);
    } else if (typeFullTypedef.repr === "rust") {
      contentPod = bytemuckRust(typeFullTypedef.content);
    } else if (typeFullTypedef.repr === "transparent") {
      contentPod = bytemuckRust(typeFullTypedef.content);
    } else {
      throw new Error(`Bytemuck: Unsupported repr: ${typeFullTypedef.repr}`);
    }
    return {
      alignment: contentPod.alignment,
      size: contentPod.size,
      value: IdlTypeFull.typedef({
        name: typeFullTypedef.name,
        repr: typeFullTypedef.repr,
        content: contentPod.value,
      }),
    };
  });
}

function bytemuckC(typeFull: IdlTypeFull): IdlTypeFullPod {
  return typeFull.traverse(visitorBytemuckC, undefined, undefined, undefined);
}

function bytemuckRust(typeFull: IdlTypeFull): IdlTypeFullPod {
  return typeFull.traverse(
    visitorBytemuckRust,
    undefined,
    undefined,
    undefined,
  );
}

function bytemuckFields(
  typeFullFields: IdlTypeFullFields,
  prefixSize: number,
  rustReorder: boolean,
): IdlTypeFullPodFields {
  return typeFullFields.traverse(
    visitorBytemuckFields,
    prefixSize,
    rustReorder,
    undefined,
  );
}

const visitorBytemuckC = {
  typedef: (self: IdlTypeFullTypedef): IdlTypeFullPod => {
    return idlTypeFullTypedefBytemuck(self);
  },
  option: (self: IdlTypeFullOption): IdlTypeFullPod => {
    const contentPod = bytemuckC(self.content);
    const alignment = Math.max(self.prefix.size, contentPod.alignment);
    const size = alignment + contentPod.size;
    return {
      alignment,
      size,
      value: IdlTypeFull.pad({
        before: 0,
        minSize: size,
        after: 0,
        content: IdlTypeFull.option({
          prefix: internalPrefixFromAlignment(alignment),
          content: contentPod.value,
        }),
      }),
    };
  },
  vec: (_self: IdlTypeFullVec): IdlTypeFullPod => {
    throw new Error("Bytemuck: Repr(C): Vec is not supported");
  },
  array: (self: IdlTypeFullArray): IdlTypeFullPod => {
    const itemsPod = bytemuckC(self.items);
    const alignment = itemsPod.alignment;
    const size = itemsPod.size * self.length;
    return {
      alignment,
      size,
      value: IdlTypeFull.array({
        items: itemsPod.value,
        length: self.length,
      }),
    };
  },
  string: (_self: IdlTypeFullString): IdlTypeFullPod => {
    throw new Error("Bytemuck: Repr(C): String is not supported");
  },
  struct: (self: IdlTypeFullStruct): IdlTypeFullPod => {
    const fieldsPod = bytemuckFields(self.fields, 0, false);
    return {
      alignment: fieldsPod.alignment,
      size: fieldsPod.size,
      value: IdlTypeFull.struct({
        fields: fieldsPod.value,
      }),
    };
  },
  enum: (self: IdlTypeFullEnum): IdlTypeFullPod => {
    if (self.variants.length === 0) {
      return {
        alignment: 1,
        size: 0,
        value: IdlTypeFull.enum(self),
      };
    }
    let alignment = Math.max(4, self.prefix.size);
    let size = 0;
    const variantsReprC = [];
    for (const variant of self.variants) {
      const variantFieldsPod = withContext(
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
      value: IdlTypeFull.pad({
        before: 0,
        minSize: size,
        after: 0,
        content: IdlTypeFull.enum({
          prefix: internalPrefixFromAlignment(alignment),
          mask: self.mask,
          indexByName: self.indexByName,
          indexByCodeBigInt: self.indexByCodeBigInt,
          indexByCodeString: self.indexByCodeString,
          variants: variantsReprC,
        }),
      }),
    };
  },
  pad: (self: IdlTypeFullPad): IdlTypeFullPod => {
    const contentPod = bytemuckC(self.content);
    return {
      alignment: 1,
      size: self.before + Math.max(contentPod.size, self.minSize) + self.after,
      value: IdlTypeFull.pad({
        before: self.before,
        minSize: self.minSize,
        after: self.after,
        content: contentPod.value,
      }),
    };
  },
  blob: (self: IdlTypeFullBlob): IdlTypeFullPod => {
    return {
      alignment: 1,
      size: self.bytes.length,
      value: IdlTypeFull.blob({ bytes: self.bytes }),
    };
  },
  primitive: (self: IdlTypePrimitive): IdlTypeFullPod => {
    return {
      alignment: self.alignment,
      size: self.size,
      value: IdlTypeFull.primitive(self),
    };
  },
};

const visitorBytemuckRust = {
  typedef: (self: IdlTypeFullTypedef): IdlTypeFullPod => {
    return idlTypeFullTypedefBytemuck(self);
  },
  option: (self: IdlTypeFullOption): IdlTypeFullPod => {
    const contentPod = bytemuckRust(self.content);
    const alignment = Math.max(self.prefix.size, contentPod.alignment);
    const size = alignment + contentPod.size;
    return {
      alignment,
      size,
      value: IdlTypeFull.pad({
        before: 0,
        minSize: size,
        after: 0,
        content: IdlTypeFull.option({
          prefix: internalPrefixFromAlignment(alignment),
          content: contentPod.value,
        }),
      }),
    };
  },
  vec: (_self: IdlTypeFullVec): IdlTypeFullPod => {
    throw new Error("Bytemuck: Repr(Rust): Vec is not supported");
  },
  array: (self: IdlTypeFullArray): IdlTypeFullPod => {
    const itemsPod = bytemuckRust(self.items);
    const alignment = itemsPod.alignment;
    const size = itemsPod.size * self.length;
    return {
      alignment,
      size,
      value: IdlTypeFull.array({
        items: itemsPod.value,
        length: self.length,
      }),
    };
  },
  string: (_self: IdlTypeFullString): IdlTypeFullPod => {
    throw new Error("Bytemuck: Repr(Rust): String is not supported");
  },
  struct: (self: IdlTypeFullStruct): IdlTypeFullPod => {
    const fieldsPod = bytemuckFields(self.fields, 0, true);
    return {
      alignment: fieldsPod.alignment,
      size: fieldsPod.size,
      value: IdlTypeFull.struct({
        fields: fieldsPod.value,
      }),
    };
  },
  enum: (self: IdlTypeFullEnum): IdlTypeFullPod => {
    if (self.variants.length === 0) {
      return {
        alignment: 1,
        size: 0,
        value: IdlTypeFull.enum(self),
      };
    }
    let alignment = self.prefix.size;
    let size = self.prefix.size;
    const variantsReprRust = [];
    for (const variant of self.variants) {
      const variantFieldsPod = withContext(
        `Bytemuck: Repr(Rust): Enum Variant: ${variant.name}`,
        () => bytemuckFields(variant.fields, self.prefix.size, true),
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
      value: IdlTypeFull.pad({
        before: 0,
        minSize: size,
        after: 0,
        content: IdlTypeFull.enum({
          prefix: self.prefix,
          mask: self.mask,
          indexByName: self.indexByName,
          indexByCodeBigInt: self.indexByCodeBigInt,
          indexByCodeString: self.indexByCodeString,
          variants: variantsReprRust,
        }),
      }),
    };
  },
  pad: (self: IdlTypeFullPad): IdlTypeFullPod => {
    const contentPod = bytemuckRust(self.content);
    return {
      alignment: 1,
      size: self.before + Math.max(contentPod.size, self.minSize) + self.after,
      value: IdlTypeFull.pad({
        before: self.before,
        minSize: self.minSize,
        after: self.after,
        content: contentPod.value,
      }),
    };
  },
  blob: (self: IdlTypeFullBlob): IdlTypeFullPod => {
    return {
      alignment: 1,
      size: self.bytes.length,
      value: IdlTypeFull.blob({ bytes: self.bytes }),
    };
  },
  primitive: (self: IdlTypePrimitive): IdlTypeFullPod => {
    return {
      alignment: self.alignment,
      size: self.size,
      value: IdlTypeFull.primitive(self),
    };
  },
};

const visitorBytemuckFields = {
  nothing: (
    _self: null,
    _prefixSize: number,
    _rustReorder: boolean,
  ): IdlTypeFullPodFields => {
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
  ): IdlTypeFullPodFields => {
    const fieldsInfosPods = self.map((field, index) => {
      const contentPod = withContext(`Bytemuck: Field: ${field.name}`, () =>
        bytemuckRust(field.content),
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
  ): IdlTypeFullPodFields => {
    const fieldsInfosPods = self.map((field, index) => {
      const contentPod = withContext(`Bytemuck: Field: ${field.position}`, () =>
        bytemuckRust(field.content),
      );
      return {
        index: index,
        alignment: contentPod.alignment,
        size: contentPod.size,
        meta: field.position,
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
          position: fieldInfo.meta,
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
        type: IdlTypeFull.pad({
          before: paddingBefore,
          minSize: fieldSize,
          after: paddingAfter,
          content: fieldType,
        }),
      });
    }
  }
  return {
    alignment,
    size,
    value: fieldsInfoPadded,
  };
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

function internalPrefixFromAlignment(alignment: number): IdlTypePrefix {
  const prefix = idlTypePrefixBySize.get(alignment);
  if (prefix === undefined) {
    throw new Error(`Bytemuck: Unknown alignment: ${alignment}`);
  }
  return prefix;
}
