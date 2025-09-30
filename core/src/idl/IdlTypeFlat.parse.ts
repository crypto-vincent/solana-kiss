import { jsonTypeObject, JsonValue } from "../data/json";
import { IdlTypeFlat } from "./idlTypeFlat";

export function idlTypeFlatParseIsPossible(typeFlatJson: JsonValue): boolean {
  return false;
}

// TODO - implement all this

export function idlTypeFlatParse(typeFlatJson: JsonValue): IdlTypeFlat {
  throw new Error("Not implemented");
}

const idlTypeFlatJsonType = jsonTypeObject({});
