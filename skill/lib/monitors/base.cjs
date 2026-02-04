#!/usr/bin/env node

/**
 * Base Monitor Class
 *
 * Abstract base class for all knowledge monitors
 */

const EventEmitter = require('events');

class BaseMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.name = options.name || 'BaseMonitor';
    this.enabled = options.enabled !== false;
    this.interval = options.interval || 300000; // 5 minutes default
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;
    this.running = false;
    this.timer = null;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.running) {
      this.logger?.warn(`${this.name} is already running`);
      return;
    }

    if (!this.enabled) {
      this.logger?.info(`${this.name} is disabled, skipping`);
      return;
    }

    this.running = true;
    this.logger?.info(`${this.name} started`, { interval: this.interval });

    // Initial poll
    this.poll().catch(error => {
      this.logger?.error(`${this.name} initial poll failed`, { error: error.message });
    });

    // Set up recurring poll
    this.timer = setInterval(() => {
      this.poll().catch(error => {
        this.logger?.error(`${this.name} poll failed`, { error: error.message });
      });
    }, this.interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.logger?.info(`${this.name} stopped`);
  }

  /**
   * Poll for new content (to be implemented by subclasses)
   */
  async poll() {
    throw new Error(`${this.name}.poll() must be implemented by subclass`);
  }

  /**
   * Process discovered content
   */
  async processContent(content) {
    try {
      // Validate content
      if (!content || !content.title) {
        this.logger?.warn(`${this.name}: Invalid content`, { content });
        return null;
      }

      // Emit discovery event
      this.emit('discovered', content);

      // Store in database
      const id = this.storage?.insertKnowledge({
        source: this.name,
        type: content.type || 'unknown',
        title: content.title,
        content: content.content || content.summary || '',
        url: content.url,
        risk_level: content.risk_level || 'LOW',
        action_taken: 'pending',
      });

      this.logger?.learn(`${this.name}: Discovered new content`, {
        title: content.title,
        id,
      });

      return id;
    } catch (error) {
      this.logger?.error(`${this.name}: Failed to process content`, {
        error: error.message,
        content: content.title,
      });
      return null;
    }
  }

  /**
   * Fetch URL (utility method)
   */
  async fetchURL(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpenClaw-Evolution/1.0',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      this.logger?.error(`${this.name}: Failed to fetch URL`, {
        url,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse RSS feed (utility method)
   */
  async parseRSS(url) {
    // Placeholder - would use rss-parser in real implementation
    this.logger?.debug(`${this.name}: Parsing RSS feed`, { url });
    return [];
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      running: this.running,
      interval: this.interval,
    };
  }
}

module.exports = { BaseMonitor };
