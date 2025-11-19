// src/services/interpretationRules.ts
import { InterventionFunction, InterventionParams, QTable, Action } from '../types';

export const suggestionRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const { state, reward, newState, learningRate } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const ncol = Math.sqrt(qtable.length); 
  const oldPos = { row: Math.floor(state / ncol), col: state % ncol };
  const newPos = { row: Math.floor(newState / ncol), col: newState % ncol };
  
  let actionToUpdate: Action;
  if (newPos.col > oldPos.col) actionToUpdate = 2; // right
  else if (newPos.col < oldPos.col) actionToUpdate = 0; // left
  else if (newPos.row > oldPos.row) actionToUpdate = 1; // down
  else actionToUpdate = 3; // up
  
  const currentQ = updatedQTable[state][actionToUpdate];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    reward + maxNextQ - currentQ
  );
  
  updatedQTable[state][actionToUpdate] = newQValue;
  
  return updatedQTable;
};

export const resetRule: InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
): QTable => {
  const { state, reward, newState, action, learningRate } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const currentQ = updatedQTable[state][action];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    reward + maxNextQ - currentQ
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
  const { state, newState, action, learningRate } = params;
  
  const updatedQTable = qtable.map(row => [...row]);
  
  const currentQ = updatedQTable[state][action];
  const maxNextQ = Math.max(...updatedQTable[newState]);
  const newQValue = currentQ + learningRate * (
    -1 + maxNextQ - currentQ
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