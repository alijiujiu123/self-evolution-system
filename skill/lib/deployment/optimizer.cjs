#!/usr/bin/env node

/**
 * System Optimizer
 *
 * Final optimization and cleanup
 */

const fs = require('fs');
const path = require('path');

class SystemOptimizer {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;
  }

  /**
   * Run full optimization
   */
  async optimize() {
    this.logger?.start('Running system optimization');

    const results = {
      cleaned: 0,
      optimized: 0,
      indexed: 0,
    };

    // Step 1: Clean up old data
    results.cleaned = await this._cleanupOldData();

    // Step 2: Optimize database
    results.optimized = await this._optimizeDatabase();

    // Step 3: Rebuild indexes
    results.indexed = await this._rebuildIndexes();

    // Step 4: Generate optimization report
    const report = await this._generateOptimizationReport();

    this.logger?.success('System optimization complete', results);

    return { ...results, report };
  }

  /**
   * Clean up old data
   */
  async _cleanupOldData() {
    this.logger?.info('[Optimizer] Cleaning old data');

    let cleaned = 0;

    // Clean old knowledge items (> 30 days)
    const deleted = this.storage.query(`
      DELETE FROM knowledge
      WHERE created_at < datetime('now', '-30 days')
    `);

    cleaned += deleted || 0;

    // Clean old logs
    const logPath = path.join(process.env.HOME || '/root', '.openclaw/evolution-log.json');
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > 10 * 1024 * 1024) { // > 10MB
        // Truncate log file
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n');
        const recentLines = lines.slice(-10000); // Keep last 10K lines
        fs.writeFileSync(logPath, recentLines.join('\n'));
        cleaned += 1;
      }
    }

    this.logger?.success('[Optimizer] Cleanup complete', { items: cleaned });

    return cleaned;
  }

  /**
   * Optimize database
   */
  async _optimizeDatabase() {
    this.logger?.info('[Optimizer] Optimizing database');

    // Run VACUUM
    this.storage.db.exec('VACUUM');

    // Analyze tables
    this.storage.db.exec('ANALYZE knowledge');
    this.storage.db.exec('ANALYZE optimizations');
    this.storage.db.exec('ANALYZE learning_log');
    this.storage.db.exec('ANALYZE token_metrics');

    this.logger?.success('[Optimizer] Database optimized');

    return 1;
  }

  /**
   * Rebuild indexes
   */
  async _rebuildIndexes() {
    this.logger?.info('[Optimizer] Rebuilding indexes');

    // SQLite handles indexes automatically, but we can check them
    const indexes = this.storage.db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index'
      AND tbl_name IN ('knowledge', 'optimizations', 'learning_log', 'token_metrics')
    `).all();

    this.logger?.info('[Optimizer] Indexes checked', {
      count: indexes.length,
    });

    return indexes.length;
  }

  /**
   * Generate optimization report
   */
  async _generateOptimizationReport() {
    this.logger?.info('[Optimizer] Generating report');

    const stats = {
      knowledge: this.storage.db.prepare('SELECT COUNT(*) as count FROM knowledge').get(),
      optimizations: this.storage.db.prepare('SELECT COUNT(*) as count FROM optimizations').get(),
      logs: this.storage.db.prepare('SELECT COUNT(*) as count FROM learning_log').get(),
      tokens: this.storage.db.prepare('SELECT COUNT(*) as count FROM token_metrics').get(),
    };

    return {
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate system health
   */
  async validate() {
    this.logger?.info('Validating system health');

    const issues = [];

    // Check database integrity
    try {
      this.storage.db.exec('PRAGMA integrity_check');
    } catch (error) {
      issues.push({
        type: 'database_integrity',
        severity: 'critical',
        message: error.message,
      });
    }

    // Check disk space
    const stats = await this._getDiskStats();
    if (stats.usage > 0.9) {
      issues.push({
        type: 'disk_space',
        severity: 'warning',
        message: 'Disk usage > 90%',
        usage: stats.usage,
      });
    }

    // Check memory
    if (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.9) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: 'Memory usage > 90%',
      });
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Get disk stats
   */
  async _getDiskStats() {
    // Placeholder - would get actual disk stats
    return { usage: 0.5 };
  }

  /**
   * Get optimization recommendations
   */
  async getRecommendations() {
    const validation = await this.validate();
    const recommendations = [];

    if (!validation.healthy) {
      for (const issue of validation.issues) {
        recommendations.push({
          priority: issue.severity,
          action: 'fix',
          issue: issue.type,
          message: issue.message,
        });
      }
    }

    return recommendations;
  }
}

module.exports = { SystemOptimizer };

if (require.main === module) {
  const optimizer = new SystemOptimizer({ logger: console });

  optimizer.optimize().then(result => {
    console.log('Optimization result:', result);
  }).catch(err => {
    console.error('Error:', err);
  });
}
