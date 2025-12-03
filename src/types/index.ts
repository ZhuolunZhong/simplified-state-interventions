// src/types/index.ts

// ==================== Environment Related Types ====================
export type CellType = 'S' | 'F' | 'H' | 'G'; // Start, Frozen, Hole, Goal
export type MapDesc = string[]; // e.g., ["SFFF", "FHFH", "FFFG"]

export interface Position {
  row: number;
  col: number;
}

export interface GameMap {
  desc: MapDesc;
  nrow: number;
  ncol: number;
}

// ==================== Agent Related Types ====================
export type Action = 0 | 1 | 2 | 3; // Corresponds to Python's 4 actions: Left, Down, Right, Up
export type QTable = number[][]; // [state][action]

export interface AgentState {
  currentState: number;
  totalReward: number;
  steps: number;
  lastReward: number;
  isDone: boolean;
}

export interface LearningParams {
  learningRate: number;
  gamma: number;
  epsilon: number;
  stateSize: number;
  actionSize: number;
  nrow: number; 
  ncol: number; 
}

// ==================== Intervention System Types ====================
export type InterventionRule = 
  | 'suggestion' 
  | 'reset' 
  | 'interrupt' 
  | 'impede';

export interface InterventionParams {
  state: number;
  reward: number;
  newState: number;
  action: number;
  learningRate: number;
  gamma: number; 
  nrow: number; 
  ncol: number; 
}

export type InterventionFunction = (
  qtable: QTable,
  params: InterventionParams
) => QTable;

export interface InterventionRecord {
  timestamp: number;
  fromState: number;
  toState: number;
  rule: InterventionRule;
  reward: number;
}

// ==================== Game Engine Types ====================
export interface GameConfig {
  mapDesc: MapDesc;
  rewardSchedule: [number, number, number]; // [Hole, Goal, Frozen] rewards
  isSlippery: boolean;
  agentStepDelay: number; // Agent action interval (ms)
}

export interface GameStats {
  episode: number;
  totalReward: number;
  steps: number;
  lastReward: number;
  interventions: number;
  successRate: number;
}

export interface GameStatus {
  isRunning: boolean;
  isPaused: boolean;
  isIntervening: boolean;
  isTraining: boolean;
}

// ==================== Experiment System Types ====================
export type ExperimentPhase = 
  | 'introduction' 
  | 'training' 
  | 'results';

export interface ExperimentConfig {
  id: string;
  participantId?: string;
  interventionRule: InterventionRule;
  totalEpisodes: number;
  createdAt: number;
  completedAt?: number;
}

export interface ExperimentResults {
  config: ExperimentConfig;
  finalQTable: QTable;
  episodeRewards: number[];
  episodeSteps: number[];
  interventionHistory: InterventionRecord[];
  trainingTime: number;
  successCount: number;
}

// ==================== Data Storage Types ====================
export interface StoredData {
  experiments: ExperimentResults[];
  qTables: Record<string, QTable>; // rule -> QTable
  statistics: {
    totalInterventions: number;
    totalTrainingTime: number;
    averageSuccessRate: number;
  };
}

// ==================== Component Props Types ====================
export interface FrozenLakeBoardProps {
  mapDesc: MapDesc;
  agentState: number;
  onCellClick?: (state: number, position: Position) => void;
  onAgentDrop?: (fromState: number, toState: number) => void;
  isIntervening?: boolean;
  qtable?: QTable; // For Q-value visualization
  onDragStart?: () => void;
  onDragEnd?: () => void;
  predictedAction?: {
    action: Action;
    type: 'exploration' | 'exploitation' | 'none';
    probability: number;
  } | null;
}

export interface GameControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  interventionRule: InterventionRule;
  onRuleChange: (rule: InterventionRule) => void;
  episode: number;
  agentStepDelay: number; 
  onStepDelayChange: (delay: number) => void; 
}

export interface StatusPanelProps {
  stats: GameStats;
  status: GameStatus;
  learningParams: LearningParams;
}

export interface QTableVisualizerProps {
  qtable: QTable;
  mapDesc: MapDesc;
  currentState?: number;
}

// ==================== Hook Parameter Types ====================
export interface UseGameEngineProps {
  config: GameConfig;
  chooseAction?: (state: number) => Action;
  updateQValue?: (state: number, action: Action, reward: number, newState: number) => void;
  applyIntervention?: (fromState: number, toState: number, reward: number) => void; 
  onStep?: (state: number, action: number, reward: number, newState: number) => void;
  onEpisodeEnd?: (stats: GameStats) => void;
  onIntervention?: (fromState: number, toState: number) => void;
}

export interface UseQLearningProps {
  initialState?: QTable;
  initialParams?: Partial<LearningParams>;
  mapDesc?: string[]; 
  onQTableUpdate?: (qtable: QTable) => void;
}

export interface UseInterventionProps {
  qtable: QTable;
  updateQTable: (newQTable: QTable) => void;
  chooseAction: (state: number) => Action;
  learningRate: number;
  gamma: number;
  onInterventionApplied?: (record: InterventionRecord) => void;
}

// ==================== Hook Return Types ====================
export interface UseGameEngineReturn {
  // State
  agentState: AgentState;
  gameStatus: GameStatus;
  gameStats: GameStats;
  isDragging: boolean;
  
  // Utility functions
  getAgentPosition: (state: number) => Position;
  positionToState: (position: Position) => number;
  isTerminalState: (state: number) => boolean;
  calculateReward: (state: number) => number;
  
  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;
  stepGame: () => void;
  setAgentState: (newState: number) => void;
  applyIntervention: (fromState: number, toState: number) => void;
  startDrag: () => void;
  endDrag: () => void;
}

export interface UseQLearningReturn {
  // State
  qtable: QTable;
  learningParams: LearningParams;
  
  // Actions
  chooseAction: (state: number) => Action;
  updateQValue: (state: number, action: Action, reward: number, newState: number) => void;
  updateQTable: (newQTable: QTable) => void;
  resetQTable: () => void;
  setLearningParams: (params: Partial<LearningParams>) => void;
  
  // Analysis tools
  getBestActionForState: (state: number) => { action: Action; qValue: number };
  getPolicy: () => Action[];
  getQTableStats: () => { min: number; max: number; average: number; std: number };
  getQTableDirections: (mapDesc: string[]) => string[][];
  getActionDirection: (action: Action) => string;
  getAvailableActions: (state: number) => Action[]; 
}

export interface UseInterventionReturn {
  // State
  interventionRule: InterventionRule;
  interventionHistory: InterventionRecord[];
  isIntervening: boolean;
  
  // Actions
  setInterventionRule: (rule: InterventionRule) => void;
  applyIntervention: (fromState: number, toState: number) => void;
  getInterventionStats: () => {
    total: number;
    byRule: Record<InterventionRule, number>;
    lastIntervention?: InterventionRecord;
  };
}

// ==================== Utility Types ====================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ==================== Constant Types ====================
export const INTERVENTION_RULES: InterventionRule[] = [
  'suggestion',
  'reset', 
  'interrupt',
  'impede'
];

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mapDesc: ['SFFF', 'FHFH', 'FFFG'],
  rewardSchedule: [-10, 10, 0], // Hole, Goal, Frozen
  isSlippery: false,
  agentStepDelay: 500
};

export interface UseGameEngineProps {
  config: GameConfig;
  chooseAction?: (state: number) => Action; // Using Action type
  updateQValue?: (state: number, action: Action, reward: number, newState: number) => void; // Using Action type
  onStep?: (state: number, action: number, reward: number, newState: number) => void;
  onEpisodeEnd?: (stats: GameStats) => void;
  onIntervention?: (fromState: number, toState: number) => void;
}

// ==================== Data Export Types ====================
export interface ExperimentExportData {
  // Metadata
  metadata: {
    exportVersion: string;
    exportTimestamp: number;
    platform: 'react-web';
  };
  
  // Experiment configuration
  experimentConfig: ExperimentConfig;
  
  // Game configuration
  gameConfig: GameConfig;
  
  // Learning parameters
  learningParams: LearningParams;
  
  // Training results
  results: {
    finalQTable: QTable;
    trainingStats: GameStats;  // Final statistics
    episodeRewards: number[];  // Episode reward history
    episodeSteps: number[];    // Episode step history
    successCount: number;
    trainingTime: number;
  };
  
  // Intervention summary (optimized data volume)
  interventionSummary: {
    totalCount: number;
    byRule: Record<InterventionRule, number>;
    averageReward: number;
    // Simplified intervention history (removed bulky qtable data)
    recentInterventions: Array<{
      timestamp: number;
      fromState: number;
      toState: number;
      rule: InterventionRule;
      reward: number;
    }>;
  };
  
  // Performance metrics
  performanceMetrics: {
    averageStepsPerEpisode: number;
    averageRewardPerEpisode: number;
    interventionFrequency: number; // Intervention frequency
    learningProgress: number[];    // Learning progress (e.g., average reward per 10 episodes)
  };
}