import { StrictMode, useState, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Gauge,
  Globe2,
  Loader2,
  LockKeyhole,
  Radar,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import "./styles.css";

type Opportunity = {
  name: string;
  audience: string;
  price: string;
  margin: string;
  score: number;
  insight: string;
  signals: string[];
};

const opportunities: Opportunity[] = [
  {
    name: "AI Revenue Inbox for boutique agencies",
    audience: "Design and dev studios selling retainers",
    price: "$149/mo",
    margin: "88%",
    score: 91,
    insight:
      "Agencies already pay for CRM, proposal tools, and lead enrichment. The fastest wedge is recovering warm leads that went quiet.",
    signals: ["Existing spend", "High urgency", "Easy outreach"],
  },
  {
    name: "Menu Margin Optimizer for restaurants",
    audience: "Independent restaurants with delivery menus",
    price: "$79/mo",
    margin: "81%",
    score: 78,
    insight:
      "Clear ROI story, but local owner reach is slower. Strong if paired with done-for-you setup.",
    signals: ["Visible pain", "Medium CAC", "Serviceable"],
  },
  {
    name: "Figma-to-Quote assistant",
    audience: "Freelance designers quoting web builds",
    price: "$19/report",
    margin: "94%",
    score: 72,
    insight:
      "Simple to ship and high margin, but lower buyer urgency unless bundled with client handoff.",
    signals: ["Low build cost", "Low ticket", "Crowded"],
  },
];

const validationSteps = [
  "Researches search, forums, reviews, and competitor pricing",
  "Scores product wedges by spend, urgency, margin, and test speed",
  "Builds a paid offer and checkout experiment",
  "Collects USDC/SOL validation receipts on devnet",
];

function App() {
  const [isHunting, setIsHunting] = useState(false);
  const [huntComplete, setHuntComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  function runHunt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHuntComplete(false);
    setIsHunting(true);
    window.setTimeout(() => {
      setIsHunting(false);
      setHuntComplete(true);
    }, 900);
  }

  async function copyAddress() {
    await navigator.clipboard.writeText("7xKXw9Shp6qV7Yq8p2aB");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
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
          <a href="#agent">Agent</a>
          <a href="#score">Score</a>
          <a href="#payment">Solana</a>
        </nav>
        <button className="wallet-button" type="button">
          <Wallet size={17} aria-hidden="true" />
          <span>7xKX...p2aB</span>
        </button>
      </header>

      <section id="top" className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Startup Idea Agent for first-dollar validation
          </p>
          <h1>Find the product inside an idea that can actually make money.</h1>
          <p className="hero-lede">
            ProfitHunter researches the market, ranks profitable product wedges,
            launches a paid experiment, and proves demand with Solana receipts.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#agent">
              Run a hunt
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-action" href="#payment">
              View payment flow
            </a>
          </div>
        </div>

        <div className="signal-panel" aria-label="Profit validation preview">
          <div className="signal-header">
            <div>
              <p className="panel-kicker">Current hunt</p>
              <h2>AI tools for small service businesses</h2>
            </div>
            <span className="live-pill">
              <span aria-hidden="true" />
              Live
            </span>
          </div>
          <div className="profit-meter">
            <div>
              <span className="meter-value">91</span>
              <span className="meter-label">Profit score</span>
            </div>
            <div className="meter-ring" aria-hidden="true">
              <span />
            </div>
          </div>
          <div className="evidence-grid">
            <Evidence label="Target price" value="$149/mo" />
            <Evidence label="Gross margin" value="88%" />
            <Evidence label="CAC proxy" value="$22" />
            <Evidence label="Payback" value="4.4 days" />
          </div>
        </div>
      </section>

      <section id="agent" className="agent-workspace" aria-labelledby="agent-title">
        <div className="section-heading">
          <p className="eyebrow">
            <Search size={16} aria-hidden="true" />
            Hypothesis in, paid experiment out
          </p>
          <h2 id="agent-title">The agent is optimized for profit, not opinions.</h2>
        </div>

        <div className="workspace-grid">
          <form className="hunt-form" onSubmit={runHunt}>
            <div className="field">
              <label htmlFor="hypothesis">Startup hypothesis</label>
              <textarea
                id="hypothesis"
                name="hypothesis"
                rows={5}
                defaultValue="AI tools for small service businesses that can produce measurable revenue in under 30 days."
                aria-describedby="hypothesis-help"
              />
              <p id="hypothesis-help">
                Describe the market, audience, or rough product area you want ProfitHunter to investigate.
              </p>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="budget">Experiment budget</label>
                <input
                  id="budget"
                  name="budget"
                  inputMode="decimal"
                  defaultValue="25 USDC"
                  aria-describedby="budget-help"
                />
                <p id="budget-help">Used to fund the validation run.</p>
              </div>
              <div className="field">
                <label htmlFor="network">Network</label>
                <select id="network" name="network" defaultValue="devnet">
                  <option value="devnet">Solana devnet</option>
                  <option value="testnet">Solana testnet</option>
                  <option value="mainnet">Solana mainnet</option>
                </select>
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={isHunting} aria-busy={isHunting}>
              {isHunting ? <Loader2 size={18} aria-hidden="true" /> : <CircleDollarSign size={18} aria-hidden="true" />}
              {isHunting ? "Running profit hunt" : "Hunt for winning product"}
            </button>
            {huntComplete && (
              <p className="success-note" role="status">
                <Check size={16} aria-hidden="true" />
                Winning wedge found: AI Revenue Inbox has the highest first-dollar score.
              </p>
            )}
          </form>

          <div className="agent-card" aria-live="polite">
            <div className="agent-status">
              <span className={`status-icon ${huntComplete ? "is-complete" : ""}`}>
                {huntComplete ? <Check size={18} aria-hidden="true" /> : <Loader2 size={18} aria-hidden="true" />}
              </span>
              <div>
                <p>Agent run</p>
                <strong>
                  {huntComplete
                    ? "Winning product selected and ready for payment test"
                    : "Searching for the fastest path to profit"}
                </strong>
              </div>
            </div>
            <ol className="step-list">
              {validationSteps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="score" className="score-section" aria-labelledby="score-title">
        <div className="section-heading compact">
          <p className="eyebrow">
            <Gauge size={16} aria-hidden="true" />
            Opportunity ranking
          </p>
          <h2 id="score-title">Profit score favors markets where buyers already spend.</h2>
        </div>

        <div className="opportunity-list">
          {opportunities.map((item, index) => (
            <article className="opportunity-card" key={item.name}>
              <div className="rank">0{index + 1}</div>
              <div className="opportunity-main">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.audience}</p>
                </div>
                <p className="insight">{item.insight}</p>
                <div className="signal-tags">
                  {item.signals.map((signal) => (
                    <span key={signal}>{signal}</span>
                  ))}
                </div>
              </div>
              <div className="opportunity-metrics">
                <Metric label="Score" value={item.score.toString()} />
                <Metric label="Price" value={item.price} />
                <Metric label="Margin" value={item.margin} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="payment" className="payment-section" aria-labelledby="payment-title">
        <div className="payment-copy">
          <p className="eyebrow">
            <LockKeyhole size={16} aria-hidden="true" />
            Solana payment proof
          </p>
          <h2 id="payment-title">Every validation run leaves a payment trail.</h2>
          <p>
            The founder funds a hunt. Buyers can place a preorder or deposit. ProfitHunter
            uses the receipt as the strongest possible demand signal.
          </p>
        </div>

        <div className="receipt-card">
          <div className="receipt-row">
            <span>Validation deposit</span>
            <strong>25.00 USDC</strong>
          </div>
          <div className="receipt-row">
            <span>Network</span>
            <strong>Solana devnet</strong>
          </div>
          <div className="receipt-address">
            <span>Escrow wallet</span>
            <button type="button" aria-label="Copy escrow wallet address" onClick={copyAddress}>
              <Copy size={16} aria-hidden="true" />
              {copied ? "Copied" : "7xKX...p2aB"}
            </button>
          </div>
          <a className="explorer-link" href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer">
            Open devnet explorer
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidence-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
