// src/hooks/useIntervention.ts
import { useState, useCallback, useRef } from 'react';
import { 
  InterventionRule, 
  InterventionRecord, 
  InterventionParams,
  UseInterventionProps,
  QTable,
  Action
} from '../types';
import { applyInterventionRule } from '../services/interpretationRules';

export const useIntervention = ({
  qtable,
  updateQTable,
  chooseAction,
  learningRate,
  gamma,
  onInterventionApplied
}: UseInterventionProps) => {
  // ==================== State Definitions ====================
  const [interventionRule, setInterventionRule] = useState<InterventionRule>('suggestion');
  const [interventionHistory, setInterventionHistory] = useState<InterventionRecord[]>([]);
  const [isIntervening, setIsIntervening] = useState(false);

  // ==================== Ref Definitions ====================
  const interventionCountRef = useRef<Record<InterventionRule, number>>({
    suggestion: 0,
    reset: 0,
    interrupt: 0,
    impede: 0
  });

  // ==================== Core Intervention Functions ====================
  /**
   * Apply intervention rule
   */
  const applyIntervention = useCallback((
    fromState: number, 
    toState: number, 
    reward: number,
    additionalParams?: Partial<InterventionParams>
  ) => {
    const startTime = performance.now();
    if (fromState < 0 || fromState >= qtable.length) {
      console.error(`Invalid start state: ${fromState}`);
      return;
    }
    
    if (toState < 0 || toState >= qtable.length) {
      console.error(`Invalid target state: ${toState}`);
      return;
    }

    if (isIntervening) {
      console.warn('Intervention in progress, please wait for current intervention to complete');
      return;
    }

    setIsIntervening(true);

    try {      
      // Get the action the agent originally intended to take
      const intendedAction = chooseAction(fromState);
      
      // Build intervention parameters
      const interventionParams: InterventionParams = {
        state: fromState,
        reward,
        newState: toState,
        action: intendedAction,
        learningRate,
        gamma,
        ...additionalParams
      };

      // Apply intervention rule
      const newQTable = applyInterventionRule(
        interventionRule,
        qtable,
        interventionParams
      );

      // Update Q-table
      updateQTable(newQTable);

      // Create intervention record
      const interventionRecord: InterventionRecord = {
        timestamp: Date.now(),
        fromState,
        toState,
        rule: interventionRule,
        reward
      };

      // Update history
      setInterventionHistory(prev => [...prev, interventionRecord]);
      
      // Update statistics count
      interventionCountRef.current[interventionRule]++;

      // Trigger callback
      onInterventionApplied?.(interventionRecord);

      console.log(`Intervention applied: ${interventionRule} rule`, {
        fromState,
        toState,
        reward,
        intendedAction,
        learningRate
      });

    } catch (error) {
      console.error('Error applying intervention:', error);
    } finally {
      const endTime = performance.now();
      console.log(`Intervention processing time: ${(endTime - startTime).toFixed(2)}ms`);
      setIsIntervening(false);
    }
  }, [
    isIntervening,
    qtable,
    interventionRule,
    chooseAction,
    learningRate,
    gamma,
    updateQTable,
    onInterventionApplied
  ]);

  /**
   * Set intervention rule
   */
  const setInterventionRuleWithReset = useCallback((newRule: InterventionRule) => {
    if (newRule !== interventionRule) {
      setInterventionRule(newRule);
      console.log(`Intervention rule switched to: ${newRule}`);
    }
  }, [interventionRule]);

  // ==================== Statistics and Analysis Functions ====================
  /**
   * Get intervention statistics
   */
  const getInterventionStats = useCallback(() => {
    const total = interventionHistory.length;
    const byRule = interventionCountRef.current;
    
    const lastIntervention = interventionHistory.length > 0 
      ? interventionHistory[interventionHistory.length - 1] 
      : undefined;

    // Calculate usage percentage for each rule
    const byRulePercentage = Object.entries(byRule).reduce((acc, [rule, count]) => {
      acc[rule as InterventionRule] = total > 0 ? (count / total) * 100 : 0;
      return acc;
    }, {} as Record<InterventionRule, number>);

    // Calculate average reward
    const averageReward = total > 0 
      ? interventionHistory.reduce((sum, record) => sum + record.reward, 0) / total 
      : 0;

    return {
      total,
      byRule,
      byRulePercentage,
      lastIntervention,
      averageReward
    };
  }, [interventionHistory]);

  /**
   * Get recent intervention records
   */
  const getRecentInterventions = useCallback((count: number = 5) => {
    return interventionHistory.slice(-count).reverse();
  }, [interventionHistory]);

  /**
   * Filter intervention records by rule
   */
  const getInterventionsByRule = useCallback((rule: InterventionRule) => {
    return interventionHistory.filter(record => record.rule === rule);
  }, [interventionHistory]);

  /**
   * Export intervention history data
   */
  const exportInterventionData = useCallback(() => {
    const stats = getInterventionStats();
    
    return {
      metadata: {
        exportTime: new Date().toISOString(),
        totalInterventions: stats.total,
        currentRule: interventionRule
      },
      statistics: stats,
      history: interventionHistory 
    };
  }, [interventionHistory, interventionRule, getInterventionStats]);

  /**
   * Clear intervention history
   */
  const clearInterventionHistory = useCallback(() => {
    setInterventionHistory([]);
    interventionCountRef.current = {
      suggestion: 0,
      reset: 0,
      interrupt: 0,
      impede: 0
    };
    console.log('Intervention history cleared');
  }, []);


  // ==================== Return Interface ====================
  return {
    // State
    interventionRule,
    interventionHistory,
    isIntervening,
    
    // Core actions
    applyIntervention,
    setInterventionRule: setInterventionRuleWithReset,
    
    // Statistics and analysis
    getInterventionStats,
    getRecentInterventions,
    getInterventionsByRule,
    exportInterventionData,
    
    // History management
    clearInterventionHistory,
  };
};