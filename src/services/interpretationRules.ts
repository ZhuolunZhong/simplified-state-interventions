// src/services/interpretationRules.ts
import { InterventionFunction, InterventionParams, QTable, Action } from '../types';

export const suggestionRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const { state, reward, newState, learningRate, nrow, ncol, gamma } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const oldPos = { row: Math.floor(state / ncol), col: state % ncol };
  const newPos = { row: Math.floor(newState / ncol), col: newState % ncol };
  
  let actionToUpdate: Action;

  const isOneDimensional = nrow === 1;
  
  if (isOneDimensional) {
    // One-dimensional map: only consider horizontal movement
    const colDiff = newPos.col - oldPos.col;
    actionToUpdate = colDiff > 0 ? 2 : 0; // Right : Left
    console.log(`1D Map: State ${state}->${newState}, ColDiff: ${colDiff}, Action: ${actionToUpdate}`);
  } else {
    // Multi-dimensional map: consider both horizontal and vertical movement
    const rowDiff = newPos.row - oldPos.row;
    const colDiff = newPos.col - oldPos.col;
    
    // Prioritize the direction with larger absolute difference
    if (Math.abs(colDiff) > Math.abs(rowDiff)) {
      actionToUpdate = colDiff > 0 ? 2 : 0; // Right : Left
    } else {
      actionToUpdate = rowDiff > 0 ? 1 : 3; // Down : Up
    }
    console.log(`2D Map: State ${state}->${newState}, RowDiff: ${rowDiff}, ColDiff: ${colDiff}, Action: ${actionToUpdate}`);
  }
  
  const currentQ = updatedQTable[state][actionToUpdate];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    1 + gamma * maxNextQ - currentQ
  );
  
  updatedQTable[state][actionToUpdate] = newQValue;
  
  return updatedQTable;
};

export const resetRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const { state, reward, newState, action, learningRate, gamma } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const currentQ = updatedQTable[state][action];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    reward + gamma * maxNextQ - currentQ
  );
  
  updatedQTable[state][action] = newQValue;
  
  return updatedQTable;
};

export const interruptRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  return qtable;
};

export const impedeRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const { state, newState, action, learningRate, gamma } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const currentQ = updatedQTable[state][action];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    -1 + gamma * maxNextQ - currentQ
  );
  
  updatedQTable[state][action] = newQValue;
  
  return updatedQTable;
};

export const INTERVENTION_RULES = {
  suggestion: suggestionRule,
  reset: resetRule,
  interrupt: interruptRule,
  impede: impedeRule,
} as const;

export const applyInterventionRule = (
  ruleName: keyof typeof INTERVENTION_RULES,
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const ruleFunction = INTERVENTION_RULES[ruleName];
  return ruleFunction(qtable, params);
};