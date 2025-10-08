import { casingCamelToSnake } from "../data/Casing";
import { Instruction } from "../data/Instruction";
import {
  JsonObject,
  JsonValue,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderObjectKey,
  jsonDecoderObjectToMap,
  jsonDecoderSplit,
  jsonDecoderTransform,
  jsonTypeObjectRaw,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
import { withContext } from "../data/Utils";
import { IdlAccount, idlAccountCheck, idlAccountParse } from "./IdlAccount";
import { IdlError, idlErrorParse } from "./IdlError";
import { IdlEvent, idlEventCheck, idlEventParse } from "./IdlEvent";
import {
  IdlInstruction,
  idlInstructionCheck,
  idlInstructionParse,
} from "./IdlInstruction";
import { IdlMetadata, idlMetadataParse } from "./IdlMetadata";
import { IdlTypedef, idlTypedefParse } from "./IdlTypedef";

// TODO - should add support for IDL constants??
// TODO - add support for a "program" level PDA (for sysvar for examples?)
export type IdlProgram = {
  metadata: IdlMetadata;
  typedefs: Map<string, IdlTypedef>;
  accounts: Map<string, IdlAccount>;
  instructions: Map<string, IdlInstruction>;
  events: Map<string, IdlEvent>;
  errors: Map<string, IdlError>;
};

export function idlProgramGuessAccount(
  programIdl: IdlProgram,
  accountData: Uint8Array,
): IdlAccount | undefined {
  for (const accountIdl of programIdl.accounts.values()) {
    try {
      idlAccountCheck(accountIdl, accountData);
      return accountIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessInstruction(
  programIdl: IdlProgram,
  instruction: Instruction,
): IdlInstruction | undefined {
  for (const instructionIdl of programIdl.instructions.values()) {
    try {
      idlInstructionCheck(instructionIdl, instruction.inputs, instruction.data);
      return instructionIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessEvent(
  programIdl: IdlProgram,
  eventData: Uint8Array,
): IdlEvent | undefined {
  for (const eventIdl of programIdl.events.values()) {
    try {
      idlEventCheck(eventIdl, eventData);
      return eventIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessError(
  programIdl: IdlProgram,
  errorCode: number,
): IdlError | undefined {
  for (const errorIdl of programIdl.errors.values()) {
    if (errorIdl.code === errorCode) {
      return errorIdl;
    }
  }
  return undefined;
}

export function idlProgramParse(programValue: JsonValue): IdlProgram {
  const programObject = jsonTypeObjectRaw.decoder(programValue);
  const metadata = {
    ...idlMetadataParse(programObject),
    ...idlMetadataParse(programObject["metadata"]),
  };
  const typedefs = parseScopedNamedValues(
    programObject,
    "types",
    false,
    undefined,
    idlTypedefParse,
  );
  const accounts = parseScopedNamedValues(
    programObject,
    "accounts",
    false,
    typedefs,
    idlAccountParse,
  );
  const instructions = parseScopedNamedValues(
    programObject,
    "instructions",
    true,
    typedefs,
    idlInstructionParse,
  );
  const events = parseScopedNamedValues(
    programObject,
    "events",
    false,
    typedefs,
    idlEventParse,
  );
  const errors = parseScopedNamedValues(
    programObject,
    "errors",
    false,
    undefined,
    idlErrorParse,
  );
  return { metadata, typedefs, accounts, instructions, events, errors };
}

function parseScopedNamedValues<Content, Param>(
  programObject: JsonObject,
  collectionName: string,
  convertNameToSnakeCase: boolean,
  param: Param,
  parsingFunction: (name: string, value: JsonValue, param: Param) => Content,
): Map<string, Content> {
  const values = new Map<string, Content>();
  const collection = collectionJsonDecoder(programObject[collectionName]);
  for (const [name, value] of collection) {
    let itemName = name;
    if (convertNameToSnakeCase) {
      itemName = casingCamelToSnake(name);
    }
    values.set(
      itemName,
      withContext(`Idl: Parse: ${collectionName}: ${itemName}`, () =>
        parsingFunction(itemName, value, param),
      ),
    );
  }
  return values;
}

const collectionJsonDecoder = jsonDecoderByKind({
  undefined: () => new Map<string, JsonValue>(),
  object: jsonDecoderObjectToMap({
    keyDecoder: (name) => name,
    valueDecoder: jsonTypeValue.decoder,
  }),
  array: jsonDecoderTransform(
    jsonDecoderArray(
      jsonDecoderSplit([
        jsonDecoderObjectKey("name", jsonTypeString.decoder),
        jsonTypeValue.decoder,
      ]),
    ),
    (entries) => {
      return new Map<string, JsonValue>(entries);
    },
  ),
});
