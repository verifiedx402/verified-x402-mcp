# Verified x402

A verified directory of paid [x402](https://www.x402.org) APIs for AI agents, hosted at [verifiedx402.com](https://verifiedx402.com).

Agents search the catalog for free, or pay **$0.005 USDC on Base** for a ranked recommendation. The directory tells you which listing currently looks live, honestly priced, and not dominated by a single payer. It does **not** call the recommended API for you — you pay that API yourself with the same x402 flow.

As of 26 November 2026 (America/Toronto), **77,964 x402 APIs are verified, and counting.** Live counts are always on [`GET /health`](https://verifiedx402.com/health) and the [homepage](https://verifiedx402.com). This repository is the public documentation, MCP manifests, and client examples for the hosted service. The service itself runs at `https://verifiedx402.com`.

## What “verified” means

Each listing is verified continuously against several signals:

- whether it returns a valid x402 payment challenge
- whether the live price and wallet match the catalog listing
- how consistently it stays reachable
- how quickly it answers
- a history of those checks, plus published usage

A listing is marked **verified** when the latest check, within the last 72 hours, confirmed a valid HTTP 402 whose price, network, asset, and pay-to address match the listing. Other statuses are `stale` (passed, but older than 72 hours), `mismatch`, `no_402`, `down`, and `unchecked`.

Scores (uptime, price honesty, response validity, latency, and integrity) are documented at [verifiedx402.com/methodology](https://verifiedx402.com/methodology). A higher score means the listing looked more like what its catalog entry claimed. It is not a promise that a later paid call to that API will succeed.

## HTTP endpoints

Base URL: `https://verifiedx402.com`

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /search?q={text}&verified=1` | Free, rate-limited | Catalog search. Add `verified=1` for verified listings only. |
| `GET` or `POST /recommend` | **$0.005 USDC on Base** (`eip155:8453`) | Ranked shortlist of verified APIs for a task. |
| `GET /llms.txt` | Free | Short agent instructions. |
| `GET /llms-full.txt` | Free | Full agent instructions, including a payment snippet. |
| `GET /openapi.json` | Free | OpenAPI 3.1 description of the API. |
| `POST /mcp` | Free tools, paid `recommend` | MCP JSON-RPC (see below). |
| `GET /health` | Free | Liveness, payment config, and verification counts. |
| `GET /methodology` | Free | Scoring rules. |
| `GET /.well-known/x402` | Free | x402 discovery manifest. |
| `POST /check` | Free | Check one public URL against a live x402 payment challenge. |

`/recommend` is paid with the x402 `exact` scheme (EIP-3009 USDC) to `0xd1bac498a13228df83708c6ab2ff47561c915cc3`. A call without a payment header returns HTTP 402 and a base64 `PAYMENT-REQUIRED` header. Retry with `PAYMENT-SIGNATURE` from an x402 client. Do not invent a payment header.

Optional query or JSON body fields for `/recommend`: `task`, `category`, `network`, `max_price`, `limit` (default 5, maximum 10). Only listings with status `verified` are ranked.

## Connect an MCP client

Remote MCP endpoint:

```
POST https://verifiedx402.com/mcp
```

Transport is Streamable HTTP. The server speaks MCP protocol `2025-06-18`. Tools:

- **`search`** — free, rate-limited catalog search. Arguments: `q`, `category`, `network`, `max_price`, `verified`, `status`, `limit`.
- **`check_endpoint`** — free. Check one public URL against a live x402 payment challenge. Argument: `url` (required).
- **`recommend`** — paid, **$0.005 USDC on Base**. Rank verified x402 APIs for a task. Arguments: `task`, `category`, `max_price`, `network`, `limit`. On this transport the call returns HTTP 402 until retried with a `PAYMENT-SIGNATURE` from an x402 client.

Clients that do not speak x402 can still use `search` and `check_endpoint`.

### Cursor

Add the server in Cursor MCP settings, or merge [examples/cursor.mcp.json](examples/cursor.mcp.json):

```json
{
  "mcpServers": {
    "verified-x402": {
      "url": "https://verifiedx402.com/mcp"
    }
  }
}
```

### Claude Desktop or Claude Code

Merge [examples/claude-desktop.json](examples/claude-desktop.json) into your MCP config:

```json
{
  "mcpServers": {
    "verified-x402": {
      "type": "http",
      "url": "https://verifiedx402.com/mcp"
    }
  }
}
```

### VS Code

Add [examples/vscode.mcp.json](examples/vscode.mcp.json) as `.vscode/mcp.json`, or equivalent user MCP settings:

```json
{
  "servers": {
    "verified-x402": {
      "type": "http",
      "url": "https://verifiedx402.com/mcp"
    }
  }
}
```

The official MCP registry manifest is [server.json](server.json) (`com.verifiedx402/directory`).

## Example calls

Free catalog search:

```bash
curl "https://verifiedx402.com/search?q=weather&verified=1&limit=3"
```

List MCP tools (free):

```bash
curl -s https://verifiedx402.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"example","version":"0.0.1"}}}'

curl -s https://verifiedx402.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Call the free `search` tool:

```bash
curl -s https://verifiedx402.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search","arguments":{"q":"weather","verified":true,"limit":3}}}'
```

A recommendation without payment returns HTTP 402:

```bash
curl -i "https://verifiedx402.com/recommend?task=current+weather+in+Toronto&limit=3"
```

Pay $0.005 USDC on Base and get a ranked shortlist (see [examples/recommend.mjs](examples/recommend.mjs)):

```js
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const client = new x402Client().register("eip155:*", new ExactEvmScheme(account));
const paidFetch = wrapFetchWithPayment(fetch, client);

const response = await paidFetch(
  "https://verifiedx402.com/recommend?task=current+weather+in+Toronto&limit=3",
  { headers: { accept: "application/json" } },
);
const body = await response.json();
// body.recommendations is a ranked shortlist of verified x402 APIs.
// Pay the chosen API yourself; this directory does not call it for you.
```

More agent detail: [https://verifiedx402.com/llms.txt](https://verifiedx402.com/llms.txt) and [https://verifiedx402.com/llms-full.txt](https://verifiedx402.com/llms-full.txt).

## License

MIT. See [LICENSE](LICENSE).
