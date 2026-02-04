#!/usr/bin/env node

/**
 * AI Analysis Engine
 *
 * Orchestrates classification, deep analysis, and risk rating
 */

const { FastClassifier } = require('./classifier.cjs');
const { DeepAnalyzer } = require('./analyzer.cjs');
const { RiskRater } = require('./risk-rater.cjs');

class AIAnalysisEngine {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Initialize components
    this.classifier = new FastClassifier({
      model: this.config.models.classifier,
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    this.analyzer = new DeepAnalyzer({
      model: this.config.models.analyzer,
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    this.rater = new RiskRater({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    // Stats
    this.stats = {
      classified: 0,
      analyzed: 0,
      rated: 0,
      total_time: 0,
    };
  }

  /**
   * Process single item through full pipeline
   */
  async processItem(item) {
    const startTime = Date.now();

    try {
      this.logger?.debug('Processing item', { title: item.title });

      // Step 1: Classify (Tier 1)
      const classification = await this.classifier.classify(item);
      this.stats.classified++;

      // Step 2: Deep analyze if relevant (Tier 2)
      let analysis = null;
      if (classification.relevance_score >= 0.7) {
        analysis = await this.analyzer.analyze(item, classification);
        if (analysis) {
          this.stats.analyzed++;
        }
      }

      // Step 3: Rate risk
      const riskRating = this.rater.rateRisk(item, classification, analysis);
      this.stats.rated++;

      // Combine results
      const result = {
        item,
        classification,
        analysis,
        riskRating,
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      };

      this.logger?.info('Item processed', {
        title: item.title,
        category: classification.category,
        action: riskRating.action,
        time: result.processingTime,
      });

      // Update stats
      this.stats.total_time += result.processingTime;

      return result;
    } catch (error) {
      this.logger?.error('Processing failed', {
        title: item.title,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process batch of items
   */
  async processBatch(items) {
    this.logger?.info('Processing batch', { count: items.length });

    const results = [];

    for (const item of items) {
      try {
        const result = await this.processItem(item);
        results.push(result);
      } catch (error) {
        this.logger?.error('Failed to process item', {
          title: item.title,
          error: error.message,
        });
      }
    }

    this.logger?.info('Batch complete', {
      total: items.length,
      successful: results.length,
      failed: items.length - results.length,
    });

    return results;
  }

  /**
   * Generate optimization suggestions from processed items
   */
  generateOptimizations(processedItems) {
    const optimizations = [];

    for (const processed of processedItems) {
      // Only generate optimizations for actionable items
      if (
        processed.analysis &&
        processed.analysis.actionable &&
        ['suggest', 'auto_apply'].includes(processed.riskRating.action)
      ) {
        const optimization = this.analyzer.generateOptimization(
          processed.item,
          processed.classification,
          processed.analysis
        );

        // Add risk info
        optimization.risk_level = processed.riskRating.level;
        optimization.action = processed.riskRating.action;

        optimizations.push(optimization);
      }
    }

    return optimizations;
  }

  /**
   * Store processed results
   */
  async storeResults(processedItems) {
    let storedKnowledge = 0;
    let storedOptimizations = 0;

    for (const processed of processedItems) {
      try {
        // Store knowledge item
        const knowledgeId = this.storage.insertKnowledge({
          source: processed.item.source || 'unknown',
          type: processed.classification.category,
          title: processed.item.title,
          content: processed.item.content || '',
          url: processed.item.url || '',
          risk_level: processed.riskRating.level,
          action_taken: processed.riskRating.action,
        });
        storedKnowledge++;

        // Store optimization if applicable
        if (processed.analysis && processed.analysis.actionable) {
          const optimization = this.analyzer.generateOptimization(
            { ...processed.item, id: knowledgeId },
            processed.classification,
            processed.analysis
          );

          optimization.risk_level = processed.riskRating.level;
          optimization.action = processed.riskRating.action;

          this.storage.insertOptimization(optimization);
          storedOptimizations++;
        }
      } catch (error) {
        this.logger?.error('Failed to store result', {
          title: processed.item.title,
          error: error.message,
        });
      }
    }

    this.logger?.info('Results stored', {
      knowledge: storedKnowledge,
      optimizations: storedOptimizations,
    });

    return { storedKnowledge, storedOptimizations };
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      avg_processing_time: this.stats.classified > 0
        ? this.stats.total_time / this.stats.classified
        : 0,
      analysis_rate: this.stats.classified > 0
        ? this.stats.analyzed / this.stats.classified
        : 0,
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      classified: 0,
      analyzed: 0,
      rated: 0,
      total_time: 0,
    };
  }
}

module.exports = { AIAnalysisEngine };

if (require.main === module) {
  // Test
  const engine = new AIAnalysisEngine({ logger: console });

  const testItem = {
    title: 'Test: New Optimization Pattern',
    content: 'A new way to optimize async operations',
    url: 'https://example.com/test',
    source: 'test',
  };

  engine.processItem(testItem).then(result => {
    console.log('Processed:', JSON.stringify(result, null, 2));
    console.log('Stats:', engine.getStats());
  }).catch(err => {
    console.error('Error:', err);
  });
}
