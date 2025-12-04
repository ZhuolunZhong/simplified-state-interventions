// src/hooks/useQLearning.ts
import { useState, useCallback, useRef, useMemo } from 'react';
import { 
  QTable, 
  LearningParams, 
  UseQLearningProps,
  Action,
  DeterministicActionInfo
} from '../types';

export const useQLearning = ({ 
  initialState,
  initialParams,
  mapDesc, 
  onQTableUpdate 
}: UseQLearningProps = {}) => {
  // ==================== Calculated Parameters ====================
  const calculatedParams = useMemo((): LearningParams => {
    const baseParams = {
      learningRate: 0.8,
      gamma: 0.95,
      epsilon: 0.1,
      stateSize: 16,
      actionSize: 4,
      nrow: 4,
      ncol: 4
    };

    Object.assign(baseParams, initialParams);

    if (mapDesc && mapDesc.length > 0 && mapDesc[0].length > 0) {
      const nrow = mapDesc.length;
      const ncol = mapDesc[0].length;
      const stateSize = nrow * ncol;
      
      return {
        ...baseParams,
        stateSize,    
        nrow,        
        ncol,        
        actionSize: 4 
      };
    }

    console.warn('No map description provided, assuming square map');
    const stateSize = baseParams.stateSize;
    const dimension = Math.sqrt(stateSize);
    
    return {
      ...baseParams,
      nrow: dimension,    
      ncol: dimension     
    };
  }, [initialParams, mapDesc]);

  // ==================== State Definitions ====================
  const [qtable, setQTable] = useState<QTable>(() => {
    if (initialState) return initialState;
    
    const { stateSize, actionSize } = calculatedParams;
    return Array.from({ length: stateSize }, () => 
      Array.from({ length: actionSize }, () => 0)
    );
  });

  const [learningParams, setLearningParams] = useState<LearningParams>(calculatedParams);
  
  // Storage for deterministic action info (announced action)
  const [currentActionInfo, setCurrentActionInfo] = useState<DeterministicActionInfo | null>(null);
  const actionHistoryRef = useRef<Map<number, DeterministicActionInfo>>(new Map());

  // ==================== Ref Definitions ====================
  class SimpleRNG {
    private seed: number;
    
    constructor(seed: number) {
      this.seed = seed;
    }
    
    uniform(min: number = 0, max: number = 1): number {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      const random = this.seed / 233280;
      return min + random * (max - min);
    }
    
    choice<T>(array: T[]): T {
      const index = Math.floor(this.uniform(0, array.length));
      return array[index];
    }
  }

  const rngRef = useRef<SimpleRNG>(new SimpleRNG(123));

  // ==================== Utility Functions ====================
  const getAvailableActions = useCallback((state: number): Action[] => {
    const { nrow, ncol } = learningParams;
    const row = Math.floor(state / ncol);
    const col = state % ncol;
    
    const availableActions: Action[] = [];
    
    if (col > 0) availableActions.push(0);
    if (row < nrow - 1) availableActions.push(1);
    if (col < ncol - 1) availableActions.push(2);
    if (row > 0) availableActions.push(3);
    
    return availableActions;
  }, [learningParams]);

  const getBestActionFromAvailable = useCallback((state: number, availableActions: Action[]): Action => {
    if (availableActions.length === 0) {
      return 0 as Action; 
    }

    const availableQValues = availableActions.map(action => ({
      action,
      qValue: qtable[state][action]
    }));

    const maxQValue = Math.max(...availableQValues.map(item => item.qValue));
    
    const bestActions = availableQValues
      .filter(({ qValue }) => qValue === maxQValue)
      .map(({ action }) => action);

    return rngRef.current.choice(bestActions);
  }, [qtable]);

  // ==================== Q-learning Core Functions ====================
  const chooseAction = useCallback((state: number): Action => {
    const { epsilon } = learningParams;
    const availableActions = getAvailableActions(state);

    if (availableActions.length === 0) {
      console.warn(`State ${state} has no available actions`);
      return 0 as Action;
    }

    // Generate random value for this decision
    const randomValue = rngRef.current.uniform();
    const isExploration = randomValue < epsilon;
    
    let action: Action;
    let type: 'exploration' | 'exploitation';
    
    if (isExploration) {
      // Exploration: randomly select from available actions
      action = rngRef.current.choice(availableActions);
      type = 'exploration';
    } else {
      // Exploitation: select action with maximum Q-value
      action = getBestActionFromAvailable(state, availableActions);
      type = 'exploitation';
    }

    // Store deterministic action info for announcement
    const actionInfo: DeterministicActionInfo = {
      action,
      type,
      randomValue,
      state,
      timestamp: Date.now()
    };
    
    setCurrentActionInfo(actionInfo);
    actionHistoryRef.current.set(state, actionInfo);

    return action;
  }, [learningParams, getAvailableActions, getBestActionFromAvailable]);

  const updateQValue = useCallback((
    state: number, 
    action: Action, 
    reward: number, 
    newState: number
  ) => {
    const { learningRate, gamma } = learningParams;
    
    setQTable(prevQTable => {
      const newQTable = prevQTable.map(row => [...row]);
      
      const currentQ = newQTable[state][action];
      const maxNextQ = Math.max(...newQTable[newState]);
      
      const newQValue = currentQ + learningRate * (
        reward + gamma * maxNextQ - currentQ
      );
      
      newQTable[state][action] = newQValue;
      onQTableUpdate?.(newQTable);
      
      return newQTable;
    });
  }, [learningParams, onQTableUpdate]);

  const updateQTable = useCallback((newQTable: QTable) => {
    setQTable(newQTable);
    onQTableUpdate?.(newQTable);
  }, [onQTableUpdate]);

  const resetQTable = useCallback(() => {
    const { stateSize, actionSize } = learningParams;
    const newQTable = Array.from({ length: stateSize }, () => 
      Array.from({ length: actionSize }, () => 0)
    );
    
    setQTable(newQTable);
    actionHistoryRef.current.clear();
    setCurrentActionInfo(null);
    onQTableUpdate?.(newQTable);
  }, [learningParams, onQTableUpdate]);

  // ==================== Parameter Management ====================
  const updateLearningParams = useCallback((newParams: Partial<LearningParams>) => {
    setLearningParams(prev => {
      const updated = { ...prev, ...newParams };
      
      const stateSizeChanged = newParams.stateSize !== undefined && newParams.stateSize !== prev.stateSize;
      const actionSizeChanged = newParams.actionSize !== undefined && newParams.actionSize !== prev.actionSize;
      
      if (stateSizeChanged || actionSizeChanged) {
        const newQTable = Array.from({ length: updated.stateSize }, () => 
          Array.from({ length: updated.actionSize }, () => 0)
        );
        setQTable(newQTable);
        actionHistoryRef.current.clear();
        setCurrentActionInfo(null);
        onQTableUpdate?.(newQTable);
      }
      
      return updated;
    });
  }, [onQTableUpdate]);

  const setRandomSeed = useCallback((seed: number) => {
    rngRef.current = new SimpleRNG(seed);
  }, []);

  // ==================== Announcement Functions ====================
  /**
   * Get announced action info for a specific state
   * This provides deterministic information about what action WILL be taken
   */
  const getAnnouncedAction = useCallback((state: number): DeterministicActionInfo | null => {
    return actionHistoryRef.current.get(state) || null;
  }, []);

  /**
   * Get current announced action (for UI display)
   */
  const getCurrentAnnouncedAction = useCallback((): DeterministicActionInfo | null => {
    return currentActionInfo;
  }, [currentActionInfo]);

  /**
   * Clear action history (called at episode reset)
   */
  const clearActionHistory = useCallback(() => {
    actionHistoryRef.current.clear();
    setCurrentActionInfo(null);
  }, []);

  // ==================== Analysis Tools ====================
  const getBestActionForState = useCallback((state: number): { action: Action; qValue: number } => {
    const availableActions = getAvailableActions(state);
    
    if (availableActions.length === 0) {
      return { action: 0 as Action, qValue: 0 };
    }

    const availableQValues = availableActions.map(action => ({
      action,
      qValue: qtable[state][action]
    }));

    const maxQValue = Math.max(...availableQValues.map(item => item.qValue));
    const bestActions = availableQValues
      .filter(({ qValue }) => qValue === maxQValue)
      .map(({ action }) => action);

    const bestAction = rngRef.current.choice(bestActions);
    return { action: bestAction, qValue: maxQValue };
  }, [qtable, getAvailableActions]);

  const getPolicy = useCallback((): Action[] => {
    return qtable.map((_, state) => {
      const { action } = getBestActionForState(state);
      return action;
    });
  }, [qtable, getBestActionForState]);

  const getQTableStats = useCallback(() => {
    const allQValues = qtable.flat();
    const average = allQValues.reduce((sum, val) => sum + val, 0) / allQValues.length;
    const variance = allQValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / allQValues.length;
    
    return {
      min: Math.min(...allQValues),
      max: Math.max(...allQValues),
      average,
      std: Math.sqrt(variance)
    };
  }, [qtable]);

  const getActionDirection = useCallback((action: Action): string => {
    const directions = { 
      0: '←', 1: '↓', 2: '→', 3: '↑'
    };
    return directions[action];
  }, []);

  const getQTableDirections = useCallback((mapDescForViz: string[]): string[][] => {
    const nrow = mapDescForViz.length;
    const ncol = mapDescForViz[0].length;
    
    return qtable.map((_, state) => {
      const row = Math.floor(state / ncol);
      const col = state % ncol;
      const cellType = mapDescForViz[row][col];
      
      if (cellType === 'H' || cellType === 'G') {
        return ['■'];
      }
      
      const { action } = getBestActionForState(state);
      return [getActionDirection(action)];
    }).reduce<string[][]>((acc, direction, state) => {
      const row = Math.floor(state / ncol);
      if (!acc[row]) acc[row] = [];
      acc[row][state % ncol] = direction[0];
      return acc;
    }, []);
  }, [qtable, getBestActionForState, getActionDirection]);

  const getAvailableActionsForState = useCallback((state: number): Action[] => {
    return getAvailableActions(state);
  }, [getAvailableActions]);

  // ==================== Return Interface ====================
  return {
    // State
    qtable,
    learningParams,
    
    // Core actions
    chooseAction,
    updateQValue,
    updateQTable,
    resetQTable,
    
    // Announcement system
    getAnnouncedAction,
    getCurrentAnnouncedAction,
    clearActionHistory,
    
    // Parameter management
    updateLearningParams,
    setRandomSeed,
    
    // Analysis tools
    getBestActionForState,
    getPolicy,
    getQTableStats,
    getQTableDirections,
    getActionDirection,
    getAvailableActions: getAvailableActionsForState,
  };
};