import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
          const apiKey = String(body.apiKey ?? "").trim();
          const idea = String(body.idea ?? "").trim();
          const market = String(body.market ?? "global").trim();
          const buyerType = String(body.buyerType ?? "b2b").trim();

          if (!apiKey) {
            throw new Error("Anthropic API key is required for live search.");
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
              max_tokens: 1800,
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
  return `You are ProfitHunter, a hackathon demo agent. Use web search to research the market for this startup idea, then return ONLY valid JSON.

Startup idea: ${idea}
Market: ${market}
Buyer type: ${buyerType}

Pick the product wedge most likely to collect a small refundable SOL preorder in 48 hours. Prefer proof of existing spend, reachable buyers, strong pain, and fast fulfillment. Avoid generic optimism.

Return exactly this JSON shape:
{
  "steps": [
    {"label": "Extract ICP and value prop", "detail": "...", "artifact": "...", "confidence": "High"},
    {"label": "Find competitors and spending signals", "detail": "...", "artifact": "...", "confidence": "High"},
    {"label": "Generate validation experiments", "detail": "...", "artifact": "...", "confidence": "Medium"},
    {"label": "Choose the money test", "detail": "...", "artifact": "Buyer deposit: 0.05 SOL on devnet", "confidence": "High"}
  ],
  "verdict": "Worth testing",
  "winningWedge": "short product name",
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
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1] ?? trimmed;
  return JSON.parse(jsonText);
}

export default defineConfig({
  plugins: [react(), profitHuntApiPlugin()],
});
