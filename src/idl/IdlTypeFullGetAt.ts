import { jsonPointerParse, jsonPointerPreview } from "../data/Json";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullOption,
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export function idlTypeFullGetAt(
  typeFull: IdlTypeFull,
  pathOrPointer: string | Array<string | number>,
): IdlTypeFull {
  const pointer = Array.isArray(pathOrPointer)
    ? pathOrPointer
    : jsonPointerParse(pathOrPointer);
  return visitTypeFull(typeFull, pointer, 0);
}

export function idlTypeFullFieldsGetAt(
  typeFullFields: IdlTypeFullFields,
  pathOrPointer: string | Array<string | number>,
): IdlTypeFull {
  const pointer = Array.isArray(pathOrPointer)
    ? pathOrPointer
    : jsonPointerParse(pathOrPointer);
  return visitTypeFullFields(typeFullFields, pointer, 0);
}

function visitTypeFull(
  typeFull: IdlTypeFull,
  pointer: Array<number | string>,
  tokenIndex: number,
): IdlTypeFull {
  if (tokenIndex >= pointer.length) {
    return typeFull;
  }
  return typeFull.traverse(visitorTypeFull, pointer, tokenIndex, undefined);
}

function visitTypeFullFields(
  typeFullFields: IdlTypeFullFields,
  pointer: Array<number | string>,
  tokenIndex: number,
): IdlTypeFull {
  if (tokenIndex >= pointer.length) {
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to point to a type (found fields)`,
    );
  }
  return typeFullFields.traverse(
    visitorTypeFullFields,
    pointer,
    tokenIndex,
    undefined,
  );
}

const visitorTypeFull = {
  typedef: (
    self: IdlTypeFullTypedef,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    return visitTypeFull(self.content, pointer, tokenIndex);
  },
  option: (
    self: IdlTypeFullOption,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    return visitTypeFull(self.content, pointer, tokenIndex);
  },
  vec: (
    self: IdlTypeFullVec,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (token === "") {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    if (typeof token === "number") {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to index into a Vec`,
    );
  },
  array: (
    self: IdlTypeFullArray,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (token === "") {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    if (typeof token === "number") {
      if (token < 0 || token >= self.length) {
        throw new Error(
          `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be fit in Array of length ${self.length}`,
        );
      }
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to index into an Array`,
    );
  },
  string: (
    _self: IdlTypeFullString,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/enum/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found string)`,
    );
  },
  struct: (
    self: IdlTypeFullStruct,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    return visitTypeFullFields(self.fields, pointer, tokenIndex);
  },
  enum: (
    self: IdlTypeFullEnum,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const current = pointer[tokenIndex]!;
    if (typeof current === "number") {
      const code = BigInt(current);
      for (const variant of self.variants) {
        if (variant.code === code) {
          return visitTypeFullFields(variant.fields, pointer, tokenIndex + 1);
        }
      }
      const codes = self.variants.map((variant) => variant.code).join("/");
      throw new Error(
        `Idl: Expected valid enum variant code at path: ${jsonPointerPreview(pointer, tokenIndex)}, available: ${codes} (found ${code})`,
      );
    }
    const name = current;
    for (const variant of self.variants) {
      if (variant.name === name) {
        return visitTypeFullFields(variant.fields, pointer, tokenIndex + 1);
      }
    }
    const names = self.variants.map((variant) => variant.name).join("/");
    throw new Error(
      `Idl: Expected valid enum variant name at path: ${jsonPointerPreview(pointer, tokenIndex)}, available: ${names} (found ${name})`,
    );
  },
  padded: (
    self: IdlTypeFullPadded,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    return visitTypeFull(self.content, pointer, tokenIndex);
  },
  blob: (
    _self: IdlTypeFullBlob,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/enum/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found blob)`,
    );
  },
  primitive: (
    self: IdlTypePrimitive,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/enum/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found ${self})`,
    );
  },
};

const visitorTypeFullFields = {
  nothing: (
    _self: null,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/enum/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found empty type)`,
    );
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (typeof token === "number") {
      throw new Error(
        `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to lookup a struct's field by name`,
      );
    }
    const name = token;
    for (const field of self) {
      if (field.name === name) {
        return visitTypeFull(field.content, pointer, tokenIndex + 1);
      }
    }
    const names = self.map((field) => field.name).join("/");
    throw new Error(
      `Idl: Expected valid field name at path: ${jsonPointerPreview(pointer, tokenIndex)}, available: ${names} (found ${name})`,
    );
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (typeof token === "string") {
      throw new Error(
        `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to access a tuple's field by index`,
      );
    }
    const index = token;
    for (const field of self) {
      if (field.position === index) {
        return visitTypeFull(field.content, pointer, tokenIndex + 1);
      }
    }
    const positions = self.map((field) => field.position).join("/");
    throw new Error(
      `Idl: Expected valid field index at path: ${jsonPointerPreview(pointer, tokenIndex)}, available: ${positions} (found ${index})`,
    );
  },
};
