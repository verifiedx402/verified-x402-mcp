#!/usr/bin/env node
/**
 * Stdio MCP server for Verified x402.
 * Free tools: check, search. Paid tool: recommend ($0.005 USDC) — returns
 * a payment challenge unless the client retries with payment, or the
 * process is given an x402-wrapped environment (not enabled by default).
 */
import { check, search, recommend, BASE_URL } from "../src/index.js";

const TOOLS = [
  {
    name: "check",
    description:
      "Before paying any x402 endpoint, run this free check to see if it is live and priced right.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The x402 endpoint URL to check before paying",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "search",
    description:
      "Free search of verified x402 APIs in the Verified x402 directory.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text, for example weather or image generation" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "recommend",
    description:
      "Which x402 API to call for a task: a ranked shortlist of verified paid APIs. Costs $0.005 USDC on Base or Solana. Unpaid calls return a payment challenge; do not invent a payment header.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "The job you need a paid x402 API for" },
        limit: { type: "number", description: "How many verified APIs to return (default 3)" },
      },
      required: ["task"],
    },
  },
];

function ok(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textResult(data, extra = {}) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }], ...extra };
}

async function callTool(name, args = {}) {
  if (name === "check") {
    return textResult(await check(args.url));
  }
  if (name === "search") {
    return textResult(await search(args.query, { limit: args.limit }));
  }
  if (name === "recommend") {
    try {
      return textResult(await recommend(args.task, { limit: args.limit }));
    } catch (err) {
      if (err && err.status === 402) {
        return textResult(
          {
            error: "payment_required",
            price: "$0.005 USDC",
            networks: ["eip155:8453", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
            endpoint: `${BASE_URL}/recommend`,
            message: err.message,
            paymentRequired: err.paymentRequired ?? null,
            body: err.body ?? null,
          },
          { isError: true },
        );
      }
      throw err;
    }
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(msg) {
  if (!msg || msg.jsonrpc !== "2.0") return null;
  const { id, method, params } = msg;
  if (method === "initialize") {
    return ok(id, {
      protocolVersion: params?.protocolVersion ?? "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "verified-x402", version: "1.0.1" },
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return null;
  }
  if (method === "ping") {
    return ok(id, {});
  }
  if (method === "tools/list") {
    return ok(id, { tools: TOOLS });
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      const result = await callTool(name, args);
      return ok(id, result);
    } catch (err) {
      return ok(id, textResult({ error: err instanceof Error ? err.message : String(err) }, { isError: true }));
    }
  }
  if (id !== undefined) {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }
  return null;
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const reply = await handle(msg);
    if (reply) {
      process.stdout.write(JSON.stringify(reply) + "\n");
    }
  }
});
process.stdin.on("end", () => process.exit(0));
