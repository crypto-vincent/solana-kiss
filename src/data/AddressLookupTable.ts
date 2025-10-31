import { Pubkey } from "./Pubkey";

export type AddressLookupTable = {
  tableAddress: Pubkey;
  lookupAddresses: Array<Pubkey>;
};
