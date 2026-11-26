// Paid recommendation from Verified x402.
// npm install @x402/fetch @x402/evm viem
// EVM_PRIVATE_KEY must be a funded Base wallet; this call costs $0.005 USDC.

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
console.log(body);
// body.recommendations is a ranked shortlist of verified x402 APIs.
// Pay the chosen API yourself; this directory does not call it for you.
