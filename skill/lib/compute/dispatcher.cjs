#!/usr/bin/env node

/**
 * Task Dispatcher
 *
 * Distributes tasks across workers and aggregates results
 */

class TaskDispatcher {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    this.workers = new Map();
    this.taskQueue = [];
    this.results = [];
  }

  /**
   * Shard task for parallel processing
   */
  shardTask(task, workerCount) {
    this.logger?.info('Sharding task', {
      taskType: task.type,
      itemCount: task.items?.length || 0,
      workers: workerCount,
    });

    if (!task.items || task.items.length === 0) {
      return [task];
    }

    const shardSize = Math.ceil(task.items.length / workerCount);
    const shards = [];

    for (let i = 0; i < task.items.length; i += shardSize) {
      const shardItems = task.items.slice(i, i + shardSize);

      shards.push({
        ...task,
        id: `${task.id}-shard-${shards.length}`,
        items: shardItems,
        shardIndex: shards.length,
        totalShards: Math.ceil(task.items.length / shardSize),
      });
    }

    this.logger?.info('Task sharded', {
      originalItems: task.items.length,
      shardCount: shards.length,
      avgItemsPerShard: shardSize,
    });

    return shards;
  }

  /**
   * Distribute tasks to workers
   */
  async distribute(tasks, workers) {
    this.logger?.info('Distributing tasks', {
      taskCount: tasks.length,
      workerCount: workers.length,
    });

    const distribution = [];
    const workerIndex = { current: 0 };

    for (const task of tasks) {
      const worker = workers[workerIndex.current % workers.length];
      distribution.push({
        taskId: task.id,
        workerId: worker.id,
        task: task,
      });
      workerIndex.current++;
    }

    this.logger?.info('Tasks distributed', {
      distribution: distribution.length,
    });

    return distribution;
  }

  /**
   * Execute task on worker
   */
  async executeOnWorker(task, worker) {
    this.logger?.debug('Executing on worker', {
      taskId: task.id,
      workerId: worker.id,
    });

    // Placeholder - would actually execute task on worker
    // For now, simulate execution
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      taskId: task.id,
      workerId: worker.id,
      status: 'completed',
      result: {
        processed: task.items?.length || 1,
      },
    };
  }

  /**
   * Aggregate shard results
   */
  aggregateShardResults(shardResults) {
    this.logger?.info('Aggregating shard results', {
      shardCount: shardResults.length,
    });

    // Check if all shards completed
    const completed = shardResults.filter(r => r.status === 'completed');

    if (completed.length !== shardResults.length) {
      this.logger?.warn('Not all shards completed', {
        completed: completed.length,
        total: shardResults.length,
      });
      return null;
    }

    // Aggregate results
    const aggregated = {
      totalProcessed: 0,
      shards: shardResults.length,
      shardResults: shardResults,
    };

    for (const result of shardResults) {
      aggregated.totalProcessed += result.result.processed;
    }

    this.logger?.success('Aggregation complete', {
      totalProcessed: aggregated.totalProcessed,
    });

    return aggregated;
  }

  /**
   * Batch execute with sharding
   */
  async batchExecute(task, availableWorkers) {
    this.logger?.info('Batch executing task', {
      taskType: task.type,
      workers: availableWorkers.length,
    });

    // Shard task
    const shards = this.shardTask(task, availableWorkers.length);

    // Distribute shards
    const distribution = await this.distribute(shards, availableWorkers);

    // Execute on workers (simulate for now)
    const shardResults = [];
    for (const dist of distribution) {
      const result = await this.executeOnWorker(dist.task, {
        id: dist.workerId,
      });
      shardResults.push(result);
    }

    // Aggregate results
    const aggregated = this.aggregateShardResults(shardResults);

    return aggregated;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activeWorkers: this.workers.size,
      queuedTasks: this.taskQueue.length,
      completedResults: this.results.length,
    };
  }
}

module.exports = { TaskDispatcher };

if (require.main === module) {
  const dispatcher = new TaskDispatcher({ logger: console });

  const testTask = {
    id: 'test-task',
    type: 'batch-analysis',
    items: Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item-${i}` })),
  };

  const testWorkers = [
    { id: 'worker-1' },
    { id: 'worker-2' },
    { id: 'worker-3' },
  ];

  dispatcher.batchExecute(testTask, testWorkers).then(result => {
    console.log('Batch result:', result);
    console.log('Stats:', dispatcher.getStats());
  }).catch(err => {
    console.error('Error:', err);
  });
}
