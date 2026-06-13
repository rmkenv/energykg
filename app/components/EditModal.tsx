"use client";
import { useState, useEffect, useRef } from "react";
import { GraphNode, GraphEdge, NODE_TYPES, RELATION_PRESETS } from "../types";

interface EditNodeProps {
  node: GraphNode;
  onSave: (updated: GraphNode) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

interface EditEdgeProps {
  edge: GraphEdge;
  nodes: GraphNode[];
  onSave: (updated: GraphEdge) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const C = {
  bg:     "#111827",
  panel:  "#0D1117",
  border: "#1E2A3A",
  cyan:   "#00D4FF",
  amber:  "#F59E0B",
  red:    "#EF4444",
  text:   "#E2E8F0",
  muted:  "#4B5563",
  subtle: "#8B9BB4",
};

function typeColor(type: string) {
  return NODE_TYPES.find(t => t.value === type)?.color || "#8B9BB4";
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ── Node Edit Modal ──────────────────────────────────────────────────
export function EditNodeModal({ node, onSave, onDelete, onClose, position }: EditNodeProps) {
  const [label, setLabel] = useState(node.label);
  const [type, setType] = useState(node.type);
  const [props, setProps] = useState<[string, string][]>(
    Object.entries(node.properties || {})
  );
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Clamp so modal stays on screen
  const left = clamp(position.x, 10, window.innerWidth - 370);
  const top  = clamp(position.y - 20, 10, window.innerHeight - 500);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const addProp = () => {
    if (!newKey.trim()) return;
    setProps(p => [...p, [newKey.trim(), newVal.trim()]]);
    setNewKey(""); setNewVal("");
  };

  const removeProp = (i: number) => setProps(p => p.filter((_, j) => j !== i));

  const updatePropKey = (i: number, k: string) =>
    setProps(p => p.map((kv, j) => j === i ? [k, kv[1]] : kv));

  const updatePropVal = (i: number, v: string) =>
    setProps(p => p.map((kv, j) => j === i ? [kv[0], v] : kv));

  const handleSave = () => {
    if (!label.trim()) return;
    const properties = Object.fromEntries(props.filter(([k]) => k.trim()));
    onSave({ ...node, label: label.trim(), type, properties });
  };

  const color = typeColor(type);

  return (
    <div ref={ref} style={{
      position: "fixed", left, top, zIndex: 500,
      width: 340, background: C.bg,
      border: `1px solid ${color}44`,
      borderRadius: 10, boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 20px ${color}18`,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px 8px",
        background: color + "14",
        borderBottom: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{NODE_TYPES.find(t => t.value === type)?.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.03em" }}>EDIT NODE</span>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.muted, fontSize: 18, lineHeight: 1, padding: "0 2px",
        }}>×</button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Label */}
        <div>
          <FieldLabel>Label</FieldLabel>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
            style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
              padding: "7px 10px", color: C.text, fontSize: 13, width: "100%",
              outline: "none", fontFamily: "inherit" }}
          />
        </div>

        {/* Type */}
        <div>
          <FieldLabel>Type</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {NODE_TYPES.map(nt => (
              <button key={nt.value} onClick={() => setType(nt.value as any)} style={{
                background: type === nt.value ? nt.color + "18" : "transparent",
                border: `1px solid ${type === nt.value ? nt.color : C.border}`,
                borderRadius: 5, padding: "5px 8px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                color: type === nt.value ? nt.color : C.muted,
                fontSize: 11, fontWeight: type === nt.value ? 600 : 400,
                transition: "all 0.1s", textAlign: "left",
              }}>
                <span>{nt.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Properties */}
        <div>
          <FieldLabel>Properties</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 5 }}>
            {props.map(([k, v], i) => (
              <div key={i} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <input value={k} onChange={e => updatePropKey(i, e.target.value)}
                  style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 5, padding: "5px 8px", color: C.subtle, fontSize: 11,
                    outline: "none", fontFamily: "inherit" }} />
                <input value={v} onChange={e => updatePropVal(i, e.target.value)}
                  style={{ flex: 1.4, background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: 5, padding: "5px 8px", color: C.text, fontSize: 11,
                    outline: "none", fontFamily: "inherit" }} />
                <button onClick={() => removeProp(i)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.red, fontSize: 14, padding: "0 4px", flexShrink: 0,
                }}>×</button>
              </div>
            ))}
          </div>
          {/* Add new prop */}
          <div style={{ display: "flex", gap: 3 }}>
            <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="key"
              style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`,
                borderRadius: 5, padding: "5px 8px", color: C.subtle, fontSize: 11,
                outline: "none", fontFamily: "inherit" }} />
            <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="value"
              onKeyDown={e => e.key === "Enter" && addProp()}
              style={{ flex: 1.4, background: C.panel, border: `1px solid ${C.border}`,
                borderRadius: 5, padding: "5px 8px", color: C.text, fontSize: 11,
                outline: "none", fontFamily: "inherit" }} />
            <button onClick={addProp} style={{
              background: C.border, border: "none", borderRadius: 5,
              padding: "5px 9px", color: C.subtle, cursor: "pointer", fontSize: 13, flexShrink: 0,
            }}>+</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => { onDelete(node.id); onClose(); }} style={{
            background: "none", border: `1px solid ${C.red}44`,
            borderRadius: 6, padding: "7px 12px", fontSize: 12,
            color: C.red, cursor: "pointer", transition: "all 0.12s",
          }}>Delete</button>
          <button onClick={onClose} style={{
            flex: 1, background: "none", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "7px 0", fontSize: 12,
            color: C.muted, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!label.trim()} style={{
            flex: 2, background: color, border: "none",
            borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700,
            color: "#0D1117", cursor: label.trim() ? "pointer" : "not-allowed",
            opacity: label.trim() ? 1 : 0.4, transition: "opacity 0.12s",
          }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ── Edge Edit Modal ──────────────────────────────────────────────────
export function EditEdgeModal({ edge, nodes, onSave, onDelete, onClose, position }: EditEdgeProps) {
  const [relation, setRelation] = useState(edge.relation);
  const [isCustom, setIsCustom] = useState(!RELATION_PRESETS.includes(edge.relation));
  const [customRel, setCustomRel] = useState(edge.relation);
  const ref = useRef<HTMLDivElement>(null);

  const left = clamp(position.x, 10, window.innerWidth - 300);
  const top  = clamp(position.y - 20, 10, window.innerHeight - 360);

  const srcNode = nodes.find(n => n.id === edge.source);
  const tgtNode = nodes.find(n => n.id === edge.target);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSave = () => {
    const rel = isCustom ? customRel.trim() : relation;
    if (!rel) return;
    onSave({ ...edge, relation: rel });
  };

  return (
    <div ref={ref} style={{
      position: "fixed", left, top, zIndex: 500,
      width: 280, background: C.bg,
      border: `1px solid ${C.amber}44`,
      borderRadius: 10, boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 20px ${C.amber}12`,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 14px 8px",
        background: C.amber + "12",
        borderBottom: `1px solid ${C.amber}33`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, letterSpacing: "0.03em" }}>EDIT RELATIONSHIP</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>×</button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Source → Target display */}
        <div style={{ background: C.panel, borderRadius: 7, padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{ color: typeColor(srcNode?.type || ""), fontWeight: 600 }}>
              {NODE_TYPES.find(t => t.value === srcNode?.type)?.icon} {srcNode?.label}
            </span>
            <span style={{ color: C.amber, fontFamily: "monospace", fontSize: 10 }}>→ {relation} →</span>
            <span style={{ color: typeColor(tgtNode?.type || ""), fontWeight: 600 }}>
              {NODE_TYPES.find(t => t.value === tgtNode?.type)?.icon} {tgtNode?.label}
            </span>
          </div>
        </div>

        {/* Relation picker */}
        <div>
          <FieldLabel>Relation</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
            {RELATION_PRESETS.map(r => (
              <button key={r} onClick={() => { setRelation(r); setIsCustom(false); }} style={{
                background: relation === r && !isCustom ? C.amber + "22" : "transparent",
                border: `1px solid ${relation === r && !isCustom ? C.amber : C.border}`,
                borderRadius: 4, padding: "4px 8px", cursor: "pointer",
                fontSize: 10, fontFamily: "monospace",
                color: relation === r && !isCustom ? C.amber : C.muted,
                transition: "all 0.1s",
              }}>{r}</button>
            ))}
            <button onClick={() => setIsCustom(true)} style={{
              background: isCustom ? C.cyan + "18" : "transparent",
              border: `1px solid ${isCustom ? C.cyan : C.border}`,
              borderRadius: 4, padding: "4px 8px", cursor: "pointer",
              fontSize: 10, color: isCustom ? C.cyan : C.muted,
            }}>Custom…</button>
          </div>
          {isCustom && (
            <input value={customRel} onChange={e => setCustomRel(e.target.value)}
              placeholder="e.g. OPTIMIZES"
              onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus
              style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 5,
                padding: "6px 10px", color: C.text, fontSize: 12, width: "100%",
                outline: "none", fontFamily: "monospace" }} />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => { onDelete(edge.id); onClose(); }} style={{
            background: "none", border: `1px solid ${C.red}44`,
            borderRadius: 6, padding: "7px 10px", fontSize: 12,
            color: C.red, cursor: "pointer",
          }}>Delete</button>
          <button onClick={onClose} style={{
            flex: 1, background: "none", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "7px 0", fontSize: 12, color: C.muted, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 2, background: C.amber, border: "none",
            borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700,
            color: "#0D1117", cursor: "pointer",
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</div>;
}
