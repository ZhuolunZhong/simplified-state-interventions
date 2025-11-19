// src/services/exportService.ts
import { 
  ExperimentExportData, 
  GameStats, 
  LearningParams, 
  GameConfig, 
  InterventionRecord,
  InterventionRule 
} from '../types';

// Generate experiment ID
const generateExperimentId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `exp_${timestamp}_${random}`;
};

// Calculate interventions by rule
const calculateInterventionsByRule = (
  interventionHistory: InterventionRecord[]
): Record<InterventionRule, number> => {
  const byRule: Record<InterventionRule, number> = {
    suggestion: 0,
    reset: 0,
    interrupt: 0,
    impede: 0
  };
  
  interventionHistory.forEach(record => {
    byRule[record.rule]++;
  });
  
  return byRule;
};

// Calculate average intervention reward
const calculateAverageInterventionReward = (
  interventionHistory: InterventionRecord[]
): number => {
  if (interventionHistory.length === 0) return 0;
  
  const totalReward = interventionHistory.reduce((sum, record) => sum + record.reward, 0);
  return totalReward / interventionHistory.length;
};

// Calculate performance metrics
const calculatePerformanceMetrics = (
  episodeRewards: number[],
  episodeSteps: number[],
  interventionHistory: InterventionRecord[]
) => {
  const totalEpisodes = episodeRewards.length;
  const totalSteps = episodeSteps.reduce((sum, steps) => sum + steps, 0);
  const totalReward = episodeRewards.reduce((sum, reward) => sum + reward, 0);
  
  return {
    averageStepsPerEpisode: totalEpisodes > 0 ? totalSteps / totalEpisodes : 0,
    averageRewardPerEpisode: totalEpisodes > 0 ? totalReward / totalEpisodes : 0,
    interventionFrequency: totalSteps > 0 ? interventionHistory.length / totalSteps : 0,
    learningProgress: calculateLearningProgress(episodeRewards)
  };
};

// Calculate learning progress
const calculateLearningProgress = (episodeRewards: number[]): number[] => {
  const progress: number[] = [];
  const windowSize = 10;
  
  for (let i = 0; i < episodeRewards.length; i += windowSize) {
    const windowRewards = episodeRewards.slice(i, i + windowSize);
    const average = windowRewards.length > 0 
      ? windowRewards.reduce((sum, reward) => sum + reward, 0) / windowRewards.length
      : 0;
    progress.push(average);
  }
  
  return progress;
};

// Main export function
export const exportExperimentData = (
  finalQTable: number[][],
  trainingStats: GameStats,
  episodeRewards: number[],
  episodeSteps: number[],
  interventionHistory: InterventionRecord[],
  learningParams: LearningParams,
  gameConfig: GameConfig,
  interventionRule: InterventionRule,
  trainingTime: number
): ExperimentExportData => {
  // Process intervention history, optimize data size (keep only recent 50 records)
  const fullInterventions = interventionHistory.map(record => ({
    timestamp: record.timestamp,
    fromState: record.fromState,
    toState: record.toState,
    rule: record.rule,
    reward: record.reward
  }));

  return {
    metadata: {
      exportVersion: '1.0.0',
      exportTimestamp: Date.now(),
      platform: 'react-web'
    },
    experimentConfig: {
      id: generateExperimentId(),
      interventionRule: interventionRule,
      totalEpisodes: trainingStats.episode,
      createdAt: Date.now() - trainingTime * 1000,
      completedAt: Date.now()
    },
    gameConfig,
    learningParams,
    results: {
      finalQTable,
      trainingStats,
      episodeRewards,
      episodeSteps,
      successCount: Math.floor(trainingStats.successRate * trainingStats.episode),
      trainingTime
    },
    interventionSummary: {
      totalCount: interventionHistory.length,
      byRule: calculateInterventionsByRule(interventionHistory),
      averageReward: calculateAverageInterventionReward(interventionHistory),
      recentInterventions: fullInterventions
    },
    performanceMetrics: calculatePerformanceMetrics(episodeRewards, episodeSteps, interventionHistory)
  };
};

// Export as JSON file download
export const downloadExperimentData = (exportData: ExperimentExportData, filename?: string) => {
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `experiment_${exportData.experimentConfig.id}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate human-readable report
export const generateReadableReport = (exportData: ExperimentExportData): string => {
  const { experimentConfig, results, interventionSummary, performanceMetrics } = exportData;
  
  return `
Experiment Report
=================

Experiment Information
----------------------
- Experiment ID: ${experimentConfig.id}
- Intervention Rule: ${experimentConfig.interventionRule}
- Total Episodes: ${experimentConfig.totalEpisodes}
- Training Duration: ${results.trainingTime.toFixed(1)} seconds

Training Results
----------------
- Success Rate: ${(results.trainingStats.successRate * 100).toFixed(1)}%
- Total Reward: ${results.trainingStats.totalReward.toFixed(1)}
- Total Steps: ${results.trainingStats.steps}
- Success Count: ${results.successCount}

Intervention Statistics
-----------------------
- Total Interventions: ${interventionSummary.totalCount}
- Average Intervention Reward: ${interventionSummary.averageReward.toFixed(2)}
- Rule Usage Distribution:
  ${Object.entries(interventionSummary.byRule)
    .map(([rule, count]) => `  - ${rule}: ${count} times`)
    .join('\n')}

Performance Metrics
-------------------
- Average Steps per Episode: ${performanceMetrics.averageStepsPerEpisode.toFixed(1)}
- Average Reward per Episode: ${performanceMetrics.averageRewardPerEpisode.toFixed(2)}
- Intervention Frequency: ${(performanceMetrics.interventionFrequency * 100).toFixed(1)}%
  `;
};