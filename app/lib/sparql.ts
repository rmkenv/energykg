// Client-side SPARQL engine built on N3.js Store + manual SELECT parser
// Supports: SELECT, WHERE with triple patterns, FILTER, LIMIT, PREFIX
import { Store, DataFactory } from 'n3';
import type { GraphNode, GraphEdge } from '../types';

const { namedNode, literal, quad } = DataFactory;
const BASE = 'http://campus-energy.io/';

export function buildStore(nodes: GraphNode[], edges: GraphEdge[]): Store {
  const store = new Store();
  for (const n of nodes) {
    const subj = namedNode(BASE + n.id);
    store.add(quad(subj, namedNode(BASE + 'type'),  literal(n.type)));
    store.add(quad(subj, namedNode(BASE + 'label'), literal(n.label)));
    if (n.properties) {
      for (const [k, v] of Object.entries(n.properties)) {
        store.add(quad(subj, namedNode(BASE + k.replace(/[\s\-\/]/g,'_')), literal(v)));
      }
    }
  }
  for (const e of edges) {
    store.add(quad(
      namedNode(BASE + e.source),
      namedNode(BASE + e.relation),
      namedNode(BASE + e.target)
    ));
  }
  return store;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, string>[];
  error?: string;
  elapsed?: number;
}

function parsePrefixes(sparql: string): Record<string, string> {
  const map: Record<string, string> = {
    ex:   BASE,
    rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  };
  const re = /PREFIX\s+(\w*:)\s*<([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sparql))) map[m[1].replace(':','')] = m[2];
  return map;
}

function expand(token: string, prefixes: Record<string, string>): string {
  if (token.startsWith('<') && token.endsWith('>')) return token.slice(1,-1);
  for (const [pfx, uri] of Object.entries(prefixes)) {
    if (token.startsWith(pfx + ':')) return uri + token.slice(pfx.length + 1);
  }
  return BASE + token;
}

type Binding = Record<string, string>;

function matchPattern(
  store: Store,
  pattern: [string,string,string],
  bindings: Binding[],
  prefixes: Record<string, string>
): Binding[] {
  const results: Binding[] = [];
  for (const b of bindings) {
    const resolve = (t: string) => {
      if (t.startsWith('?')) return b[t.slice(1)] ? namedNode(b[t.slice(1)]) : null;
      if (t.startsWith('"') || t.startsWith("'")) return literal(t.replace(/^['"]|['"]$/g,''));
      return namedNode(expand(t, prefixes));
    };
    const s = resolve(pattern[0]);
    const p = resolve(pattern[1]);
    const o = resolve(pattern[2]);
    const matches = store.getQuads(s, p, o, null);
    for (const q of matches) {
      const nb = { ...b };
      if (!s && pattern[0].startsWith('?')) nb[pattern[0].slice(1)] = q.subject.value;
      if (!p && pattern[1].startsWith('?')) nb[pattern[1].slice(1)] = q.predicate.value;
      if (!o && pattern[2].startsWith('?')) nb[pattern[2].slice(1)] = q.object.value;
      results.push(nb);
    }
  }
  return results;
}

function parseTriplePatterns(where: string): [string,string,string][] {
  const patterns: [string,string,string][] = [];
  const cleaned = where.replace(/FILTER\s*\([^)]*\)/gi, '').replace(/[{}]/g, '');
  const tokens = cleaned.replace(/[.;]/g, ' DOT ').split(/\s+/).filter(t => t && t !== 'DOT');
  let i = 0;
  while (i + 2 < tokens.length) {
    if (tokens[i] === 'DOT') { i++; continue; }
    if (tokens[i+1] === 'DOT' || tokens[i+2] === 'DOT') { i++; continue; }
    patterns.push([tokens[i], tokens[i+1], tokens[i+2]]);
    i += 3;
    if (tokens[i] === 'DOT') i++;
  }
  return patterns;
}

function applyFilters(where: string, bindings: Binding[]): Binding[] {
  const filterRe = /FILTER\s*\(([^)]+)\)/gi;
  let m: RegExpExecArray | null;
  let result = bindings;
  while ((m = filterRe.exec(where))) {
    const expr = m[1].trim();
    const containsM = expr.match(/CONTAINS\s*\(\s*\?(\w+)\s*,\s*["']([^"']+)["']\s*\)/i);
    if (containsM) {
      const [, varName, substr] = containsM;
      result = result.filter(b => (b[varName] || '').toLowerCase().includes(substr.toLowerCase()));
      continue;
    }
    const regexM = expr.match(/regex\s*\(\s*\?(\w+)\s*,\s*["']([^"']+)["']/i);
    if (regexM) {
      const pat = new RegExp(regexM[2], 'i');
      result = result.filter(b => pat.test(b[regexM[1]] || ''));
      continue;
    }
    const eqM = expr.match(/\?\s*(\w+)\s*=\s*["']([^"']+)["']/);
    if (eqM) {
      result = result.filter(b => b[eqM[1]] === eqM[2]);
      continue;
    }
  }
  return result;
}

function shorten(uri: string, nodes: GraphNode[]): string {
  if (!uri.startsWith(BASE)) return uri;
  const local = uri.slice(BASE.length);
  const node = nodes.find(n => n.id === local);
  if (node) return node.label;
  return local;
}

export function runSPARQL(
  sparql: string,
  store: Store,
  nodes: GraphNode[]
): QueryResult {
  const t0 = performance.now();
  try {
    const prefixes = parsePrefixes(sparql);
    const selectM = sparql.match(/SELECT\s+(DISTINCT\s+)?([\s\S]+?)\s+WHERE/i);
    if (!selectM) return { columns: [], rows: [], error: 'Could not parse SELECT clause. Format: SELECT ?var WHERE { … }' };
    const distinct = !!selectM[1];
    const selectPart = selectM[2].trim();
    const selectAll = selectPart === '*';
    const selectedVars = selectAll ? [] : (selectPart.match(/\?\w+/g) || []).map(v => v.slice(1));

    const whereM = sparql.match(/WHERE\s*\{([\s\S]+?)\}(?:\s*(?:LIMIT|ORDER|$))/i);
    if (!whereM) return { columns: [], rows: [], error: 'Could not parse WHERE { } block' };
    const whereBody = whereM[1];

    const limitM = sparql.match(/LIMIT\s+(\d+)/i);
    const limit = limitM ? parseInt(limitM[1]) : 500;

    const patterns = parseTriplePatterns(whereBody);
    if (patterns.length === 0) return { columns: [], rows: [], error: 'No triple patterns found. Example: ?node ex:type ?type .' };

    let bindings: Binding[] = [{}];
    for (const pat of patterns) {
      bindings = matchPattern(store, pat, bindings, prefixes);
      if (bindings.length === 0) break;
    }
    bindings = applyFilters(whereBody, bindings);

    const allVars = selectAll
      ? [...new Set(bindings.flatMap(b => Object.keys(b)))]
      : selectedVars;

    let rows = bindings.map(b => {
      const row: Record<string, string> = {};
      for (const v of allVars) row[v] = shorten(b[v] || '', nodes);
      return row;
    });

    if (distinct) {
      const seen = new Set<string>();
      rows = rows.filter(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return { columns: allVars, rows: rows.slice(0, limit), elapsed: Math.round(performance.now() - t0) };
  } catch (e: any) {
    return { columns: [], rows: [], error: String(e.message) };
  }
}
