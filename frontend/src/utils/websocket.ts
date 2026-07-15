// WebSocket connection manager for frontend clients

type MessageCallback = (data: any) => void;

class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageCallback>> = new Map();
  private reconnectInterval = 1000;
  private maxReconnectInterval = 16000;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    this.shouldReconnect = true;
    
    // Clean up existing connection if it exists
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    try {
      const currentWs = new WebSocket(this.url);
      this.ws = currentWs;

      currentWs.onopen = () => {
        console.log("WebSocket connected to", this.url);
        this.reconnectInterval = 1000; // Reset backoff
      };

      currentWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const type = message.type;
          const data = message.data;

          const callbacks = this.listeners.get(type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data));
          }

          // Also allow listening to all messages
          const wildcardCallbacks = this.listeners.get("*");
          if (wildcardCallbacks) {
            wildcardCallbacks.forEach((cb) => cb(message));
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      currentWs.onclose = (event) => {
        console.log("WebSocket closed. Code:", event.code);
        if (this.shouldReconnect && this.ws === currentWs) {
          this.attemptReconnect();
        }
      };

      currentWs.onerror = () => {
        console.warn(`WebSocket: connection to ${this.url} failed. Retrying in ${this.reconnectInterval}ms...`);
        currentWs.close();
      };
    } catch (e) {
      console.error("WebSocket connection initiation failed:", e);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    setTimeout(() => {
      console.log(`Attempting to reconnect WebSocket... (${this.reconnectInterval}ms)`);
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
      this.connect();
    }, this.reconnectInterval);
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn("WebSocket not connected. Message dropped:", { type, data });
    }
  }

  public addListener(type: string, callback: MessageCallback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return an unsubscribe function
    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }
}

import { WS_BASE_URL } from "./config";

const isClient = typeof window !== "undefined";

export const wsClient = isClient ? new WebSocketClient(WS_BASE_URL) : null;
