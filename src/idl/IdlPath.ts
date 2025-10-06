import {
  jsonAsArray,
  jsonAsObject,
  jsonPreview,
  JsonValue,
} from "../data/Json";
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

type IdlPathPartDiscriminant = "empty" | "index" | "key";
type IdlPathPartContent = null | bigint | string;

export class IdlPathPart {
  private discriminant: IdlPathPartDiscriminant;
  private content: IdlPathPartContent;

  private constructor(
    discriminant: IdlPathPartDiscriminant,
    content: IdlPathPartContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static empty(): IdlPathPart {
    return new IdlPathPart("empty", null);
  }
  public static index(value: bigint): IdlPathPart {
    return new IdlPathPart("index", value);
  }
  public static key(value: string): IdlPathPart {
    return new IdlPathPart("key", value);
  }

  public isEmpty(): boolean {
    return this.discriminant === "empty";
  }

  public key(): string | undefined {
    if (this.discriminant === "key") {
      return this.content as string;
    }
    return undefined;
  }
  public index(): bigint | undefined {
    if (this.discriminant === "index") {
      return this.content as bigint;
    }
    return undefined;
  }

  public value(): string {
    switch (this.discriminant) {
      case "empty":
        return "";
      case "index":
        return (this.content as bigint).toString();
      case "key":
        return this.content as string;
    }
  }

  public traverse<P1, P2, T>(
    visitor: {
      empty: (value: null, p1: P1, p2: P2) => T;
      index: (value: bigint, p1: P1, p2: P2) => T;
      key: (value: string, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    switch (this.discriminant) {
      case "empty":
        return visitor.empty(this.content as null, p1, p2);
      case "index":
        return visitor.index(this.content as bigint, p1, p2);
      case "key":
        return visitor.key(this.content as string, p1, p2);
    }
  }
}

export class IdlPath {
  private readonly parts: Array<IdlPathPart>;

  public constructor(parts: Array<IdlPathPart>) {
    this.parts = parts;
  }

  public splitFirst(): { first: IdlPathPart; rest: IdlPath } | undefined {
    if (this.parts.length === 0) {
      return undefined;
    }
    return {
      first: this.parts[0]!,
      rest: new IdlPath(this.parts.slice(1)),
    };
  }

  public isEmpty(): boolean {
    return this.parts.length === 0;
  }

  public value(): string {
    return this.parts.map((p) => p.value()).join(".");
  }
}

export function idlPathParse(content: string): IdlPath {
  const parts = new Array<IdlPathPart>();
  for (const part of content.replace(/\[(\w+)\]/g, ".$1").split(".")) {
    if (part === "") {
      parts.push(IdlPathPart.empty());
    } else if (/^\d+$/.test(part)) {
      parts.push(IdlPathPart.index(BigInt(part)));
    } else {
      parts.push(IdlPathPart.key(part));
    }
  }
  if (parts[0]!.isEmpty()) {
    parts.shift();
  }
  return new IdlPath(parts);
}

export function idlPathGetJsonValue(
  path: IdlPath,
  value: JsonValue,
): JsonValue {
  const split = path.splitFirst();
  if (split === undefined) {
    return value;
  }
  const current = split.first;
  const next = split.rest;
  const array = jsonAsArray(value);
  if (array !== undefined) {
    const length = array.length;
    const index = current.isEmpty() ? 0n : current.index();
    if (index === undefined) {
      throw new Error(`Expected array index but got '${current.value()}'`);
    }
    const indexNumber = Number(index);
    if (indexNumber < 0 || indexNumber >= length) {
      throw new Error(
        `Index ${indexNumber} out of bounds for array of length ${length}`,
      );
    }
    return idlPathGetJsonValue(next, array[indexNumber]);
  }
  const object = jsonAsObject(value);
  if (object !== undefined) {
    const key = current.value();
    return idlPathGetJsonValue(next, object[key]);
  }
  throw new Error(
    `Idl: Expected array or object but got '${jsonPreview(value)}' when traversing path`,
  );
}

export function idlPathGetTypeFull(
  path: IdlPath,
  typeFull: IdlTypeFull,
): IdlTypeFull {
  const split = path.splitFirst();
  if (split === undefined) {
    return typeFull;
  }
  const current = split.first;
  const next = split.rest;
  return typeFull.traverse(visitorTypeFull, path, current, next);
}

export function idlPathGetTypeFullFields(
  path: IdlPath,
  typeFullFields: IdlTypeFullFields,
): IdlTypeFull {
  const split = path.splitFirst();
  if (split === undefined) {
    throw new Error("Fields cannot be a standalone type");
  }
  const current = split.first;
  const next = split.rest;
  return typeFullFields.traverse(visitorTypeFullFields, path, current, next);
}

const visitorTypeFull = {
  typedef: (
    self: IdlTypeFullTypedef,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    return idlPathGetTypeFull(path, self.content);
  },
  option: (
    self: IdlTypeFullOption,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    return idlPathGetTypeFull(path, self.content);
  },
  vec: (
    self: IdlTypeFullVec,
    _path: IdlPath,
    current: IdlPathPart,
    next: IdlPath,
  ) => {
    const key = current.key();
    if (key !== undefined) {
      throw new Error(`Vec cannot be accessed by key: '${key}'`);
    }
    return idlPathGetTypeFull(next, self.items);
  },
  array: (
    self: IdlTypeFullArray,
    _path: IdlPath,
    current: IdlPathPart,
    next: IdlPath,
  ) => {
    const key = current.key();
    if (key !== undefined) {
      throw new Error(`Array cannot be accessed by key: '${key}'`);
    }
    return idlPathGetTypeFull(next, self.items);
  },
  string: (
    _self: IdlTypeFullString,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    throw new Error(`Type string does not contain path: '${path.value()}'`);
  },
  struct: (
    self: IdlTypeFullStruct,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    return idlPathGetTypeFullFields(path, self.fields);
  },
  enum: (
    self: IdlTypeFullEnum,
    _path: IdlPath,
    current: IdlPathPart,
    next: IdlPath,
  ) => {
    return current.traverse(
      {
        empty: () => {
          throw new Error(`Expected enum variant key or index (found empty)`);
        },
        key: (key: string) => {
          for (const variant of self.variants) {
            if (variant.name === key) {
              return idlPathGetTypeFullFields(next, variant.fields);
            }
          }
          throw new Error(`Could not find enum variant: '${key}'`);
        },
        index: (index: bigint) => {
          for (const variant of self.variants) {
            if (variant.code === index) {
              return idlPathGetTypeFullFields(next, variant.fields);
            }
          }
          throw new Error(`Could not find enum variant with code: '${index}'`);
        },
      },
      undefined,
      undefined,
    );
  },
  padded: (
    self: IdlTypeFullPadded,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    return idlPathGetTypeFull(path, self.content);
  },
  blob: (
    _self: IdlTypeFullBlob,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    throw new Error(`Type blob does not contain path: '${path.value()}'`);
  },
  primitive: (
    self: IdlTypePrimitive,
    path: IdlPath,
    _current: IdlPathPart,
    _next: IdlPath,
  ) => {
    throw new Error(
      `Idl: Type primitive '${self}' does not contain path: '${path.value()}'`,
    );
  },
};

const visitorTypeFullFields = {
  nothing: (_self: null, path: IdlPath) => {
    throw new Error(`Idl: Type has no fields: '${path.value()}'`);
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    _path: IdlPath,
    current: IdlPathPart,
    next: IdlPath,
  ) => {
    const key = current.value();
    for (const field of self) {
      if (field.name === key) {
        return idlPathGetTypeFull(next, field.content);
      }
    }
    throw new Error(`Idl: Could not find named field: '${key}'`);
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    _path: IdlPath,
    current: IdlPathPart,
    next: IdlPath,
  ) => {
    const length = self.length;
    const index = current.index();
    if (index === undefined) {
      throw new Error(`Idl: Expected index but got '${current.value()}'`);
    }
    const indexNumber = Number(index);
    if (indexNumber < 0 || indexNumber >= length) {
      throw new Error(
        `Idl: Index ${indexNumber} out of bounds for fields of length ${length}`,
      );
    }
    return idlPathGetTypeFull(next, self[indexNumber]!.content);
  },
};
