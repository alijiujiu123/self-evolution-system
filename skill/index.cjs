#!/usr/bin/env node

/**
 * OpenClaw Evolution System
 *
 * Continuous learning and autonomous optimization
 */

const { getConfig } = require('./lib/config.cjs');
const { getLogger } = require('./lib/utils/logger.cjs');
const { SQLStore } = require('./lib/storage/sql-store.cjs');
const { BaseMonitor } = require('./lib/monitors/base.cjs');
const { AIAnalysisEngine } = require('./lib/analyzer/index.cjs');
const { ExecutionEngine } = require('./lib/executor/index.cjs');
const { TokenOptimizationEngine } = require('./lib/optimizer/index.cjs');
const { ElasticComputeEngine } = require('./lib/compute/index.cjs');

class EvolutionSystem {
  constructor(options = {}) {
    this.config = options.config || getConfig();
    this.logger = options.logger || getLogger({ level: 'INFO' });
    this.storage = null;
    this.monitors = [];
    this.analysisEngine = null;
    this.executionEngine = null;
    this.optimizer = null;
    this.computeEngine = null;
    this.running = false;
  }

  /**
   * Initialize system
   */
  async init(options = {}) {
    this.logger.start('Initializing Evolution System', {
      version: '1.0.0',
    });

    // Initialize storage
    this.storage = new SQLStore(this.config.paths.db);
    this.storage.init();
    this.logger.success('Database initialized', {
      path: this.config.paths.db,
    });

    // Initialize monitors
    await this._initMonitors();
    this.logger.success('Monitors initialized', {
      count: this.monitors.length,
    });

    // Initialize AI analysis engine
    this.analysisEngine = new AIAnalysisEngine({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });
    this.logger.success('AI Analysis Engine initialized');

    // Initialize execution engine
    this.executionEngine = new ExecutionEngine({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
      dryRun: options.dryRun || false,
    });
    this.logger.success('Execution Engine initialized');

    // Initialize token optimization engine
    this.optimizer = new TokenOptimizationEngine({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });
    this.logger.success('Token Optimization Engine initialized');

    // Initialize elastic compute engine
    this.computeEngine = new ElasticComputeEngine({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
      enabled: this.config.elastic.enabled || false,
    });
    this.logger.success('Elastic Compute Engine initialized');

    this.logger.success('Evolution System ready');
    return this;
  }

  /**
   * Initialize monitors
   */
  async _initMonitors() {
    const { OpenClawMonitor } = require('./lib/monitors/monitor-openclaw.cjs');
    const { AIMonitor } = require('./lib/monitors/monitor-ai.cjs');
    const { TechMonitor } = require('./lib/monitors/monitor-tech.cjs');
    const { StartupMonitor } = require('./lib/monitors/monitor-startup.cjs');
    const { InternalMonitor } = require('./lib/monitors/monitor-internal.cjs');

    // OpenClaw Ecosystem Monitor
    if (this.config.monitors.openclaw.enabled) {
      const openclawMonitor = new OpenClawMonitor({
        enabled: true,
        interval: this.config.intervals.medium,
        logger: this.logger,
        storage: this.storage,
        config: this.config,
      });
      this.monitors.push(openclawMonitor);
    }

    // AI/LLM Frontier Monitor
    if (this.config.monitors.ai.enabled) {
      const aiMonitor = new AIMonitor({
        enabled: true,
        interval: this.config.intervals.medium,
        logger: this.logger,
        storage: this.storage,
        config: this.config,
      });
      this.monitors.push(aiMonitor);
    }

    // Tech Stack Monitor
    if (this.config.monitors.tech.enabled) {
      const techMonitor = new TechMonitor({
        enabled: true,
        interval: this.config.intervals.medium,
        logger: this.logger,
        storage: this.storage,
        config: this.config,
      });
      this.monitors.push(techMonitor);
    }

    // Startup/Product Monitor
    if (this.config.monitors.startup.enabled) {
      const startupMonitor = new StartupMonitor({
        enabled: true,
        interval: this.config.intervals.medium,
        logger: this.logger,
        storage: this.storage,
        config: this.config,
      });
      this.monitors.push(startupMonitor);
    }

    // Internal Improvement Monitor
    if (this.config.monitors.internal.enabled) {
      const internalMonitor = new InternalMonitor({
        enabled: true,
        interval: this.config.intervals.slow,
        logger: this.logger,
        storage: this.storage,
        config: this.config,
      });
      this.monitors.push(internalMonitor);
    }
  }

  /**
   * Start system
   */
  async start() {
    if (this.running) {
      this.logger.warn('Evolution System is already running');
      return;
    }

    this.logger.start('Starting Evolution System');

    // Start all monitors
    for (const monitor of this.monitors) {
      monitor.start();
    }

    this.running = true;
    this.logger.success('Evolution System started', {
      monitors: this.monitors.length,
    });
  }

  /**
   * Stop system
   */
  async stop() {
    if (!this.running) {
      return;
    }

    this.logger.info('Stopping Evolution System');

    // Stop all monitors
    for (const monitor of this.monitors) {
      monitor.stop();
    }

    this.running = false;
    this.logger.success('Evolution System stopped');
  }

  /**
   * Run single learning cycle
   */
  async runLearningCycle() {
    this.logger.start('Running learning cycle');

    // Collect discovered items from all monitors
    const discoveredItems = [];

    // Poll all monitors
    for (const monitor of this.monitors) {
      if (monitor.enabled) {
        try {
          // Listen for discoveries
          monitor.once('discovered', (item) => {
            discoveredItems.push(item);
          });

          await monitor.poll();
        } catch (error) {
          this.logger.error(`Monitor ${monitor.name} failed`, {
            error: error.message,
          });
        }
      }
    }

    this.logger.learn('Items discovered', {
      count: discoveredItems.length,
    });

    // Process items through AI analysis engine
    if (discoveredItems.length > 0) {
      this.logger.analyze('Processing items through AI engine');

      const processedItems = await this.analysisEngine.processBatch(discoveredItems);

      // Store results
      const stored = await this.analysisEngine.storeResults(processedItems);

      // Generate optimizations
      const optimizations = this.analysisEngine.generateOptimizations(processedItems);

      // Process optimizations (auto-apply, create issues, etc.)
      const executionResults = await this.executionEngine.processOptimizations(optimizations);

      this.logger.success('Learning cycle complete', {
        discovered: discoveredItems.length,
        processed: processedItems.length,
        stored_knowledge: stored.storedKnowledge,
        stored_optimizations: stored.storedOptimizations,
        optimizations_generated: optimizations.length,
        auto_applied: executionResults.auto_applied.length,
        issues_created: executionResults.issues_created.length,
      });

      // Log AI engine stats
      const stats = this.analysisEngine.getStats();
      this.logger.info('AI Engine stats', stats);

      // Log execution stats
      const execStats = this.executionEngine.getStats();
      this.logger.info('Execution stats', execStats);

      return {
        discovered: discoveredItems.length,
        processed: processedItems.length,
        stored,
        optimizations,
        executionResults,
        stats,
        execStats,
      };
    } else {
      this.logger.success('Learning cycle complete', {
        discovered: 0,
      });

      return {
        discovered: 0,
        processed: 0,
        stored: { storedKnowledge: 0, storedOptimizations: 0 },
        optimizations: [],
        executionResults: { auto_applied: [], issues_created: [], ignored: [] },
        stats: this.analysisEngine.getStats(),
        execStats: this.executionEngine.getStats(),
      };
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    const monitorStatus = this.monitors.map(m => m.getStatus());

    const learningStats = this.storage.getLearningStats(24);

    return {
      running: this.running,
      monitors: monitorStatus,
      learning: learningStats,
      aiEngine: this.analysisEngine ? this.analysisEngine.getStats() : null,
      executionEngine: this.executionEngine ? this.executionEngine.getStats() : null,
      optimizer: this.optimizer ? this.optimizer.getStats() : null,
      computeEngine: this.computeEngine ? this.computeEngine.getStats() : null,
    };
  }

  /**
   * Generate status report
   */
  generateReport() {
    const status = this.getStatus();

    const report = {
      summary: {
        running: status.running,
        active_monitors: status.monitors.filter(m => m.running).length,
        total_monitors: status.monitors.length,
      },
      learning: status.learning,
      aiEngine: status.aiEngine,
      executionEngine: status.executionEngine,
      optimizer: status.optimizer,
      computeEngine: status.computeEngine,
      monitors: status.monitors,
    };

    return report;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const command = args[0] || 'start';

  const system = new EvolutionSystem();
  await system.init();

  switch (command) {
    case 'start':
      await system.start();
      console.log('Evolution System started. Press Ctrl+C to stop.');

      // Keep running
      process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await system.stop();
        process.exit(0);
      });

      // Prevent exit
      await new Promise(() => {});

      break;

    case 'learn':
      const result = await system.runLearningCycle();
      console.log('Learning cycle complete:', result);
      process.exit(0);
      break;

    case 'report':
      const report = system.generateReport();
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
      break;

    case 'status':
      const status = system.getStatus();
      console.log(JSON.stringify(status, null, 2));
      process.exit(0);
      break;

    case 'init-db':
      console.log('Database initialized');
      process.exit(0);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Usage: node index.js [start|learn|report|status|init-db]');
      process.exit(1);
  }
}

// Export for testing
module.exports = { EvolutionSystem };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
