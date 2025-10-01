import { camelCaseToSnakeCase } from "../data/casing";
import {
  jsonAsArray,
  jsonAsObject,
  jsonExpectObject,
  jsonExpectString,
  JsonObject,
  JsonValue,
} from "../data/json";
import { IdlAccount, idlAccountParse } from "./IdlAccount";
import { IdlTypedef, idlTypedefParse } from "./IdlTypedef";

export type IdlProgram = {
  // readonly metadata: IdlProgramMetadata;
  readonly typedefs: Map<string, IdlTypedef>;
  readonly accounts: Map<string, IdlAccount>;
  // readonly instructions: Map<string, IdlInstruction>;
  // readonly events: Map<string, IdlEvent>;
  // readonly errors: Map<string, IdlError>;
};

export const IdlProgramUnknown: IdlProgram = {
  //metadata: {},
  typedefs: new Map(),
  accounts: new Map(),
  //instructions: new Map(),
  //events: new Map(),
  //errors: new Map(),
};

export function idlProgramParse(programValue: JsonValue): IdlProgram {
  const programObject = jsonExpectObject(programValue);
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
  return { typedefs, accounts };
}

function parseScopedNamedValues<T, P>(
  programObject: JsonObject,
  collectionKey: string,
  convertNameToSnakeCase: boolean,
  param: P,
  parsingFunction: (name: string, value: JsonValue, param: P) => T,
): Map<string, T> {
  const values = new Map<string, T>();
  const collectionValue = programObject[collectionKey];
  const collectionArray = jsonAsArray(collectionValue);
  if (collectionArray !== undefined) {
    for (const itemValue of collectionArray) {
      const itemObject = jsonExpectObject(itemValue);
      let itemName = jsonExpectString(itemObject["name"]);
      if (convertNameToSnakeCase) {
        itemName = camelCaseToSnakeCase(itemName);
      }
      values.set(itemName, parsingFunction(itemName, itemValue, param));
    }
  }
  const collectionObject = jsonAsObject(collectionValue);
  if (collectionObject !== undefined) {
    Object.entries(collectionObject).forEach(([key, value]) => {
      if (convertNameToSnakeCase) {
        key = camelCaseToSnakeCase(key);
      }
      values.set(key, parsingFunction(key, value, param));
    });
  }
  return values;
}

/*
export class IdlProgram {
  public static readonly Unknown = new IdlProgram({
    metadata: {},
    typedefs: new Map(),
    accounts: new Map(),
    instructions: new Map(),
    events: new Map(),
    errors: new Map(),
  });


  public static tryParse(idlRoot: any): IdlProgram {
    const metadata = {
      ...IdlProgram.tryParseMetadata(idlRoot),
      ...IdlProgram.tryParseMetadata(idlRoot["metadata"]),
    };
    const typedefs = IdlProgram.tryParseScopedNamedValues(
      idlRoot,
      "types",
      false,
      undefined,
      IdlTypedef.tryParse,
    );
    const accounts = IdlProgram.tryParseScopedNamedValues(
      idlRoot,
      "accounts",
      false,
      typedefs,
      IdlAccount.tryParse,
    );
    const instructions = IdlProgram.tryParseScopedNamedValues(
      idlRoot,
      "instructions",
      true,
      typedefs,
      IdlInstruction.tryParse,
    );
    const events = IdlProgram.tryParseScopedNamedValues(
      idlRoot,
      "events",
      false,
      typedefs,
      IdlEvent.tryParse,
    );
    const errors = IdlProgram.tryParseScopedNamedValues(
      idlRoot,
      "errors",
      false,
      undefined,
      IdlError.tryParse,
    );
    return new IdlProgram({
      metadata,
      typedefs,
      accounts,
      instructions,
      events,
      errors,
    });
  }

  public guessAccount(accountData: Buffer): IdlAccount | undefined {
    for (const account of this.accounts.values()) {
      try {
        account.check(accountData);
        return account;
      } catch {}
    }
    return undefined;
  }

  public guessInstruction(instructionData: Buffer): IdlInstruction | undefined {
    for (const instruction of this.instructions.values()) {
      try {
        instruction.checkPayload(instructionData);
        return instruction;
      } catch {}
    }
    return undefined;
  }

  public guessEvent(eventData: Buffer): IdlEvent | undefined {
    for (const event of this.events.values()) {
      try {
        event.check(eventData);
        return event;
      } catch {}
    }
    return undefined;
  }

  public guessError(errorCode: number): IdlError | undefined {
    for (const error of this.errors.values()) {
      if (error.code === errorCode) {
        return error;
      }
    }
    return undefined;
  }
}
*/
