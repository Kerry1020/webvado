/**
 * WaveformViewer.js - Canvas-based waveform viewer for VCD data
 */

export class WaveformViewer {
  constructor(container) {
    this.container = container;
    this.data = null;
    this.scale = 1.0; // pixels per time unit
    this.offsetX = 0;
    this.signalHeight = 30;
    this.nameColumnWidth = 160;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartOffsetX = 0;
    
    this.init();
  }
  
  init() {
    this.container.innerHTML = '';
    this.container.className = 'waveform-viewer';
    
    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'waveform-toolbar';
    toolbar.innerHTML = `
      <button class="waveform-btn" data-action="zoom-in" title="Zoom In">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M 10.5 10.5 L 14 14" stroke="currentColor" stroke-width="1.5"/>
          <path d="M 4 7 L 10 7 M 7 4 L 7 10" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="waveform-btn" data-action="zoom-out" title="Zoom Out">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M 10.5 10.5 L 14 14" stroke="currentColor" stroke-width="1.5"/>
          <path d="M 4 7 L 10 7" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="waveform-btn" data-action="zoom-fit" title="Zoom to Fit">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M 5 8 L 8 5 L 11 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <span class="waveform-spacer"></span>
      <span class="waveform-info">No waveform loaded</span>
    `;
    
    // Viewer container
    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'waveform-container';
    
    // Signal names column
    this.namesCanvas = document.createElement('canvas');
    this.namesCanvas.className = 'waveform-names-canvas';
    this.namesCtx = this.namesCanvas.getContext('2d');
    
    // Waveform canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'waveform-canvas';
    this.ctx = this.canvas.getContext('2d');
    
    viewerContainer.appendChild(this.namesCanvas);
    viewerContainer.appendChild(this.canvas);
    
    this.container.appendChild(toolbar);
    this.container.appendChild(viewerContainer);
    
    // Event listeners
    toolbar.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      
      const action = btn.dataset.action;
      if (action === 'zoom-in') this.zoomIn();
      else if (action === 'zoom-out') this.zoomOut();
      else if (action === 'zoom-fit') this.zoomFit();
    };
    
    // Canvas mouse events
    this.canvas.onmousedown = (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartOffsetX = this.offsetX;
      this.canvas.style.cursor = 'grabbing';
    };
    
    this.canvas.onmousemove = (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        this.offsetX = this.dragStartOffsetX + dx;
        this.render();
      }
    };
    
    this.canvas.onmouseup = () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    };
    
    this.canvas.onmouseleave = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
      }
    };
    
    // Scroll wheel zoom
    this.canvas.onwheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    };
    
    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
      this.render();
    });
    this.resizeObserver.observe(viewerContainer);
    
    this.updateCanvasSize();
  }
  
  updateCanvasSize() {
    const rect = this.container.querySelector('.waveform-container').getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Names canvas
    this.namesCanvas.width = this.nameColumnWidth * dpr;
    this.namesCanvas.height = rect.height * dpr;
    this.namesCanvas.style.width = `${this.nameColumnWidth}px`;
    this.namesCanvas.style.height = `${rect.height}px`;
    this.namesCtx.scale(dpr, dpr);
    
    // Waveform canvas
    const waveformWidth = rect.width - this.nameColumnWidth;
    this.canvas.width = waveformWidth * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${waveformWidth}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  setData(vcdData) {
    this.data = vcdData;
    this.offsetX = 0;
    
    if (this.data && this.data.signals && this.data.signals.length > 0) {
      this.zoomFit();
      
      const info = this.container.querySelector('.waveform-info');
      info.textContent = `${this.data.signals.length} signals | Timescale: ${this.data.timescale || '1ns'}`;
    }
    
    this.render();
  }
  
  render() {
    if (!this.data || !this.data.signals) {
      this.clear();
      return;
    }
    
    this.renderNames();
    this.renderWaveforms();
  }
  
  renderNames() {
    const ctx = this.namesCtx;
    const width = this.nameColumnWidth;
    const height = this.namesCanvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Consolas, monospace';
    ctx.textBaseline = 'middle';
    
    this.data.signals.forEach((signal, i) => {
      const y = i * this.signalHeight;
      
      // Background alternating
      if (i % 2 === 0) {
        ctx.fillStyle = '#2b2b2b';
      } else {
        ctx.fillStyle = '#252525';
      }
      ctx.fillRect(0, y, width, this.signalHeight);
      
      // Signal name
      ctx.fillStyle = '#d0d0d0';
      ctx.fillText(signal.name, 8, y + this.signalHeight / 2);
    });
    
    // Right border
    ctx.strokeStyle = '#404040';
    ctx.beginPath();
    ctx.moveTo(width - 0.5, 0);
    ctx.lineTo(width - 0.5, height);
    ctx.stroke();
  }
  
  renderWaveforms() {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    this.renderGrid(ctx, width, height);
    
    // Waveforms
    this.data.signals.forEach((signal, i) => {
      const y = i * this.signalHeight;
      
      // Background alternating
      if (i % 2 === 0) {
        ctx.fillStyle = '#1e1e1e';
      } else {
        ctx.fillStyle = '#1a1a1a';
      }
      ctx.fillRect(0, y, width, this.signalHeight);
      
      // Draw waveform
      if (signal.width === 1) {
        this.renderDigitalWaveform(ctx, signal, y, width);
      } else {
        this.renderBusWaveform(ctx, signal, y, width);
      }
    });
  }
  
  renderGrid(ctx, width, height) {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (time markers)
    const timeStep = Math.max(50, 100 / this.scale);
    for (let t = 0; t < width; t += timeStep * this.scale) {
      const x = t + this.offsetX;
      if (x >= 0 && x < width) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
    }
    
    // Horizontal grid lines (between signals)
    for (let i = 1; i < this.data.signals.length; i++) {
      const y = i * this.signalHeight;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  }
  
  renderDigitalWaveform(ctx, signal, y, width) {
    const margin = 5;
    const high = y + margin;
    const low = y + this.signalHeight - margin;
    const mid = y + this.signalHeight / 2;
    
    ctx.strokeStyle = signal.name.includes('clk') || signal.name.includes('clock') 
      ? '#4fc3f7'  // Clock: cyan
      : '#66bb6a'; // Data: green
    ctx.lineWidth = 1.5;
    
    if (!signal.values || signal.values.length === 0) return;
    
    ctx.beginPath();
    let prevValue = signal.values[0].value;
    let prevX = this.offsetX;
    
    ctx.moveTo(prevX, prevValue === '1' ? high : low);
    
    for (let i = 0; i < signal.values.length; i++) {
      const item = signal.values[i];
      const x = item.time * this.scale + this.offsetX;
      
      if (x > width) break;
      if (x < 0) {
        prevValue = item.value;
        prevX = x;
        continue;
      }
      
      const value = item.value;
      const currentY = value === '1' ? high : value === '0' ? low : mid;
      const prevY = prevValue === '1' ? high : prevValue === '0' ? low : mid;
      
      // Draw horizontal line to transition point
      ctx.lineTo(x, prevY);
      
      // Draw vertical transition
      ctx.lineTo(x, currentY);
      
      prevValue = value;
      prevX = x;
    }
    
    // Extend to end
    ctx.lineTo(width, prevValue === '1' ? high : low);
    ctx.stroke();
  }
  
  renderBusWaveform(ctx, signal, y, width) {
    const margin = 5;
    const top = y + margin;
    const bottom = y + this.signalHeight - margin;
    const mid = y + this.signalHeight / 2;
    
    ctx.strokeStyle = '#ffa726'; // Bus: orange
    ctx.fillStyle = '#ffa72633';
    ctx.lineWidth = 1.5;
    
    if (!signal.values || signal.values.length === 0) return;
    
    for (let i = 0; i < signal.values.length - 1; i++) {
      const item = signal.values[i];
      const nextItem = signal.values[i + 1];
      
      const x1 = item.time * this.scale + this.offsetX;
      const x2 = nextItem.time * this.scale + this.offsetX;
      
      if (x2 < 0) continue;
      if (x1 > width) break;
      
      // Draw bus shape
      ctx.beginPath();
      ctx.moveTo(Math.max(0, x1), top);
      ctx.lineTo(Math.max(0, x1) + 5, mid);
      ctx.lineTo(Math.min(width, x2) - 5, mid);
      ctx.lineTo(Math.min(width, x2), top);
      ctx.lineTo(Math.min(width, x2), bottom);
      ctx.lineTo(Math.min(width, x2) - 5, mid);
      ctx.lineTo(Math.max(0, x1) + 5, mid);
      ctx.lineTo(Math.max(0, x1), bottom);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
      
      // Draw value text
      if (x2 - x1 > 30) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const valueText = this.formatBusValue(item.value, signal.width);
        ctx.fillText(valueText, (x1 + x2) / 2, mid);
      }
    }
  }
  
  formatBusValue(value, width) {
    if (!value || value === 'x' || value === 'z') return value;
    
    // Convert binary to hex
    const hex = parseInt(value, 2).toString(16).toUpperCase();
    return `0x${hex.padStart(Math.ceil(width / 4), '0')}`;
  }
  
  zoomIn() {
    this.scale *= 1.5;
    this.render();
  }
  
  zoomOut() {
    this.scale *= 0.67;
    this.render();
  }
  
  zoomFit() {
    if (!this.data || !this.data.signals || this.data.signals.length === 0) return;
    
    // Find max time
    let maxTime = 0;
    this.data.signals.forEach(signal => {
      if (signal.values && signal.values.length > 0) {
        const lastTime = signal.values[signal.values.length - 1].time;
        maxTime = Math.max(maxTime, lastTime);
      }
    });
    
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    this.scale = (width - 40) / maxTime;
    this.offsetX = 20;
    this.render();
  }
  
  clear() {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#808080';
    ctx.font = '14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No waveform data', width / 2, height / 2);
    
    // Clear names
    const namesCtx = this.namesCtx;
    const namesWidth = this.nameColumnWidth;
    const namesHeight = this.namesCanvas.height / (window.devicePixelRatio || 1);
    namesCtx.fillStyle = '#2b2b2b';
    namesCtx.fillRect(0, 0, namesWidth, namesHeight);
  }
  
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
