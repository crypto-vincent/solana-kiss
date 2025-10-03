import { rpcHttpFromUrl } from "solana-kiss-rpc";
import { resolveProgram } from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");

  const programAddress = "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j";

  const dudu = await resolveProgram(rpcHttp, programAddress);

  console.log("dudu", dudu);
});
