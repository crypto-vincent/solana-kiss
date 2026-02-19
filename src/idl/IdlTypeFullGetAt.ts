import { casingLosslessConvertToCamel } from "../data/Casing";
import {
  JsonPointer,
  jsonPointerParse,
  jsonPointerPreview,
  jsonPointerTokenAsArrayIndex,
} from "../data/Json";
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

/** Navigates a full IDL type tree using a JSON pointer path to retrieve a nested type. */
export function idlTypeFullGetAt(
  self: IdlTypeFull,
  pathOrPointer: string | JsonPointer,
): IdlTypeFull {
  const pointer = Array.isArray(pathOrPointer)
    ? pathOrPointer
    : jsonPointerParse(pathOrPointer);
  return visitTypeFull(self, pointer, 0);
}

/** Navigates full IDL type fields using a JSON pointer path to retrieve a nested type. */
export function idlTypeFullFieldsGetAt(
  self: IdlTypeFullFields,
  pathOrPointer: string | JsonPointer,
): IdlTypeFull {
  const pointer = Array.isArray(pathOrPointer)
    ? pathOrPointer
    : jsonPointerParse(pathOrPointer);
  return visitTypeFullFields(self, pointer, 0);
}

function visitTypeFull(
  self: IdlTypeFull,
  pointer: Array<number | string>,
  tokenIndex: number,
): IdlTypeFull {
  if (tokenIndex >= pointer.length) {
    return self;
  }
  return self.traverse(visitorTypeFull, pointer, tokenIndex, undefined);
}

function visitTypeFullFields(
  self: IdlTypeFullFields,
  pointer: Array<number | string>,
  tokenIndex: number,
): IdlTypeFull {
  if (tokenIndex >= pointer.length) {
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to point to a type (found fields)`,
    );
  }
  return self.traverse(visitorTypeFullFields, pointer, tokenIndex, undefined);
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
    if (jsonPointerTokenAsArrayIndex(token, Infinity) !== undefined) {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to index into a Vec`,
    );
  },
  loop: (
    self: IdlTypeFullLoop,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (jsonPointerTokenAsArrayIndex(token, Infinity) !== undefined) {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be able to index into a Loop`,
    );
  },
  array: (
    self: IdlTypeFullArray,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    if (jsonPointerTokenAsArrayIndex(token, self.length) !== undefined) {
      return visitTypeFull(self.items, pointer, tokenIndex + 1);
    }
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)} to be a valid index for an Array of length ${self.length}`,
    );
  },
  string: (
    _self: IdlTypeFullString,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found string)`,
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
    _self: IdlTypeFullEnum,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found enum)`,
    );
  },
  pad: (
    self: IdlTypeFullPad,
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
      `Idl: Expected a struct/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found blob)`,
    );
  },
  primitive: (
    self: IdlTypePrimitive,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    throw new Error(
      `Idl: Expected a struct/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found ${self})`,
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
      `Idl: Expected a struct/vec/array at path ${jsonPointerPreview(pointer, tokenIndex)} (found empty type)`,
    );
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const fieldName = String(pointer[tokenIndex]!);
    for (const field of self) {
      if (field.name === fieldName) {
        return visitTypeFull(field.content, pointer, tokenIndex + 1);
      }
    }
    const fieldNameCamel = casingLosslessConvertToCamel(fieldName);
    for (const field of self) {
      if (field.name === fieldNameCamel) {
        return visitTypeFull(field.content, pointer, tokenIndex + 1);
      }
    }
    const names = self.map((field) => field.name).join("/");
    throw new Error(
      `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)}, to be a valid accessor for on of the fields: ${names}`,
    );
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    pointer: Array<number | string>,
    tokenIndex: number,
  ) => {
    const token = pointer[tokenIndex]!;
    const arrayIndex = jsonPointerTokenAsArrayIndex(token, self.length);
    if (arrayIndex === undefined) {
      throw new Error(
        `Idl: Expected path ${jsonPointerPreview(pointer, tokenIndex)}, to be a valid index for a Tuple of length: ${self.length}`,
      );
    }
    return visitTypeFull(self[arrayIndex]!.content, pointer, tokenIndex + 1);
  },
};
