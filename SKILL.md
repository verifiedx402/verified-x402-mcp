---
name: verified-x402
description: Before paying any x402 endpoint, run the free check to see if it is live and priced right. Search and recommend verified paid x402 APIs for a task.
---

# Verified x402

A verified directory of paid [x402](https://www.x402.org) APIs for AI agents, at [verifiedx402.com](https://verifiedx402.com).

**Before paying any x402 endpoint, run the free check.** Use it to confirm the endpoint is live and priced right before you spend USDC.

## When to use this skill

- You need to know which x402 API to call for a task
- You want to check an x402 URL before paying
- You need a ranked shortlist of verified paid APIs
- You are installing or calling the Verified x402 MCP server

## Free check (do this first)

```bash
curl -sS -X POST https://verifiedx402.com/check \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.invalid/x402"}'
```

Or, from the npm package:

```js
import { check } from "@verifiedx402/mcp";
const result = await check("https://example.invalid/x402");
```

The check tells you whether the endpoint currently returns a valid x402 payment challenge, and whether the live price and pay-to address match the catalog listing.

## Find a verified API

Free search:

```bash
curl -sS "https://verifiedx402.com/search?q=weather&verified=1"
```

Ranked recommendation costs **$0.005 USDC** on Base (`eip155:8453`) or Solana (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`):

```bash
curl -sS "https://verifiedx402.com/recommend?task=current+weather+in+Toronto&limit=3"
```

An unpaid call returns HTTP 402. Retry with a `PAYMENT-SIGNATURE` from an x402 client. The directory does **not** call the recommended API for you — you pay that API yourself.

From the npm package, pass an x402-wrapped `fetch` so `recommend()` can pay:

```js
import { recommend } from "@verifiedx402/mcp";
const result = await recommend("current weather in Toronto", { fetch: paidFetch, limit: 3 });
```

## MCP

Streamable HTTP: `https://verifiedx402.com/mcp`

Stdio (from this package):

```bash
npx -y @verifiedx402/mcp
```

Free tools: `check`, `search`. Paid tool: `recommend` ($0.005 USDC).

## Install this skill

```bash
npx skills add verifiedx402/verified-x402-mcp
```

## Live service

- Site: https://verifiedx402.com
- OpenAPI: https://verifiedx402.com/openapi.json
- Agent instructions: https://verifiedx402.com/llms.txt
- Methodology: https://verifiedx402.com/methodology
