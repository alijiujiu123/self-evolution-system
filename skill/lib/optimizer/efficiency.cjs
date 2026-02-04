#!/usr/bin/env node

/**
 * Token Efficiency Optimizer
 *
 * Minimizes token consumption per task
 */

class EfficiencyOptimizer {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Efficiency targets by task type
    this.targets = {
      'rss-analysis': 500,   // tokens/item
      'code-review': 2000,
      'documentation': 300,
      'classification': 200,
    };

    // Current metrics
    this.currentMetrics = {};
  }

  /**
   * Optimize task for token efficiency
   */
  async optimize(task) {
    const taskType = task.type || 'unknown';
    const currentUsage = task.tokens_used || 0;
    const target = this.targets[taskType] || 1000;

    this.logger?.debug('Optimizing for efficiency', {
      type: taskType,
      current: currentUsage,
      target: target,
    });

    // If current usage is acceptable, no optimization needed
    if (currentUsage <= target) {
      return { optimized: false, reason: 'Already efficient' };
    }

    // Calculate optimization strategies
    const strategies = this._determineStrategies(task, currentUsage, target);

    // Apply optimizations
    const optimizedTask = await this._applyOptimizations(task, strategies);

    this.logger?.optimize('Efficiency optimization applied', {
      type: taskType,
      strategies: strategies.length,
      estimated_savings: currentUsage - (currentUsage * 0.8), // 估算20%节省
    });

    return {
      optimized: true,
      strategies,
      task: optimizedTask,
    };
  }

  /**
   * Determine optimization strategies
   */
  _determineStrategies(task, current, target) {
    const strategies = [];
    const ratio = current / target;

    // High token usage - needs aggressive optimization
    if (ratio > 2.0) {
      strategies.push('compress_prompt');
      strategies.push('switch_to_cheaper_model');
      strategies.push('enable_result_caching');
      strategies.push('batch_similar_tasks');
    } else if (ratio > 1.5) {
      strategies.push('compress_prompt');
      strategies.push('switch_to_cheaper_model');
      strategies.push('enable_result_caching');
    } else if (ratio > 1.1) {
      strategies.push('compress_prompt');
      strategies.push('enable_result_caching');
    }

    return strategies;
  }

  /**
   * Apply optimizations to task
   */
  async _applyOptimizations(task, strategies) {
    let optimizedTask = { ...task };

    for (const strategy of strategies) {
      switch (strategy) {
        case 'compress_prompt':
          optimizedTask = this._compressPrompt(optimizedTask);
          break;
        case 'switch_to_cheaper_model':
          optimizedTask = this._switchModel(optimizedTask);
          break;
        case 'enable_result_caching':
          optimizedTask.cache_key = this._generateCacheKey(optimizedTask);
          break;
        case 'batch_similar_tasks':
          optimizedTask.batchable = true;
          break;
      }
    }

    return optimizedTask;
  }

  /**
   * Compress prompt
   */
  _compressPrompt(task) {
    if (!task.prompt) {
      return task;
    }

    // Remove redundant information
    let compressed = task.prompt
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .trim();

    // Truncate if too long
    const maxLength = 1000;
    if (compressed.length > maxLength) {
      compressed = compressed.slice(0, maxLength) + '...';
    }

    return {
      ...task,
      prompt: compressed,
      original_prompt: task.prompt,
    };
  }

  /**
   * Switch to cheaper model
   */
  _switchModel(task) {
    const modelHierarchy = {
      'glm-4-plus': 'glm-4.7',
      'glm-4.7': 'glm-4-flash',
      'gpt-4o': 'glm-4.7',
    };

    const currentModel = task.model || 'glm-4.7';
    const cheaperModel = modelHierarchy[currentModel];

    if (cheaperModel) {
      return {
        ...task,
        model: cheaperModel,
        original_model: currentModel,
      };
    }

    return task;
  }

  /**
   * Generate cache key
   */
  _generateCacheKey(task) {
    const content = task.prompt || task.content || '';
    return `cache_${Buffer.from(content).toString('base64').slice(0, 32)}`;
  }

  /**
   * Record metrics
   */
  recordMetrics(taskType, tokensConsumed, itemsProcessed) {
    const efficiency = itemsProcessed > 0 ? tokensConsumed / itemsProcessed : 0;

    this.currentMetrics[taskType] = {
      current: efficiency,
      target: this.targets[taskType] || 1000,
      timestamp: Date.now(),
    };

    // Store in database
    if (this.storage) {
      this.storage.recordTokenMetrics({
        task_type: taskType,
        tokens_consumed: tokensConsumed,
        items_processed: itemsProcessed,
        efficiency: efficiency,
        throughput: 0,
        model_used: 'unknown',
      });
    }
  }

  /**
   * Get optimization suggestions
   */
  getSuggestions() {
    const suggestions = [];

    for (const [type, metrics] of Object.entries(this.currentMetrics)) {
      if (metrics.current > metrics.target) {
        suggestions.push({
          type,
          current: metrics.current,
          target: metrics.target,
          excess: metrics.current - metrics.target,
          priority: metrics.current / metrics.target,
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      targets: { ...this.targets },
      currentMetrics: { ...this.currentMetrics },
      suggestions: this.getSuggestions(),
    };
  }
}

module.exports = { EfficiencyOptimizer };

if (require.main === module) {
  const optimizer = new EfficiencyOptimizer({ logger: console });

  const testTask = {
    type: 'rss-analysis',
    tokens_used: 1500,
    prompt: 'This is a very long prompt with lots of repeated information...',
  };

  optimizer.optimize(testTask).then(result => {
    console.log('Optimization result:', result);
    console.log('Stats:', optimizer.getStats());
  }).catch(err => {
    console.error('Error:', err);
  });
}
