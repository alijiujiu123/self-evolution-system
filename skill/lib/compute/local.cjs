#!/usr/bin/env node

/**
 * Local Resource Manager
 *
 * Manages local compute resources (CPU, memory, GPU)
 */

const os = require('os');

class LocalResourceManager {
  constructor(options = {}) {
    this.logger = options.logger;
    this.config = options.config;

    // Detect available resources
    this.resources = {
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      gpu: null, // Will detect
    };

    // Detect GPU
    this._detectGPU();
  }

  /**
   * Detect GPU availability
   */
  async _detectGPU() {
    try {
      // Try to detect NVIDIA GPU
      const result = await this._exec('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader');
      if (result) {
        this.resources.gpu = {
          type: 'nvidia',
          available: true,
          info: result.trim(),
        };
        this.logger?.info('NVIDIA GPU detected', { gpu: this.resources.gpu });
        return;
      }
    } catch (error) {
      // No NVIDIA GPU
    }

    try {
      // Try to detect Apple Silicon GPU
      const arch = os.arch();
      if (arch === 'arm64') {
        this.resources.gpu = {
          type: 'apple-silicon',
          available: true,
          info: 'Apple Silicon GPU',
        };
        this.logger?.info('Apple Silicon GPU detected');
        return;
      }
    } catch (error) {
      // No Apple Silicon
    }

    this.resources.gpu = {
      type: 'none',
      available: false,
    };
  }

  /**
   * Get current resource usage
   */
  getUsage() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Calculate CPU usage percentage
    const cpuUsage = this._calculateCPUUsage();

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: loadAvg,
        cores: this.resources.cpu.cores,
      },
      memory: {
        total: this.resources.memory.total,
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        usage: (os.totalmem() - os.freemem()) / os.totalmem(),
      },
      gpu: this.resources.gpu,
    };
  }

  /**
   * Calculate CPU usage
   */
  _calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return {
      idle: totalIdle / totalTick,
      usage: 1 - (totalIdle / totalTick),
    };
  }

  /**
   * Check if can run task locally
   */
  canRunLocally(task) {
    const usage = this.getUsage();
    const cpuUsage = usage.cpu.usage.usage;

    // Check CPU availability
    if (cpuUsage > 0.95) {
      this.logger?.debug('CPU at capacity', { usage: cpuUsage });
      return false;
    }

    // Check memory availability
    const memUsage = usage.memory.usage;
    if (memUsage > 0.9) {
      this.logger?.debug('Memory at capacity', { usage: memUsage });
      return false;
    }

    // Check GPU requirements
    if (task.requiresGPU && !this.resources.gpu.available) {
      this.logger?.debug('Task requires GPU but none available');
      return false;
    }

    return true;
  }

  /**
   * Get resource recommendations
   */
  getRecommendations() {
    const usage = this.getUsage();
    const recommendations = [];

    // CPU recommendations
    if (usage.cpu.usage.usage > 0.9) {
      recommendations.push({
        type: 'cpu',
        severity: 'high',
        message: 'CPU usage critical',
        action: 'scale_up',
      });
    } else if (usage.cpu.usage.usage < 0.2) {
      recommendations.push({
        type: 'cpu',
        severity: 'low',
        message: 'CPU underutilized',
        action: 'scale_down',
      });
    }

    // Memory recommendations
    if (usage.memory.usage > 0.9) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'Memory usage critical',
        action: 'scale_up',
      });
    }

    return recommendations;
  }

  /**
   * Execute shell command
   */
  async _exec(command) {
    const { execSync } = require('child_process');
    try {
      return execSync(command, { encoding: 'utf-8' });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get stats
   */
  getStats() {
    const usage = this.getUsage();

    return {
      resources: this.resources,
      usage: usage,
      recommendations: this.getRecommendations(),
    };
  }
}

module.exports = { LocalResourceManager };

if (require.main === module) {
  const manager = new LocalResourceManager({ logger: console });

  const stats = manager.getStats();
  console.log('Local Resources:', JSON.stringify(stats, null, 2));

  const canRun = manager.canRunLocally({ requiresGPU: false });
  console.log('Can run locally:', canRun);
}
