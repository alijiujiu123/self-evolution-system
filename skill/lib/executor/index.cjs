#!/usr/bin/env node

/**
 * Execution Engine
 *
 * Orchestrates auto-apply, GitHub integration, and push notifications
 */

const { AutoApplyEngine } = require('./auto-apply.cjs');
const { GitHubAPI } = require('./github-api.cjs');
const { PushSystem } = require('./push-system.cjs');

class ExecutionEngine {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;

    // Initialize components
    this.autoApply = new AutoApplyEngine({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
      dryRun: options.dryRun || false,
    });

    this.github = new GitHubAPI({
      token: this.config.github.token,
      repo: this.config.github.repo,
      logger: this.logger,
    });

    this.push = new PushSystem({
      logger: this.logger,
      storage: this.storage,
      config: this.config,
      channels: options.channels,
    });

    // Stats
    this.stats = {
      auto_applied: 0,
      issues_created: 0,
      pushes_sent: 0,
    };
  }

  /**
   * Process optimizations
   */
  async processOptimizations(optimizations) {
    this.logger?.info('Processing optimizations', {
      count: optimizations.length,
    });

    const results = {
      auto_applied: [],
      issues_created: [],
      ignored: [],
    };

    // Separate by action type
    const toAutoApply = optimizations.filter(opt => opt.action === 'auto_apply');
    const toSuggest = optimizations.filter(opt => opt.action === 'suggest');
    const toReport = optimizations.filter(opt => opt.action === 'report');

    // Auto-apply LOW risk items
    if (toAutoApply.length > 0) {
      this.logger?.info('Auto-applying optimizations', {
        count: toAutoApply.length,
      });

      const applied = await this.autoApply.applyBatch(toAutoApply);
      results.auto_applied = applied.filter(r => r.success);
      this.stats.auto_applied += results.auto_applied.length;

      if (results.auto_applied.length > 0) {
        this.logger?.success('Optimizations applied', {
          count: results.auto_applied.length,
        });
      }
    }

    // Create GitHub issues for suggestions
    if (toSuggest.length > 0) {
      this.logger?.info('Creating GitHub issues', {
        count: toSuggest.length,
      });

      const issues = await this.github.createIssues(toSuggest);
      results.issues_created = issues;
      this.stats.issues_created += issues.length;

      if (issues.length > 0) {
        this.logger?.success('Issues created', {
          count: issues.length,
        });
      }
    }

    // Send push notification for all actionable items
    const actionable = [...toAutoApply, ...toSuggest];
    if (actionable.length > 0) {
      await this.push.sendOptimizationAlert(actionable);
      this.stats.pushes_sent++;
    }

    // Log report items
    if (toReport.length > 0) {
      this.logger?.warn('Items requiring manual review', {
        count: toReport.length,
      });

      for (const item of toReport) {
        this.logger?.info('Manual review required', {
          type: item.type,
          description: item.description,
          risk: item.risk_level,
        });
      }

      results.ignored = toReport;
    }

    return results;
  }

  /**
   * Send heartbeat with summary
   */
  async sendHeartbeat(learningResult) {
    const summary = {
      discovered: learningResult.discovered || 0,
      processed: learningResult.processed || 0,
      stored: learningResult.stored?.storedKnowledge || 0,
      optimizations: learningResult.optimizations || [],
      ai_stats: learningResult.stats || null,
    };

    await this.push.sendHeartbeat(summary);
    this.stats.pushes_sent++;
  }

  /**
   * Send emergency alert
   */
  async sendEmergency(alert) {
    await this.push.sendEmergencyAlert(alert);
  }

  /**
   * Get stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      auto_applied: 0,
      issues_created: 0,
      pushes_sent: 0,
    };
  }
}

module.exports = { ExecutionEngine };

if (require.main === module) {
  const engine = new ExecutionEngine({
    logger: console,
    dryRun: true,
  });

  const testOptimizations = [
    {
      id: 1,
      type: 'documentation',
      action: 'auto_apply',
      risk_level: 'LOW',
      description: 'Update README with new features',
      target_file: 'README.md',
    },
    {
      id: 2,
      type: 'refactor',
      action: 'suggest',
      risk_level: 'MEDIUM',
      description: 'Refactor error handling pattern',
      target_file: 'skills/*/lib/*.cjs',
      diff_preview: '// Example diff',
      benefits: ['Consistency', 'Better tracking'],
      risks: ['May break existing'],
      source_url: 'https://example.com',
    },
  ];

  engine.processOptimizations(testOptimizations).then(results => {
    console.log('Results:', JSON.stringify(results, null, 2));
    console.log('Stats:', engine.getStats());
  }).catch(err => {
    console.error('Error:', err);
  });
}
