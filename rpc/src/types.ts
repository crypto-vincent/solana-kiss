export type Rpc = (method: string, params: any[]) => Promise<any>;
export type Commitment = 'processed' | 'confirmed' | 'finalized';
export type PublicKey = string;
export type Signature = string;
export type Lamports = bigint;
export type Slot = number;
