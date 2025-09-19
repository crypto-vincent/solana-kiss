export type Commitment = "processed" | "confirmed" | "finalized";

export type Slot = number; // TODO - clarify those names and consider using bigint
export type Hash = string; // TODO - should this be Uint8Array ?

export type PrivateKey = Uint8Array; // TODO - how ?

export type PublicKey = string; // TODO - should this be a harder type ?
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
