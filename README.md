# EnergyGraph — Knowledge Graph Builder

A full-stack Next.js app for building and visualizing energy management knowledge graphs.

## Features

- **Interactive force-directed graph** — drag nodes, zoom, pan
- **8 node types** — Facility, Meter, System, Equipment, Grid, Renewable, Sensor, Program
- **Custom properties** — add key/value metadata to any node
- **10 preset relations** + custom — FEEDS, MONITORS, SERVES, CONTROLS, etc.
- **AI generation** — describe a system, Claude builds the graph
- **Export** — JSON or Turtle (RDF) for downstream use in triplestores/SPARQL
- **Demo graph** — Maryland school decarbonization scenario preloaded

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

## Local Dev

```bash
npm install
npm run dev
```

## Built with
- Next.js 15 (App Router)
- D3.js (force simulation)
- Claude Sonnet API (AI generation)
- Tailwind CSS
