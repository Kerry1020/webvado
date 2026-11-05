/**
 * API Client - HTTP and WebSocket communication with backend
 */

export class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.ws = null;
    this.wsCallbacks = new Map();
  }

  async request(method, path, options = {}) {
    const url = `${this.baseURL}${path}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          message: response.statusText 
        }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API] ${method} ${path} failed:`, error);
      throw error;
    }
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, body, options) {
    return this.request('POST', path, { ...options, body });
  }

  put(path, body, options) {
    return this.request('PUT', path, { ...options, body });
  }

  delete(path, options) {
    return this.request('DELETE', path, options);
  }

  // WebSocket methods
  connectWebSocket(path) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsURL = `${wsProtocol}//${window.location.host}${path}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsURL);

      this.ws.onopen = () => {
        console.log(`[API] WebSocket connected: ${path}`);
        resolve(this.ws);
      };

      this.ws.onerror = (error) => {
        console.error('[API] WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('[API] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[API] WebSocket disconnected');
        this.ws = null;
      };
    });
  }

  handleWebSocketMessage(data) {
    const { type, payload } = data;
    
    if (this.wsCallbacks.has(type)) {
      const callbacks = this.wsCallbacks.get(type);
      callbacks.forEach(callback => callback(payload));
    }
  }

  onWebSocketMessage(type, callback) {
    if (!this.wsCallbacks.has(type)) {
      this.wsCallbacks.set(type, []);
    }
    this.wsCallbacks.get(type).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.wsCallbacks.get(type);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  sendWebSocketMessage(type, payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[API] WebSocket not connected');
      return false;
    }

    this.ws.send(JSON.stringify({ type, payload }));
    return true;
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
