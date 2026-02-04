#!/usr/bin/env node

/**
 * SQLite Storage Layer
 *
 * Manages SQLite database for knowledge, optimizations, and metrics
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class SQLStore {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database and create schema
   */
  init() {
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create schema
    this._createSchema();

    return this;
  }

  /**
   * Create database schema
   */
  _createSchema() {
    this.db.exec(`
      -- Knowledge items
      CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT,
        url TEXT,
        vector_id TEXT,
        risk_level TEXT DEFAULT 'LOW',
        action_taken TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source);
      CREATE INDEX IF NOT EXISTS idx_knowledge_risk ON knowledge(risk_level);
      CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge(created_at);

      -- Optimization suggestions
      CREATE TABLE IF NOT EXISTS optimizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER,
        target_file TEXT,
        type TEXT,
        description TEXT,
        diff_preview TEXT,
        status TEXT DEFAULT 'pending',
        pr_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge(id)
      );

      CREATE INDEX IF NOT EXISTS idx_optimizations_status ON optimizations(status);
      CREATE INDEX IF NOT EXISTS idx_optimizations_type ON optimizations(type);

      -- Learning log
      CREATE TABLE IF NOT EXISTS learning_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        tokens_used INTEGER DEFAULT 0,
        items_processed INTEGER DEFAULT 0,
        optimizations_generated INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_learning_log_timestamp ON learning_log(timestamp);

      -- Token efficiency metrics
      CREATE TABLE IF NOT EXISTS token_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT,
        tokens_consumed INTEGER DEFAULT 0,
        items_processed INTEGER DEFAULT 0,
        efficiency REAL DEFAULT 0,
        throughput REAL DEFAULT 0,
        model_used TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_token_metrics_type ON token_metrics(task_type);
      CREATE INDEX IF NOT EXISTS idx_token_metrics_timestamp ON token_metrics(timestamp);
    `);
  }

  /**
   * Insert knowledge item
   */
  insertKnowledge(item) {
    const stmt = this.db.prepare(`
      INSERT INTO knowledge (source, type, title, content, url, vector_id, risk_level, action_taken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      item.source,
      item.type,
      item.title,
      item.content,
      item.url,
      item.vector_id || null,
      item.risk_level || 'LOW',
      item.action_taken || 'pending'
    );

    return result.lastInsertRowid;
  }

  /**
   * Query knowledge items
   */
  queryKnowledge(filters = {}) {
    let sql = 'SELECT * FROM knowledge WHERE 1=1';
    const params = [];

    if (filters.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }

    if (filters.risk_level) {
      sql += ' AND risk_level = ?';
      params.push(filters.risk_level);
    }

    if (filters.action_taken) {
      sql += ' AND action_taken = ?';
      params.push(filters.action_taken);
    }

    if (filters.created_after) {
      sql += ' AND created_at > ?';
      params.push(filters.created_after);
    }

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * Insert optimization suggestion
   */
  insertOptimization(optimization) {
    const stmt = this.db.prepare(`
      INSERT INTO optimizations (knowledge_id, target_file, type, description, diff_preview, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      optimization.knowledge_id || null,
      optimization.target_file || null,
      optimization.type,
      optimization.description,
      optimization.diff_preview || null,
      optimization.status || 'pending'
    );

    return result.lastInsertRowid;
  }

  /**
   * Update optimization status
   */
  updateOptimizationStatus(id, status, prNumber = null) {
    const stmt = this.db.prepare(`
      UPDATE optimizations
      SET status = ?, pr_number = ?
      WHERE id = ?
    `);

    return stmt.run(status, prNumber, id);
  }

  /**
   * Get pending optimizations
   */
  getPendingOptimizations(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT o.*, k.title, k.url
      FROM optimizations o
      LEFT JOIN knowledge k ON o.knowledge_id = k.id
      WHERE o.status = 'pending'
      ORDER BY o.created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Log learning session
   */
  logLearning(session) {
    const stmt = this.db.prepare(`
      INSERT INTO learning_log (session_id, tokens_used, items_processed, optimizations_generated)
      VALUES (?, ?, ?, ?)
    `);

    return stmt.run(
      session.session_id,
      session.tokens_used || 0,
      session.items_processed || 0,
      session.optimizations_generated || 0
    );
  }

  /**
   * Get learning stats
   */
  getLearningStats(hours = 24) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as sessions,
        SUM(tokens_used) as total_tokens,
        SUM(items_processed) as total_items,
        SUM(optimizations_generated) as total_optimizations
      FROM learning_log
      WHERE timestamp > datetime('now', '-' || ? || ' hours')
    `);

    return stmt.get(hours);
  }

  /**
   * Record token metrics
   */
  recordTokenMetrics(metrics) {
    const stmt = this.db.prepare(`
      INSERT INTO token_metrics (task_type, tokens_consumed, items_processed, efficiency, throughput, model_used)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      metrics.task_type,
      metrics.tokens_consumed,
      metrics.items_processed,
      metrics.efficiency,
      metrics.throughput,
      metrics.model_used
    );
  }

  /**
   * Get token efficiency by task type
   */
  getTokenEfficiency(taskType, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT
        AVG(efficiency) as avg_efficiency,
        AVG(throughput) as avg_throughput,
        COUNT(*) as samples
      FROM token_metrics
      WHERE task_type = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.get(taskType, limit);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = { SQLStore };

if (require.main === module) {
  const store = new SQLStore('/tmp/evolution-test.db');
  store.init();

  // Test insert
  const id = store.insertKnowledge({
    source: 'test',
    type: 'blog',
    title: 'Test Knowledge',
    content: 'Test content',
    url: 'https://example.com',
    risk_level: 'LOW',
  });

  console.log('Inserted knowledge item:', id);

  // Test query
  const items = store.queryKnowledge({ source: 'test' });
  console.log('Queried items:', items);

  store.close();
}
