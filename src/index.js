/** Client helpers for the Verified x402 directory at https://verifiedx402.com */
export const BASE_URL = "https://verifiedx402.com";

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Free check: before paying any x402 endpoint, confirm it is live and priced right.
 * @param {string} url
 * @param {{ fetch?: typeof fetch }} [opts]
 */
export async function check(url, opts = {}) {
  if (!url || typeof url !== "string") {
    throw new TypeError("check(url) requires a URL string");
  }
  const f = opts.fetch ?? fetch;
  const res = await f(`${BASE_URL}/check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ url }),
  });
  const body = await readJson(res);
  if (!res.ok) {
    const err = new Error(`check failed: HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Free catalog search.
 * @param {string} query
 * @param {{ verified?: boolean, limit?: number, fetch?: typeof fetch }} [opts]
 */
export async function search(query, opts = {}) {
  if (!query || typeof query !== "string") {
    throw new TypeError("search(query) requires a string");
  }
  const f = opts.fetch ?? fetch;
  const u = new URL(`${BASE_URL}/search`);
  u.searchParams.set("q", query);
  if (opts.verified !== false) u.searchParams.set("verified", "1");
  if (opts.limit) u.searchParams.set("limit", String(opts.limit));
  const res = await f(u, { headers: { accept: "application/json" } });
  const body = await readJson(res);
  if (!res.ok) {
    const err = new Error(`search failed: HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Ranked shortlist of verified x402 APIs for a task. Costs $0.005 USDC.
 * Pass an x402-wrapped `fetch` (for example from `@x402/fetch`) to settle payment.
 * Without payment, this throws an error with `status: 402` and payment headers.
 * @param {string} task
 * @param {{ limit?: number, fetch?: typeof fetch }} [opts]
 */
export async function recommend(task, opts = {}) {
  if (!task || typeof task !== "string") {
    throw new TypeError("recommend(task) requires a string");
  }
  const f = opts.fetch ?? fetch;
  const u = new URL(`${BASE_URL}/recommend`);
  u.searchParams.set("task", task);
  u.searchParams.set("limit", String(opts.limit ?? 3));
  const res = await f(u, { headers: { accept: "application/json" } });
  const body = await readJson(res);
  if (res.status === 402) {
    const err = new Error(
      "Payment required: $0.005 USDC on Base or Solana. Retry recommend(task, { fetch: paidFetch }) with an x402-wrapped fetch.",
    );
    err.status = 402;
    err.paymentRequired = res.headers.get("PAYMENT-REQUIRED") ?? res.headers.get("payment-required");
    err.body = body;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`recommend failed: HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Vercel AI SDK tool for the free check.
 * Pass `tool` and `z` from the `ai` and `zod` packages so this package stays dependency-free.
 */
export function createCheckTool({ tool, z, fetch: f } = {}) {
  if (!tool || !z) {
    throw new TypeError("createCheckTool({ tool, z }) needs the Vercel AI SDK `tool` helper and a Zod namespace");
  }
  return tool({
    description:
      "Before paying any x402 endpoint, run this free check to see if the endpoint is live and priced right.",
    inputSchema: z.object({
      url: z.string().url().describe("The x402 endpoint URL to check before paying"),
    }),
    parameters: z.object({
      url: z.string().url().describe("The x402 endpoint URL to check before paying"),
    }),
    execute: async ({ url }) => check(url, { fetch: f }),
  });
}

/**
 * Vercel AI SDK tool for a paid recommendation ($0.005 USDC).
 * Pass an x402-wrapped `fetch` so the tool can settle payment.
 */
export function createRecommendTool({ tool, z, fetch: f } = {}) {
  if (!tool || !z) {
    throw new TypeError("createRecommendTool({ tool, z }) needs the Vercel AI SDK `tool` helper and a Zod namespace");
  }
  return tool({
    description:
      "Which x402 API to call for a task: returns a ranked shortlist of verified paid APIs. Costs $0.005 USDC. Before paying any recommended endpoint, run the free check.",
    inputSchema: z.object({
      task: z.string().describe("The job you need a paid x402 API for"),
      limit: z.number().int().min(1).max(10).optional().describe("How many verified APIs to return (default 3)"),
    }),
    parameters: z.object({
      task: z.string().describe("The job you need a paid x402 API for"),
      limit: z.number().int().min(1).max(10).optional().describe("How many verified APIs to return (default 3)"),
    }),
    execute: async ({ task, limit }) => recommend(task, { limit, fetch: f }),
  });
}
