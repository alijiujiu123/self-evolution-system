#!/usr/bin/env node

/**
 * Token Optimization Engine
 *
 * Orchestrates efficiency and throughput optimization
 */

const { EfficiencyOptimizer } = require('./efficiency.cjs');
const { ThroughputOptimizer } = require('./throughput.cjs');
const { ModelSelector } = require('./model-selector.cjs');

class TokenOptimizationEngine {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Initialize optimizers
    this.efficiency = new EfficiencyOptimizer({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    this.throughput = new ThroughputOptimizer({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    this.modelSelector = new ModelSelector({
      logger: this.logger,
      config: this.config,
    });

    // Stats
    this.stats = {
      optimizations: 0,
      tokensSaved: 0,
      throughputImprovements: 0,
    };
  }

  /**
   * Optimize task for both efficiency and throughput
   */
  async optimize(task, context) {
    this.logger?.debug('Optimizing task', {
      type: task.type,
      complexity: task.complexity,
    });

    let optimizedTask = { ...task };

    // Step 1: Select optimal model
    const selectedModel = this.modelSelector.selectModel(task);
    optimizedTask.model = selectedModel;
    optimizedTask.original_model = task.model || 'unknown';

    // Step 2: Optimize for efficiency
    if (task.tokens_used) {
      const efficiencyResult = await this.efficiency.optimize(optimizedTask);
      if (efficiencyResult.optimized) {
        optimizedTask = efficiencyResult.task;
        this.stats.optimizations++;
        this.stats.tokensSaved += efficiencyResult.estimated_savings || 0;
      }
    }

    // Step 3: Check throughput and recommend scaling
    const throughputResult = await this.throughput.optimize(
      context.queueLength || 0,
      context.processingRate || 0
    );

    if (throughputResult.action !== 'maintain') {
      this.stats.throughputImprovements++;
      this.logger?.info('Throughput optimization', {
        action: throughputResult.action,
        reason: throughputResult.reason,
      });
    }

    // Step 4: Check budget
    if (context.budgetUsed) {
      const budgetStatus = this.throughput.checkBudget(context.budgetUsed);
      if (budgetStatus.status === 'warning' || budgetStatus.status === 'critical') {
        this.logger?.warn('Budget alert', budgetStatus);
        optimizedTask.budget_constrained = true;
      }
    }

    return {
      task: optimizedTask,
      model: selectedModel,
      efficiency: this.efficiency.getStats(),
      throughput: {
        result: throughputResult,
        stats: this.throughput.getStats(),
      },
      modelComparison: this.modelSelector.compareModels([task]),
    };
  }

  /**
   * Get optimization suggestions
   */
  getSuggestions() {
    const efficiencySuggestions = this.efficiency.getSuggestions();
    const throughputStats = this.throughput.getStats();

    return {
      efficiency: efficiencySuggestions,
      throughput: throughputStats,
      summary: this._generateSummary(efficiencySuggestions, throughputStats),
    };
  }

  /**
   * Generate summary
   */
  _generateSummary(efficiencySuggestions, throughputStats) {
    const parts = [];

    if (efficiencySuggestions.length > 0) {
      parts.push(`${efficiencySuggestions.length} efficiency optimization(s) available`);
    }

    if (throughputStats.utilization > 0.8) {
      parts.push('high utilization - consider scaling up');
    } else if (throughputStats.utilization < 0.3) {
      parts.push('low utilization - can scale down');
    }

    return parts.join(', ') || 'System operating optimally';
  }

  /**
   * Record metrics
   */
  recordMetrics(taskType, tokensConsumed, itemsProcessed, timeSeconds) {
    this.efficiency.recordMetrics(taskType, tokensConsumed, itemsProcessed);
    this.throughput.recordMetrics(tokensConsumed, timeSeconds);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      efficiency: this.efficiency.getStats(),
      throughput: this.throughput.getStats(),
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      optimizations: 0,
      tokensSaved: 0,
      throughputImprovements: 0,
    };
  }
}

module.exports = { TokenOptimizationEngine };

if (require.main === module) {
  const engine = new TokenOptimizationEngine({ logger: console });

  const testTask = {
    type: 'code-review',
    complexity: 0.7,
    tokens_used: 3000,
  };

  const context = {
    queueLength: 1500,
    processingRate: 5000,
    budgetUsed: 10000000,
  };

  engine.optimize(testTask, context).then(result => {
    console.log('Optimization result:', JSON.stringify(result, null, 2));
    console.log('Stats:', engine.getStats());
    console.log('Suggestions:', engine.getSuggestions());
  }).catch(err => {
    console.error('Error:', err);
  });
}
