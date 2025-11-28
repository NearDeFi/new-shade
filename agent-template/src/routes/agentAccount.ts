import { Hono } from "hono";
import { agent } from "../index";

const app = new Hono();

app.get("/", async (c) => {
  try {
    // Get the agent's account ID
    const accountId = agent.accountId();

    // Get the balance of the agent account
    const balance = await agent.balance();

    return c.json({
      accountId,
      balance: balance.toString(),
    });
  } catch (error) {
    console.log("Error getting agent account:", error);
    return c.json({ error: "Failed to get agent account " + error }, 500);
  }
});

export default app;
