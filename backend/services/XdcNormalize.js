import fs from 'fs-extra';
import path from 'path';

// Vivado-style per-port properties we understand. Anything else is ignored.
const KNOWN_PROPS = /^(PACKAGE_PIN|LOC|IOSTANDARD|DRIVE|SLEW|PULLUP|PULLDOWN|PULLTYPE|INTERNAL_VREF)$/i;

/**
 * Extract per-port attributes and clock periods from Vivado-style XDC text.
 *
 * nextpnr-xilinx's built-in XDC parser only understands the flat
 * `set_property <PROP> <VAL> [get_ports <p>]` form; the canonical Vivado
 * `set_property -dict { ... } [get_ports { ... }]` form makes it abort.
 * Normalizing to flat form keeps one .xdc usable by both Vivado and the open
 * flow.
 */
export function parseXdc(text) {
  const attrs = new Map(); // normalizedPort -> { PROP: value }
  const clocks = [];       // { port, period }

  const stripped = text
    .replace(/\\\s*\n/g, ' ')   // join line continuations
    .replace(/#[^\n]*/g, '');   // drop comments

  const addProp = (port, prop, value) => {
    if (!attrs.has(port)) attrs.set(port, {});
    attrs.get(port)[prop.toUpperCase()] = value;
  };

  for (const raw of stripped.split('\n')) {
    const line = raw.trim().replace(/;\s*$/, '');
    if (!line) continue;

    if (/^create_clock\b/i.test(line)) {
      const period = line.match(/-period\s+([0-9.]+)/i);
      const target = line.match(/\[get_ports\s+(.+?)\s*\]\s*$/i);
      if (period && target) {
        for (const port of splitTargets(target[1])) {
          clocks.push({ port, period: parseFloat(period[1]) });
        }
      }
      continue;
    }

    if (!/^set_property\b/i.test(line)) continue;

    const gt = line.match(/\[get_ports\s+(.+?)\s*\]\s*$/i);
    if (!gt) continue;
    const targets = splitTargets(gt[1]);
    const rest = line.slice('set_property'.length, gt.index).trim();

    // -dict form: `set_property -dict { PROP VAL PROP VAL } [get_ports ...]`
    // flat form:  `set_property PROP VAL [get_ports ...]`
    const dict = rest.match(/^-dict\s+(.+)$/i);
    const items = (dict ? dict[1] : rest).replace(/[{}]/g, ' ').trim().split(/\s+/).filter(Boolean);

    for (let i = 0; i + 1 < items.length; i += 2) {
      if (KNOWN_PROPS.test(items[i])) {
        for (const port of targets) addProp(port, items[i], items[i + 1]);
      }
    }
  }

  return { attrs, clocks };
}

function splitTargets(str) {
  return str.replace(/[{}"]/g, '').trim().split(/\s+/).filter(Boolean);
}

// led[0] before led[10]; bare ports first
function sortPorts(a, b) {
  const pa = a.match(/^(.+?)\[(\d+)\]$/);
  const pb = b.match(/^(.+?)\[(\d+)\]$/);
  if (pa && pb && pa[1] === pb[1]) return Number(pa[2]) - Number(pb[2]);
  return a.localeCompare(b);
}

// nextpnr-xilinx accepts `led[3]` bare or `{led[3]}`; brace bus bits for clarity.
function wrapBus(port) {
  return /\[/.test(port) ? `{${port}}` : port;
}

/**
 * Read every .xdc in constrsDir and return one flat-form XDC string
 * (PACKAGE_PIN lines first, then other properties, then clocks), or null if
 * there are no usable constraints. This is what we hand to nextpnr-xilinx.
 */
export async function normalizeXdcForNextpnr(constrsDir) {
  if (!await fs.pathExists(constrsDir)) return null;
  const files = (await fs.readdir(constrsDir)).filter(f => /\.xdc$/i.test(f));
  if (!files.length) return null;

  const merged = new Map();
  const clocks = [];
  for (const f of files) {
    const { attrs, clocks: ck } = parseXdc(await fs.readFile(path.join(constrsDir, f), 'utf8'));
    for (const [port, a] of attrs) merged.set(port, { ...(merged.get(port) || {}), ...a });
    clocks.push(...ck);
  }
  if (!merged.size && !clocks.length) return null;

  const ordered = [...merged.entries()].sort((x, y) => sortPorts(x[0], y[0]));
  const lines = [];

  // PACKAGE_PIN / LOC first.
  for (const [port, a] of ordered) {
    const pin = a.PACKAGE_PIN || a.LOC;
    if (pin) lines.push(`set_property PACKAGE_PIN ${pin} [get_ports ${wrapBus(port)}]`);
  }
  // Then the remaining properties, skipping pins and INTERNAL_VREF (nextpnr ignores it).
  for (const [port, a] of ordered) {
    for (const [prop, value] of Object.entries(a)) {
      if (prop === 'PACKAGE_PIN' || prop === 'LOC' || prop === 'INTERNAL_VREF') continue;
      lines.push(`set_property ${prop} ${value} [get_ports ${wrapBus(port)}]`);
    }
  }
  for (const { port, period } of clocks) {
    lines.push(`create_clock -period ${period} [get_ports ${wrapBus(port)}]`);
  }
  return lines.join('\n') + '\n';
}

export default { parseXdc, normalizeXdcForNextpnr };
