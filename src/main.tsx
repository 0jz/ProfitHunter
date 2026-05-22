import { StrictMode, useState, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import "./styles.css";

type AgentStep = {
  label: string;
  detail: string;
  artifact: string;
  confidence: "High" | "Medium";
};

type Experiment = {
  title: string;
  buyer: string;
  price: string;
  reason: string;
  score: number;
};

type HuntResult = {
  steps: AgentStep[];
  verdict: string;
  winningWedge: string;
  topReasons: string[];
  risks: string[];
  next48h: string[];
  nonObviousDecision: string;
  experiments: Experiment[];
};

type SolanaProvider = {
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

const agentSteps: AgentStep[] = [
  {
    label: "Extract ICP and value prop",
    detail: "Detected that the buyer is not 'small business', but service firms losing warm leads.",
    artifact: "ICP: boutique agencies with 5-30 retainers",
    confidence: "High",
  },
  {
    label: "Find competitors and spending signals",
    detail: "Compared CRM, proposal, and lead enrichment tools instead of generic AI assistants.",
    artifact: "Existing spend: $59-$299/mo per seat",
    confidence: "High",
  },
  {
    label: "Generate validation experiments",
    detail: "Rejected a generic chatbot because it has weak urgency and unclear willingness to pay.",
    artifact: "Experiment: recover quiet leads in 48h",
    confidence: "Medium",
  },
  {
    label: "Choose the money test",
    detail: "Selected refundable preorder over survey feedback because payment is the validation event.",
    artifact: "Buyer deposit: 0.05 SOL on devnet",
    confidence: "High",
  },
];

const experiments: Experiment[] = [
  {
    title: "AI Revenue Inbox",
    buyer: "Boutique agencies",
    price: "$149/mo",
    reason: "High existing spend, direct revenue tie, fast outreach list.",
    score: 91,
  },
  {
    title: "Menu Margin Optimizer",
    buyer: "Independent restaurants",
    price: "$79/mo",
    reason: "Strong ROI, but slower buyer access and more setup work.",
    score: 78,
  },
  {
    title: "Figma-to-Quote Assistant",
    buyer: "Freelance designers",
    price: "$19/report",
    reason: "Easy to ship, but lower urgency and lower ticket size.",
    score: 72,
  },
];

const txHash = "4m5F...9QpD";

const defaultResult: HuntResult = {
  steps: agentSteps,
  verdict: "Worth testing",
  winningWedge: "AI Revenue Inbox",
  topReasons: ["Existing CRM/proposal spend", "Revenue recovery is urgent", "Buyers reachable via LinkedIn/email"],
  risks: ["Outcome claim needs proof", "Crowded AI-sales category", "Requires credible data access"],
  next48h: ["Build one landing page", "Ask 30 agency owners for a preorder", "Collect 0.05 SOL refundable deposit"],
  nonObviousDecision:
    "Do not start with restaurants. Their pain is real, but buyer access and setup friction make them weaker for a 48-hour money test.",
  experiments,
};

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletError, setWalletError] = useState("");
  const [apiError, setApiError] = useState("");
  const [usedLiveSearch, setUsedLiveSearch] = useState(false);
  const [result, setResult] = useState<HuntResult>(defaultResult);

  async function runAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const idea = String(formData.get("idea") ?? "");
    const market = String(formData.get("market") ?? "");
    const buyerType = String(formData.get("buyer-type") ?? "");
    const apiKey = String(formData.get("anthropic-key") ?? "").trim();

    setApiError("");
    setUsedLiveSearch(false);
    setHasRun(false);
    setIsRunning(true);

    if (!apiKey) {
      window.setTimeout(() => {
        setResult(defaultResult);
        setIsRunning(false);
        setHasRun(true);
        setIsPaid(false);
      }, 1100);
      return;
    }

    try {
      const response = await fetch("/api/profit-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, idea, market, buyerType }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Anthropic search failed.");
      }

      setResult(normalizeResult(payload.result));
      setUsedLiveSearch(true);
      setIsPaid(false);
    } catch (error) {
      setResult(defaultResult);
      setApiError(error instanceof Error ? error.message : "Could not run live Anthropic search.");
      setIsPaid(false);
    } finally {
      setIsRunning(false);
      setHasRun(true);
    }
  }

  function simulatePayment() {
    setIsPaid(false);
    window.setTimeout(() => setIsPaid(true), 800);
  }

  async function copyTx() {
    await navigator.clipboard.writeText("4m5FJ2QxDemoDevnetProfitHunter9QpD");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function toggleWallet() {
    setWalletError("");
    if (isWalletConnected) {
      await window.solana?.disconnect?.();
      setIsWalletConnected(false);
      setWalletAddress("");
      return;
    }

    const provider = window.solana;
    if (!provider?.isPhantom) {
      setWalletError("Phantom nije pronadjen. Instaliraj Phantom ekstenziju ili otvori app u browseru gde je wallet aktivan.");
      return;
    }

    try {
      const response = await provider.connect({ onlyIfTrusted: false });
      setWalletAddress(response.publicKey.toString());
      setIsWalletConnected(true);
    } catch {
      setWalletError("Wallet connect je odbijen ili nije uspeo.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="ProfitHunter navigation">
        <a className="brand" href="#top" aria-label="ProfitHunter home">
          <span className="brand-mark" aria-hidden="true">
            <Radar size={18} />
          </span>
          <span>ProfitHunter</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#run">Agent loop</a>
          <a href="#results">Verdict</a>
          <a href="#proof">Payment proof</a>
        </nav>
        <button
          className={`wallet-button ${isWalletConnected ? "is-connected" : ""}`}
          type="button"
          aria-label={isWalletConnected ? "Disconnect wallet" : "Connect wallet"}
          onClick={toggleWallet}
        >
          <Wallet size={17} aria-hidden="true" />
          {isWalletConnected && <span className="wallet-dot" aria-hidden="true" />}
          <span>{isWalletConnected ? truncateAddress(walletAddress) : "Connect wallet"}</span>
        </button>
      </header>
      {walletError && <p className="top-error" role="status">{walletError}</p>}

      <section id="top" className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Prove it, don't sell it
          </p>
          <h1>Turn a vague startup idea into a paid demand test.</h1>
          <p className="hero-lede">
            ProfitHunter runs an agent loop, chooses the most profitable wedge,
            and proves validation with a buyer payment on Solana.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#run">
              Watch the agent run
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#proof">
              See payment proof
            </a>
          </div>
        </div>

        <div className="demo-card" aria-label="Hackathon demo proof">
          <div className="demo-header">
            <div>
              <p className="panel-kicker">Live demo shape</p>
              <h2>Idea from audience</h2>
            </div>
            <span className="live-pill">
              <span aria-hidden="true" />
              90 sec
            </span>
          </div>
          <p className="demo-quote">
            "AI tools for small service businesses that can create measurable revenue in 30 days."
          </p>
          <div className="proof-strip">
            <ProofStat label="Verdict" value="Worth testing" />
            <ProofStat label="Winning wedge" value={result.winningWedge.replace(/^AI /, "")} />
            <ProofStat label="Buyer paid" value="0.05 SOL" />
          </div>
        </div>
      </section>

      <section id="run" className="agent-workspace" aria-labelledby="run-title">
        <div className="section-heading">
          <p className="eyebrow">
            <Search size={16} aria-hidden="true" />
            Paste idea, run agent, inspect trace
          </p>
          <h2 id="run-title">The demo shows decisions, not just generated text.</h2>
        </div>

        <div className="workspace-grid">
          <form className="hunt-form" onSubmit={runAgent}>
            <div className="field">
              <label htmlFor="idea">Startup idea</label>
              <textarea
                id="idea"
                name="idea"
                rows={5}
                defaultValue="I want an AI product for small service businesses that helps them make more money quickly."
                aria-describedby="idea-help"
              />
              <p id="idea-help">One short paragraph is enough. No login, no onboarding maze.</p>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="market">Market</label>
                <select id="market" name="market" defaultValue="us-eu">
                  <option value="us-eu">US/EU English-speaking</option>
                  <option value="serbia">Serbia and Balkans</option>
                  <option value="global">Global</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="buyer-type">Buyer type</label>
                <select id="buyer-type" name="buyer-type" defaultValue="b2b">
                  <option value="b2b">B2B buyer</option>
                  <option value="creator">Creator / solo maker</option>
                  <option value="consumer">Consumer</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="anthropic-key">Anthropic API key</label>
              <input
                id="anthropic-key"
                name="anthropic-key"
                type="password"
                autoComplete="off"
                placeholder="sk-ant-api03-..."
                aria-describedby="anthropic-key-help"
              />
              <p id="anthropic-key-help">
                Optional for demo mode. If provided, it is sent only to the local `/api/profit-hunt` endpoint.
              </p>
            </div>

            <button className="submit-button" type="submit" disabled={isRunning} aria-busy={isRunning}>
              {isRunning ? <Loader2 size={18} aria-hidden="true" /> : <Radar size={18} aria-hidden="true" />}
              {isRunning ? "Running agent loop" : "Analyze in 90 seconds"}
            </button>
          </form>

          <div className="agent-card" aria-live="polite">
            <div className="agent-status">
              <span className={`status-icon ${hasRun ? "is-complete" : ""}`}>
                {isRunning ? <Loader2 size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
              </span>
              <div>
                <p>{usedLiveSearch ? "Live Anthropic search" : "Autonomy proof"}</p>
                <strong>{isRunning ? "Agent is choosing the money test" : "Agent rejected the obvious generic chatbot wedge"}</strong>
              </div>
            </div>
            {apiError && <p className="api-error" role="status">{apiError} Demo result is shown instead.</p>}
            <ol className="trace-list">
              {result.steps.map((step, index) => (
                <li key={step.label}>
                  <span className="trace-index">{index + 1}</span>
                  <div>
                    <div className="trace-title">
                      <strong>{step.label}</strong>
                      <span>{step.confidence}</span>
                    </div>
                    <p>{step.detail}</p>
                    <small>{step.artifact}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="results" className="results-section" aria-labelledby="results-title">
        <div className="section-heading compact">
          <p className="eyebrow">
            <Gauge size={16} aria-hidden="true" />
            Verdict, risks, next 48h
          </p>
          <h2 id="results-title">The answer is operational enough to act on tomorrow.</h2>
        </div>

        <div className="results-grid">
          <article className="verdict-card">
            <span className="verdict-label">Verdict</span>
            <h3>{result.verdict}</h3>
            <p>
              The winning wedge is {result.winningWedge} because it maps to money already
              being spent and has a short route to a paid preorder.
            </p>
            <div className="decision-box">
              <strong>Non-obvious agent decision</strong>
              <p>{result.nonObviousDecision}</p>
            </div>
          </article>

          <div className="reason-grid">
            <SignalPanel title="Top reasons" items={result.topReasons} />
            <SignalPanel title="Risks" items={result.risks} />
            <SignalPanel title="Next 48h" items={result.next48h} />
          </div>
        </div>

        <div className="experiment-table" aria-label="Ranked product experiments">
          {result.experiments.map((experiment) => (
            <article className="experiment-row" key={experiment.title}>
              <div>
                <h3>{experiment.title}</h3>
                <p>{experiment.buyer}</p>
              </div>
              <div className="experiment-reason">{experiment.reason}</div>
              <ProofStat label="Price" value={experiment.price} />
              <ProofStat label="Score" value={experiment.score.toString()} />
            </article>
          ))}
        </div>
      </section>

      <section id="proof" className="payment-section" aria-labelledby="payment-title">
        <div className="payment-copy">
          <p className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            Payment proof, not a report paywall
          </p>
          <h2 id="payment-title">The buyer pays for the proposed product, not for research.</h2>
          <p>
            In the pitch, the clean proof moment is a small refundable preorder from a real
            audience member or judge. The transaction is the validation artifact.
          </p>
        </div>

        <div className="receipt-card">
          <div className="receipt-status">
            <span className={isPaid ? "paid-dot" : "pending-dot"} aria-hidden="true" />
            {isPaid ? "Buyer deposit confirmed" : "Waiting for signature"}
          </div>
          <div className="receipt-row">
            <span>Product preorder</span>
            <strong>{result.winningWedge}</strong>
          </div>
          <div className="receipt-row">
            <span>Buyer payment</span>
            <strong>0.05 SOL</strong>
          </div>
          <div className="receipt-row">
            <span>Network</span>
            <strong>Solana devnet</strong>
          </div>
          <div className="receipt-address">
            <span>TX hash</span>
            <button type="button" aria-label="Copy transaction hash" onClick={copyTx}>
              <Copy size={16} aria-hidden="true" />
              {copied ? "Copied" : txHash}
            </button>
          </div>
          <button className="submit-button proof-button" type="button" onClick={simulatePayment} disabled={!hasRun}>
            <Wallet size={18} aria-hidden="true" />
            Simulate buyer pays 0.05 SOL
          </button>
          <a className="explorer-link" href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer">
            Open devnet explorer
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          <p className="receipt-note">
            Full report unlocks after the buyer signal, but the money movement is the proof.
          </p>
        </div>
      </section>

      <section className="pitch-section" aria-label="Five minute pitch structure">
        <div className="pitch-card">
          <FileText size={20} aria-hidden="true" />
          <div>
            <h2>5-minute pitch spine</h2>
            <p>
              30s problem, 90s live agent loop, 90s verdict, 60s buyer payment proof,
              30s why this is impossible without AI.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProofStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="proof-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SignalPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="signal-box">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={15} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function truncateAddress(address: string, chars = 4) {
  if (!address) return "Connected";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function normalizeResult(value: Partial<HuntResult>): HuntResult {
  return {
    ...defaultResult,
    ...value,
    steps: Array.isArray(value.steps) && value.steps.length ? value.steps.slice(0, 4) as AgentStep[] : defaultResult.steps,
    topReasons: Array.isArray(value.topReasons) && value.topReasons.length ? value.topReasons.slice(0, 3) : defaultResult.topReasons,
    risks: Array.isArray(value.risks) && value.risks.length ? value.risks.slice(0, 3) : defaultResult.risks,
    next48h: Array.isArray(value.next48h) && value.next48h.length ? value.next48h.slice(0, 3) : defaultResult.next48h,
    experiments:
      Array.isArray(value.experiments) && value.experiments.length
        ? value.experiments.slice(0, 3) as Experiment[]
        : defaultResult.experiments,
  };
}

type RootContainer = HTMLElement & {
  profitHunterRoot?: Root;
};

const rootElement = document.getElementById("root") as RootContainer;
const root = rootElement.profitHunterRoot ?? createRoot(rootElement);
rootElement.profitHunterRoot = root;

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
