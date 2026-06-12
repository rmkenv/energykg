"use client";
import { useState } from "react";
import { GraphNode, GraphEdge, NodeType, NODE_TYPES, RELATION_PRESETS, CAMPUS_SCENARIOS } from "../types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  onAddNode: (node: Omit<GraphNode, "id">) => void;
  onDeleteNode: (id: string) => void;
  onAddEdge: (edge: Omit<GraphEdge, "id">) => void;
  onDeleteEdge: (id: string) => void;
  onSelectNode: (id: string | null) => void;
  onAddScenario: (idx: number) => void;
}

type Tab = "add" | "templates" | "edges" | "export";

export default function NodePanel({
  nodes, edges, selectedNode,
  onAddNode, onDeleteNode, onAddEdge, onDeleteEdge, onSelectNode, onAddScenario,
}: Props) {
  const [tab, setTab] = useState<Tab>("add");
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeType, setNodeType] = useState<NodeType>("building");
  const [propKey, setPropKey] = useState("");
  const [propVal, setPropVal] = useState("");
  const [props, setProps] = useState<Record<string, string>>({});
  const [edgeSrc, setEdgeSrc] = useState("");
  const [edgeTgt, setEdgeTgt] = useState("");
  const [edgeRel, setEdgeRel] = useState("FEEDS");
  const [edgeRelCustom, setEdgeRelCustom] = useState("");

  const typeColor = (t: string) => NODE_TYPES.find(nt => nt.value === t)?.color || "#8B9BB4";

  const handleAddNode = () => {
    if (!nodeLabel.trim()) return;
    onAddNode({ label: nodeLabel.trim(), type: nodeType, properties: { ...props } });
    setNodeLabel(""); setProps({});
  };

  const addProp = () => {
    if (!propKey.trim()) return;
    setProps(p => ({ ...p, [propKey.trim()]: propVal.trim() }));
    setPropKey(""); setPropVal("");
  };

  const handleAddEdge = () => {
    if (!edgeSrc || !edgeTgt || edgeSrc === edgeTgt) return;
    const rel = edgeRel === "__custom__" ? edgeRelCustom.trim() : edgeRel;
    if (!rel) return;
    onAddEdge({ source: edgeSrc, target: edgeTgt, relation: rel });
    setEdgeSrc(""); setEdgeTgt("");
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "campus-energy-graph.json"; a.click();
  };

  const exportTurtle = () => {
    const lines = [
      `@prefix ex: <http://campus-energy.io/> .`,
      `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .`,
      `@prefix brick: <https://brickschema.org/schema/Brick#> .`,
      ``,
      ...nodes.map(n => {
        const props = n.properties ? Object.entries(n.properties).map(([k,v]) =>
          `    ex:${k.replace(/[\s\-\/]/g,"_")} "${v}" ;`).join("\n") : "";
        return `ex:${n.id}\n    rdf:type ex:${n.type} ;\n    ex:label "${n.label}" ${props ? ";\n" + props : ""} .\n`;
      }),
      ...edges.map(e => `ex:${e.source} ex:${e.relation} ex:${e.target} .`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/turtle" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "campus-energy-graph.ttl"; a.click();
  };

  const selNode = nodes.find(n => n.id === selectedNode);
  const tabs: { key: Tab; label: string }[] = [
    { key: "add", label: "Node" },
    { key: "templates", label: "Templates" },
    { key: "edges", label: "Edges" },
    { key: "export", label: "Export" },
  ];

  return (
    <div style={{ width: 304, flexShrink: 0, background: "#111827", borderRight: "1px solid #1E2A3A", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 18px 0", borderBottom: "1px solid #1E2A3A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🏛️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.05em", color: "#E2E8F0" }}>CAMPUS ENERGY</div>
            <div style={{ fontSize: 10, color: "#4B5563", letterSpacing: "0.08em" }}>KNOWLEDGE GRAPH BUILDER</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {[
            { v: nodes.filter(n => n.type === "building").length, l: "Bldgs", c: "#00D4FF" },
            { v: nodes.filter(n => n.type === "meter").length, l: "Meters", c: "#F59E0B" },
            { v: nodes.length, l: "Total", c: "#8B9BB4" },
            { v: edges.length, l: "Edges", c: "#8B9BB4" },
          ].map(s => (
            <div key={s.l} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "6px 2px", fontSize: 11, fontWeight: 600,
              color: tab === t.key ? "#00D4FF" : "#4B5563",
              borderBottom: tab === t.key ? "2px solid #00D4FF" : "2px solid transparent",
              textTransform: "uppercase", letterSpacing: "0.05em",
              transition: "color 0.12s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>

        {/* ── ADD NODE TAB ── */}
        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Selected node info */}
            {selNode && (
              <div style={{ background: "#0D1117", border: `1px solid ${typeColor(selNode.type)}44`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: typeColor(selNode.type), fontWeight: 700, fontSize: 13 }}>{selNode.label}</span>
                  <span style={{ fontSize: 9, color: typeColor(selNode.type), background: typeColor(selNode.type) + "18", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {NODE_TYPES.find(t => t.value === selNode.type)?.icon} {selNode.type.replace("_"," ")}
                  </span>
                </div>
                {selNode.properties && Object.entries(selNode.properties).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11, marginBottom: 2, display: "flex", gap: 6 }}>
                    <span style={{ color: "#4B5563" }}>{k}:</span>
                    <span style={{ color: "#8B9BB4" }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => onSelectNode(null)} style={{
                    flex: 1, background: "none", border: "1px solid #2A3A4A", borderRadius: 5,
                    padding: "5px 0", fontSize: 11, color: "#4B5563", cursor: "pointer",
                  }}>Deselect</button>
                  <button onClick={() => { onDeleteNode(selNode.id); onSelectNode(null); }} style={{
                    flex: 1, background: "none", border: "1px solid #EF444433", borderRadius: 5,
                    padding: "5px 0", fontSize: 11, color: "#EF4444", cursor: "pointer",
                  }}>Delete</button>
                </div>
              </div>
            )}

            {/* Add node form */}
            <div style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Add Node</div>

              <div style={{ marginBottom: 8 }}>
                <Label>Label</Label>
                <input value={nodeLabel} onChange={e => setNodeLabel(e.target.value)}
                  placeholder="e.g. Engineering Hall"
                  onKeyDown={e => e.key === "Enter" && handleAddNode()} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <Label>Type</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                  {NODE_TYPES.map(nt => (
                    <button key={nt.value} onClick={() => setNodeType(nt.value)} style={{
                      background: nodeType === nt.value ? nt.color + "18" : "transparent",
                      border: `1px solid ${nodeType === nt.value ? nt.color : "#2A3A4A"}`,
                      borderRadius: 5, padding: "5px 7px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      color: nodeType === nt.value ? nt.color : "#4B5563",
                      fontSize: 11, fontWeight: nodeType === nt.value ? 600 : 400,
                      transition: "all 0.1s", textAlign: "left",
                    }}>
                      <span style={{ fontSize: 12 }}>{nt.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <Label>Properties</Label>
                <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                  <input value={propKey} onChange={e => setPropKey(e.target.value)} placeholder="key" style={{ flex: 1 }} />
                  <input value={propVal} onChange={e => setPropVal(e.target.value)} placeholder="value" style={{ flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && addProp()} />
                  <button onClick={addProp} style={{
                    background: "#1E2A3A", border: "1px solid #2A3A4A", borderRadius: 5,
                    padding: "6px 10px", color: "#8B9BB4", cursor: "pointer", fontSize: 13, flexShrink: 0,
                  }}>+</button>
                </div>
                {Object.entries(props).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 10, marginBottom: 3 }}>
                    <span style={{ color: "#4B5563", background: "#1E2A3A", padding: "1px 5px", borderRadius: 3 }}>{k}</span>
                    <span style={{ color: "#8B9BB4", flex: 1 }}>{v}</span>
                    <button onClick={() => setProps(p => { const n = {...p}; delete n[k]; return n; })}
                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12 }}>×</button>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={handleAddNode} disabled={!nodeLabel.trim()}>
                Add Node
              </button>
            </div>

            {/* Node list */}
            <div>
              <Label>All Nodes ({nodes.length})</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                {nodes.length === 0 && <div style={{ color: "#2A3A4A", fontSize: 12, textAlign: "center", padding: "16px 0" }}>No nodes yet</div>}
                {nodes.map(n => (
                  <div key={n.id} onClick={() => onSelectNode(n.id === selectedNode ? null : n.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "7px 10px",
                      background: n.id === selectedNode ? "#1E2A3A" : "#0D1117",
                      border: `1px solid ${n.id === selectedNode ? typeColor(n.type) + "55" : "#1E2A3A"}`,
                      borderRadius: 6, cursor: "pointer", transition: "all 0.1s",
                    }}>
                    <span style={{ fontSize: 12 }}>{NODE_TYPES.find(t => t.value === n.type)?.icon || "◆"}</span>
                    <span style={{ fontSize: 11, color: "#C8D3E0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                    <span style={{ fontSize: 9, color: typeColor(n.type), opacity: 0.7 }}>{n.type.replace("_"," ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 11, color: "#4B5563", lineHeight: 1.5 }}>
              Add pre-built campus system patterns to your graph. Each template appends new nodes and edges.
            </p>
            {CAMPUS_SCENARIOS.map((s, i) => (
              <div key={i} style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2, lineHeight: 1.4 }}>{s.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#4B5563", marginBottom: 10 }}>
                  <span>{s.nodes.length} nodes</span>
                  <span>{s.edges.length} edges</span>
                  <span style={{ marginLeft: "auto" }}>
                    {[...new Set(s.nodes.map(n => n.type))].map(t =>
                      <span key={t} style={{ marginLeft: 3 }}>{NODE_TYPES.find(nt => nt.value === t)?.icon}</span>
                    )}
                  </span>
                </div>
                <button className="btn-ghost" onClick={() => onAddScenario(i)} style={{ width: "100%", textAlign: "center", fontSize: 11 }}>
                  Add to Graph →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── EDGES TAB ── */}
        {tab === "edges" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Add Relationship</div>

              <div style={{ marginBottom: 7 }}>
                <Label>From</Label>
                <select value={edgeSrc} onChange={e => setEdgeSrc(e.target.value)}>
                  <option value="">Select source…</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{NODE_TYPES.find(t => t.value === n.type)?.icon} {n.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 7 }}>
                <Label>Relation</Label>
                <select value={edgeRel} onChange={e => setEdgeRel(e.target.value)} style={{ marginBottom: 5 }}>
                  {RELATION_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {edgeRel === "__custom__" && (
                  <input value={edgeRelCustom} onChange={e => setEdgeRelCustom(e.target.value)} placeholder="e.g. OPTIMIZES" />
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <Label>To</Label>
                <select value={edgeTgt} onChange={e => setEdgeTgt(e.target.value)}>
                  <option value="">Select target…</option>
                  {nodes.filter(n => n.id !== edgeSrc).map(n => <option key={n.id} value={n.id}>{NODE_TYPES.find(t => t.value === n.type)?.icon} {n.label}</option>)}
                </select>
              </div>

              <button className="btn-primary" onClick={handleAddEdge}
                disabled={!edgeSrc || !edgeTgt || (edgeRel === "__custom__" && !edgeRelCustom.trim())}>
                Add Relationship
              </button>
            </div>

            <div>
              <Label>Relationships ({edges.length})</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                {edges.length === 0 && <div style={{ color: "#2A3A4A", fontSize: 12, textAlign: "center", padding: "16px 0" }}>No edges yet</div>}
                {edges.map(e => {
                  const src = nodes.find(n => n.id === e.source);
                  const tgt = nodes.find(n => n.id === e.target);
                  if (!src || !tgt) return null;
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 6 }}>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 10, color: typeColor(src.type), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.label}</div>
                        <div style={{ fontSize: 9, color: "#F59E0B", fontFamily: "monospace", letterSpacing: "0.05em" }}>{e.relation}</div>
                        <div style={{ fontSize: 10, color: typeColor(tgt.type), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tgt.label}</div>
                      </div>
                      <button onClick={() => onDeleteEdge(e.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── EXPORT TAB ── */}
        {tab === "export" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 11, color: "#4B5563", lineHeight: 1.5 }}>
              Export your campus graph for downstream use in a CMMS, ESPC, SPARQL endpoint, or analytics platform.
            </p>

            <ExportCard title="JSON" subtitle="All nodes, edges, and properties" tag="Universal" tagColor="#10B981"
              onClick={exportJSON} disabled={nodes.length === 0} label="Download JSON" primary />

            <ExportCard title="Turtle (RDF)" subtitle="BRICK Schema-compatible triples for SPARQL" tag="Semantic Web" tagColor="#8B5CF6"
              onClick={exportTurtle} disabled={nodes.length === 0} label="Download .ttl" />

            {/* Graph summary by type */}
            {nodes.length > 0 && (
              <div style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Graph Composition</div>
                {Object.entries(
                  nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{NODE_TYPES.find(t => t.value === type)?.icon}</span>
                    <span style={{ fontSize: 11, color: typeColor(type), flex: 1, textTransform: "capitalize" }}>{type.replace("_"," ")}</span>
                    <div style={{ height: 3, width: `${Math.round((count / nodes.length) * 80)}px`, background: typeColor(type), borderRadius: 2, opacity: 0.6 }} />
                    <span style={{ fontSize: 11, color: "#4B5563", minWidth: 20, textAlign: "right" }}>{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* SPARQL sample */}
            <div style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8 }}>Sample SPARQL</div>
              <pre style={{ fontFamily: "monospace", fontSize: 10, color: "#8B9BB4", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{`PREFIX ex: <http://campus-energy.io/>

# All meters monitoring a building
SELECT ?meter ?building WHERE {
  ?meter rdf:type ex:meter ;
         ex:MONITORS ?building .
  ?building rdf:type ex:building .
}

# What does the chiller plant feed?
SELECT ?target WHERE {
  ?plant rdf:type ex:chiller_plant .
  ?plant ex:FEEDS ?target .
}`}</pre>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "8px 18px", borderTop: "1px solid #1E2A3A", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2A3A4A" }}>
        <span>Campus Energy Graph Builder</span>
        <span style={{ fontFamily: "monospace" }}>{nodes.length}N / {edges.length}E</span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</div>;
}

function ExportCard({ title, subtitle, tag, tagColor, onClick, disabled, label, primary }: any) {
  return (
    <div style={{ background: "#0D1117", border: "1px solid #1E2A3A", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{title}</div>
          <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>{subtitle}</div>
        </div>
        <span style={{ fontSize: 9, color: tagColor, background: tagColor + "18", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>{tag}</span>
      </div>
      {primary
        ? <button className="btn-primary" onClick={onClick} disabled={disabled}>{label}</button>
        : <button className="btn-ghost" onClick={onClick} disabled={disabled} style={{ width: "100%", textAlign: "center" }}>{label}</button>
      }
    </div>
  );
}
