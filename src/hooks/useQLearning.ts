// src/hooks/useQLearning.ts
import { useState, useCallback, useRef } from 'react';
import { 
  QTable, 
  LearningParams, 
  UseQLearningProps,
  Action,
  Position
} from '../types';

// ==================== Default Parameters ====================
const DEFAULT_LEARNING_PARAMS: LearningParams = {
  learningRate: 0.8,
  gamma: 0.95,
  epsilon: 0.1,
  stateSize: 16,
  actionSize: 4
};

export const useQLearning = ({ 
  initialState,
  initialParams,
  mapDesc, 
  onQTableUpdate 
}: UseQLearningProps = {}) => {
  // ==================== State Definitions ====================
  const [qtable, setQTable] = useState<QTable>(() => {
    if (initialState) return initialState;
    
    const params = { ...DEFAULT_LEARNING_PARAMS, ...initialParams };
    return Array.from({ length: params.stateSize }, () => 
      Array.from({ length: params.actionSize }, () => 0)
    );
  });

  const [learningParams, setLearningParams] = useState<LearningParams>(() => ({
    ...DEFAULT_LEARNING_PARAMS,
    ...initialParams
  }));

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
  /**
   * Get available actions for a state
   */
  const getAvailableActions = useCallback((state: number): Action[] => {
    if (!mapDesc) {
      return [0, 1, 2, 3];
    }

    const ncol = mapDesc[0].length;
    const nrow = mapDesc.length;
    const row = Math.floor(state / ncol);
    const col = state % ncol;
    
    const availableActions: Action[] = [];
    
    // Check if each direction is available (not out of bounds)
    if (col > 0) availableActions.push(0); // Left
    if (row < nrow - 1) availableActions.push(1); // Down
    if (col < ncol - 1) availableActions.push(2); // Right
    if (row > 0) availableActions.push(3); // Up
    
    return availableActions;
  }, [mapDesc]);

  /**
   * Select best action from available actions
   */
  const getBestActionFromAvailable = useCallback((state: number, availableActions: Action[]): Action => {
    if (availableActions.length === 0) {
      return 0 as Action; 
    }

    // Get Q-values for available actions
    const availableQValues = availableActions.map(action => ({
      action,
      qValue: qtable[state][action]
    }));

    // Find maximum Q-value
    const maxQValue = Math.max(...availableQValues.map(item => item.qValue));
    
    // Select actions with maximum Q-value (there might be multiple)
    const bestActions = availableQValues
      .filter(({ qValue }) => qValue === maxQValue)
      .map(({ action }) => action);

    // Use new choice method to randomly select one best action
    return rngRef.current.choice(bestActions);
  }, [qtable]);

  // ==================== Q-learning Core Functions ====================
  /**
   * Choose action - ε-greedy policy (considering available actions)
   */
  const chooseAction = useCallback((state: number): Action => {
    const { epsilon } = learningParams;
    const availableActions = getAvailableActions(state);

    if (availableActions.length === 0) {
      console.warn(`State ${state} has no available actions`);
      return 0 as Action;
    }

    // Exploration: randomly select from available actions with ε probability
    if (rngRef.current.uniform() < epsilon) {
      return rngRef.current.choice(availableActions);
    }

    // Exploitation: select action with maximum Q-value from available actions
    return getBestActionFromAvailable(state, availableActions);
  }, [qtable, learningParams, getAvailableActions, getBestActionFromAvailable]);

  /**
   * Update Q-value - Q-learning core update formula
   */
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

  /**
   * Batch update Q-table (for intervention rules)
   */
  const updateQTable = useCallback((newQTable: QTable) => {
    setQTable(newQTable);
    onQTableUpdate?.(newQTable);
  }, [onQTableUpdate]);

  /**
   * Reset Q-table
   */
  const resetQTable = useCallback(() => {
    const { stateSize, actionSize } = learningParams;
    const newQTable = Array.from({ length: stateSize }, () => 
      Array.from({ length: actionSize }, () => 0)
    );
    
    setQTable(newQTable);
    onQTableUpdate?.(newQTable);
  }, [learningParams, onQTableUpdate]);

  // ==================== Parameter Management ====================
  /**
   * Update learning parameters
   */
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
        onQTableUpdate?.(newQTable);
      }
      
      return updated;
    });
  }, [onQTableUpdate]);

  /**
   * Set random number generator seed
   */
  const setRandomSeed = useCallback((seed: number) => {
    rngRef.current = new SimpleRNG(seed);
  }, []);

  // ==================== Analysis Tools ====================
  /**
   * Get best action and Q-value for state (considering available actions)
   */
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

  /**
   * Get policy (best action for each state, considering available actions)
   */
  const getPolicy = useCallback((): Action[] => {
    return qtable.map((_, state) => {
      const { action } = getBestActionForState(state);
      return action;
    });
  }, [qtable, getBestActionForState]);

  /**
   * Get Q-value statistics
   */
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

  /**
   * Get visualization direction for action
   */
  const getActionDirection = useCallback((action: Action): string => {
    const directions = { 
      0: '←', 1: '↓', 2: '→', 3: '↑'
    };
    return directions[action];
  }, []);

  /**
   * Get visualization direction map for entire Q-table
   */
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
    
    // Parameter management
    updateLearningParams,
    setRandomSeed,
    
    // Analysis tools
    getBestActionForState,
    getPolicy,
    getQTableStats,
    getQTableDirections,
    getActionDirection,
    getAvailableActions 
  };
};