import { StrictMode, useState, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Gauge,
  Loader2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import "./styles.css";

type AgentStep = {
  label: string;
  detail: string;
  artifact: string;
  confidence: "High" | "Medium" | "Low";
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
  improvedIdea: {
    title: string;
    pitch: string;
    whyBetter: string;
  };
  topReasons: string[];
  risks: string[];
  next48h: string[];
  nonObviousDecision: string;
  experiments: Experiment[];
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
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

const PAYMENT_SOL = 0.05;
const RECIPIENT_WALLET = "7f7Gqo2rCMXSRdeqR7spLkx8vS9U6YLH1KH6xTVBrmEL";
const DEVNET_EXPLORER = "https://explorer.solana.com";

const defaultResult: HuntResult = {
  steps: agentSteps,
  verdict: "Worth testing",
  winningWedge: "AI Revenue Inbox",
  improvedIdea: {
    title: "AI Revenue Inbox",
    pitch: "A tool for boutique agencies that finds warm leads that went quiet and drafts a 48-hour recovery sequence.",
    whyBetter: "It sells a direct revenue outcome to buyers who already pay for CRM, proposal, and lead tools.",
  },
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
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSignature, setPaymentSignature] = useState("");
  const [apiError, setApiError] = useState("");
  const [usedLiveSearch, setUsedLiveSearch] = useState(false);
  const [result, setResult] = useState<HuntResult>(defaultResult);

  async function runAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const idea = String(formData.get("idea") ?? "");
    const market = String(formData.get("market") ?? "");
    const buyerType = String(formData.get("buyer-type") ?? "");

    setApiError("");
    setUsedLiveSearch(false);
    setHasRun(false);
    setIsRunning(true);

    try {
      const response = await fetch("/api/profit-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, market, buyerType }),
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

  async function copyTx() {
    await navigator.clipboard.writeText(paymentSignature || RECIPIENT_WALLET);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function connectWallet() {
    setWalletError("");
    if (isWalletConnected) {
      return window.solana?.publicKey ?? null;
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
      return response.publicKey;
    } catch {
      setWalletError("Wallet connect je odbijen ili nije uspeo.");
      return null;
    }
  }

  async function payWithSolana() {
    setPaymentError("");
    setIsPaying(true);

    try {
      const provider = window.solana;
      const payer = await connectWallet();
      if (!provider || !payer) {
        throw new Error("Povezi Phantom wallet pre placanja.");
      }

      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const recipient = new PublicKey(RECIPIENT_WALLET);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: payer,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: recipient,
          lamports: Math.round(PAYMENT_SOL * LAMPORTS_PER_SOL),
        }),
      );

      const { signature } = await provider.signAndSendTransaction(transaction);
      await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");
      setPaymentSignature(signature);
      setIsPaid(true);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Solana transakcija nije uspela.");
      setIsPaid(false);
    } finally {
      setIsPaying(false);
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
          aria-label={isWalletConnected ? "Wallet connected" : "Connect wallet"}
          onClick={connectWallet}
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

        <div className="summary-card" aria-label="Current validation summary">
          <div className="summary-header">
            <div>
              <p className="panel-kicker">Current analysis</p>
              <h2>{result.winningWedge}</h2>
            </div>
            <span className="live-pill">
              <span aria-hidden="true" />
              {usedLiveSearch ? "Live search" : "Ready"}
            </span>
          </div>
          <p className="summary-quote">
            {result.improvedIdea.pitch}
          </p>
          <div className="proof-strip">
            <ProofStat label="Verdict" value={result.verdict} />
            <ProofStat label="Winning wedge" value={result.winningWedge.replace(/^AI /, "")} />
            <ProofStat label="Buyer pays" value={`${PAYMENT_SOL} SOL`} />
          </div>
        </div>
      </section>

      <section id="run" className="agent-workspace" aria-labelledby="run-title">
        <div className="section-heading">
          <p className="eyebrow">
            <Search size={16} aria-hidden="true" />
            Paste idea, run agent, inspect trace
          </p>
          <h2 id="run-title">The agent shows decisions, not just generated text.</h2>
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
                <strong>
                  {isRunning
                    ? "Agent is choosing the money test"
                    : isRejectedResult(result.verdict)
                      ? "Agent rewrote the idea into a stronger wedge"
                      : "Agent selected a payable wedge"}
                </strong>
              </div>
            </div>
            {apiError && <p className="api-error" role="status">{apiError} Fallback result is shown instead.</p>}
            <ol className="trace-list">
              {result.steps.map((step, index) => (
                <li key={step.label}>
                  <span className="trace-index">{index + 1}</span>
                  <div>
                    <div className="trace-title">
                      <strong>{step.label}</strong>
                      <span className={`confidence-badge confidence-${step.confidence.toLowerCase()}`}>{step.confidence}</span>
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
            <div className="decision-box improved-box">
              <strong>Improved idea that can pass</strong>
              <h4>{result.improvedIdea.title}</h4>
              <p>{result.improvedIdea.pitch}</p>
              <small>{result.improvedIdea.whyBetter}</small>
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
            {isPaid ? "Buyer deposit confirmed" : "Waiting for Phantom signature"}
          </div>
          <div className="receipt-row">
            <span>Product preorder</span>
            <strong>{result.winningWedge}</strong>
          </div>
          <div className="receipt-row">
            <span>Buyer payment</span>
            <strong>{PAYMENT_SOL} SOL</strong>
          </div>
          <div className="receipt-row">
            <span>Network</span>
            <strong>Solana devnet</strong>
          </div>
          <div className="receipt-address">
            <span>{paymentSignature ? "TX hash" : "Recipient wallet"}</span>
            <button type="button" aria-label="Copy transaction hash" onClick={copyTx}>
              <Copy size={16} aria-hidden="true" />
              {copied ? "Copied" : truncateAddress(paymentSignature || RECIPIENT_WALLET)}
            </button>
          </div>
          <button className="submit-button proof-button" type="button" onClick={payWithSolana} disabled={!hasRun || isPaying}>
            {isPaying ? <Loader2 size={18} aria-hidden="true" /> : <Wallet size={18} aria-hidden="true" />}
            {isPaying ? "Confirming on devnet" : `Pay ${PAYMENT_SOL} SOL with Phantom`}
          </button>
          {paymentError && <p className="payment-error" role="status">{paymentError}</p>}
          <a className="explorer-link" href={explorerUrl(paymentSignature)} target="_blank" rel="noreferrer">
            Open devnet explorer
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          <p className="receipt-note">
            Sends devnet SOL to {truncateAddress(RECIPIENT_WALLET)} as the validation deposit.
          </p>
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

function explorerUrl(signature: string) {
  return signature
    ? `${DEVNET_EXPLORER}/tx/${signature}?cluster=devnet`
    : `${DEVNET_EXPLORER}/address/${RECIPIENT_WALLET}?cluster=devnet`;
}

function isRejectedResult(verdict: string) {
  const normalized = verdict.toLowerCase();
  return normalized.includes("weak") || normalized.includes("reject") || normalized.includes("don't") || normalized.includes("pivot");
}

function normalizeResult(value: Partial<HuntResult>): HuntResult {
  return {
    ...defaultResult,
    ...value,
    steps: Array.isArray(value.steps) && value.steps.length ? value.steps.slice(0, 4) as AgentStep[] : defaultResult.steps,
    improvedIdea: value.improvedIdea?.title ? value.improvedIdea : defaultResult.improvedIdea,
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
