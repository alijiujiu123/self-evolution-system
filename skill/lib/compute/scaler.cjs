#!/usr/bin/env node

/**
 * Auto Scaler
 *
 * Automatically scales compute resources based on load
 */

class AutoScaler {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Scaling thresholds
    this.thresholds = {
      queueDepth: options.queueDepth || 1000,
      utilizationLow: options.utilizationLow || 0.3,
      utilizationHigh: options.utilizationHigh || 0.8,
      taskComplexity: options.taskComplexity || 0.8,
    };

    // Scaling limits
    this.limits = {
      minWorkers: options.minWorkers || 1,
      maxWorkers: options.maxWorkers || 10,
      scaleUpCooldown: options.scaleUpCooldown || 60000, // 1 min
      scaleDownCooldown: options.scaleDownCooldown || 120000, // 2 min
    };

    // Current state
    this.currentWorkers = 0;
    this.lastScaleUp = 0;
    this.lastScaleDown = 0;
  }

  /**
   * Check if scaling is needed
   */
  async shouldScale(queueLength, utilization, avgComplexity) {
    const now = Date.now();
    const reasons = [];

    // Check scale up conditions
    if (this._shouldScaleUp(queueLength, utilization, avgComplexity)) {
      // Check cooldown
      if (now - this.lastScaleUp < this.limits.scaleUpCooldown) {
        this.logger?.debug('Scale up cooldown active');
        return { action: 'maintain', reason: 'scale_up_cooldown' };
      }

      reasons.push(this._getScaleUpReason(queueLength, utilization, avgComplexity));

      const targetWorkers = this._calculateTargetWorkers(queueLength);

      return {
        action: 'scale_up',
        reasons,
        currentWorkers: this.currentWorkers,
        targetWorkers,
      };
    }

    // Check scale down conditions
    if (this._shouldScaleDown(queueLength, utilization)) {
      // Check cooldown
      if (now - this.lastScaleDown < this.limits.scaleDownCooldown) {
        this.logger?.debug('Scale down cooldown active');
        return { action: 'maintain', reason: 'scale_down_cooldown' };
      }

      reasons.push('low_utilization');

      const targetWorkers = Math.max(
        this.limits.minWorkers,
        Math.floor(this.currentWorkers / 2)
      );

      return {
        action: 'scale_down',
        reasons,
        currentWorkers: this.currentWorkers,
        targetWorkers,
      };
    }

    return { action: 'maintain' };
  }

  /**
   * Determine if should scale up
   */
  _shouldScaleUp(queueLength, utilization, avgComplexity) {
    // Queue depth trigger
    if (queueLength > this.thresholds.queueDepth) {
      return true;
    }

    // High utilization with queue
    if (utilization > this.thresholds.utilizationHigh && queueLength > 100) {
      return true;
    }

    // High complexity tasks
    if (avgComplexity > this.thresholds.taskComplexity) {
      return true;
    }

    return false;
  }

  /**
   * Determine if should scale down
   */
  _shouldScaleDown(queueLength, utilization) {
    // Low utilization and small queue
    return (
      queueLength < 100 &&
      utilization < this.thresholds.utilizationLow &&
      this.currentWorkers > this.limits.minWorkers
    );
  }

  /**
   * Get scale up reason
   */
  _getScaleUpReason(queueLength, utilization, avgComplexity) {
    if (queueLength > this.thresholds.queueDepth) {
      return `queue_depth:${queueLength}`;
    }
    if (utilization > this.thresholds.utilizationHigh) {
      return `high_utilization:${(utilization * 100).toFixed(0)}%`;
    }
    if (avgComplexity > this.thresholds.taskComplexity) {
      return `complex_tasks:${avgComplexity.toFixed(2)}`;
    }
    return 'unknown';
  }

  /**
   * Calculate optimal worker count
   */
  _calculateTargetWorkers(queueLength) {
    // Simple formula: 1 worker per 500 items
    const optimal = Math.ceil(queueLength / 500);

    // Clamp to limits
    return Math.max(
      this.limits.minWorkers,
      Math.min(optimal, this.limits.maxWorkers)
    );
  }

  /**
   * Scale up
   */
  async scaleUp(targetWorkers, cloudScheduler) {
    const workersToAdd = targetWorkers - this.currentWorkers;

    this.logger?.info('Scaling up', {
      from: this.currentWorkers,
      to: targetWorkers,
      adding: workersToAdd,
    });

    // Launch new workers
    const launchedWorkers = [];
    for (let i = 0; i < workersToAdd; i++) {
      // Placeholder - would launch actual workers
      launchedWorkers.push({
        id: `worker-${Date.now()}-${i}`,
        launchedAt: Date.now(),
      });
    }

    this.currentWorkers = targetWorkers;
    this.lastScaleUp = Date.now();

    this.logger?.success('Scale up complete', {
      workers: this.currentWorkers,
      launched: launchedWorkers.length,
    });

    return launchedWorkers;
  }

  /**
   * Scale down
   */
  async scaleDown(targetWorkers) {
    const workersToRemove = this.currentWorkers - targetWorkers;

    this.logger?.info('Scaling down', {
      from: this.currentWorkers,
      to: targetWorkers,
      removing: workersToRemove,
    });

    // Terminate workers (placeholder)
    for (let i = 0; i < workersToRemove; i++) {
      // Would terminate actual workers
    }

    this.currentWorkers = targetWorkers;
    this.lastScaleDown = Date.now();

    this.logger?.success('Scale down complete', {
      workers: this.currentWorkers,
      removed: workersToRemove,
    });

    return { removed: workersToRemove };
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      currentWorkers: this.currentWorkers,
      thresholds: this.thresholds,
      limits: this.limits,
      lastScaleUp: new Date(this.lastScaleUp),
      lastScaleDown: new Date(this.lastScaleDown),
    };
  }
}

module.exports = { AutoScaler };

if (require.main === module) {
  const scaler = new AutoScaler({ logger: console });

  // Test scale up
  scaler.shouldScale(1500, 0.9, 0.7).then(result => {
    console.log('Scale decision:', result);
  });

  console.log('Stats:', scaler.getStats());
}
