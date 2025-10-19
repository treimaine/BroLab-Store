/**
 * Browser-compatible EventEmitter implementation
 *
 * Provides a simple event emitter that works in browser environments
 * without requiring Node.js modules.
 */

export class BrowserEventEmitter {
  private listeners = new Map<string, Array<(...args: any[]) => void>>();

  /**
   * Add an event listener
   */
  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  /**
   * Add an event listener (alias for on)
   */
  addListener(event: string, listener: (...args: any[]) => void): this {
    return this.on(event, listener);
  }

  /**
   * Add an event listener to the beginning of the listeners array
   */
  prependListener(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.unshift(listener);
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once(event: string, listener: (...args: any[]) => void): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      return false;
    }

    eventListeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });

    return true;
  }

  /**
   * Remove a specific event listener
   */
  removeListener(event: string, listener: (...args: any[]) => void): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.length : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Alias for removeListener for compatibility
   */
  off(event: string, listener: (...args: any[]) => void): this {
    return this.removeListener(event, listener);
  }

  /**
   * Set maximum number of listeners (Node.js EventEmitter compatibility)
   * In browser environment, this is a no-op for compatibility
   */
  setMaxListeners(n: number): this {
    // No-op in browser environment, just for compatibility
    return this;
  }
}

export default BrowserEventEmitter;
