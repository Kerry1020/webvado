import i18n from '../i18n/index.js';

const SVG = 'http://www.w3.org/2000/svg';
const svgElement = (name, attrs = {}, text) => {
  const el = document.createElementNS(SVG, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text !== undefined) el.textContent = text;
  return el;
};

// 端口、单元引脚和边均由 Yosys bit ID 建立；布局仅影响位置，不推断连接。
export class NetlistViewer {
  constructor(netlist) {
    this.netlist = netlist;
    this.root = document.createElement('div');
    this.root.className = 'netlist-viewer';
    const toolbar = document.createElement('div');
    toolbar.className = 'netlist-toolbar';
    this.modules = document.createElement('select');
    this.modules.setAttribute('aria-label', i18n.t('netlist.module'));
    Object.entries(netlist.modules || {}).filter(([, value]) => !Number(value.attributes?.blackbox)).forEach(([name]) => {
      this.modules.add(new Option(name, name));
    });
    const top = Object.entries(netlist.modules || {}).find(([, value]) => Number(value.attributes?.top) === 1)?.[0];
    if (top) this.modules.value = top;
    toolbar.appendChild(this.modules);
    const button = (label, action) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn';
      el.textContent = i18n.t(`netlist.${label}`);
      el.onclick = action;
      toolbar.appendChild(el);
    };
    button('zoomIn', () => this.zoom(0.8));
    button('zoomOut', () => this.zoom(1.25));
    button('fit', () => this.fit());
    this.svg = svgElement('svg', { class: 'netlist-svg', role: 'img', 'aria-label': i18n.t('netlist.graph'), tabindex: '0' });
    this.details = document.createElement('pre');
    this.details.className = 'netlist-details';
    this.details.setAttribute('aria-live', 'polite');
    this.root.append(toolbar, this.svg, this.details);
    this.modules.onchange = () => this.render();
    this.svg.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    this.svg.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.netlist-node')) return;
      this.drag = { x: e.clientX, y: e.clientY, box: [...this.box] };
      this.svg.setPointerCapture(e.pointerId);
    });
    this.svg.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const rect = this.svg.getBoundingClientRect();
      this.box[0] = this.drag.box[0] - (e.clientX - this.drag.x) * this.box[2] / rect.width;
      this.box[1] = this.drag.box[1] - (e.clientY - this.drag.y) * this.box[3] / rect.height;
      this.updateView();
    });
    this.svg.addEventListener('pointerup', () => { this.drag = null; });
    this.svg.addEventListener('pointercancel', () => { this.drag = null; });
    this.svg.addEventListener('keydown', e => {
      const delta = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] }[e.key];
      if (delta) { e.preventDefault(); this.box[0] += delta[0]; this.box[1] += delta[1]; this.updateView(); }
      if (e.key === '+' || e.key === '=') this.zoom(0.8);
      if (e.key === '-') this.zoom(1.25);
    });
    this.render();
  }

  render() {
    const module = this.netlist.modules[this.modules.value];
    this.svg.replaceChildren();
    if (!module) { this.details.textContent = i18n.t('netlist.empty'); return; }
    const nodes = [];
    const cells = Object.entries(module.cells || {});
    const columns = Math.max(1, Math.ceil(Math.sqrt(cells.length)));
    const maxPins = Math.max(1, ...cells.map(([, c]) => Object.keys(c.connections || {}).length));
    const rowHeight = Math.max(140, maxPins * 18 + 65);
    let input = 0, output = 0;
    for (const [name, port] of Object.entries(module.ports || {})) {
      const isInput = port.direction === 'input';
      nodes.push({ name, type: port.direction, x: isInput ? 20 : (columns + 1) * 280, y: 40 + (isInput ? input++ : output++) * 100,
        ports: [{ name, bits: port.bits, direction: isInput ? 'output' : 'input' }], data: port, kind: 'port' });
    }
    cells.forEach(([name, cell], index) => nodes.push({ name, type: cell.type, kind: 'cell', data: cell,
      x: 300 + index % columns * 280, y: 40 + Math.floor(index / columns) * rowHeight,
      ports: Object.entries(cell.connections || {}).map(([pin, bits]) => ({ name: pin, bits, direction: cell.port_directions?.[pin] || 'input' })) }));
    const bits = new Map();
    const wires = svgElement('g', { class: 'netlist-wires' });
    this.svg.appendChild(wires);
    let maxY = 200;
    nodes.forEach(node => {
      const height = Math.max(65, node.ports.length * 18 + 45);
      maxY = Math.max(maxY, node.y + height + 40);
      const group = svgElement('g', { class: `netlist-node netlist-${node.kind}`, transform: `translate(${node.x} ${node.y})`, role: 'button', tabindex: '0', 'aria-label': `${node.name}: ${node.type}` });
      group.append(svgElement('rect', { width: 210, height, rx: 3 }), svgElement('title', {}, node.name),
        svgElement('text', { x: 8, y: 17, class: 'netlist-node-name' }, node.name.length > 26 ? `${node.name.slice(0, 25)}…` : node.name),
        svgElement('text', { x: 8, y: 32 }, node.type));
      node.ports.forEach((port, index) => {
        const out = port.direction === 'output';
        const y = 48 + index * 18;
        group.append(svgElement('circle', { cx: out ? 210 : 0, cy: y, r: 3 }),
          svgElement('text', { x: out ? 203 : 7, y: y + 3, 'text-anchor': out ? 'end' : 'start' }, `${port.name}${port.bits.length > 1 ? `[${port.bits.length}]` : ''}`));
        port.bits.forEach(bit => {
          if (!bits.has(bit)) bits.set(bit, []);
          bits.get(bit).push({ x: node.x + (out ? 210 : 0), y: node.y + y, out, group, name: `${node.name}.${port.name}` });
        });
      });
      const select = () => {
        this.svg.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        group.classList.add('selected');
        this.details.textContent = `${node.name} (${node.type})\n${JSON.stringify(node.data, null, 2)}`;
        this.svg.querySelectorAll('.netlist-wire').forEach(edge => edge.classList.toggle('selected', edge.nodes.includes(group)));
      };
      group.onclick = select;
      group.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } };
      this.svg.appendChild(group);
    });
    bits.forEach((ends, bit) => {
      // 常量没有驱动单元：绘制带常量标签的源点，避免伪造单元间连接。
      const source = ends.find(end => end.out) || (typeof bit === 'string' ? { x: 8, y: maxY + 20, name: `constant ${bit}` } : ends[0]);
      if (typeof bit === 'string') {
        wires.appendChild(svgElement('text', { x: 8, y: maxY + 15 }, `constant ${bit}`));
        maxY += 30;
      }
      ends.filter(end => end !== source).forEach(end => {
        const mid = (source.x + end.x) / 2;
        const edge = svgElement('path', { class: 'netlist-wire', d: `M ${source.x} ${source.y} C ${mid} ${source.y}, ${mid} ${end.y}, ${end.x} ${end.y}` });
        edge.appendChild(svgElement('title', {}, `bit ${bit}: ${source.name} → ${end.name}`));
        edge.nodes = [source.group, end.group];
        wires.appendChild(edge);
      });
    });
    this.size = [(columns + 2) * 280, maxY + 40];
    this.details.textContent = `${this.modules.value}: ${Object.keys(module.ports || {}).length} ports, ${cells.length} cells, ${bits.size} nets\n${i18n.t('netlist.hint')}`;
    this.fit();
  }

  updateView() { this.svg.setAttribute('viewBox', this.box.join(' ')); }
  fit() { this.box = [0, 0, ...this.size]; this.updateView(); }
  zoom(factor) {
    if (!this.box) return;
    const width = Math.min(this.size[0] * 5, Math.max(80, this.box[2] * factor));
    const height = this.box[3] * width / this.box[2];
    this.box = [this.box[0] + (this.box[2] - width) / 2, this.box[1] + (this.box[3] - height) / 2, width, height];
    this.updateView();
  }
}
