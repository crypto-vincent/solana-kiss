import { expect, it } from "@jest/globals";
import {
  idlProgramParse,
  IdlTypeFull,
  IdlTypeFullFields,
  IdlTypePrefix,
  IdlTypePrimitive,
} from "../src";

it("run", () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(
    require("./fixtures/idl_anchor_generics.json"),
  );
  // Check that the account was parsed correctly
  const accountIdl = programIdl.accounts.get("GenericAccount")!;
  expect(accountIdl.contentTypeFull).toStrictEqual(
    IdlTypeFull.typedef({
      name: "GenericAccount",
      repr: undefined,
      content: IdlTypeFull.struct({
        fields: IdlTypeFullFields.named([
          {
            name: "data",
            content: makeTypeFullGenericType(
              makeTypeFullU32(),
              makeTypeFullU64(),
              10,
            ),
          },
        ]),
      }),
    }),
  );
  // Check that the instruction was parsed correctly
  const instructionIdl = programIdl.instructions.get("generic")!;
  expect(instructionIdl.argsTypeFullFields).toStrictEqual(
    IdlTypeFullFields.named([
      {
        name: "generic_field",
        content: makeTypeFullGenericType(
          makeTypeFullU32(),
          makeTypeFullU64(),
          10,
        ),
      },
    ]),
  );
});

function makeTypeFullGenericType(
  t: IdlTypeFull,
  u: IdlTypeFull,
  n: number,
): IdlTypeFull {
  return IdlTypeFull.typedef({
    name: "GenericType",
    repr: undefined,
    content: IdlTypeFull.struct({
      fields: IdlTypeFullFields.named([
        {
          name: "gen1",
          content: t,
        },
        {
          name: "gen2",
          content: u,
        },
        {
          name: "gen3",
          content: makeTypeFullGenericNested(makeTypeFullU32(), u),
        },
        {
          name: "gen4",
          content: makeTypeFullGenericNested(t, makeTypeFullMyStruct()),
        },
        {
          name: "gen5",
          content: makeTypeFullGenericNested(t, u),
        },
        {
          name: "gen6",
          content: makeTypeFullGenericNested(
            makeTypeFullU32(),
            makeTypeFullU64(),
          ),
        },
        {
          name: "gen7",
          content: makeTypeFullGenericNested(
            t,
            makeTypeFullGenericNested(t, u),
          ),
        },
        {
          name: "arr",
          content: makeTypeFullArray(makeTypeFullU8(), n),
        },
        {
          name: "warr",
          content: makeTypeFullWrappedU8Array(n),
        },
        {
          name: "warrval",
          content: makeTypeFullWrappedU8Array(10),
        },
        {
          name: "enm1",
          content: makeTypeFullGenericEnum(t, u, n),
        },
        {
          name: "enm2",
          content: makeTypeFullGenericEnum(
            makeTypeFullGenericNested(t, makeTypeFullU64()),
            makeTypeFullU32(),
            30,
          ),
        },
      ]),
    }),
  });
}

function makeTypeFullGenericEnum(
  t: IdlTypeFull,
  u: IdlTypeFull,
  n: number,
): IdlTypeFull {
  return IdlTypeFull.typedef({
    name: "GenericEnum",
    repr: undefined,
    content: IdlTypeFull.enum({
      prefix: IdlTypePrefix.u8,
      variants: [
        {
          name: "Unnamed",
          code: 0n,
          fields: IdlTypeFullFields.unnamed([
            {
              position: 0,
              content: t,
            },
            {
              position: 1,
              content: u,
            },
          ]),
        },
        {
          name: "Named",
          code: 1n,
          fields: IdlTypeFullFields.named([
            {
              name: "gen1",
              content: t,
            },
            {
              name: "gen2",
              content: u,
            },
          ]),
        },
        {
          name: "Struct",
          code: 2n,
          fields: IdlTypeFullFields.unnamed([
            {
              position: 0,
              content: makeTypeFullGenericNested(t, u),
            },
          ]),
        },
        {
          name: "Arr",
          code: 3n,
          fields: IdlTypeFullFields.unnamed([
            {
              position: 0,
              content: makeTypeFullArray(t, n),
            },
          ]),
        },
      ],
    }),
  });
}

function makeTypeFullMyStruct(): IdlTypeFull {
  return IdlTypeFull.typedef({
    name: "MyStruct",
    repr: undefined,
    content: IdlTypeFull.struct({
      fields: IdlTypeFullFields.named([
        {
          name: "some_field",
          content: makeTypeFullU8(),
        },
      ]),
    }),
  });
}

function makeTypeFullGenericNested(
  v: IdlTypeFull,
  z: IdlTypeFull,
): IdlTypeFull {
  return IdlTypeFull.typedef({
    name: "GenericNested",
    repr: undefined,
    content: IdlTypeFull.struct({
      fields: IdlTypeFullFields.named([
        {
          name: "gen1",
          content: v,
        },
        {
          name: "gen2",
          content: z,
        },
      ]),
    }),
  });
}

function makeTypeFullWrappedU8Array(_n: number): IdlTypeFull {
  return IdlTypeFull.typedef({
    name: "WrappedU8Array",
    repr: undefined,
    content: IdlTypeFull.struct({
      fields: IdlTypeFullFields.unnamed([
        {
          position: 0,
          content: makeTypeFullU8(),
        },
      ]),
    }),
  });
}

function makeTypeFullArray(items: IdlTypeFull, length: number): IdlTypeFull {
  return IdlTypeFull.array({
    items,
    length,
  });
}

function makeTypeFullU8(): IdlTypeFull {
  return IdlTypeFull.primitive(IdlTypePrimitive.u8);
}

function makeTypeFullU32(): IdlTypeFull {
  return IdlTypeFull.primitive(IdlTypePrimitive.u32);
}

function makeTypeFullU64(): IdlTypeFull {
  return IdlTypeFull.primitive(IdlTypePrimitive.u64);
}
