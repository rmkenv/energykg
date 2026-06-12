export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  properties?: Record<string, string>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

export type NodeType =
  | "building" | "meter" | "hvac" | "equipment"
  | "grid" | "renewable" | "sensor" | "program"
  | "chiller_plant" | "distribution" | "storage" | "ems";

export interface KnowledgeGraph {
  id: string;
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: string;
  updatedAt: string;
}

export const NODE_TYPES: { value: NodeType; label: string; icon: string; desc: string; color: string }[] = [
  { value: "building",      label: "Building",       icon: "🏛️",  desc: "Campus building or structure",        color: "#00D4FF" },
  { value: "meter",         label: "Meter",          icon: "📊",  desc: "Electric, gas, steam, or water meter", color: "#F59E0B" },
  { value: "hvac",          label: "HVAC",           icon: "🌡️",  desc: "AHU, VAV, FCU, RTU",                  color: "#10B981" },
  { value: "equipment",     label: "Equipment",      icon: "🔧",  desc: "Pump, fan, transformer, switchgear",   color: "#8B5CF6" },
  { value: "grid",          label: "Utility / Grid", icon: "🔌",  desc: "Utility feed or campus feeder",        color: "#EF4444" },
  { value: "renewable",     label: "Renewable",      icon: "☀️",  desc: "Solar PV, wind, or geothermal",        color: "#34D399" },
  { value: "sensor",        label: "Sensor / IoT",   icon: "📡",  desc: "BACnet point, IoT sensor, weather stn", color: "#F97316" },
  { value: "program",       label: "Program",        icon: "📋",  desc: "DR, rebate, efficiency program",       color: "#EC4899" },
  { value: "chiller_plant", label: "Chiller Plant",  icon: "❄️",  desc: "Central chilled water plant",          color: "#67E8F9" },
  { value: "distribution",  label: "Distribution",   icon: "〰️",  desc: "Pipe loop, duct, electrical bus",      color: "#A78BFA" },
  { value: "storage",       label: "Storage",        icon: "🔋",  desc: "Battery, thermal storage, BESS",       color: "#86EFAC" },
  { value: "ems",           label: "EMS / BAS",      icon: "🖥️",  desc: "Energy mgmt or building automation",   color: "#FDE68A" },
];

export const RELATION_PRESETS = [
  "FEEDS",
  "MONITORS",
  "SERVES",
  "CONTROLS",
  "MEASURES",
  "PART_OF",
  "CONNECTS_TO",
  "ADJACENT_TO",
  "REPORTS_TO",
  "OPTIMIZES",
  "CHARGES",
  "DISPATCHES",
  "INTERLOCKS_WITH",
];

// Campus-specific quick-add templates
export interface NodeTemplate {
  label: string;
  type: NodeType;
  properties: Record<string, string>;
}

export interface ScenarioTemplate {
  name: string;
  description: string;
  icon: string;
  nodes: Omit<GraphNode, "id">[];
  edges: { sourceIdx: number; targetIdx: number; relation: string }[];
}

export const CAMPUS_SCENARIOS: ScenarioTemplate[] = [
  {
    name: "Central Chiller Plant",
    description: "Chilled water loop serving multiple buildings",
    icon: "❄️",
    nodes: [
      { label: "Central Chiller Plant", type: "chiller_plant", properties: { capacity: "2400 tons", chillers: "3×800T", protocol: "BACnet" } },
      { label: "Cooling Tower A", type: "equipment", properties: { type: "Cooling Tower", capacity: "900 tons", cells: "2" } },
      { label: "Cooling Tower B", type: "equipment", properties: { type: "Cooling Tower", capacity: "900 tons", cells: "2" } },
      { label: "CHW Distribution Loop", type: "distribution", properties: { fluid: "Chilled Water", design_ΔT: "12°F", pressure: "60 psi" } },
      { label: "Plant EMS", type: "ems", properties: { system: "Metasys", version: "12.0", protocol: "BACnet IP" } },
      { label: "Chiller Plant Meter", type: "meter", properties: { type: "Electric", interval: "15-min", unit: "kWh" } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 3, relation: "FEEDS" },
      { sourceIdx: 0, targetIdx: 1, relation: "CONTAINS" },
      { sourceIdx: 0, targetIdx: 2, relation: "CONTAINS" },
      { sourceIdx: 4, targetIdx: 0, relation: "CONTROLS" },
      { sourceIdx: 5, targetIdx: 0, relation: "MONITORS" },
    ],
  },
  {
    name: "Demand Response Asset",
    description: "DR-enrolled loads with curtailment controls",
    icon: "📉",
    nodes: [
      { label: "DR Program", type: "program", properties: { program: "PJM ERS", curtailment: "500 kW", notice: "30 min" } },
      { label: "Campus EMS", type: "ems", properties: { system: "EnerNOC", integration: "OpenADR 2.0b" } },
      { label: "Thermal Storage Tank", type: "storage", properties: { capacity: "10,000 ton-hr", type: "Chilled Water" } },
      { label: "BESS", type: "storage", properties: { capacity: "1 MWh", power: "500 kW", chemistry: "LFP" } },
      { label: "Lighting Controls", type: "ems", properties: { system: "Dali", zones: "48", dimming: "0–100%" } },
    ],
    edges: [
      { sourceIdx: 1, targetIdx: 0, relation: "REPORTS_TO" },
      { sourceIdx: 1, targetIdx: 2, relation: "DISPATCHES" },
      { sourceIdx: 1, targetIdx: 3, relation: "DISPATCHES" },
      { sourceIdx: 1, targetIdx: 4, relation: "CONTROLS" },
    ],
  },
  {
    name: "Solar + Storage Microgrid",
    description: "Campus renewable generation and battery dispatch",
    icon: "☀️",
    nodes: [
      { label: "Rooftop Solar Array", type: "renewable", properties: { capacity: "750 kW-dc", panels: "1,875", inverter: "SMA" } },
      { label: "Carport Solar", type: "renewable", properties: { capacity: "250 kW-dc", spaces: "312", inverter: "Fronius" } },
      { label: "Campus BESS", type: "storage", properties: { capacity: "2 MWh", power: "1 MW", warranty: "10 yr" } },
      { label: "Microgrid Controller", type: "ems", properties: { vendor: "Schneider Electric", mode: "Grid-tied + Island" } },
      { label: "Revenue-Grade Meter", type: "meter", properties: { type: "Bidirectional", accuracy: "0.2%", ANSI: "C12.20" } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 3, relation: "FEEDS" },
      { sourceIdx: 1, targetIdx: 3, relation: "FEEDS" },
      { sourceIdx: 3, targetIdx: 2, relation: "CHARGES" },
      { sourceIdx: 3, targetIdx: 2, relation: "DISPATCHES" },
      { sourceIdx: 4, targetIdx: 3, relation: "MONITORS" },
    ],
  },
  {
    name: "Building Sub-Metering",
    description: "Interval sub-meters for an academic building",
    icon: "📊",
    nodes: [
      { label: "Academic Building", type: "building", properties: { sqft: "85,000", floors: "5", built: "1994", use: "Academic" } },
      { label: "Whole-Building Meter", type: "meter", properties: { type: "Electric", interval: "15-min", unit: "kWh/kW" } },
      { label: "HVAC Sub-Meter", type: "meter", properties: { type: "Electric", circuit: "Mechanical", share: "~55%" } },
      { label: "Lighting Sub-Meter", type: "meter", properties: { type: "Electric", circuit: "Lighting", share: "~18%" } },
      { label: "Plug Load Sub-Meter", type: "meter", properties: { type: "Electric", circuit: "Receptacles", share: "~27%" } },
      { label: "Gas Meter", type: "meter", properties: { type: "Natural Gas", unit: "Therms", interval: "Hourly" } },
    ],
    edges: [
      { sourceIdx: 1, targetIdx: 0, relation: "MONITORS" },
      { sourceIdx: 2, targetIdx: 0, relation: "MONITORS" },
      { sourceIdx: 3, targetIdx: 0, relation: "MONITORS" },
      { sourceIdx: 4, targetIdx: 0, relation: "MONITORS" },
      { sourceIdx: 5, targetIdx: 0, relation: "MONITORS" },
      { sourceIdx: 2, targetIdx: 1, relation: "PART_OF" },
      { sourceIdx: 3, targetIdx: 1, relation: "PART_OF" },
      { sourceIdx: 4, targetIdx: 1, relation: "PART_OF" },
    ],
  },
];
