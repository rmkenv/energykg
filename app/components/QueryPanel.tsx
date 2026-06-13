"use client";
import { useState, useCallback, useRef } from "react";
import type { QueryResult } from "../lib/sparql";

interface Props {
  onRunQuery: (sparql: string) => QueryResult;
  nodeCount: number;
  edgeCount: number;
}

const PRESETS: { label: string; icon: string; desc: string; query: string }[] = [
  {
    label: "All nodes",
    icon: "◈",
    desc: "Every node with its type",
    query: `SELECT ?label ?type WHERE {
  ?node ex:label ?label .
  ?node ex:type ?type .
}`,
  },
  {
    label: "Buildings",
    icon: "🏛️",
    desc: "All campus buildings",
    query: `SELECT ?label WHERE {
  ?node ex:type "building" .
  ?node ex:label ?label .
}`,
  },
  {
    label: "What feeds X",
    icon: "🔌",
    desc: "All FEEDS relationships",
    query: `SELECT ?source ?target WHERE {
  ?src ex:FEEDS ?tgt .
  ?src ex:label ?source .
  ?tgt ex:label ?target .
}`,
  },
  {
    label: "Unmonitored buildings",
    icon: "⚠️",
    desc: "Buildings with no meter",
    query: `SELECT ?building WHERE {
  ?node ex:type "building" .
  ?node ex:label ?building .
  FILTER NOT EXISTS { ?meter ex:MONITORS ?node . }
}`,
  },
  {
    label: "Meters",
    icon: "📊",
    desc: "All meters and types",
    query: `SELECT ?label ?meterType WHERE {
  ?node ex:type "meter" .
  ?node ex:label ?label .
  OPTIONAL { ?node ex:type ?meterType . }
}`,
  },
  {
    label: "EMS controls",
    icon: "🖥️",
    desc: "What each EMS controls",
    query: `SELECT ?ems ?target WHERE {
  ?e ex:type "ems" .
  ?e ex:label ?ems .
  ?e ex:CONTROLS ?t .
  ?t ex:label ?target .
}`,
  },
  {
    label: "Renewables",
    icon: "☀️",
    desc: "All renewable sources",
    query: `SELECT ?label WHERE {
  ?node ex:type "renewable" .
  ?node ex:label ?label .
}`,
  },
  {
    label: "DR programs",
    icon: "📉",
    desc: "What reports to DR programs",
    query: `SELECT ?asset ?program WHERE {
  ?a ex:REPORTS_TO ?p .
  ?a ex:label ?asset .
  ?p ex:label ?program .
  ?p ex:type "program" .
}`,
  },
  {
    label: "Full topology",
    icon: "🗺️",
    desc: "Every relationship in the graph",
    query: `SELECT DISTINCT ?source ?relation ?target WHERE {
  ?s ?rel ?t .
  ?s ex:label ?source .
  ?t ex:label ?target .
  FILTER(?rel != <http://campus-energy.io/type>)
  FILTER(?rel != <http://campus-energy.io/label>)
}`,
  },
  {
    label: "Node properties",
    icon: "🔧",
    desc: "All properties for a node type",
    query: `SELECT ?label ?sqft ?EUI WHERE {
  ?node ex:type "building" .
  ?node ex:label ?label .
  OPTIONAL { ?node ex:sqft ?sqft . }
  OPTIONAL { ?node ex:EUI ?EUI . }
}`,
  },
];

const COLORS = {
  panel: "#111827",
  bg: "#0D1117",
  border: "#1E2A3A",
  cyan: "#00D4FF",
  amber: "#F59E0B",
  green: "#10B981",
  red: "#EF4444",
  text: "#E2E8F0",
  muted: "#4B5563",
  subtle: "#8B9BB4",
};

export default function QueryPanel({ onRunQuery, nodeCount, edgeCount }: Props) {
  const [query, setQuery] = useState(PRESETS[0].query);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const r = onRunQuery(query);
      setResult(r);
      setRunning(false);
    }, 30);
  }, [query, onRunQuery]);

  const selectPreset = (i: number) => {
    setActivePreset(i);
    setQuery(PRESETS[i].query);
    setResult(null);
  };

  const copyCSV = () => {
    if (!result || result.rows.length === 0) return;
    const header = result.columns.join(",");
    const rows = result.rows.map(r => result.columns.map(c => `"${(r[c]||'').replace(/"/g,'""')}"`).join(","));
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCSV = () => {
    if (!result || result.rows.length === 0) return;
    const header = result.columns.join(",");
    const rows = result.rows.map(r => result.columns.map(c => `"${(r[c]||'').replace(/"/g,'""')}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "query-results.csv";
    a.click();
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: COLORS.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px 10px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.panel,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚗️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: COLORS.text, letterSpacing: "0.04em" }}>SPARQL QUERY</div>
              <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: "0.07em" }}>LIVE GRAPH · CLIENT-SIDE ENGINE</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Stat v={nodeCount} l="Nodes" c={COLORS.cyan} />
            <Stat v={edgeCount} l="Edges" c={COLORS.amber} />
            {result && !result.error && <Stat v={result.rows.length} l="Results" c={COLORS.green} />}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: presets */}
        <div style={{
          width: 200, flexShrink: 0,
          borderRight: `1px solid ${COLORS.border}`,
          background: COLORS.panel,
          overflowY: "auto",
          padding: "10px 0",
        }}>
          <div style={{ fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 14px 8px" }}>
            Preset Queries
          </div>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => selectPreset(i)} style={{
              width: "100%", textAlign: "left", border: "none",
              padding: "8px 14px", cursor: "pointer",
              borderLeft: `3px solid ${i === activePreset ? COLORS.cyan : "transparent"}`,
              background: i === activePreset ? COLORS.cyan + "10" : "transparent",
              transition: "all 0.1s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 13 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: i === activePreset ? 600 : 400, color: i === activePreset ? COLORS.cyan : COLORS.subtle }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>{p.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: editor + results */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Editor */}
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setResult(null); }}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
                rows={8}
                spellCheck={false}
                style={{
                  width: "100%", resize: "vertical",
                  background: "#080E18",
                  border: `1px solid ${result?.error ? COLORS.red + "66" : COLORS.border}`,
                  borderRadius: 8,
                  color: "#A8C4E0",
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  fontSize: 13, lineHeight: 1.7,
                  padding: "12px 14px",
                  outline: "none",
                  boxShadow: result?.error ? `0 0 0 2px ${COLORS.red}22` : "none",
                }}
              />
              <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: COLORS.muted }}>
                ⌘/Ctrl+Enter to run
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <button onClick={run} disabled={running || nodeCount === 0} style={{
                background: COLORS.cyan, color: "#0D1117",
                border: "none", borderRadius: 6,
                padding: "8px 20px", fontSize: 13, fontWeight: 700,
                cursor: running || nodeCount === 0 ? "not-allowed" : "pointer",
                opacity: running || nodeCount === 0 ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: 7,
                transition: "opacity 0.15s",
              }}>
                {running ? (
                  <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>↻</span> Running…</>
                ) : (
                  <>▶ Run Query</>
                )}
              </button>

              {nodeCount === 0 && (
                <span style={{ fontSize: 11, color: COLORS.amber }}>⚠ Add nodes to the graph first</span>
              )}

              {result && !result.error && (
                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>
                  {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} · {result.elapsed}ms
                </span>
              )}
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflow: "auto", padding: "0" }}>
            {!result && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⚗️</div>
                <div style={{ fontSize: 14, color: COLORS.muted }}>Select a preset or write a query, then click Run</div>
                <div style={{ fontSize: 11, color: "#2A3A4A", marginTop: 8 }}>
                  Uses the ex: prefix for <code style={{ color: "#3A5A6A" }}>http://campus-energy.io/</code>
                </div>
              </div>
            )}

            {result?.error && (
              <div style={{ margin: 16, padding: "14px 16px", background: COLORS.red + "12", border: `1px solid ${COLORS.red}44`, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.red, marginBottom: 4 }}>Query Error</div>
                <div style={{ fontSize: 12, color: "#F87171", fontFamily: "monospace" }}>{result.error}</div>
              </div>
            )}

            {result && !result.error && result.rows.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>∅</div>
                <div style={{ fontSize: 14, color: COLORS.muted }}>No results matched</div>
                <div style={{ fontSize: 11, color: "#2A3A4A", marginTop: 6 }}>Check that node types and relation names match your graph exactly</div>
              </div>
            )}

            {result && !result.error && result.rows.length > 0 && (
              <>
                {/* Results toolbar */}
                <div style={{
                  padding: "8px 16px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                  background: COLORS.panel, position: "sticky", top: 0, zIndex: 10,
                }}>
                  <span style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>
                    ✓ {result.rows.length} result{result.rows.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>·</span>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{result.elapsed}ms</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={copyCSV} style={{
                      background: "none", border: `1px solid ${COLORS.border}`,
                      borderRadius: 5, padding: "4px 10px", fontSize: 11,
                      color: copied ? COLORS.green : COLORS.subtle, cursor: "pointer",
                    }}>
                      {copied ? "✓ Copied" : "Copy CSV"}
                    </button>
                    <button onClick={downloadCSV} style={{
                      background: "none", border: `1px solid ${COLORS.border}`,
                      borderRadius: 5, padding: "4px 10px", fontSize: 11,
                      color: COLORS.subtle, cursor: "pointer",
                    }}>
                      ↓ Download CSV
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {result.columns.map(col => (
                          <th key={col} style={{
                            textAlign: "left", padding: "9px 14px",
                            background: "#0A1220",
                            color: COLORS.cyan, fontWeight: 600,
                            fontSize: 11, letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${COLORS.border}`,
                            whiteSpace: "nowrap",
                            position: "sticky", top: 40,
                          }}>
                            ?{col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#0A1220" }}>
                          {result.columns.map(col => (
                            <td key={col} style={{
                              padding: "8px 14px",
                              color: row[col] ? COLORS.text : COLORS.muted,
                              borderBottom: `1px solid ${COLORS.border}22`,
                              maxWidth: 300,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {row[col] || <span style={{ color: COLORS.muted, fontStyle: "italic" }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer: quick reference */}
          <div style={{
            padding: "8px 16px",
            borderTop: `1px solid ${COLORS.border}`,
            background: COLORS.panel,
            display: "flex", gap: 20, flexWrap: "wrap",
            flexShrink: 0,
          }}>
            {[
              ["Prefix", "ex: = campus-energy.io/"],
              ["Types", "building · meter · hvac · equipment · grid · renewable · sensor · program · chiller_plant · distribution · storage · ems"],
              ["Relations", "FEEDS · MONITORS · SERVES · CONTROLS · REPORTS_TO · DISPATCHES · CHARGES · PART_OF"],
            ].map(([label, val]) => (
              <div key={label} style={{ fontSize: 10 }}>
                <span style={{ color: COLORS.muted, fontWeight: 600 }}>{label}: </span>
                <span style={{ color: "#3A5A6A", fontFamily: "monospace" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
    </div>
  );
}
