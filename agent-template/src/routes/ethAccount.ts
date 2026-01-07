import { Hono } from "hono";
import { Evm } from "../utils/ethereum";

const app = new Hono();

app.get("/", async (c) => {
  try {
    // Derive the price pusher EVM address
    const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
      process.env.AGENT_CONTRACT_ID as string,
      "ethereum-1",
    );

    // Get the balance of the EVM address
    const balance = await Evm.getBalance(senderAddress);

    return c.json({ senderAddress, balance: Number(balance.balance) });
  } catch (error) {
    console.log("Error getting the derived EVM address:", error);
    return c.json({ error: "Failed to get the derived EVM address" }, 500);
  }
});

export default app;
