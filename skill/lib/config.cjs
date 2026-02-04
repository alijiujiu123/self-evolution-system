#!/usr/bin/env node

/**
 * Evolution System Configuration
 *
 * Manages configuration from environment variables and config file
 */

const fs = require('fs');
const path = require('path');

/**
 * Load configuration from multiple sources
 */
function loadConfig() {
  // 1. Environment variables
  const env = {
    // AI Models
    modelClassifier: process.env.EVOLUTION_MODEL_CLASSIFIER || 'glm-4-flash',
    modelAnalyzer: process.env.EVOLUTION_MODEL_ANALYZER || 'glm-4.7',
    modelComplex: process.env.EVOLUTION_MODEL_COMPLEX || 'glm-4-plus',

    // Database
    dbPath: process.env.EVOLUTION_DB_PATH ||
      path.join(process.env.HOME || '/root', '.openclaw/knowledge/evolution.db'),
    vectorPath: process.env.EVOLUTION_VECTOR_PATH ||
      path.join(process.env.HOME || '/root', '.openclaw/knowledge/vectors'),

    // Monitors
    checkIntervalFast: parseInt(process.env.EVOLUTION_CHECK_INTERVAL_FAST) || 30,
    checkIntervalMed: parseInt(process.env.EVOLUTION_CHECK_INTERVAL_MED) || 300,
    checkIntervalSlow: parseInt(process.env.EVOLUTION_CHECK_INTERVAL_SLOW) || 3600,

    // Budget
    dailyBudget: parseFloat(process.env.EVOLUTION_DAILY_BUDGET) || 50,

    // Elastic Compute
    enableCloud: process.env.EVOLUTION_ENABLE_CLOUD === 'true',
    maxWorkers: parseInt(process.env.EVOLUTION_MAX_WORKERS) || 10,

    // GitHub
    githubToken: process.env.EVOLUTION_GITHUB_TOKEN || '',
    repo: process.env.EVOLUTION_REPO || 'alijiujiu123/openclaw',
  };

  // 2. Config file (if exists)
  const configPath = path.join(__dirname, '../evolution-config.json');
  let fileConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error(`⚠️  Failed to load config file: ${error.message}`);
    }
  }

  // 3. Merge and return
  return {
    monitors: {
      openclaw: { enabled: true, ...fileConfig.monitors?.openclaw },
      ai: { enabled: true, ...fileConfig.monitors?.ai },
      tech: { enabled: true, ...fileConfig.monitors?.tech },
      startup: { enabled: true, ...fileConfig.monitors?.startup },
      internal: { enabled: true, ...fileConfig.monitors?.internal },
    },
    optimization: {
      tokenEfficiencyTarget: 0.8,
      throughputTarget: 10000,
      autoApplyLowRisk: true,
      requireApprovalMedium: true,
      ...fileConfig.optimization,
    },
    elastic: {
      enabled: false,
      providers: ['docker-local'],
      maxWorkers: 5,
      scaleUpThreshold: 1000,
      scaleDownThreshold: 100,
      ...fileConfig.elastic,
      enabled: env.enableCloud || fileConfig.elastic?.enabled || false,
    },
    budget: {
      dailyLimit: 50,
      warnThreshold: 45,
      emergencyStop: true,
      ...fileConfig.budget,
      dailyLimit: env.dailyBudget,
    },
    models: {
      classifier: env.modelClassifier,
      analyzer: env.modelAnalyzer,
      complex: env.modelComplex,
    },
    intervals: {
      fast: env.checkIntervalFast,
      medium: env.checkIntervalMed,
      slow: env.checkIntervalSlow,
    },
    paths: {
      db: env.dbPath,
      vectors: env.vectorPath,
    },
    github: {
      token: env.githubToken,
      repo: env.repo,
    },
  };
}

/**
 * Get configuration (singleton)
 */
let configCache = null;

function getConfig() {
  if (!configCache) {
    configCache = loadConfig();
  }
  return configCache;
}

/**
 * Reload configuration
 */
function reloadConfig() {
  configCache = null;
  return getConfig();
}

module.exports = {
  loadConfig,
  getConfig,
  reloadConfig,
};

if (require.main === module) {
  const config = getConfig();
  console.log(JSON.stringify(config, null, 2));
}
