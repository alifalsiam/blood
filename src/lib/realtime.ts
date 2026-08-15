// Real-Time SSE (Server-Sent Events) Client with auto-reconnection and event dispatching

type RealtimeListener = (data: any) => void;

class RealtimeHub {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<RealtimeListener>> = new Map();
  private isConnected: boolean = false;
  private reconnectTimeout: any = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/realtime/stream');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.emitLocal('connection_status', { status: 'connected' });
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type) {
            this.emitLocal(parsed.type, parsed.data);
            this.emitLocal('*', parsed);
          }
        } catch (e) {
          // Ignore heartbeat or non-JSON comments
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.emitLocal('connection_status', { status: 'disconnected' });
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Realtime SSE connection failed, retrying in 5s...', err);
      setTimeout(() => this.connect(), 5000);
    }
  }

  public on(event: string, callback: RealtimeListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in realtime event handler for ${event}:`, e);
        }
      });
    }
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimeHub = new RealtimeHub();
