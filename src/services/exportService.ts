// src/services/exportService.ts
import { 
  ExperimentExportData, 
  GameStats, 
  LearningParams, 
  GameConfig, 
  InterventionRecord,
  InterventionRule,
  EpisodeData,
  RoundQTable,
  RoundConfig,
  RoundSummary
} from '../types';

// Count interventions by rule
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

// Count interventions by round
const calculateInterventionsByRound = (
  interventionHistory: InterventionRecord[]
): Record<number, number> => {
  const byRound: Record<number, number> = {};
  
  interventionHistory.forEach(record => {
    const round = record.round || 1;
    byRound[round] = (byRound[round] || 0) + 1;
  });
  
  return byRound;
};

// Calculate average reward from interventions
const calculateAverageInterventionReward = (
  interventionHistory: InterventionRecord[]
): number => {
  if (interventionHistory.length === 0) return 0;
  
  const totalReward = interventionHistory.reduce((sum, record) => sum + record.reward, 0);
  return totalReward / interventionHistory.length;
};

// Calculate performance metrics
const calculatePerformanceMetrics = (
  episodeData: EpisodeData[],
  interventionHistory: InterventionRecord[]
) => {
  const totalEpisodes = episodeData.length;
  const totalSteps = episodeData.reduce((sum, episode) => sum + episode.steps, 0);
  const totalReward = episodeData.reduce((sum, episode) => sum + episode.reward, 0);
  
  return {
    averageStepsPerEpisode: totalEpisodes > 0 ? totalSteps / totalEpisodes : 0,
    averageRewardPerEpisode: totalEpisodes > 0 ? totalReward / totalEpisodes : 0,
    interventionFrequency: totalSteps > 0 ? interventionHistory.length / totalSteps : 0,
    learningProgress: calculateLearningProgress(episodeData)
  };
};

// Calculate learning progress over episodes
const calculateLearningProgress = (episodeData: EpisodeData[]): number[] => {
  const progress: number[] = [];
  const windowSize = 10;
  
  for (let i = 0; i < episodeData.length; i += windowSize) {
    const windowRewards = episodeData.slice(i, i + windowSize).map(e => e.reward);
    const average = windowRewards.length > 0 
      ? windowRewards.reduce((sum, reward) => sum + reward, 0) / windowRewards.length
      : 0;
    progress.push(average);
  }
  
  return progress;
};

// Calculate statistics for each round
const calculateRoundStatistics = (episodeData: EpisodeData[]): RoundSummary => {
  const roundStats: RoundSummary = {};
  
  episodeData.forEach(episode => {
    const round = episode.round;
    if (!roundStats[round]) {
      roundStats[round] = {
        episodes: 0,
        totalReward: 0,
        totalSteps: 0,
        averageReward: 0,
        averageSteps: 0
      };
    }
    
    roundStats[round].episodes++;
    roundStats[round].totalReward += episode.reward;
    roundStats[round].totalSteps += episode.steps;
  });
  
  // Calculate average values
  Object.keys(roundStats).forEach(round => {
    const roundNum = parseInt(round);
    if (roundStats[roundNum].episodes > 0) {
      roundStats[roundNum].averageReward = roundStats[roundNum].totalReward / roundStats[roundNum].episodes;
      roundStats[roundNum].averageSteps = roundStats[roundNum].totalSteps / roundStats[roundNum].episodes;
    }
  });
  
  return roundStats;
};

// Main export function
export const exportExperimentData = (
  roundQTables: RoundQTable[],
  trainingStats: GameStats,
  episodeData: EpisodeData[],
  interventionHistory: InterventionRecord[],
  learningParams: LearningParams,
  gameConfig: GameConfig,
  interventionRule: InterventionRule,
  trainingTime: number,
  roundConfig: RoundConfig,
  surveyResponses?: any[]
): ExperimentExportData => {
  // Process intervention history
  const fullInterventions = interventionHistory.map(record => ({
    timestamp: record.timestamp,
    fromState: record.fromState,
    toState: record.toState,
    rule: record.rule,
    reward: record.reward,
    round: record.round || 1,
    episode: record.episode || 1
  }));

  // Extract episode rewards and steps
  const episodeRewards = episodeData.map(e => e.reward);
  const episodeSteps = episodeData.map(e => e.steps);

  const userId = sessionStorage.getItem('user_id');
  if (!userId) {
    console.error('No user ID found in sessionStorage!');
  }

  const roundStats = calculateRoundStatistics(episodeData);
  const interventionsByRound = calculateInterventionsByRound(interventionHistory);

  return {
    metadata: {
      exportVersion: '1.1.0',
      exportTimestamp: Date.now(),
      platform: 'react-web'
    },
    experimentConfig: {
      id: userId!,
      interventionRule: interventionRule,
      totalEpisodes: trainingStats.episode,
      createdAt: Date.now() - trainingTime * 1000,
      completedAt: Date.now(),
      totalRounds: roundConfig.totalRounds,
      episodesPerRound: roundConfig.episodesPerRound
    },
    gameConfig,
    learningParams,
    results: {
      roundQTables,
      trainingStats,
      episodeData,
      roundStats,
      successCount: Math.floor(trainingStats.successRate * trainingStats.episode),
      trainingTime
    },
    interventionSummary: {
      totalCount: interventionHistory.length,
      byRule: calculateInterventionsByRule(interventionHistory),
      byRound: interventionsByRound,
      averageReward: calculateAverageInterventionReward(interventionHistory),
      recentInterventions: fullInterventions
    },
    performanceMetrics: calculatePerformanceMetrics(episodeData, interventionHistory),
    surveyData: surveyResponses || []
  };
};

// Download experiment data as JSON file
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

// Generate readable report text
export const generateReadableReport = (exportData: ExperimentExportData): string => {
  const { experimentConfig, results, interventionSummary, performanceMetrics, surveyData } = exportData;
  
  const roundInfo = experimentConfig.totalRounds ? 
    `\nRound Configuration: ${experimentConfig.totalRounds} rounds × ${experimentConfig.episodesPerRound} episodes/round` : '';
  
  const roundStatsInfo = results.roundStats ? 
    `\nRound Statistics:\n${Object.entries(results.roundStats).map(([round, stats]) => 
      `  Round ${round}: ${stats.episodes} episodes, Avg Reward: ${stats.averageReward.toFixed(2)}, Avg Steps: ${stats.averageSteps.toFixed(1)}`
    ).join('\n')}` : '';

  const roundInterventions = interventionSummary.byRound ? 
    `\nInterventions by Round:\n${Object.entries(interventionSummary.byRound).map(([round, count]) => 
      `  Round ${round}: ${count} interventions`
    ).join('\n')}` : '';

  const qtableInfo = results.roundQTables ? 
    `\nQ-tables Saved: ${results.roundQTables.length} rounds` : '';

  const surveyInfo = surveyData && surveyData.length > 0 ? 
    `\nSurvey Responses: ${surveyData.length} rounds collected` : '\nSurvey Responses: None';

  return `
Experiment Report
=================

Experiment Information
----------------------
- Experiment ID: ${experimentConfig.id}
- Intervention Rule: ${experimentConfig.interventionRule}
- Total Episodes: ${experimentConfig.totalEpisodes}
- Training Duration: ${results.trainingTime.toFixed(1)} seconds${roundInfo}

Training Results
----------------
- Success Rate: ${(results.trainingStats.successRate * 100).toFixed(1)}%
- Total Reward: ${results.trainingStats.totalReward.toFixed(1)}
- Total Steps: ${results.trainingStats.steps}
- Success Count: ${results.successCount}${roundStatsInfo}${qtableInfo}

Intervention Statistics
-----------------------
- Total Interventions: ${interventionSummary.totalCount}
- Average Intervention Reward: ${interventionSummary.averageReward.toFixed(2)}
- Rule Usage Distribution:
  ${Object.entries(interventionSummary.byRule)
    .map(([rule, count]) => `  - ${rule}: ${count} times`)
    .join('\n')}${roundInterventions}

Performance Metrics
-------------------
- Average Steps per Episode: ${performanceMetrics.averageStepsPerEpisode.toFixed(1)}
- Average Reward per Episode: ${performanceMetrics.averageRewardPerEpisode.toFixed(2)}
- Intervention Frequency: ${(performanceMetrics.interventionFrequency * 100).toFixed(1)}%

Survey Data
-----------
${surveyInfo}
  `;
};