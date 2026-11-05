import pino from 'pino';

const logger = pino({ name: 'WebSocketManager' });

/**
 * WebSocketManager - Manages WebSocket connections and broadcasting
 */
export class WebSocketManager {
  constructor() {
    this.connections = new Map(); // projectId -> Set of WebSocket clients
  }

  /**
   * Register a WebSocket connection for a project
   * @param {string} projectId - Project ID
   * @param {WebSocket} ws - WebSocket instance
   */
  register(projectId, ws) {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set());
    }

    this.connections.get(projectId).add(ws);
    logger.debug({ projectId, totalConnections: this.connections.get(projectId).size }, 'WebSocket registered');

    // Remove on close
    ws.on('close', () => {
      this.unregister(projectId, ws);
    });
  }

  /**
   * Unregister a WebSocket connection
   * @param {string} projectId - Project ID
   * @param {WebSocket} ws - WebSocket instance
   */
  unregister(projectId, ws) {
    const clients = this.connections.get(projectId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.connections.delete(projectId);
      }
      logger.debug({ projectId, remainingConnections: clients.size }, 'WebSocket unregistered');
    }
  }

  /**
   * Broadcast a message to all clients connected to a project
   * @param {string} projectId - Project ID
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   */
  broadcast(projectId, type, payload) {
    const clients = this.connections.get(projectId);
    if (!clients || clients.size === 0) {
      return;
    }

    const message = JSON.stringify({ type, payload });
    let sent = 0;
    let failed = 0;

    for (const ws of clients) {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        logger.error({ projectId, error }, 'Failed to send WebSocket message');
      }
    }

    logger.debug({ projectId, type, sent, failed }, 'Broadcast complete');
  }

  /**
   * Get number of active connections for a project
   * @param {string} projectId - Project ID
   * @returns {number}
   */
  getConnectionCount(projectId) {
    return this.connections.get(projectId)?.size || 0;
  }

  /**
   * Get total number of connections across all projects
   * @returns {number}
   */
  getTotalConnections() {
    let total = 0;
    for (const clients of this.connections.values()) {
      total += clients.size;
    }
    return total;
  }
}

export default WebSocketManager;
