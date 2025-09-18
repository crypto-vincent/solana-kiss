import { JsonValue } from './json';

export type RpcHttp = (
  method: string,
  params: Array<any>,
) => Promise<JsonValue>;

export type Commitment = 'processed' | 'confirmed' | 'finalized';

export type Slot = number; // TODO - clarify those names and consider using bigint
export type Hash = string;

export type PublicKey = string;
export type Lamports = string;

// TODO - keypair/privatekey type?
export type Signature = string;

export type Instruction = {
  programAddress: PublicKey;
  accountsDescriptors: Array<{
    address: PublicKey;
    writable: boolean;
    signer: boolean;
  }>;
  data: Uint8Array;
};

export type Transaction = {
  payerAddress: PublicKey;
  instructions: Array<Instruction>;
  recentBlockHash: Hash;
};

export type Execution = {
  transaction: Transaction;
  outcome: {
    error?: any;
    logs: Array<string>;
    chargedFees: Lamports;
    computeUnitsConsumed: number;
  };
};
