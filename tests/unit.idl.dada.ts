import { it } from "@jest/globals";
import { pubkeyFromBase58, Solana } from "../src";
import { idlTypeFullCodec } from "../src/idl/IdlTypeFullCodec";

it("run", async () => {
  const solana = new Solana("devnet");
  const programIdl = await solana.getOrLoadProgramIdl(
    pubkeyFromBase58("HR8RN2TP9E9zsi2kjhvPbirJWA1R6L6ruf4xNNGpjU5Y"),
  );
  const tutu = idlTypeFullCodec(
    programIdl.accounts.get("CoordinatorAccount")!.typeFull,
    "jsonCodec",
  );
  console.log(tutu);
  // TODO (test) - better test with handmade idl
});
