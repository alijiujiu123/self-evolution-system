#!/usr/bin/env node

/**
 * Job Queue System
 *
 * Simple in-memory queue for processing discovered content
 */

const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();

    this.maxSize = options.maxSize || 10000;
    this.concurrency = options.concurrency || 5;
    this.queue = [];
    this.processing = 0;
    this.logger = options.logger;
    this.stats = {
      enqueued: 0,
      processed: 0,
      failed: 0,
    };
  }

  /**
   * Add job to queue
   */
  enqueue(job) {
    if (this.queue.length >= this.maxSize) {
      this.logger?.warn('Queue full, dropping job', { type: job.type });
      return false;
    }

    this.queue.push({
      ...job,
      id: this.stats.enqueued++,
      enqueuedAt: Date.now(),
    });

    this.emit('enqueued', job);
    this._tryProcess();

    return true;
  }

  /**
   * Process jobs from queue
   */
  async _tryProcess() {
    // Check if we can process more jobs
    while (this.queue.length > 0 && this.processing < this.concurrency) {
      const job = this.queue.shift();
      this.processing++;

      try {
        await this._processJob(job);
        this.stats.processed++;
        this.emit('processed', job);
      } catch (error) {
        this.stats.failed++;
        this.emit('failed', { job, error });
        this.logger?.error('Job failed', {
          job: job.title,
          error: error.message,
        });
      } finally {
        this.processing--;
        // Try to process more
        setImmediate(() => this._tryProcess());
      }
    }
  }

  /**
   * Process single job
   */
  async _processJob(job) {
    this.logger?.debug('Processing job', {
      id: job.id,
      type: job.type,
      title: job.title,
    });

    // This would be overridden by actual processor
    // For now, just log
    this.logger?.info('Job processed', { job: job.title });
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      stats: { ...this.stats },
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.emit('cleared');
  }
}

module.exports = { JobQueue };

if (require.main === module) {
  // Test
  const queue = new JobQueue({
    maxSize: 100,
    concurrency: 2,
    logger: console,
  });

  queue.on('enqueued', (job) => {
    console.log('Enqueued:', job.title);
  });

  queue.on('processed', (job) => {
    console.log('Processed:', job.title);
  });

  // Add test jobs
  for (let i = 0; i < 5; i++) {
    queue.enqueue({
      type: 'test',
      title: `Test Job ${i}`,
      data: { index: i },
    });
  }

  setTimeout(() => {
    console.log('Status:', queue.getStatus());
  }, 1000);
}
