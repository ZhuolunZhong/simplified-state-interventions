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

export interface EpisodeData {
  round: number;
  episodeInRound: number;
  reward: number;
  steps: number;
}

export interface RoundQTable {
  round: number;
  qtable: QTable;
}

export interface RoundConfig {
  totalRounds: number;
  episodesPerRound: number;
}

export interface AgentState {
  currentState: number;
  totalReward: number;
  steps: number;
  lastReward: number;
  isDone: boolean;
  nextAction: Action | null;
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
  action: Action;
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
  action?: Action; 
  actionType?: 'exploration' | 'exploitation';
  round?: number;
  episode?: number;
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
  currentRound: number;           
}

export interface GameStatus {
  isRunning: boolean;
  isPaused: boolean;
  isIntervening: boolean;
  isTraining: boolean;
}

// ==================== Experiment System Types ====================
export type ExperimentPhase = 
  | 'consent'
  | 'introduction' 
  | 'training' 
  | 'results';

export interface ExperimentConfig {
  id: string;
  interventionRule: InterventionRule;
  totalEpisodes: number;
  createdAt: number;
  completedAt?: number;
  totalRounds?: number;       
  episodesPerRound?: number;
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

export interface DeterministicActionInfo {
  action: Action;
  type: 'exploration' | 'exploitation';
  randomValue: number;
  state: number;
  timestamp: number;
  valid: boolean;
}

// ==================== Component Props Types ====================
export interface FrozenLakeBoardProps {
  mapDesc: MapDesc;
  agentState: number;
  onCellClick?: (state: number, position: Position) => void;
  onAgentDrop?: (fromState: number, toState: number) => void;
  isIntervening?: boolean;
  qtable?: QTable; 
  onDragStart?: () => void;
  onDragEnd?: () => void;
  announcedAction?: {
    action: Action;
    type: 'exploration' | 'exploitation';
  } | null;
  isGameRunning?: boolean;  
  isGamePaused?: boolean;  
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
  onStep?: (state: number, action: Action, reward: number, newState: number) => void;
  onEpisodeEnd?: (stats: GameStats) => void;
  onIntervention?: (fromState: number, toState: number) => void;
  resetQTable?: () => void;
  markActionAsExecuted?: (state: number) => void;
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
  getAnnouncedAction: (state: number) => DeterministicActionInfo | null; 
  learningRate: number;
  gamma: number;
  onInterventionApplied?: (record: InterventionRecord) => void;
  currentRound?: number;           
  currentEpisode?: number;      
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

// ==================== Round Statistics Types ====================
export interface RoundStats {
  episodes: number;
  totalReward: number;
  totalSteps: number;
  averageReward: number;
  averageSteps: number;
}

export interface RoundSummary {
  [round: number]: RoundStats;
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
    roundQTables: RoundQTable[];           // Q-tables for each round
    trainingStats: GameStats;              // Final statistics
    episodeData: EpisodeData[];            // Complete episode data with round info
    roundStats: RoundSummary;              // Statistics per round
    successCount: number;
    trainingTime: number;
  };
  
  // Intervention summary
  interventionSummary: {
    totalCount: number;
    byRule: Record<InterventionRule, number>;
    byRound: Record<number, number>;
    averageReward: number;
    recentInterventions: Array<{
      timestamp: number;
      fromState: number;
      toState: number;
      rule: InterventionRule;
      reward: number;
      round?: number;
    }>;
  };
  
  // Performance metrics
  performanceMetrics: {
    averageStepsPerEpisode: number;
    averageRewardPerEpisode: number;
    interventionFrequency: number;         // Intervention frequency
    learningProgress: number[];            // Learning progress
  };
  
  // Survey data (new field)
  surveyData: SurveyResponseData[];
}

// ==================== Survey System Types ====================
export interface SurveyResponse {
  round: number;                    // Round number
  q1_naturality?: number;          // 1-5 rating
  q2_learning_effect?: number;     // 1-5 rating  
  q3_enjoyment?: number;           // 1-5 rating
  q4_teaching_strategy?: string;   // Text response
  q5_comments?: string;           // Text response
  timestamp?: number;              // Response time
  skipped?: boolean;              // Whether survey was skipped
}

export interface SurveyResponseData extends SurveyResponse {
  experiment_id?: string;          // Optional experiment ID
  user_id?: string;               // Optional user ID
}