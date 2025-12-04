// src/hooks/useIntervention.ts
import { useState, useCallback, useRef } from 'react';
import { 
  InterventionRule, 
  InterventionRecord, 
  InterventionParams,
  UseInterventionProps,
  QTable,
  Action,
  DeterministicActionInfo
} from '../types';
import { applyInterventionRule } from '../services/interpretationRules';

export const useIntervention = ({
  qtable,
  updateQTable,
  getAnnouncedAction,
  learningRate,
  gamma,
  onInterventionApplied,
  learningParams 
}: UseInterventionProps & { learningParams: any }) => { 
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
      // Get the deterministic action info that was stored when chooseAction was called
      const actionInfo = getAnnouncedAction(fromState);
      
      if (!actionInfo) {
        console.error(`No announced action found for state ${fromState}. Cannot apply intervention.`);
        setIsIntervening(false);
        return;
      }

      const intendedAction = actionInfo.action;
      
      const interventionParams: InterventionParams = {
        state: fromState,
        reward,
        newState: toState,
        action: intendedAction,
        learningRate,
        gamma,
        nrow: learningParams.nrow, 
        ncol: learningParams.ncol, 
        ...additionalParams
      };

      console.log(`Intervention params:`, {
        fromState,
        toState,
        nrow: learningParams.nrow,
        ncol: learningParams.ncol,
        intendedAction,
        actionType: actionInfo.type,
        randomValue: actionInfo.randomValue,
        rule: interventionRule
      });

      // Apply intervention rule using the deterministic action
      const newQTable = applyInterventionRule(
        interventionRule,
        qtable,
        interventionParams
      );

      // Update Q-table
      updateQTable(newQTable);

      // Create intervention record with additional context
      const interventionRecord: InterventionRecord = {
        timestamp: Date.now(),
        fromState,
        toState,
        rule: interventionRule,
        reward,
        action: intendedAction,
        actionType: actionInfo.type
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
        actionType: actionInfo.type,
        learningRate,
        mapDimensions: `${learningParams.nrow}×${learningParams.ncol}` 
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
    getAnnouncedAction,
    learningRate,
    gamma,
    learningParams.nrow, 
    learningParams.ncol, 
    updateQTable,
    onInterventionApplied
  ]);

  const setInterventionRuleWithReset = useCallback((newRule: InterventionRule) => {
    if (newRule !== interventionRule) {
      setInterventionRule(newRule);
      console.log(`Intervention rule switched to: ${newRule}`);
    }
  }, [interventionRule]);

  // ==================== Statistics and Analysis Functions ====================
  const getInterventionStats = useCallback(() => {
    const total = interventionHistory.length;
    const byRule = interventionCountRef.current;
    
    const lastIntervention = interventionHistory.length > 0 
      ? interventionHistory[interventionHistory.length - 1] 
      : undefined;

    const byRulePercentage = Object.entries(byRule).reduce((acc, [rule, count]) => {
      acc[rule as InterventionRule] = total > 0 ? (count / total) * 100 : 0;
      return acc;
    }, {} as Record<InterventionRule, number>);

    const averageReward = total > 0 
      ? interventionHistory.reduce((sum, record) => sum + record.reward, 0) / total 
      : 0;

    // Calculate statistics by action type
    const byActionType = interventionHistory.reduce((acc, record) => {
      const type = record.actionType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byRule,
      byRulePercentage,
      byActionType,
      lastIntervention,
      averageReward,
      mapDimensions: `${learningParams.nrow}×${learningParams.ncol}` 
    };
  }, [interventionHistory, learningParams.nrow, learningParams.ncol]); 

  const getRecentInterventions = useCallback((count: number = 5) => {
    return interventionHistory.slice(-count).reverse();
  }, [interventionHistory]);

  const getInterventionsByRule = useCallback((rule: InterventionRule) => {
    return interventionHistory.filter(record => record.rule === rule);
  }, [interventionHistory]);

  const exportInterventionData = useCallback(() => {
    const stats = getInterventionStats();
    
    return {
      metadata: {
        exportTime: new Date().toISOString(),
        totalInterventions: stats.total,
        currentRule: interventionRule,
        mapDimensions: `${learningParams.nrow}×${learningParams.ncol}` 
      },
      statistics: stats,
      history: interventionHistory 
    };
  }, [interventionHistory, interventionRule, getInterventionStats, learningParams.nrow, learningParams.ncol]); 

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