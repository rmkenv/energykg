"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import NodePanel from "./components/NodePanel";
import { EditNodeModal, EditEdgeModal } from "./components/EditModal";
import { GraphNode, GraphEdge, CAMPUS_SCENARIOS } from "./types";

const GraphCanvas = dynamic(() => import("./components/GraphCanvas"), { ssr: false });

const DEMO_NODES: GraphNode[] = [
  { id: "n1",  label: "Science Center",       type: "building",      properties: { sqft: "120,000", built: "1989", use: "Research/Lab", EUI: "285 kBtu/sf/yr" }, x: 480, y: 300 },
  { id: "n2",  label: "Student Union",        type: "building",      properties: { sqft: "65,000",  built: "2003", use: "Assembly",     EUI: "148 kBtu/sf/yr" }, x: 640, y: 220 },
  { id: "n3",  label: "Library",              type: "building",      properties: { sqft: "90,000",  built: "1972", use: "Academic",     EUI: "162 kBtu/sf/yr" }, x: 320, y: 220 },
  { id: "n4",  label: "Utility Grid (BGE)",   type: "grid",          properties: { utility: "BGE",  voltage: "13.8 kV", tariff: "GS-3D" }, x: 200, y: 120 },
  { id: "n5",  label: "Campus Substation",    type: "distribution",  properties: { voltage_in: "13.8 kV", voltage_out: "480V", capacity: "5 MVA" }, x: 320, y: 140 },
  { id: "n6",  label: "Central Chiller Plant",type: "chiller_plant", properties: { capacity: "1800 tons", chillers: "3", COP: "6.2" }, x: 480, y: 160 },
  { id: "n7",  label: "CHW Loop",             type: "distribution",  properties: { fluid: "Chilled Water", ΔT: "14°F", pressure: "55 psi" }, x: 480, y: 240 },
  { id: "n8",  label: "Campus BESS",          type: "storage",       properties: { capacity: "1 MWh", power: "500 kW", chemistry: "LFP" }, x: 660, y: 120 },
  { id: "n9",  label: "Rooftop Solar (SU)",   type: "renewable",     properties: { capacity: "180 kW-dc", commissioned: "2022" }, x: 760, y: 200 },
  { id: "n10", label: "Campus EMS",           type: "ems",           properties: { platform: "Siemens Desigo CC", protocol: "BACnet IP", points: "~12,000" }, x: 640, y: 360 },
  { id: "n11", label: "Science Ctr Meter",    type: "meter",         properties: { type: "Electric", interval: "15-min", demand: "850 kW peak" }, x: 560, y: 380 },
  { id: "n12", label: "DR Program (PJM)",     type: "program",       properties: { program: "PJM ERS", enrolled: "400 kW", notice: "30 min" }, x: 760, y: 340 },
  { id: "n13", label: "Lab AHU-1",            type: "hvac",          properties: { type: "100% OA AHU", CFM: "28,000", vintage: "2001" }, x: 400, y: 380 },
  { id: "n14", label: "Weather Station",      type: "sensor",        properties: { location: "Roof Library", data: "Temp, RH, Solar, Wind" }, x: 200, y: 260 },
];

const DEMO_EDGES: GraphEdge[] = [
  { id: "e1",  source: "n4",  target: "n5",  relation: "FEEDS" },
  { id: "e2",  source: "n5",  target: "n6",  relation: "FEEDS" },
  { id: "e3",  source: "n5",  target: "n1",  relation: "FEEDS" },
  { id: "e4",  source: "n5",  target: "n2",  relation: "FEEDS" },
  { id: "e5",  source: "n5",  target: "n3",  relation: "FEEDS" },
  { id: "e6",  source: "n6",  target: "n7",  relation: "FEEDS" },
  { id: "e7",  source: "n7",  target: "n1",  relation: "SERVES" },
  { id: "e8",  source: "n7",  target: "n2",  relation: "SERVES" },
  { id: "e9",  source: "n7",  target: "n3",  relation: "SERVES" },
  { id: "e10", source: "n8",  target: "n5",  relation: "CONNECTS_TO" },
  { id: "e11", source: "n9",  target: "n2",  relation: "FEEDS" },
  { id: "e12", source: "n10", target: "n6",  relation: "CONTROLS" },
  { id: "e13", source: "n10", target: "n13", relation: "CONTROLS" },
  { id: "e14", source: "n11", target: "n1",  relation: "MONITORS" },
  { id: "e15", source: "n10", target: "n12", relation: "REPORTS_TO" },
  { id: "e16", source: "n13", target: "n1",  relation: "SERVES" },
  { id: "e17", source: "n14", target: "n10", relation: "REPORTS_TO" },
  { id: "e18", source: "n10", target: "n8",  relation: "DISPATCHES" },
];

let nodeCounter = 200;
let edgeCounter = 200;
const uid = () => `n${++nodeCounter}`;
const eid = () => `e${++edgeCounter}`;

const AI_PROMPTS = [
  "Map the chilled water distribution loop from the central plant to every building, including pumps, valves, and BTU meters",
  "Show how the campus BESS participates in PJM demand response with curtailable loads and EMS dispatch logic",
  "Model the steam system from the campus boiler plant through distribution to building steam-to-hot-water heat exchangers",
  "Lay out sub-metering for the Science Center: electric, gas, steam, and chilled water with LEED O+M reporting",
  "Create the fault detection and diagnostics (FDD) data flow from BACnet sensors through the analytics platform to work orders",
  "Show the solar carport, rooftop PV, and battery storage microgrid with interconnection and islanding controls",
];

interface EditTarget {
  type: "node" | "edge";
  id: string;
  x: number;
  y: number;
}

export default function Home() {
  const [nodes, setNodes] = useState<GraphNode[]>(DEMO_NODES);
  const [edges, setEdges] = useState<GraphEdge[]>(DEMO_EDGES);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2200);
  };

  const addNode = useCallback((node: Omit<GraphNode, "id">) => {
    setNodes(ns => [...ns, { ...node, id: uid() }]);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
  }, []);

  const updateNode = useCallback((updated: GraphNode) => {
    setNodes(ns => ns.map(n => n.id === updated.id ? updated : n));
    toast(`Updated: ${updated.label}`);
  }, []);

  const addEdge = useCallback((edge: Omit<GraphEdge, "id">) => {
    setEdges(es => [...es, { ...edge, id: eid() }]);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges(es => es.filter(e => e.id !== id));
  }, []);

  const updateEdge = useCallback((updated: GraphEdge) => {
    setEdges(es => es.map(e => e.id === updated.id ? updated : e));
    toast(`Updated: ${updated.relation}`);
  }, []);

  const updateNodePos = useCallback((id: string, x: number, y: number) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleDoubleClickNode = useCallback((id: string, x: number, y: number) => {
    setEditTarget({ type: "node", id, x, y });
    setSelectedNode(id);
  }, []);

  const handleDoubleClickEdge = useCallback((id: string, x: number, y: number) => {
    setEditTarget({ type: "edge", id, x, y });
  }, []);

  const clearGraph = () => {
    if (confirm("Clear the entire campus graph?")) {
      setNodes([]); setEdges([]); setSelectedNode(null); setEditTarget(null);
    }
  };

  const loadDemo = () => {
    setNodes(DEMO_NODES); setEdges(DEMO_EDGES);
    setSelectedNode(null); setEditTarget(null);
    toast("Demo campus loaded");
  };

  const addScenario = useCallback((scenarioIdx: number) => {
    const scenario = CAMPUS_SCENARIOS[scenarioIdx];
    const idMap: string[] = [];
    const newNodes: GraphNode[] = scenario.nodes.map(n => {
      const id = uid(); idMap.push(id); return { ...n, id };
    });
    const newEdges: GraphEdge[] = scenario.edges.map(e => ({
      id: eid(), source: idMap[e.sourceIdx], target: idMap[e.targetIdx], relation: e.relation,
    }));
    setNodes(ns => [...ns, ...newNodes]);
    setEdges(es => [...es, ...newEdges]);
    toast(`Added: ${scenario.name}`);
  }, []);

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are an expert in campus energy management systems. Generate a knowledge graph from a description.
Return ONLY valid JSON — no preamble, no markdown fences:
{"nodes":[{"id":"n1","label":"string","type":"building|meter|hvac|equipment|grid|renewable|sensor|program|chiller_plant|distribution|storage|ems","properties":{"key":"value"}}],"edges":[{"id":"e1","source":"n1","target":"n2","relation":"FEEDS|MONITORS|SERVES|CONTROLS|MEASURES|PART_OF|CONNECTS_TO|ADJACENT_TO|REPORTS_TO|OPTIMIZES|CHARGES|DISPATCHES|INTERLOCKS_WITH"}]}
Use 6–12 nodes and 6–12 edges. Labels should be specific and realistic. Include engineering properties.`,
          messages: [{ role: "user", content: aiPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === "text")?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const idRemap: Record<string, string> = {};
      const newNodes: GraphNode[] = parsed.nodes.map((n: any) => {
        const newId = uid(); idRemap[n.id] = newId;
        return { ...n, id: newId, x: undefined, y: undefined };
      });
      const newEdges: GraphEdge[] = parsed.edges.map((e: any) => ({
        ...e, id: eid(), source: idRemap[e.source] || e.source, target: idRemap[e.target] || e.target,
      }));
      setNodes(ns => [...ns, ...newNodes]);
      setEdges(es => [...es, ...newEdges]);
      setShowAIPanel(false); setAiPrompt("");
      toast(`Added ${newNodes.length} nodes from AI`);
    } catch {
      setAiError("Couldn't parse AI response — try rephrasing.");
    } finally {
      setAiLoading(false);
    }
  };

  const editingNode = editTarget?.type === "node" ? nodes.find(n => n.id === editTarget.id) : null;
  const editingEdge = editTarget?.type === "edge" ? edges.find(e => e.id === editTarget.id) : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <NodePanel
        nodes={nodes} edges={edges} selectedNode={selectedNode}
        onAddNode={addNode} onDeleteNode={deleteNode}
        onAddEdge={addEdge} onDeleteEdge={deleteEdge}
        onSelectNode={setSelectedNode}
        onAddScenario={addScenario}
      />

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <GraphCanvas
          nodes={nodes} edges={edges}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          onUpdateNodePos={updateNodePos}
          onDoubleClickNode={handleDoubleClickNode}
          onDoubleClickEdge={handleDoubleClickEdge}
        />

        {/* Header bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px",
          background: "linear-gradient(180deg, rgba(13,17,23,0.95) 0%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", gap: 20, pointerEvents: "none" }}>
            <Stat label="Buildings" value={nodes.filter(n => n.type === "building").length} color="#00D4FF" />
            <Stat label="Meters"    value={nodes.filter(n => n.type === "meter").length}    color="#F59E0B" />
            <Stat label="Nodes"     value={nodes.length}  color="#8B9BB4" />
            <Stat label="Edges"     value={edges.length}  color="#8B9BB4" />
          </div>
          <div style={{ display: "flex", gap: 8, pointerEvents: "all" }}>
            <button className="btn-ghost" onClick={loadDemo}   style={{ fontSize: 11 }}>Reset Demo</button>
            <button className="btn-ghost" onClick={clearGraph} style={{ fontSize: 11, borderColor: "#EF444433", color: "#EF4444" }}>Clear</button>
            <button onClick={() => setShowAIPanel(true)} style={{
              background: "linear-gradient(135deg, #00D4FF18, #8B5CF618)",
              border: "1px solid #00D4FF44", borderRadius: 6,
              padding: "7px 14px", color: "#00D4FF",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>✦</span> Generate with AI
            </button>
          </div>
        </div>

        {nodes.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏛️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#2A3A4A" }}>No campus graph yet</div>
            <div style={{ fontSize: 13, color: "#1E2A3A", marginTop: 6 }}>Add nodes from the panel, use a template, or generate with AI</div>
          </div>
        )}

        {/* Hint */}
        <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 10, color: "#2A3A4A", display: "flex", gap: 12 }}>
          <span>Scroll to zoom</span>
          <span>Drag to pan</span>
          <span>Click to select</span>
          <span style={{ color: "#3A5A4A" }}>Double-click to edit</span>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div style={{
            position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
            background: "#1E2A3A", border: "1px solid #2A3A4A",
            borderRadius: 8, padding: "8px 18px", fontSize: 12, color: "#00D4FF",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)", pointerEvents: "none",
          }}>{toastMsg}</div>
        )}
      </div>

      {/* ── Inline edit modals ── */}
      {editingNode && editTarget && (
        <EditNodeModal
          node={editingNode}
          onSave={(updated) => { updateNode(updated); setEditTarget(null); }}
          onDelete={(id) => { deleteNode(id); setEditTarget(null); setSelectedNode(null); toast("Node deleted"); }}
          onClose={() => setEditTarget(null)}
          position={{ x: editTarget.x, y: editTarget.y }}
        />
      )}

      {editingEdge && editTarget && (
        <EditEdgeModal
          edge={editingEdge}
          nodes={nodes}
          onSave={(updated) => { updateEdge(updated); setEditTarget(null); }}
          onDelete={(id) => { deleteEdge(id); setEditTarget(null); toast("Relationship deleted"); }}
          onClose={() => setEditTarget(null)}
          position={{ x: editTarget.x, y: editTarget.y }}
        />
      )}

      {/* AI Modal */}
      {showAIPanel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 300, backdropFilter: "blur(4px)",
        }} onClick={e => { if (e.target === e.currentTarget) setShowAIPanel(false); }}>
          <div style={{
            background: "#111827", border: "1px solid #1E2A3A",
            borderRadius: 12, padding: 28, width: 520,
            boxShadow: "0 0 60px rgba(0,212,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>Generate Campus Graph with AI</span>
            </div>
            <p style={{ fontSize: 12, color: "#4B5563", marginBottom: 16, lineHeight: 1.6 }}>
              Describe a campus energy system. New nodes are appended to the existing graph.
            </p>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Quick prompts</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {AI_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => setAiPrompt(p)} style={{
                    background: aiPrompt === p ? "#00D4FF18" : "#0D1117",
                    border: `1px solid ${aiPrompt === p ? "#00D4FF44" : "#1E2A3A"}`,
                    borderRadius: 4, padding: "4px 8px",
                    fontSize: 10, color: aiPrompt === p ? "#00D4FF" : "#4B5563",
                    cursor: "pointer", textAlign: "left", transition: "all 0.1s",
                  }}>{p.slice(0, 48)}…</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#4B5563", display: "block", marginBottom: 4 }}>Or describe your scenario</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4}
                placeholder="e.g. Map the steam tunnel distribution…" style={{ resize: "vertical" }} />
            </div>
            {aiError && <div style={{ color: "#EF4444", fontSize: 11, marginBottom: 8 }}>{aiError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-ghost" onClick={() => setShowAIPanel(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={generateWithAI}
                disabled={!aiPrompt.trim() || aiLoading} style={{ flex: 2 }}>
                {aiLoading ? "Generating…" : "Generate Graph"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
    </div>
  );
}
