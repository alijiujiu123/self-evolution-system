#!/usr/bin/env node

/**
 * Risk Rater
 *
 * Evaluates risk level and determines appropriate action
 */

class RiskRater {
  constructor(options = {}) {
    this.logger = options.logger;
    this.storage = options.storage;
    this.config = options.config;
  }

  /**
   * Rate risk level
   */
  rateRisk(content, classification, analysis) {
    try {
      this.logger?.debug('Rating risk', { title: content.title });

      // Base risk from classification
      let baseRisk = this._parseRiskLevel(classification.risk_level);

      // Adjust based on analysis
      if (analysis) {
        baseRisk = this._adjustRisk(baseRisk, analysis);
      }

      // Determine action
      const action = this._determineAction(baseRisk, analysis);

      const riskRating = {
        level: this._riskToString(baseRisk),
        score: this._riskToScore(baseRisk),
        action: action,
        reasoning: this._explainRating(baseRisk, analysis),
      };

      this.logger?.debug('Risk rating complete', {
        title: content.title,
        level: riskRating.level,
        action: riskRating.action,
      });

      return riskRating;
    } catch (error) {
      this.logger?.error('Risk rating failed', {
        title: content.title,
        error: error.message,
      });
      return this._defaultRating();
    }
  }

  /**
   * Parse risk level string to enum
   */
  _parseRiskLevel(level) {
    const levels = {
      'LOW': 0,
      'MEDIUM': 1,
      'HIGH': 2,
      'CRITICAL': 3,
    };
    return levels[level] || 0;
  }

  /**
   * Adjust risk based on analysis
   */
  _adjustRisk(baseRisk, analysis) {
    let adjustedRisk = baseRisk;

    // Increase risk if there are significant risks listed
    if (analysis.risks && analysis.risks.length > 0) {
      const hasBreakingChange = analysis.risks.some(r =>
        r.toLowerCase().includes('breaking') ||
        r.toLowerCase().includes('incompatible') ||
        r.toLowerCase().includes('deprecate')
      );

      if (hasBreakingChange) {
        adjustedRisk = Math.max(adjustedRisk, 2); // At least HIGH
      }

      // Increase risk for security-related changes
      if (analysis.optimization_type === 'security') {
        adjustedRisk = Math.min(adjustedRisk + 1, 3); // CRITICAL max
      }
    }

    // Decrease risk for documentation-only changes
    if (analysis.optimization_type === 'documentation') {
      adjustedRisk = 0; // LOW
    }

    return adjustedRisk;
  }

  /**
   * Determine action based on risk
   */
  _determineAction(risk, analysis) {
    const riskActions = {
      0: 'auto_apply',  // LOW
      1: 'suggest',      // MEDIUM
      2: 'report',       // HIGH
      3: 'report',       // CRITICAL
    };

    const baseAction = riskActions[risk];

    // Special cases
    if (risk >= 2 && analysis && analysis.optimization_type === 'security') {
      return 'emergency_report';
    }

    if (risk === 0 && (!analysis || !analysis.actionable)) {
      return 'ignore';
    }

    return baseAction;
  }

  /**
   * Convert risk level to string
   */
  _riskToString(level) {
    const strings = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return strings[level] || 'LOW';
  }

  /**
   * Convert risk level to score (0-1)
   */
  _riskToScore(level) {
    return level / 3;
  }

  /**
   * Explain rating
   */
  _explainRating(risk, analysis) {
    const explanations = {
      0: 'Safe to auto-apply (documentation, suggestions, low-risk changes)',
      1: 'Requires review (moderate impact, may need confirmation)',
      2: 'Requires manual review (significant impact, breaking changes)',
      3: 'Immediate attention required (security issues, critical bugs)',
    };

    let explanation = explanations[risk];

    if (analysis && analysis.risks && analysis.risks.length > 0) {
      explanation += `\nRisks: ${analysis.risks.join(', ')}`;
    }

    return explanation;
  }

  /**
   * Default rating
   */
  _defaultRating() {
    return {
      level: 'LOW',
      score: 0.0,
      action: 'report',
      reasoning: 'Default rating due to error',
    };
  }

  /**
   * Batch rate multiple items
   */
  rateBatch(items) {
    return items.map(item => ({
      ...item,
      riskRating: this.rateRisk(item.content, item.classification, item.analysis),
    }));
  }
}

module.exports = { RiskRater };

if (require.main === module) {
  // Test
  const rater = new RiskRater({ logger: console });

  const content = {
    title: 'Test Content',
  };

  const classification = {
    risk_level: 'MEDIUM',
  };

  const analysis = {
    optimization_type: 'refactor',
    risks: ['May break existing functionality'],
  };

  const rating = rater.rateRisk(content, classification, analysis);
  console.log('Risk Rating:', JSON.stringify(rating, null, 2));
}
