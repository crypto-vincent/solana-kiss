/*
import { jsonExpectObject, jsonExpectString, JsonValue } from "../data/json";
import { Pubkey } from "../data/pubkey";

export type IdlMetadata = {
  readonly name?: string;
  readonly docs?: any;
  readonly description?: string;
  readonly address?: Pubkey;
  readonly version?: string;
  readonly spec?: string;
};

export function idlMetadataParse(metadataValue: JsonValue): IdlMetadata {
  if (!metadataValue) {
    return {};
  }
  const metadataObject = jsonExpectObject(metadataValue);
  const idlMetadata: IdlMetadata = {};
  const rawName = metadataObject["name"];
  if (rawName !== undefined) {
    idlMetadata.name = jsonExpectString(rawName);
  }
  const rawDocs = metadataObject["docs"];
  const rawDescription = metadataObject["description"];
  const rawAddress = metadataObject["address"];
  const rawVersion = metadataObject["version"];
  const rawSpec = metadataObject["spec"];
  if ()
  return {
    name: rawName ? jsonExpectString(rawName) : undefined,
    docs: rawDocs,
    description: rawDescription ? jsonExpectString(rawDescription) : undefined,
    address: rawAddress ? jsonExpectString(rawAddress) : undefined,
    version: rawVersion ? jsonExpectString(rawVersion) : undefined,
    spec: rawSpec ? jsonExpectString(rawSpec) : undefined,
  };
}
*/
