#!/usr/bin/env node

/**
 * Intelligent Model Selector
 *
 * Selects optimal AI model based on task complexity and cost
 */

class ModelSelector {
  constructor(options = {}) {
    this.logger = options.logger;
    this.config = options.config;

    // Model definitions
    this.models = {
      'glm-4-flash': {
        costPerToken: 0.0001,
        speed: 'fast',
        quality: 'low',
        maxTokens: 4000,
      },
      'glm-4.7': {
        costPerToken: 0.001,
        speed: 'medium',
        quality: 'high',
        maxTokens: 8000,
      },
      'glm-4-plus': {
        costPerToken: 0.005,
        speed: 'slow',
        quality: 'very_high',
        maxTokens: 32000,
      },
      'gpt-4o': {
        costPerToken: 0.01,
        speed: 'medium',
        quality: 'very_high',
        maxTokens: 128000,
      },
    };

    // Default models
    this.defaults = {
      classifier: 'glm-4-flash',
      analyzer: 'glm-4.7',
      complex: 'glm-4-plus',
    };
  }

  /**
   * Select model for task
   */
  selectModel(task) {
    const taskType = task.type || 'unknown';
    const complexity = task.complexity || 0.5;
    const urgency = task.urgency || 'normal';

    this.logger?.debug('Selecting model', {
      type: taskType,
      complexity,
      urgency,
    });

    // Urgent tasks get faster model
    if (urgency === 'urgent') {
      const model = this._selectForUrgency(task);
      this.logger?.debug('Selected for urgency', { model });
      return model;
    }

    // Low risk tasks get cheapest model
    if (task.risk_level === 'LOW') {
      const model = this.defaults.classifier;
      this.logger?.debug('Selected for low risk', { model });
      return model;
    }

    // High complexity tasks get best model
    if (complexity > 0.8) {
      const model = this.defaults.complex;
      this.logger?.debug('Selected for complexity', { model });
      return model;
    }

    // Default based on task type
    const model = this._selectByTaskType(taskType, complexity);
    this.logger?.debug('Selected by type', { model, taskType });
    return model;
  }

  /**
   * Select model for urgent tasks
   */
  _selectForUrgency(task) {
    // Balance speed and quality
    if (task.complexity > 0.7) {
      return 'glm-4.7'; // Fast but capable
    }
    return 'glm-4-flash'; // Fastest
  }

  /**
   * Select model by task type
   */
  _selectByTaskType(taskType, complexity) {
    const typeMapping = {
      'classification': 'glm-4-flash',
      'categorization': 'glm-4-flash',
      'documentation': 'glm-4-flash',
      'rss-analysis': 'glm-4-flash',

      'analysis': 'glm-4.7',
      'summarization': 'glm-4.7',
      'optimization': 'glm-4.7',

      'code-review': complexity > 0.7 ? 'glm-4-plus' : 'glm-4.7',
      'refactoring': complexity > 0.7 ? 'glm-4-plus' : 'glm-4.7',
      'security': 'glm-4-plus', // Security needs best quality
      'architecture': 'glm-4-plus', // Architecture needs best quality
    };

    return typeMapping[taskType] || this.defaults.analyzer;
  }

  /**
   * Get model info
   */
  getModelInfo(modelName) {
    return this.models[modelName] || null;
  }

  /**
   * Calculate cost estimate
   */
  estimateCost(modelName, tokenCount) {
    const model = this.models[modelName];
    if (!model) {
      return null;
    }

    return {
      model: modelName,
      tokens: tokenCount,
      cost: tokenCount * model.costPerToken,
      currency: 'USD',
    };
  }

  /**
   * Compare models
   */
  compareModels(tasks) {
    const comparisons = [];

    for (const [name, model] of Object.entries(this.models)) {
      const estimatedTokens = this._estimateTokensForModel(model, tasks);
      const estimatedCost = estimatedTokens * model.costPerToken;
      const estimatedTime = this._estimateTimeForModel(model, tasks);

      comparisons.push({
        model: name,
        tokens: estimatedTokens,
        cost: estimatedCost,
        time: estimatedTime,
        costPerTask: estimatedCost / tasks.length,
      });
    }

    return comparisons.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Estimate tokens for model
   */
  _estimateTokensForModel(model, tasks) {
    // Rough estimate: 500 tokens per task base
    const baseTokens = tasks.length * 500;

    // Adjust for model quality
    const qualityMultiplier = {
      'low': 0.5,
      'high': 1.0,
      'very_high': 1.5,
    };

    return baseTokens * (qualityMultiplier[model.quality] || 1.0);
  }

  /**
   * Estimate time for model
   */
  _estimateTimeForModel(model, tasks) {
    // Rough estimate based on speed
    const speedMultiplier = {
      'fast': 0.5,
      'medium': 1.0,
      'slow': 2.0,
    };

    const baseTime = tasks.length * 1; // 1 second per task base
    return baseTime * (speedMultiplier[model.speed] || 1.0);
  }

  /**
   * Get recommendation
   */
  getRecommendation(tasks) {
    const comparisons = this.compareModels(tasks);

    // Recommend best value (cost/quality balance)
    const bestValue = comparisons.find(c => c.model === 'glm-4.7') || comparisons[0];

    // Recommend fastest
    const fastest = comparisons.reduce((fastest, current) =>
      current.time < fastest.time ? current : fastest
    );

    // Recommend cheapest
    const cheapest = comparisons[0];

    return {
      bestValue,
      fastest,
      cheapest,
      all: comparisons,
    };
  }
}

module.exports = { ModelSelector };

if (require.main === module) {
  const selector = new ModelSelector({ logger: console });

  const testTask = {
    type: 'code-review',
    complexity: 0.6,
    risk_level: 'MEDIUM',
  };

  const selected = selector.selectModel(testTask);
  console.log('Selected model:', selected);

  const cost = selector.estimateCost(selected, 5000);
  console.log('Cost estimate:', cost);

  const comparison = selector.compareModels([testTask]);
  console.log('Model comparison:', comparison);
}
