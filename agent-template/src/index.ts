import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import { Agent } from "@neardefi/shade-api-ts";
import ethAccount from "./routes/ethAccount";
import agentAccount from "./routes/agentAccount";
import transaction from "./routes/transaction";

// Load environment variables from .env file (only needed for local development)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Initialize agent
export const agent = await Agent.create({
  networkId: "testnet",
  agentContractId: process.env.AGENT_CONTRACT_ID as string,
  sponsor: {
    accountId: process.env.SPONSOR_ACCOUNT_ID as string,
    privateKey: process.env.SPONSOR_PRIVATE_KEY as string,
  },
  derivationPath: "hi",
});

// Initialize app
const app = new Hono();

// Middleware
app.use(cors());

// Routes
app.get("/", (c) => c.json({ message: "App is running" }));
app.route("/api/eth-account", ethAccount);
app.route("/api/agent-account", agentAccount);
app.route("/api/transaction", transaction);

console.log("Agent account ID:", agent.accountId());
console.log("Waiting for agent to be whitelisted...");

// Wait until the agent is whitelisted to register
while (true) {
  const status = await agent.isRegistered();
  if (status.whitelisted) {
    const registered = await agent.register();
    if (registered) {
      break;
    }
  }
  await new Promise(resolve => setTimeout(resolve, 10000));
}

// Start server after registration is complete
const port = Number(process.env.PORT || "3000");
console.log(`Server starting on port ${port}...`);
serve({ fetch: app.fetch, port });
