#!/usr/bin/env node

/**
 * Evolution System Logger
 *
 * Structured logging with levels and emoji indicators
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const EMOJI = {
  DEBUG: '🔍',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
  CRITICAL: '🔥',
  SUCCESS: '✅',
  START: '🚀',
  LEARN: '📚',
  ANALYZE: '🤖',
  OPTIMIZE: '⚡',
  SCALE: '☁️',
};

class EvolutionLogger {
  constructor(options = {}) {
    this.level = options.level || 'INFO';
    this.logFile = options.logFile ||
      path.join(process.env.HOME || '/root', '.openclaw/evolution-log.json');
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.history = [];

    // Ensure log directory exists
    if (this.enableFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  _formatTimestamp() {
    return new Date().toISOString();
  }

  _logToConsole(level, emoji, message, data) {
    if (!this.enableConsole || !this._shouldLog(level)) return;

    const prefix = `${emoji} [${level}] ${this._formatTimestamp()}`;
    const msg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    if (data) {
      console.log(`${prefix} ${msg}`, data);
    } else {
      console.log(`${prefix} ${msg}`);
    }
  }

  _logToFile(level, emoji, message, data) {
    if (!this.enableFile) return;

    const entry = {
      level,
      emoji,
      timestamp: this._formatTimestamp(),
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      data: data || null,
    };

    this.history.push(entry);

    // Append to file
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  debug(message, data) {
    this._logToConsole('DEBUG', EMOJI.DEBUG, message, data);
    this._logToFile('DEBUG', EMOJI.DEBUG, message, data);
  }

  info(message, data) {
    this._logToConsole('INFO', EMOJI.INFO, message, data);
    this._logToFile('INFO', EMOJI.INFO, message, data);
  }

  warn(message, data) {
    this._logToConsole('WARN', EMOJI.WARN, message, data);
    this._logToFile('WARN', EMOJI.WARN, message, data);
  }

  error(message, data) {
    this._logToConsole('ERROR', EMOJI.ERROR, message, data);
    this._logToFile('ERROR', EMOJI.ERROR, message, data);
  }

  critical(message, data) {
    this._logToConsole('CRITICAL', EMOJI.CRITICAL, message, data);
    this._logToFile('CRITICAL', EMOJI.CRITICAL, message, data);
  }

  // Specialized methods

  success(message, data) {
    this._logToConsole('INFO', EMOJI.SUCCESS, message, data);
    this._logToFile('INFO', EMOJI.SUCCESS, message, data);
  }

  start(message, data) {
    this._logToConsole('INFO', EMOJI.START, message, data);
    this._logToFile('INFO', EMOJI.START, message, data);
  }

  learn(message, data) {
    this._logToConsole('INFO', EMOJI.LEARN, message, data);
    this._logToFile('INFO', EMOJI.LEARN, message, data);
  }

  analyze(message, data) {
    this._logToConsole('INFO', EMOJI.ANALYZE, message, data);
    this._logToFile('INFO', EMOJI.ANALYZE, message, data);
  }

  optimize(message, data) {
    this._logToConsole('INFO', EMOJI.OPTIMIZE, message, data);
    this._logToFile('INFO', EMOJI.OPTIMIZE, message, data);
  }

  scale(message, data) {
    this._logToConsole('INFO', EMOJI.SCALE, message, data);
    this._logToFile('INFO', EMOJI.SCALE, message, data);
  }

  // Get recent logs
  getRecent(count = 50) {
    return this.history.slice(-count);
  }

  // Get logs by level
  getByLevel(level, count = 50) {
    return this.history
      .filter(entry => entry.level === level)
      .slice(-count);
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger(options) {
  if (!loggerInstance) {
    loggerInstance = new EvolutionLogger(options);
  }
  return loggerInstance;
}

module.exports = {
  EvolutionLogger,
  getLogger,
};

if (require.main === module) {
  const logger = new EvolutionLogger({ level: 'DEBUG' });

  logger.debug('This is a debug message', { foo: 'bar' });
  logger.info('System started', { version: '1.0.0' });
  logger.warn('Warning: high token usage', { tokens: 50000 });
  logger.error('Error occurred', { error: 'Connection failed' });
  logger.critical('Critical failure', { code: 'ERR_001' });

  logger.success('Optimization applied', { type: 'doc_update' });
  logger.start('Learning cycle initiated', { cycle: 123 });
  logger.learn('New skill discovered', { name: 'skill-twitter' });
  logger.analyze('Code review complete', { file: 'installer.js' });
  logger.optimize('Token efficiency improved', { gain: '15%' });
  logger.scale('Elastic scaling triggered', { workers: 5 });

  console.log('\nRecent logs:');
  console.log(logger.getRecent(5));
}
