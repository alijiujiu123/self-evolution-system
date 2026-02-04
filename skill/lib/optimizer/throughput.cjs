#!/usr/bin/env node

/**
 * Token Throughput Optimizer
 *
 * Maximizes tokens processed per unit time
 */

class ThroughputOptimizer {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Throughput targets (tokens/minute)
    this.targetThroughput = options.targetThroughput || 10000;
    this.maxBudget = options.maxBudget || 50000000; // 50M tokens/day

    // Current metrics
    this.currentThroughput = 0;
    this.utilization = 0;
  }

  /**
   * Optimize for throughput
   */
  async optimize(queueLength, processingRate) {
    this.logger?.debug('Optimizing for throughput', {
      queue: queueLength,
      rate: processingRate,
    });

    // Calculate current throughput
    this.currentThroughput = processingRate;
    this.utilization = queueLength > 0 ? processingRate / this.targetThroughput : 0;

    // Check if scaling is needed
    if (this._shouldScaleUp(queueLength)) {
      return {
        action: 'scale_up',
        reason: this._getScaleUpReason(queueLength),
        targetWorkers: this._calculateOptimalWorkers(queueLength),
      };
    }

    if (this._shouldScaleDown(queueLength)) {
      return {
        action: 'scale_down',
        reason: 'Low utilization',
        targetWorkers: this._calculateOptimalWorkers(queueLength),
      };
    }

    return { action: 'maintain' };
  }

  /**
   * Determine if should scale up
   */
  _shouldScaleUp(queueLength) {
    // Scale up if:
    // 1. Queue is building up (> 1000 items)
    // 2. Utilization is high (> 80%)
    // 3. Queue depth is increasing

    return (
      queueLength > 1000 ||
      this.utilization > 0.8 ||
      (queueLength > 100 && this.utilization < 0.5)
    );
  }

  /**
   * Determine if should scale down
   */
  _shouldScaleDown(queueLength) {
    // Scale down if:
    // 1. Queue is empty or small (< 100)
    // 2. Utilization is low (< 30%)

    return queueLength < 100 && this.utilization < 0.3;
  }

  /**
   * Get scale up reason
   */
  _getScaleUpReason(queueLength) {
    if (queueLength > 1000) {
      return `queue_depth:${queueLength}`;
    }
    if (this.utilization > 0.8) {
      return `high_utilization:${(this.utilization * 100).toFixed(0)}%`;
    }
    return 'increasing_queue';
  }

  /**
   * Calculate optimal workers
   */
  _calculateOptimalWorkers(queueLength) {
    // Simple formula: 1 worker per 500 items, max 20
    return Math.min(Math.max(Math.ceil(queueLength / 500), 1), 20);
  }

  /**
   * Check budget
   */
  checkBudget(spentToday) {
    const budgetRemaining = this.maxBudget - spentToday;
    const budgetUsed = spentToday / this.maxBudget;

    this.logger?.debug('Budget check', {
      spent: spentToday,
      remaining: budgetRemaining,
      used: `${(budgetUsed * 100).toFixed(1)}%`,
    });

    if (spentToday > this.maxBudget * 0.9) {
      return {
        status: 'warning',
        message: '90% budget consumed',
        remaining: budgetRemaining,
      };
    }

    if (spentToday >= this.maxBudget) {
      return {
        status: 'critical',
        message: 'Budget exceeded',
        remaining: budgetRemaining,
        action: 'stop',
      };
    }

    return {
      status: 'ok',
      remaining: budgetRemaining,
      used: budgetUsed,
    };
  }

  /**
   * Record metrics
   */
  recordMetrics(tokensConsumed, timeSeconds) {
    if (timeSeconds > 0) {
      this.currentThroughput = (tokensConsumed / timeSeconds) * 60; // tokens/min
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      targetThroughput: this.targetThroughput,
      currentThroughput: this.currentThroughput,
      utilization: this.utilization,
      efficiency: this.currentThroughput / this.targetThroughput,
    };
  }
}

module.exports = { ThroughputOptimizer };

if (require.main === module) {
  const optimizer = new ThroughputOptimizer({ logger: console });

  // Test scale up
  optimizer.optimize(1500, 5000).then(result => {
    console.log('Scale up result:', result);
  });

  // Test budget check
  const budget = optimizer.checkBudget(45000000);
  console.log('Budget check:', budget);

  console.log('Stats:', optimizer.getStats());
}
