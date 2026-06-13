"use client";
import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge, NODE_TYPES } from "../types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNodePos: (id: string, x: number, y: number) => void;
  onDoubleClickNode: (id: string, screenX: number, screenY: number) => void;
  onDoubleClickEdge: (id: string, screenX: number, screenY: number) => void;
}

const typeInfo = (type: string) => NODE_TYPES.find(t => t.value === type) || { color: "#8B9BB4", icon: "◆" };

export default function GraphCanvas({
  nodes, edges, selectedNode,
  onSelectNode, onUpdateNodePos,
  onDoubleClickNode, onDoubleClickEdge,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<any, any> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    defs.append("filter").attr("id", "glow").call((f: any) => {
      f.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
      const m = f.append("feMerge");
      m.append("feMergeNode").attr("in", "coloredBlur");
      m.append("feMergeNode").attr("in", "SourceGraphic");
    });

    ["#2A3A4A","#00D4FF","#F59E0B"].forEach((c, i) => {
      defs.append("marker")
        .attr("id", `arrow${i}`).attr("viewBox", "0 -4 8 8")
        .attr("refX", 24).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", c).attr("opacity", 0.7);
    });

    const g = svg.append("g");
    (svg as any).call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const simNodes = nodes.map(n => ({
      ...n,
      x: n.x || width / 2 + (Math.random() - 0.5) * 300,
      y: n.y || height / 2 + (Math.random() - 0.5) * 300,
    }));
    const idMap = new Map(simNodes.map(n => [n.id, n]));
    const simEdges = edges
      .filter(e => idMap.has(e.source) && idMap.has(e.target))
      .map(e => ({ ...e, source: idMap.get(e.source)!, target: idMap.get(e.target)! }));

    if (simRef.current) simRef.current.stop();
    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(simEdges).id((d: any) => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(38));
    simRef.current = sim;

    // ── Edges ──────────────────────────────────────────────────────
    const edgeGroup = g.append("g");
    const edgeSel = edgeGroup.selectAll("g").data(simEdges).enter().append("g")
      .attr("cursor", "pointer")
      .on("dblclick", (event, d: any) => {
        event.stopPropagation();
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        onDoubleClickEdge(d.id, event.clientX, event.clientY);
      })
      .on("mouseover", (_e, d: any) => {
        edgeSel.filter((ed: any) => ed.id === d.id)
          .select("line").attr("stroke", "#F59E0B").attr("stroke-width", 2.5);
        edgeSel.filter((ed: any) => ed.id === d.id)
          .select("text").attr("fill", "#F59E0B").attr("font-size", "10px");
      })
      .on("mouseout", (_e, d: any) => {
        edgeSel.filter((ed: any) => ed.id === d.id)
          .select("line").attr("stroke", "#2A3A4A").attr("stroke-width", 1.5);
        edgeSel.filter((ed: any) => ed.id === d.id)
          .select("text").attr("fill", "#3A4A5A").attr("font-size", "9px");
      });

    // Invisible wide hit area for easier edge clicking
    edgeSel.append("line")
      .attr("stroke", "transparent")
      .attr("stroke-width", 12);

    edgeSel.append("line")
      .attr("stroke", "#2A3A4A").attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow0)");

    edgeSel.append("text")
      .attr("text-anchor", "middle").attr("fill", "#3A4A5A")
      .attr("font-size", "9px").attr("font-family", "monospace")
      .attr("letter-spacing", "0.04em")
      .attr("pointer-events", "none")
      .text((d: any) => d.relation);

    // ── Nodes ──────────────────────────────────────────────────────
    const nodeSel = g.append("g").selectAll("g").data(simNodes).enter().append("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
            onUpdateNodePos(d.id, d.x, d.y);
          })
      )
      .on("click", (_e, d: any) => onSelectNode(d.id === selectedNode ? null : d.id))
      .on("dblclick", (event, d: any) => {
        event.stopPropagation();
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        onDoubleClickNode(d.id, event.clientX, event.clientY);
      })
      .on("mouseover", (event, d: any) => {
        if (!tooltipRef.current) return;
        const info = typeInfo(d.type);
        tooltipRef.current.style.display = "block";
        tooltipRef.current.style.left = (event.clientX + 14) + "px";
        tooltipRef.current.style.top = (event.clientY - 10) + "px";
        tooltipRef.current.innerHTML = `
          <div style="color:${info.color};font-weight:700;font-size:13px;margin-bottom:2px">${d.label}</div>
          <div style="color:#4B5563;font-size:10px;font-family:monospace;margin-bottom:4px">${info.icon} ${d.type.replace("_"," ")} · <span style="color:#3A5A6A">dbl-click to edit</span></div>
          ${d.properties ? Object.entries(d.properties).map(([k,v]) =>
            `<div style="font-size:11px;margin-bottom:2px"><span style="color:#4B5563">${k}: </span><span style="color:#8B9BB4">${v}</span></div>`
          ).join("") : ""}
        `;
      })
      .on("mousemove", (event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.left = (event.clientX + 14) + "px";
          tooltipRef.current.style.top = (event.clientY - 10) + "px";
        }
      })
      .on("mouseout", () => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; });

    // Selection halo
    nodeSel.append("circle").attr("r", 28).attr("fill", "none")
      .attr("stroke", (d: any) => d.id === selectedNode ? typeInfo(d.type).color : "none")
      .attr("stroke-width", 1.5).attr("opacity", 0.4).attr("stroke-dasharray", "4,3");

    // Node body
    nodeSel.append("circle").attr("r", 20)
      .attr("fill", (d: any) => typeInfo(d.type).color + "1A")
      .attr("stroke", (d: any) => typeInfo(d.type).color)
      .attr("stroke-width", (d: any) => d.id === selectedNode ? 2.5 : 1.5)
      .attr("filter", (d: any) => d.id === selectedNode ? "url(#glow)" : "none");

    // Icon
    nodeSel.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", "14px").attr("pointer-events", "none")
      .text((d: any) => typeInfo(d.type).icon as string);

    // Label
    nodeSel.append("text")
      .attr("text-anchor", "middle").attr("y", 32)
      .attr("fill", (d: any) => d.id === selectedNode ? typeInfo(d.type).color : "#6B7B8D")
      .attr("font-size", "10px").attr("font-weight", (d: any) => d.id === selectedNode ? "700" : "400")
      .attr("pointer-events", "none")
      .text((d: any) => d.label.length > 16 ? d.label.slice(0, 15) + "…" : d.label);

    sim.on("tick", () => {
      edgeSel.selectAll("line")
        .attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      edgeSel.select("text")
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 5);
      nodeSel.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [nodes, edges, selectedNode, onSelectNode, onUpdateNodePos, onDoubleClickNode, onDoubleClickEdge]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (svgRef.current) ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <>
      <svg ref={svgRef} style={{
        width: "100%", height: "100%",
        background: "radial-gradient(ellipse at 55% 45%, #0a1628 0%, #0D1117 75%)",
        backgroundImage: "radial-gradient(ellipse at 55% 45%, #0a1628 0%, #0D1117 75%), linear-gradient(rgba(42,58,74,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(42,58,74,0.2) 1px, transparent 1px)",
        backgroundSize: "auto, 40px 40px, 40px 40px",
      }} />
      <div ref={tooltipRef} style={{
        position: "fixed", display: "none",
        background: "#1A2535", border: "1px solid #2A3A4A",
        borderRadius: 8, padding: "10px 14px",
        pointerEvents: "none", zIndex: 100,
        maxWidth: 240, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }} />
    </>
  );
}
