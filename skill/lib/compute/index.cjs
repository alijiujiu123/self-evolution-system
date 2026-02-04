#!/usr/bin/env node

/**
 * Elastic Compute Engine
 *
 * Orchestrates local resources, cloud scheduling, auto-scaling, and task dispatch
 */

const { LocalResourceManager } = require('./local.cjs');
const { CloudScheduler } = require('./cloud.cjs');
const { AutoScaler } = require('./scaler.cjs');
const { TaskDispatcher } = require('./dispatcher.cjs');

class ElasticComputeEngine {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;
    this.enabled = options.enabled || false;

    // Initialize components
    this.localManager = new LocalResourceManager({
      logger: this.logger,
      config: this.config,
    });

    this.cloudScheduler = new CloudScheduler({
      logger: this.logger,
      config: this.config,
    });

    this.scaler = new AutoScaler({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    this.dispatcher = new TaskDispatcher({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
    });

    // Workers
    this.workers = [];
    this.activeTasks = new Map();
  }

  /**
   * Process task with elastic scaling
   */
  async processTask(task) {
    if (!this.enabled) {
      this.logger?.info('Elastic compute disabled, running locally');
      return await this._runLocally(task);
    }

    this.logger?.info('Processing with elastic compute', {
      taskType: task.type,
      requiresGPU: task.requiresGPU,
    });

    // Step 1: Check local resources
    const canRunLocally = this.localManager.canRunLocally(task);
    if (canRunLocally) {
      this.logger?.info('Running locally (resources available)');
      return await this._runLocally(task);
    }

    // Step 2: Scale up if needed
    const usage = this.localManager.getUsage();
    const scaleDecision = await this.scaler.shouldScale(
      this.activeTasks.size,
      usage.cpu.usage.usage,
      task.complexity || 0.5
    );

    if (scaleDecision.action === 'scale_up') {
      this.logger?.info('Scaling up workers', scaleDecision);
      await this.scaler.scaleUp(scaleDecision.targetWorkers, this.cloudScheduler);
    }

    // Step 3: Select cloud provider
    const provider = this.cloudScheduler.selectProvider(task);

    if (!provider) {
      this.logger?.warn('No capable provider, queuing task');
      this.activeTasks.set(task.id, task);
      return { status: 'queued', reason: 'no_capacity' };
    }

    // Step 4: Estimate cost
    const cost = this.cloudScheduler.estimateCost(provider, task);
    this.logger?.info('Cloud compute selected', {
      provider,
      cost: cost.cost,
    });

    // Step 5: Launch worker and execute
    const worker = await this.cloudScheduler.launchWorker(provider, task);

    // Step 6: Execute task
    const result = await this.dispatcher.executeOnWorker(task, worker);

    return result;
  }

  /**
   * Batch process tasks
   */
  async batchProcess(tasks) {
    if (!this.enabled) {
      this.logger?.info('Elastic compute disabled, processing locally');
      return await this._batchProcessLocally(tasks);
    }

    this.logger?.info('Batch processing with elastic compute', {
      taskCount: tasks.length,
    });

    // Check if scaling is beneficial
    if (tasks.length > 100) {
      const usage = this.localManager.getUsage();
      const scaleDecision = await this.scaler.shouldScale(
        tasks.length,
        usage.cpu.usage.usage,
        0.5
      );

      if (scaleDecision.action === 'scale_up') {
        const workers = await this.scaler.scaleUp(
          scaleDecision.targetWorkers,
          this.cloudScheduler
        );

        this.workers = workers.map(w => ({ id: w.id }));

        return await this.dispatcher.batchExecute(
          { id: 'batch', type: 'batch', items: tasks },
          this.workers
        );
      }
    }

    return await this._batchProcessLocally(tasks);
  }

  /**
   * Run task locally
   */
  async _runLocally(task) {
    this.logger?.debug('Running locally', { taskId: task.id });

    // Placeholder - would execute task
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      taskId: task.id,
      status: 'completed',
      location: 'local',
    };
  }

  /**
   * Batch process locally
   */
  async _batchProcessLocally(tasks) {
    this.logger?.info('Batch processing locally', {
      taskCount: tasks.length,
    });

    const results = [];
    for (const task of tasks) {
      const result = await this._runLocally(task);
      results.push(result);
    }

    return {
      totalProcessed: results.length,
      results,
    };
  }

  /**
   * Monitor and auto-scale
   */
  async monitorAndScale() {
    if (!this.enabled) {
      return;
    }

    const usage = this.localManager.getUsage();
    const queueSize = this.activeTasks.size;
    const utilization = usage.cpu.usage.usage;

    const decision = await this.scaler.shouldScale(queueSize, utilization, 0.5);

    if (decision.action === 'scale_up') {
      await this.scaler.scaleUp(decision.targetWorkers, this.cloudScheduler);
    } else if (decision.action === 'scale_down') {
      await this.scaler.scaleDown(decision.targetWorkers);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      enabled: this.enabled,
      localResources: this.localManager.getStats(),
      workers: this.workers.length,
      activeTasks: this.activeTasks.size,
      scaler: this.scaler.getStats(),
      cloudProviders: this.cloudScheduler.getStats(),
    };
  }

  /**
   * Enable/disable elastic compute
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.logger?.info(`Elastic compute ${enabled ? 'enabled' : 'disabled'}`);
  }
}

module.exports = { ElasticComputeEngine };

if (require.main === module) {
  const engine = new ElasticComputeEngine({
    logger: console,
    enabled: false, // Disabled for test
  });

  const testTask = {
    id: 'test-task',
    type: 'code-analysis',
    requiresGPU: false,
    complexity: 0.5,
  };

  engine.processTask(testTask).then(result => {
    console.log('Result:', result);
    console.log('Stats:', engine.getStats());
  }).catch(err => {
    console.error('Error:', err);
  });
}
