import { casingCamelToSnake } from "../data/Casing";
import { Instruction } from "../data/Instruction";
import {
  JsonObject,
  JsonValue,
  jsonAsArray,
  jsonAsObject,
  jsonTypeObjectRaw,
  jsonTypeString,
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

function parseScopedNamedValues<T, P>(
  programObject: JsonObject,
  collectionName: string,
  convertNameToSnakeCase: boolean,
  param: P,
  parsingFunction: (name: string, value: JsonValue, param: P) => T,
): Map<string, T> {
  const values = new Map<string, T>();
  const collectionValue = programObject[collectionName];
  const collectionArray = jsonAsArray(collectionValue);
  if (collectionArray !== undefined) {
    for (const itemValue of collectionArray) {
      const itemObject = jsonTypeObjectRaw.decoder(itemValue);
      let itemName = jsonTypeString.decoder(itemObject["name"]);
      if (convertNameToSnakeCase) {
        itemName = casingCamelToSnake(itemName);
      }
      values.set(
        itemName,
        withContext(`Idl: Parse: ${collectionName}: ${itemName}`, () =>
          parsingFunction(itemName, itemValue, param),
        ),
      );
    }
  }
  const collectionObject = jsonAsObject(collectionValue);
  if (collectionObject !== undefined) {
    Object.entries(collectionObject).forEach(([key, value]) => {
      if (convertNameToSnakeCase) {
        key = casingCamelToSnake(key);
      }
      values.set(
        key,
        withContext(`Idl: Parse: ${collectionName}: ${key}`, () =>
          parsingFunction(key, value, param),
        ),
      );
    });
  }
  return values;
}
