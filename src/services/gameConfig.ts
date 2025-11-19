import { GameConfig, MapDesc, InterventionRule } from '../types';

/**
 * Game configuration and constant definitions
 */

// Predefined map configurations
export const MAP_CONFIGS = {
  // 1x16 linear map (used in Python version)
  LINEAR_1x16: ['HFSFFFFFFFFFFG'] as MapDesc,
  
  // 4x4 standard Frozen Lake map
  STANDARD_4x4: [
    'SFFF',
    'FHFH', 
    'FFFH',
    'HFFG'
  ] as MapDesc,
  
  // 8x8 large map
  LARGE_8x8: [
    'SFFFFFFF',
    'FFFFFFFF',
    'FFFHFFFF',
    'FFFFFHFF',
    'FFFHFFFF',
    'FHHFFFHF',
    'FHFFHFHF',
    'FFFHFFFG'
  ] as MapDesc
} as const;

// Reward scheme configurations
export const REWARD_SCHEDULES = {
  DEFAULT: [-10, 10, 0] as [number, number, number], // [hole, goal, frozen]
  GENEROUS: [-5, 20, 0] as [number, number, number],
  HARSH: [-20, 5, -1] as [number, number, number],
} as const;

export const DEFAULT_INTERVENTION_RULE: InterventionRule = 'suggestion';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mapDesc: MAP_CONFIGS.STANDARD_4x4,
  rewardSchedule: REWARD_SCHEDULES.DEFAULT,
  isSlippery: false,
  agentStepDelay: 500
};

/**
 * Calculate reward based on map description
 */
export const calculateReward = (
  state: number, 
  mapDesc: MapDesc, 
  rewardSchedule: [number, number, number]
): number => {
  const ncol = mapDesc[0].length;
  const row = Math.floor(state / ncol);
  const col = state % ncol;
  const cellType = mapDesc[row][col];
  
  switch (cellType) {
    case 'H': // Hole
      return rewardSchedule[0];
    case 'G': // Goal
      return rewardSchedule[1];
    case 'S': // Start
    case 'F': // Frozen
    default:
      return rewardSchedule[2];
  }
};

/**
 * Check if state is terminal state
 */
export const isTerminalState = (state: number, mapDesc: MapDesc): boolean => {
  const ncol = mapDesc[0].length;
  const row = Math.floor(state / ncol);
  const col = state % ncol;
  const cellType = mapDesc[row][col];
  
  return cellType === 'H' || cellType === 'G';
};

/**
 * Get map dimensions
 */
export const getMapDimensions = (mapDesc: MapDesc) => {
  return {
    nrow: mapDesc.length,
    ncol: mapDesc[0].length
  };
};

/**
 * 获取地图的起点状态
 */
export const getStartState = (mapDesc: MapDesc): number => {
  const ncol = mapDesc[0].length;
  for (let row = 0; row < mapDesc.length; row++) {
    for (let col = 0; col < ncol; col++) {
      if (mapDesc[row][col] === 'S') {
        return row * ncol + col;
      }
    }
  }
  return 0; // 默认回退到状态0
};

/**
 * 检查状态是否是起点
 */
export const isStartState = (state: number, mapDesc: MapDesc): boolean => {
  const ncol = mapDesc[0].length;
  const row = Math.floor(state / ncol);
  const col = state % ncol;
  return mapDesc[row][col] === 'S';
};