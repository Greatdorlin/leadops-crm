import type { CSSProperties } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Command,
  FileText,
  Gauge,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Mail,
  Megaphone,
  PanelsTopLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import styles from "./design-lab.module.css";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Leads", icon: UserRound },
  { label: "Pipeline", icon: PanelsTopLeft },
  { label: "Deals", icon: CircleDollarSign },
  { label: "Tasks", icon: ListChecks },
  { label: "Contacts", icon: UsersRound },
  { label: "Campaigns", icon: Megaphone },
  { label: "Reports", icon: LineChart },
  { label: "Settings", icon: Settings },
];

const metrics = [
  {
    label: "New Leads",
    value: "128",
    trend: "+18% vs last 7 days",
    icon: UsersRound,
    glow: "rgba(96,165,250,0.34)",
    stroke: "#a78bfa",
  },
  {
    label: "Qualified Leads",
    value: "74",
    trend: "+22% vs last 7 days",
    icon: CheckCircle2,
    glow: "rgba(110,231,183,0.32)",
    stroke: "#86efac",
  },
  {
    label: "Deals in Progress",
    value: "42",
    trend: "+9% vs last 7 days",
    icon: Gauge,
    glow: "rgba(103,232,249,0.34)",
    stroke: "#67e8f9",
  },
  {
    label: "Revenue Forecast",
    value: "$2.48M",
    trend: "+16% vs last 7 days",
    icon: CircleDollarSign,
    glow: "rgba(251,146,60,0.3)",
    stroke: "#fb7185",
  },
  {
    label: "Conversion Rate",
    value: "24.6%",
    trend: "+12% vs last 7 days",
    icon: Target,
    glow: "rgba(125,211,252,0.28)",
    stroke: "#7dd3fc",
  },
];

const stages = [
  { name: "New", count: 450, color: "rgba(91,124,255,0.9)", height: "172px" },
  { name: "Contacted", count: 320, color: "rgba(168,85,247,0.86)", height: "156px" },
  { name: "Qualified", count: 210, color: "rgba(244,114,182,0.82)", height: "142px" },
  { name: "Proposal", count: 120, color: "rgba(251,191,36,0.78)", height: "124px" },
  { name: "Won", count: 60, color: "rgba(52,211,153,0.78)", height: "106px" },
];

const tasks = [
  { title: "Follow up with Zenith Co.", detail: "Email follow-up", due: "Today", color: "#7dd3fc" },
  { title: "Prepare proposal for Acme", detail: "Proposal", due: "May 24", color: "#fbbf24" },
  { title: "Intro call with Rivers Ltd.", detail: "Call", due: "May 25", color: "#a78bfa" },
  { title: "Check in with Apex Corp.", detail: "Follow-up", due: "May 27", color: "#34d399" },
];

const sources = [
  { label: "Website", value: "38%", color: "#9b6cff" },
  { label: "Referrals", value: "22%", color: "#60a5fa" },
  { label: "Social Media", value: "18%", color: "#34d399" },
  { label: "Email Campaign", value: "12%", color: "#fbbf24" },
  { label: "Other", value: "10%", color: "#94a3b8" },
];

const recentLeads = [
  ["Aurelia Systems", "aurelia.com", "Qualified", "92", "Website", "Sarah Kim", "2m ago"],
  ["Vertex Labs", "vertexlabs.io", "Proposal", "81", "Referrals", "James Lee", "15m ago"],
  ["Northwind Co.", "northwind.co", "Discovery", "76", "Social", "Michael Chen", "1h ago"],
  ["BrightWave", "brightwave.io", "Follow Up", "64", "Website", "Sarah Kim", "2h ago"],
  ["Cobalt Dynamics", "cobaltdyn.com", "New", "58", "Email", "James Lee", "3h ago"],
];

const teamRows = [
  ["Sarah Kim", "12", "$640,000", "128%"],
  ["James Lee", "9", "$420,000", "105%"],
  ["Michael Chen", "7", "$310,000", "89%"],
  ["Jessica Park", "5", "$215,000", "72%"],
  ["Daniel Kim", "4", "$180,000", "60%"],
];

const backgrounds = [
  "/backgrounds/bg-butterfly-glass.png",
  "/backgrounds/bg-botanical-bloom.png",
  "/backgrounds/bg-dark-luxury.png",
  "/backgrounds/bg-cyberpunk-minimal.png",
  "/backgrounds/bg-midnight-horizon.png",
];

function customStyle(values: Record<string, string>) {
  return values as CSSProperties;
}

function Sparkline({ stroke }: { stroke: string }) {
  return (
    <svg className={styles.sparkline} viewBox="0 0 220 42" role="img" aria-label="Metric trend">
      <defs>
        <linearGradient id={`spark-${stroke.replace("#", "")}`} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor={stroke} stopOpacity="0.2" />
          <stop offset="0.55" stopColor={stroke} stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path
        d="M4 30 C24 18 34 28 48 22 C63 15 70 8 88 24 C104 38 116 12 132 16 C151 20 154 5 173 10 C192 15 199 28 216 18"
        fill="none"
        stroke={`url(#spark-${stroke.replace("#", "")})`}
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function StatusPill({ label }: { label: string }) {
  const color =
    label === "Qualified"
      ? ["rgba(52,211,153,0.16)", "#86efac"]
      : label === "Proposal"
        ? ["rgba(251,191,36,0.15)", "#fbbf24"]
        : label === "Discovery"
          ? ["rgba(96,165,250,0.15)", "#93c5fd"]
          : label === "Follow Up"
            ? ["rgba(168,85,247,0.15)", "#c4b5fd"]
            : ["rgba(148,163,184,0.14)", "#cbd5e1"];

  return (
    <span
      className={styles.status}
      style={customStyle({ "--status-bg": color[0], "--status-color": color[1] })}
    >
      {label}
    </span>
  );
}

export default function AdminDesignLabPage() {
  return (
    <main className={`ld-app-background ${styles.lab}`}>
      <div className="ld-background-image" aria-hidden="true" />
      <div className="ld-background-overlay" aria-hidden="true" />

      <div className={styles.content}>
        <aside className={`ld-glass-panel ${styles.sidebar}`}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              <span />
            </span>
            <span className={styles.brandText}>Leads Desk</span>
          </div>

          <nav className={styles.nav} aria-label="Design lab navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`${styles.navItem} ${item.active ? styles.activeNav : ""}`}
                >
                  <span className={styles.navIcon}>
                    <Icon size={16} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </div>
              );
            })}
          </nav>

          <div className={styles.sideCard}>
            <div className={styles.rowTitle}>Customize Workspace</div>
            <div className={styles.rowSub}>Make it yours</div>
          </div>

          <div className={styles.profile}>
            <span className={styles.avatar}>AN</span>
            <div className={styles.profileText}>
              <div className={styles.rowTitle}>Ann Nguyen</div>
              <div className={styles.rowSub}>Growth Manager</div>
            </div>
          </div>
        </aside>

        <section className={styles.workspace}>
          <div className={styles.topbar}>
            <div className={`ld-floating-control ${styles.search}`}>
              <Search size={18} />
              <span>Search leads, contacts, deals...</span>
              <Command size={15} style={{ marginLeft: "auto" }} />
              <span>K</span>
            </div>
            <button className={`ld-glass-button ${styles.primaryButton}`} type="button">
              <Plus size={18} />
              Add Lead
            </button>
            <button className={`ld-floating-control ${styles.iconButton}`} type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className={`ld-floating-control ${styles.workspaceButton}`} type="button">
              <Sparkles size={16} />
              My Workspace
              <ChevronDown size={16} />
            </button>
          </div>

          <div className={styles.hero}>
            <div>
              <h1 className={styles.title}>Good morning, Ann</h1>
              <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your pipeline today.</p>
            </div>
            <div className={`ld-floating-control ${styles.dateControl}`}>
              <CalendarDays size={16} />
              May 12 - May 18, 2025
              <ChevronDown size={16} />
            </div>
          </div>

          <section className={styles.metrics} aria-label="Sales metrics">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className={`ld-glass-panel ${styles.metric}`}
                  style={customStyle({ "--metric-glow": metric.glow })}
                >
                  <div className={styles.metricTop}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <span className={styles.metricIcon}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <div className={styles.metricBody}>
                    <div className={styles.metricValue}>{metric.value}</div>
                    <div className={styles.trend}>{metric.trend}</div>
                    <Sparkline stroke={metric.stroke} />
                  </div>
                </article>
              );
            })}
          </section>

          <section className={styles.grid}>
            <article className={`ld-glass-panel ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Pipeline Overview</h2>
                <span className={styles.pill}>This Month</span>
              </div>
              <div className={styles.pipeline}>
                <div className={styles.ring}>
                  <div>
                    <div className={styles.ringValue}>72%</div>
                    <div className={styles.ringLabel}>of monthly target</div>
                  </div>
                </div>
                <div className={styles.stageBars}>
                  {stages.map((stage) => (
                    <div
                      key={stage.name}
                      className={styles.stage}
                      style={customStyle({ "--stage-color": stage.color, "--height": stage.height })}
                    >
                      <span className={styles.stageName}>{stage.name}</span>
                      <span className={styles.stageCount}>{stage.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className={styles.sideGrid}>
              <article className={`ld-glass-panel ${styles.panel}`}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Follow-ups / Tasks</h2>
                  <span className={styles.pill}>8 due</span>
                </div>
                {tasks.map((task) => (
                  <div key={task.title} className={styles.taskRow}>
                    <span className={styles.taskDot} style={customStyle({ "--dot": task.color })} />
                    <div>
                      <div className={styles.rowTitle}>{task.title}</div>
                      <div className={styles.rowSub}>{task.detail}</div>
                    </div>
                    <span className={styles.rowSub}>{task.due}</span>
                  </div>
                ))}
              </article>

              <article className={`ld-glass-panel ${styles.panel}`}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Source Performance</h2>
                  <span className={styles.pill}>This Month</span>
                </div>
                {sources.map((source) => (
                  <div key={source.label} className={styles.sourceRow}>
                    <span className={styles.taskDot} style={customStyle({ "--dot": source.color })} />
                    <div>
                      <div className={styles.rowTitle}>{source.label}</div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={customStyle({ "--progress": source.value })} />
                      </div>
                    </div>
                    <span className={styles.rowTitle}>{source.value}</span>
                  </div>
                ))}
              </article>
            </div>
          </section>

          <section className={styles.lowerGrid}>
            <article className={`ld-glass-panel ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Leads</h2>
                <span className={styles.pill}>View all</span>
              </div>
              <div className={`${styles.leadRow} ${styles.tableHeader}`}>
                <span>Lead name</span>
                <span>Status</span>
                <span>Owner</span>
                <span>Added</span>
              </div>
              {recentLeads.map((lead) => (
                <div key={lead[0]} className={styles.leadRow}>
                  <div>
                    <div className={styles.rowTitle}>{lead[0]}</div>
                    <div className={styles.rowSub}>{lead[1]} · {lead[4]}</div>
                  </div>
                  <StatusPill label={lead[2]} />
                  <span className={styles.rowTitle}>{lead[5]}</span>
                  <span className={styles.rowSub}>{lead[6]}</span>
                </div>
              ))}
            </article>

            <article className={`ld-glass-panel ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Team Performance</h2>
                <span className={styles.pill}>This Month</span>
              </div>
              <div className={`${styles.teamRow} ${styles.tableHeader}`}>
                <span>Team member</span>
                <span>Won</span>
                <span>Revenue</span>
                <span>Goal</span>
              </div>
              {teamRows.map((row) => (
                <div key={row[0]} className={styles.teamRow}>
                  <span className={styles.rowTitle}>{row[0]}</span>
                  <span className={styles.rowTitle}>{row[1]}</span>
                  <span className={styles.rowTitle}>{row[2]}</span>
                  <div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={customStyle({ "--progress": row[3] })} />
                    </div>
                    <div className={styles.rowSub}>{row[3]}</div>
                  </div>
                </div>
              ))}
            </article>

            <article className={`ld-glass-panel ${styles.customizer}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Customize Workspace</h2>
                  <div className={styles.rowSub}>Create a space that inspires.</div>
                </div>
                <SlidersHorizontal size={18} />
              </div>
              <div className={styles.kicker}>Background</div>
              <div className={styles.backgrounds}>
                {backgrounds.map((background, index) => (
                  <div
                    key={background}
                    className={`${styles.backgroundThumb} ${index === 0 ? styles.selectedThumb : ""}`}
                    style={{ backgroundImage: `url(${background})` }}
                  />
                ))}
              </div>
              <div className={styles.kicker} style={{ marginTop: 18 }}>Accent color</div>
              <div className={styles.swatches}>
                {["#9b6cff", "#38bdf8", "#2dd4bf", "#fb7185", "#fbbf24", "#60a5fa"].map((swatch) => (
                  <span key={swatch} className={styles.swatch} style={customStyle({ "--swatch": swatch })} />
                ))}
              </div>
              <div className={styles.kicker} style={{ marginTop: 18 }}>Glass style</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
                <span className={styles.pill}>Clear</span>
                <span className={`ld-glass-active ${styles.pill}`}>Soft</span>
                <span className={styles.pill}>Bold</span>
              </div>
            </article>
          </section>

          <section className={styles.lowerGrid}>
            <article className={`ld-glass-panel ${styles.loginPreview}`}>
              <div className={`ld-glass-panel ${styles.loginCard}`}>
                <div className={styles.brand} style={{ justifyContent: "center", paddingBottom: 14 }}>
                  <span className={styles.mark} aria-hidden="true">
                    <span />
                  </span>
                  <span className={styles.brandText}>Leads Desk</span>
                </div>
                <h2 className={styles.panelTitle} style={{ fontSize: 25 }}>Welcome back</h2>
                <p className={styles.rowSub}>Manage leads, follow-ups, and sales performance.</p>
                <div className={`ld-glass-input ${styles.previewInput}`}>
                  <Mail size={15} />
                  <span style={{ marginLeft: 9 }}>you@company.com</span>
                </div>
                <div className={`ld-glass-input ${styles.previewInput}`}>Password</div>
                <button className={`ld-glass-button ${styles.primaryButton}`} style={{ width: "100%", marginTop: 14 }} type="button">
                  Sign in
                </button>
                <div className={styles.trust}>
                  <ShieldCheck size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
                  Secure. Private. Yours.
                </div>
              </div>
            </article>

            <article className={`ld-glass-panel ${styles.formPreview}`}>
              <div className={`ld-glass-panel ${styles.publicFormCard}`}>
                <div className={styles.brand} style={{ justifyContent: "center", paddingBottom: 12 }}>
                  <span className={styles.mark} aria-hidden="true">
                    <span />
                  </span>
                  <span className={styles.brandText}>Leads Desk</span>
                </div>
                <h2 className={styles.panelTitle} style={{ fontSize: 24 }}>Let&apos;s build something amazing together</h2>
                <p className={styles.rowSub}>Tell us about your project. We&apos;ll be in touch shortly.</p>
                <div className={`ld-glass-input ${styles.previewInput}`}>
                  <UserRound size={15} />
                  <span style={{ marginLeft: 9 }}>Full name</span>
                </div>
                <div className={`ld-glass-input ${styles.previewInput}`}>
                  <BriefcaseBusiness size={15} />
                  <span style={{ marginLeft: 9 }}>Company</span>
                </div>
                <div className={`ld-glass-input ${styles.previewInput}`}>
                  <FileText size={15} />
                  <span style={{ marginLeft: 9 }}>Tell us about your project</span>
                </div>
                <button className={`ld-glass-button ${styles.primaryButton}`} style={{ width: "100%", marginTop: 14 }} type="button">
                  Submit Form
                </button>
                <div className={styles.trust}>
                  <ClipboardCheck size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
                  Your information is secure.
                </div>
              </div>
            </article>

            <article className={`ld-glass-panel ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Quality Gate</h2>
                <span className={styles.pill}>Design lab</span>
              </div>
              <div className={styles.taskRow}>
                <span className={styles.taskDot} style={customStyle({ "--dot": "#86efac" })} />
                <div>
                  <div className={styles.rowTitle}>Real background assets</div>
                  <div className={styles.rowSub}>Five presets wired from public/backgrounds.</div>
                </div>
              </div>
              <div className={styles.taskRow}>
                <span className={styles.taskDot} style={customStyle({ "--dot": "#86efac" })} />
                <div>
                  <div className={styles.rowTitle}>Readable table surfaces</div>
                  <div className={styles.rowSub}>Semi-solid panels protect dense data.</div>
                </div>
              </div>
              <div className={styles.taskRow}>
                <span className={styles.taskDot} style={customStyle({ "--dot": "#86efac" })} />
                <div>
                  <div className={styles.rowTitle}>Approval required</div>
                  <div className={styles.rowSub}>No rollout until this passes review.</div>
                </div>
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
