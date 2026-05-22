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
                  content: buildProfitHuntPrompt({ idea, market, buyerType }),
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

function buildProfitHuntPrompt({ idea, market, buyerType }) {
  return `You are ProfitHunter, a hackathon validation agent. Use web search to research the market for this startup idea, then return ONLY valid JSON.

Startup idea: ${idea}
Market: ${market}
Buyer type: ${buyerType}

Pick the product wedge most likely to collect a small refundable SOL preorder in 48 hours. Prefer proof of existing spend, reachable buyers, strong pain, and fast fulfillment. Avoid generic optimism.

If the submitted idea is weak, risky, illegal, too regulated, or unlikely to collect payment, say that clearly in "verdict" using wording like "Weak signal - pivot recommended" or "Do not pursue as written". Then generate an improved idea that could pass the hackathon criteria and make that improved idea the "winningWedge". Do not leave the user with only rejection.

Return raw JSON only. Do not wrap the JSON in markdown fences. Do not add commentary before or after it.

Return exactly this JSON shape:
{
  "steps": [
    {"label": "Extract ICP and value prop", "detail": "...", "artifact": "...", "confidence": "High"},
    {"label": "Find competitors and spending signals", "detail": "...", "artifact": "...", "confidence": "High"},
    {"label": "Generate validation experiments", "detail": "...", "artifact": "...", "confidence": "Medium"},
    {"label": "Choose the money test", "detail": "...", "artifact": "Buyer deposit: 0.05 SOL on devnet", "confidence": "High"}
  ],
  "verdict": "Worth testing OR Weak signal - pivot recommended OR Do not pursue as written",
  "winningWedge": "short improved product name",
  "improvedIdea": {
    "title": "short improved idea name",
    "pitch": "one-sentence product pitch that could collect a 0.05 SOL preorder",
    "whyBetter": "why this is more likely to pass than the original idea"
  },
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "next48h": ["task 1", "task 2", "Collect 0.05 SOL refundable deposit"],
  "nonObviousDecision": "one surprising decision and why",
  "experiments": [
    {"title": "product wedge", "buyer": "buyer segment", "price": "price in USD or SOL", "reason": "why this wedge ranks here", "score": 91},
    {"title": "product wedge", "buyer": "buyer segment", "price": "price in USD or SOL", "reason": "why this wedge ranks here", "score": 78},
    {"title": "product wedge", "buyer": "buyer segment", "price": "price in USD or SOL", "reason": "why this wedge ranks here", "score": 72}
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
