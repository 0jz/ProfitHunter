import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";

loadEnv();

function profitHuntApiPlugin() {
  return {
    name: "profit-hunt-api",
    configureServer(server) {
      server.middlewares.use("/api/profit-hunt", async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "Method not allowed." }));
          return;
        }

        try {
          const body = await readJsonBody(request);
          const apiKey = String(process.env.ANTHROPIC_API_KEY ?? "").trim();
          const idea = String(body.idea ?? "").trim();
          const targetCustomer = String(body.targetCustomer ?? "").trim();
          const priceGuess = String(body.priceGuess ?? "").trim();
          const market = String(body.market ?? "global").trim();
          const buyerType = String(body.buyerType ?? "b2b").trim();

          if (!apiKey) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env.");
          }

          if (!idea) {
            throw new Error("Startup idea is required.");
          }

          const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5",
              max_tokens: 3200,
              tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
              messages: [
                {
                  role: "user",
                  content: buildProfitHuntPrompt({ idea, targetCustomer, priceGuess, market, buyerType }),
                },
              ],
            }),
          });

          const anthropicPayload = await anthropicResponse.json();

          if (!anthropicResponse.ok) {
            throw new Error(anthropicPayload.error?.message ?? "Anthropic request failed.");
          }

          const result = parseClaudeJson(extractText(anthropicPayload));
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ result }));
        } catch (error) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Profit hunt failed." }));
        }
      });
    },
  };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function buildProfitHuntPrompt({ idea, targetCustomer, priceGuess, market, buyerType }) {
  return `You are ProfitHunter, a hackathon validation agent. Use web search to research the market for this startup idea, then return ONLY valid JSON.

Startup idea: ${idea}
Target customer: ${targetCustomer || "not provided"}
Price guess: ${priceGuess || "not provided"}
Market: ${market}
Buyer type: ${buyerType}

Pick the product wedge most likely to collect a small refundable SOL preorder in 48 hours. Prefer proof of existing spend, reachable buyers, strong pain, and fast fulfillment. Avoid generic optimism.

If the submitted idea is weak, risky, illegal, too regulated, or unlikely to collect payment, say that clearly in "verdict" using wording like "Weak signal - pivot recommended" or "Do not pursue as written". Then generate an improved idea that could pass the hackathon criteria and make that improved idea the "winningWedge". Do not leave the user with only rejection.

Confidence labels must not be placeholders:
- "High" means direct evidence from competitors, prices, current spend, or clear buyer behavior.
- "Medium" means partial evidence plus plausible inference.
- "Low" means mostly hypothesis or weak sources.
For every step, include "confidenceScore" from 0 to 100 and "confidenceReason" explaining the evidence quality.

Monetization must not be placeholder:
- Return one concrete "price" for the selected offer, e.g. "$49 setup + 0.05 SOL refundable deposit" or "0.05 SOL preorder".
- Explain the price in "reason" using comparable spend, buyer urgency, and friction.
- Include "paymentPurpose": what the final Solana payment proves and why it unlocks the rest of the output.
- In each experiment, "score" is a monetization score from 0 to 100. It must reflect willingness to pay, urgency, existing spend, reachability, and delivery speed.
- In each experiment, "price" must be a concrete amount and billing/deposit structure, never "TBD", "varies", or a placeholder.

Return raw JSON only. Do not wrap the JSON in markdown fences. Do not add commentary before or after it.

Return exactly this JSON shape:
{
  "steps": [
    {"label": "Extract ICP and promise", "detail": "...", "artifact": "...", "confidence": "High", "confidenceScore": 82, "confidenceReason": "..."},
    {"label": "Choose offer format", "detail": "...", "artifact": "...", "confidence": "High", "confidenceScore": 78, "confidenceReason": "..."},
    {"label": "Choose price + risk reversal", "detail": "...", "artifact": "Concrete price: ...", "confidence": "Medium", "confidenceScore": 64, "confidenceReason": "..."},
    {"label": "Decide primary channel + backup", "detail": "...", "artifact": "Primary channel: ...", "confidence": "High", "confidenceScore": 75, "confidenceReason": "..."}
  ],
  "verdict": "Worth testing OR Weak signal - pivot recommended OR Do not pursue as written",
  "winningWedge": "short improved product name",
  "improvedIdea": {
    "title": "short improved idea name",
    "pitch": "one-sentence product pitch that could collect a 0.05 SOL preorder",
    "whyBetter": "why this is more likely to pass than the original idea"
  },
  "primaryChannel": "Telegram / X / LinkedIn / Reddit / direct email, whichever is strongest",
  "offer": "specific paid offer to test",
  "price": "specific concrete price, never placeholder",
  "reason": "why this price is believable",
  "paymentPurpose": "what the 0.05 SOL payment proves and what it unlocks",
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "next48h": ["task 1", "task 2", "Collect 0.05 SOL refundable deposit"],
  "nonObviousDecision": "one surprising decision and why",
  "experiments": [
    {"title": "product wedge", "buyer": "buyer segment", "price": "$49 setup + 0.05 SOL refundable preorder", "reason": "why this price and monetization score are justified", "score": 91},
    {"title": "product wedge", "buyer": "buyer segment", "price": "$19 report + 0.05 SOL preorder", "reason": "why this price and monetization score are justified", "score": 78},
    {"title": "product wedge", "buyer": "buyer segment", "price": "$99 pilot deposit", "reason": "why this price and monetization score are justified", "score": 72}
  ]
}`;
}

function extractText(payload) {
  return (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseClaudeJson(text) {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const jsonText = extractJsonObject(withoutFences);
  return JSON.parse(jsonText);
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("Claude did not return a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, index + 1);
    }
  }

  throw new Error("Claude returned incomplete JSON.");
}

export default defineConfig({
  plugins: [react(), profitHuntApiPlugin()],
});
