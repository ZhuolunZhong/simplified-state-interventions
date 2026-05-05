// src/pages/TrainingPage.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { FrozenLakeBoard } from '../components/FrozenLakeBoard';
import { GameControls } from '../components/GameControls';
import { StatusPanel } from '../components/StatusPanel';
import { QTableVisualizer } from '../components/QTableVisualizer';
import RoundSurveyDialog from '../components/RoundSurveyDialog';
import RoundFailureDialog from '../components/RoundFailureDialog';
import { useGameEngine } from '../hooks/useGameEngine';
import { useQLearning } from '../hooks/useQLearning';
import { useIntervention } from '../hooks/useIntervention';
import { DEFAULT_GAME_CONFIG, MAP_CONFIGS } from '../services/gameConfig';
import { exportExperimentData } from '../services/exportService';
import { ApiService } from '../services/apiService';
import { 
  InterventionRecord, 
  ExperimentPhase, 
  Action, 
  InterventionRule,
  EpisodeData,
  RoundQTable,
  RoundConfig,
  AgentState,
  GameStats
} from '../types';
import './TrainingPage.css';

interface TrainingPageProps {
  onPhaseChange: (phase: ExperimentPhase, data?: any) => void;
}

const INTERVENTION_RULES: InterventionRule[] = ['suggestion', 'reset', 'interrupt', 'impede'];

// Get intervention rule from user ID
const getRuleFromUserId = (userId: string): InterventionRule => {
  const userIdNum = parseInt(userId);
  const ruleIndex = (userIdNum - 1) % 4;
  return INTERVENTION_RULES[ruleIndex];
};

// Get description for intervention rule
const getRuleDescription = (rule: InterventionRule): string => {
  switch (rule) {
    case 'suggestion': return 'Update Q-value based on movement direction';
    case 'reset': return 'Update Q-value using target state reward';
    case 'interrupt': return 'Ignore current timestep';
    case 'impede': return 'Apply negative reward to original action';
    default: return '';
  }
};

export const TrainingPage: React.FC<TrainingPageProps> = ({ onPhaseChange }) => {
  // Game configuration state
  const [gameConfig, setGameConfig] = useState(() => ({
    ...DEFAULT_GAME_CONFIG,
    mapDesc: MAP_CONFIGS.LINEAR_1x16,
    rewardSchedule: [ 5, 10, 0 ] as [number, number, number],
    agentStepDelay: 1000
  }));

  // UI state
  const [activeInfoTab, setActiveInfoTab] = useState<'status' | 'qtable'>('status');
  const [trainingStartTime, setTrainingStartTime] = useState<number>(0);
  const [trainingTime, setTrainingTime] = useState<number>(0);
  const [showSurveyDialog, setShowSurveyDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [completedRoundNumber, setCompletedRoundNumber] = useState(0);
  const [isFinalRoundCompleted, setIsFinalRoundCompleted] = useState(false);

  // Data collection state
  const [episodeData, setEpisodeData] = useState<EpisodeData[]>([]);
  const [roundEpisodeData, setRoundEpisodeData] = useState<EpisodeData[]>([]);
  const [roundQTables, setRoundQTables] = useState<RoundQTable[]>([]);
  const [roundInterventions, setRoundInterventions] = useState<InterventionRecord[]>([]);
  const [allInterventions, setAllInterventions] = useState<InterventionRecord[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [announcedAction, setAnnouncedAction] = useState<{
    action: Action;
    type: 'exploration' | 'exploitation';
  } | null>(null);

  // Backend connection state
  const [backendStatus, setBackendStatus] = useState<{
    connected: boolean;
    database: string;
    loading: boolean;
  }>({
    connected: false,
    database: 'unknown',
    loading: true
  });

  // User information
  const userId = sessionStorage.getItem('user_id');
  const assignedRule = userId ? getRuleFromUserId(userId) : 'suggestion';

  // Round configuration
  const stateSize = gameConfig.mapDesc.length * gameConfig.mapDesc[0].length;
  const roundConfig: RoundConfig = {
    totalRounds: 3,
    episodesPerRound: 15
  };

  // Initialize Q-learning
  const { 
    qtable, 
    learningParams,
    chooseAction, 
    updateQValue,  
    updateQTable,
    resetQTable,
    getAnnouncedAction,
    clearActionHistory,
    markActionAsExecuted
  } = useQLearning({
    initialParams: {
      stateSize: stateSize,
      actionSize: 4
    },
    mapDesc: gameConfig.mapDesc
  });

  // Reference objects for state
  const gameStatsRef = useRef<GameStats | null>(null);
  const roundEpisodeDataRef = useRef<EpisodeData[]>([]);
  const roundInterventionsRef = useRef<InterventionRecord[]>([]);
  const surveyResponsesRef = useRef<any[]>([]);
  const currentRoundRef = useRef(1);
  const agentStateRef = useRef<AgentState | null>(null);
  const isProcessingEpisodeRef = useRef(false);

  // Handle experiment end
  const handleExperimentEnd = useCallback(async (totalEpisodes: number) => {
    if (!gameStatsRef.current) {
      return;
    }

    const finalRoundEpisodes = [...roundEpisodeDataRef.current];
    const finalRoundInterventions = [...roundInterventionsRef.current];
    
    if (finalRoundEpisodes.length < roundConfig.episodesPerRound) {
      const recordedEpisodes = finalRoundEpisodes.map(ep => ep.episodeInRound);
      for (let i = 1; i <= roundConfig.episodesPerRound; i++) {
        if (!recordedEpisodes.includes(i)) {
          finalRoundEpisodes.push({
            round: currentRoundRef.current,
            episodeInRound: i,
            reward: 0,
            steps: 0
          });
        }
      }
      finalRoundEpisodes.sort((a, b) => a.episodeInRound - b.episodeInRound);
    }
    
    if (finalRoundEpisodes.length > 0) {
      setEpisodeData(prev => [...prev, ...finalRoundEpisodes]);
    }
    
    if (finalRoundInterventions.length > 0) {
      setAllInterventions(prev => [...prev, ...finalRoundInterventions]);
    }
    
    const finalRoundQTable: RoundQTable = {
      round: currentRoundRef.current,
      qtable: qtable.map(row => [...row])
    };
    
    const finalRoundSaved = roundQTables.some(rq => rq.round === currentRoundRef.current);
    if (!finalRoundSaved) {
      setRoundQTables(prev => [...prev, finalRoundQTable]);
    }
    
    const finalTrainingTime = trainingStartTime ? 
      Math.floor((Date.now() - trainingStartTime) / 1000) : trainingTime;

    const exportData = exportExperimentData(
      roundQTables,
      gameStatsRef.current,
      episodeData,
      allInterventions,
      learningParams,
      gameConfig,
      assignedRule,
      finalTrainingTime,
      roundConfig,
      surveyResponsesRef.current
    );

    try {
      let saveResult = null;
      
      if (backendStatus.connected) {
        try {
          saveResult = await ApiService.saveExperiment(exportData);
        } catch (saveError) {
          console.warn('Database save failed:', saveError);
        }
      }

      const enhancedData = {
        ...exportData,
        backendInfo: {
          savedToDatabase: saveResult?.success || false,
          experimentId: saveResult?.experimentId || null,
          backendConnected: backendStatus.connected
        }
      };

      onPhaseChange('results', enhancedData);

    } catch (error) {
      console.error('Error processing experiment data:', error);
      onPhaseChange('results', exportData);
    }
  }, [
    qtable,
    roundQTables,
    episodeData,
    allInterventions,
    learningParams,
    gameConfig,
    assignedRule,
    trainingStartTime,
    trainingTime,
    roundConfig,
    backendStatus.connected,
    onPhaseChange
  ]);

  // Handle Q-learning step
  const handleStep = useCallback((state: number, action: Action, reward: number, newState: number) => {
    updateQValue(state, action, reward, newState);
  }, [updateQValue]);

  // Record intervention application
  const handleInterventionApplied = useCallback((record: InterventionRecord) => {
    const currentEpisode = gameStatsRef.current?.episode || 1;
    const roundRecord = {
      ...record,
      round: currentRoundRef.current,
      episode: currentEpisode
    };
    
    setRoundInterventions(prev => {
      const newData = [...prev, roundRecord];
      roundInterventionsRef.current = newData;
      return newData;
    });
  }, []);

  // Handle episode completion
  const handleEpisodeEnd = useCallback((stats: GameStats) => {
    if (isProcessingEpisodeRef.current) {
      return;
    }
    
    isProcessingEpisodeRef.current = true;
    
    const currentRound = stats.currentRound;
    const episodeNumber = stats.episode;
    
    const existingEpisode = roundEpisodeDataRef.current.find(
      ep => ep.round === currentRound && ep.episodeInRound === episodeNumber
    );

    if (existingEpisode) {
      isProcessingEpisodeRef.current = false;
      return;
    }

    const newEpisode: EpisodeData = {
      round: currentRound,
      episodeInRound: episodeNumber,
      reward: stats.lastReward,
      steps: stats.steps
    };
    
    setRoundEpisodeData(prev => {
      const newData = [...prev, newEpisode];
      roundEpisodeDataRef.current = newData;
      
      setTimeout(() => {
        isProcessingEpisodeRef.current = false;
      }, 0);
      
      return newData;
    });
    
    clearActionHistory();
    setAnnouncedAction(null);
  }, [clearActionHistory]);

  // Handle round completion
  const handleRoundEnd = useCallback((roundNumber: number) => {
    const currentRoundEpisodes = [...roundEpisodeDataRef.current];
    const currentRoundInterventions = [...roundInterventionsRef.current];

    // Check success rate from current stats
    const currentSuccessRate = gameStatsRef.current?.successRate || 0;
    
    // If success rate < , show failure dialog
    if (currentSuccessRate < 0.5) {
      setShowFailureDialog(true);
      return;
    }

    const roundQTable: RoundQTable = {
      round: roundNumber,
      qtable: qtable.map(row => [...row])
    };
    
    setRoundQTables(prev => [...prev, roundQTable]);
    setEpisodeData(prev => [...prev, ...currentRoundEpisodes]);
    setAllInterventions(prev => [...prev, ...currentRoundInterventions]);

    setRoundEpisodeData([]);
    roundEpisodeDataRef.current = [];
    setRoundInterventions([]);
    roundInterventionsRef.current = [];
    
    currentRoundRef.current = roundNumber + 1;
    
    const isFinalRound = roundNumber >= roundConfig.totalRounds;
    setIsFinalRoundCompleted(isFinalRound);
    
    setCompletedRoundNumber(roundNumber);
    setShowSurveyDialog(true);
  }, [qtable, roundConfig.totalRounds]);

  // Handle intervention event
  const handleIntervention = useCallback((fromState: number, toState: number) => {
    console.log(`Intervention: ${fromState} -> ${toState}`);
  }, []);

  // Initialize game engine
  const {
    agentState,
    gameStatus,
    gameStats,
    startGame,
    pauseGame,
    resetGame,
    stepGame,
    setAgentState,
    isDragging,
    startDrag,
    endDrag,
    calculateReward,
    getAgentPosition, 
    prepareNewRound,
    setRoundConfig
  } = useGameEngine({
    config: gameConfig,
    chooseAction,        
    updateQValue,        
    onStep: handleStep,
    onEpisodeEnd: handleEpisodeEnd,
    onIntervention: handleIntervention,
    onRoundEnd: handleRoundEnd,
    onExperimentEnd: handleExperimentEnd,
    resetQTable: resetQTable,
    markActionAsExecuted: markActionAsExecuted,
  });

  // Handle survey completion
  const handleSurveyComplete = useCallback((responses: any) => {
    const responseWithRound = {
      ...responses,
      round: completedRoundNumber,
      timestamp: Date.now()
    };
    
    const newSurveyResponses = [...surveyResponsesRef.current, responseWithRound];
    surveyResponsesRef.current = newSurveyResponses;
    setSurveyResponses(newSurveyResponses);
    setShowSurveyDialog(false);
    
    if (isFinalRoundCompleted) {
      handleExperimentEnd(gameStats.episode);
    } else {
      resetQTable();
      const nextRound = completedRoundNumber + 1;
      currentRoundRef.current = nextRound;
      prepareNewRound();
    }
  }, [completedRoundNumber, isFinalRoundCompleted, resetQTable, prepareNewRound, handleExperimentEnd, gameStats.episode]);

  // Handle survey skip
  const handleSurveySkip = useCallback(() => {
    const skipRecord = {
      round: completedRoundNumber,
      skipped: true,
      timestamp: Date.now()
    };
    
    const newSurveyResponses = [...surveyResponsesRef.current, skipRecord];
    surveyResponsesRef.current = newSurveyResponses;
    setSurveyResponses(newSurveyResponses);
    setShowSurveyDialog(false);
    
    if (isFinalRoundCompleted) {
      handleExperimentEnd(gameStats.episode);
    } else {
      resetQTable();
      const nextRound = completedRoundNumber + 1;
      currentRoundRef.current = nextRound;
      prepareNewRound();
    }
  }, [completedRoundNumber, isFinalRoundCompleted, resetQTable, prepareNewRound, handleExperimentEnd, gameStats.episode]);

  // Initialize intervention system
  const {
    isIntervening,
    applyIntervention,
    interventionRule,
    setInterventionRule
  } = useIntervention({
    qtable,
    updateQTable,
    getAnnouncedAction,
    learningRate: learningParams.learningRate,
    gamma: learningParams.gamma,
    learningParams: learningParams,
    onInterventionApplied: handleInterventionApplied,
    currentRound: gameStats.currentRound,      
    currentEpisode: gameStats.episode  
  });

  // Sync intervention rule with user assignment
  useEffect(() => {
    if (setInterventionRule && assignedRule && assignedRule !== interventionRule) {
      setInterventionRule(assignedRule);
    }
  }, [assignedRule, setInterventionRule, interventionRule]);

  // Update refs with current state
  useEffect(() => {
    gameStatsRef.current = gameStats;
    currentRoundRef.current = gameStats.currentRound;
  }, [gameStats]);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    roundEpisodeDataRef.current = roundEpisodeData;
  }, [roundEpisodeData]);

  useEffect(() => {
    roundInterventionsRef.current = roundInterventions;
  }, [roundInterventions]);

  useEffect(() => {
    surveyResponsesRef.current = surveyResponses;
  }, [surveyResponses]);

  // Set round configuration
  useEffect(() => {
    setRoundConfig(roundConfig);
  }, [setRoundConfig]);

  // Track training time
  useEffect(() => {
    if (trainingStartTime && gameStatus.isRunning) {
      const interval = setInterval(() => {
        setTrainingTime(Math.floor((Date.now() - trainingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [trainingStartTime, gameStatus.isRunning]);

  // Update announced action display
  useEffect(() => {
    if (!agentState.isDone && gameStatus.isRunning && !gameStatus.isPaused) {
      const actionInfo = getAnnouncedAction(agentState.currentState);
      if (actionInfo) {
        setAnnouncedAction({
          action: actionInfo.action,
          type: actionInfo.type
        });
      }
    } else {
      setAnnouncedAction(null);
    }
  }, [
    agentState.currentState, 
    agentState.isDone, 
    gameStatus.isRunning, 
    gameStatus.isPaused, 
    getAnnouncedAction
  ]);

  // Check backend connection
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        setBackendStatus(prev => ({ ...prev, loading: true }));
        const status = await ApiService.testConnection();
        
        setBackendStatus({
          connected: status.status === 'connected',
          database: status.database || 'unknown',
          loading: false
        });
      } catch (error) {
        setBackendStatus({
          connected: false,
          database: 'unknown',
          loading: false
        });
      }
    };
    
    checkBackendConnection();
  }, []);

  // Handle step delay change
  const handleStepDelayChange = useCallback((newDelay: number) => {
    setGameConfig(prev => ({
      ...prev,
      agentStepDelay: newDelay
    }));
  }, []);

  // Start game
  const handleStartGame = useCallback(() => {
    if (!trainingStartTime) {
      setTrainingStartTime(Date.now());
    }
    startGame();
  }, [startGame, trainingStartTime]);

  // Handle agent drag and drop
  const handleAgentDrop = useCallback((fromState: number, toState: number) => {
    const reward = calculateReward(toState);
    applyIntervention(fromState, toState, reward);
    setAgentState(toState);
  }, [applyIntervention, calculateReward, setAgentState]);

  // Handle cell click
  const handleCellClick = useCallback((state: number, position: any) => {
    console.log('Cell clicked:', { state, position });
  }, []);

  // Reset game and data
  const handleReset = useCallback(() => {
    resetGame();
    clearActionHistory();
    setRoundEpisodeData([]);
    roundEpisodeDataRef.current = [];
    setRoundInterventions([]);
    roundInterventionsRef.current = [];
    setAnnouncedAction(null);
    setIsFinalRoundCompleted(false);
    setShowSurveyDialog(false);
    setShowFailureDialog(false);
  }, [resetGame, clearActionHistory]);

  return (
    <div className="training-page">
      {/* Survey dialog */}
      {showSurveyDialog && (
        <RoundSurveyDialog
          roundNumber={completedRoundNumber}
          totalRounds={roundConfig.totalRounds}
          isFinalRound={isFinalRoundCompleted}
          onComplete={handleSurveyComplete}
          onContinue={handleSurveySkip}
        />
      )}

      {/* Failure Dialog */}
      {showFailureDialog && (
        <RoundFailureDialog onRetry={handleReset} />
      )}

      {/* Page header */}
      <div className="page-header">
        <h2>Model Training Phase</h2>
        <p>Please click start when you are ready to begin this round of the study</p>
        <p>Observe the machine learning agent and teach it to get to the goal (🎯) by dragging it</p>
        <div className="header-actions">
          {userId && (
            <span className="participant-id">
              Participant ID: <strong>{userId}</strong>
            </span>
          )}
          
          <span className="round-progress">
            Round: <strong>{gameStats.currentRound}</strong> / {roundConfig.totalRounds}
          </span>
          
          <span className="episode-counter">
            Episode: <strong>{gameStats.episode}</strong> / {roundConfig.episodesPerRound}
          </span>
          
          {trainingTime > 0 && (
            <span className="training-time">
              Training Time: <strong>{trainingTime}s</strong>
            </span>
          )}
          
          <div className="backend-indicator">
            {backendStatus.loading ? (
              <span className="status loading">Checking backend...</span>
            ) : backendStatus.connected ? (
              <span className="status connected">Backend connected</span>
            ) : (
              <span className="status disconnected">Backend disconnected</span>
            )}
          </div>
        </div>
      </div>

      {/* Main training content */}
      <div className="training-content">
        <div className="game-area">
          <div className="map-container">
            <FrozenLakeBoard
              mapDesc={gameConfig.mapDesc}
              agentState={agentState.currentState}
              announcedAction={announcedAction}
              onCellClick={handleCellClick}
              onAgentDrop={handleAgentDrop}
              isIntervening={isIntervening}
              qtable={qtable}
              onDragStart={startDrag}
              onDragEnd={endDrag}
              isGameRunning={gameStatus.isRunning}
              isGamePaused={gameStatus.isPaused}
            />
          </div>
          
          {/* <div className="info-tabs-container">
            <div className="info-tabs">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeInfoTab === 'status' ? 'active' : ''}`}
                  onClick={() => setActiveInfoTab('status')}
                >
                  Live Status
                </button>
                <button 
                  className={`tab-button ${activeInfoTab === 'qtable' ? 'active' : ''}`}
                  onClick={() => setActiveInfoTab('qtable')}
                >
                  Q-table Analysis
                </button>
              </div>
              
              <div className="tab-content">
                {activeInfoTab === 'status' && (
                  <StatusPanel
                    stats={gameStats}
                    status={gameStatus}
                    learningParams={learningParams}
                  />
                )}
                {activeInfoTab === 'qtable' && (
                  <QTableVisualizer
                    qtable={qtable}
                    mapDesc={gameConfig.mapDesc}
                    currentState={agentState.currentState}
                  />
                )}
              </div>
            </div>
          </div> */}
        </div>

        <div className="controls-area">
          <GameControls
            isRunning={gameStatus.isRunning}
            isPaused={gameStatus.isPaused}
            onStart={handleStartGame}
            onPause={pauseGame}
            onReset={handleReset}
            onStep={stepGame}
            interventionRule={interventionRule}
            onRuleChange={setInterventionRule}
            episode={gameStats.episode}
            agentStepDelay={gameConfig.agentStepDelay} 
            onStepDelayChange={handleStepDelayChange}
          />
        </div>
      </div>

      {/* Training information panels */}
      <div className="training-info">
        {/* <div className="info-card">
          <h4>Round Progress</h4>
          <div className="progress-stats">
            <span>Current Round: <strong>{gameStats.currentRound}</strong> / {roundConfig.totalRounds}</span>
            <span>Episode: <strong>{gameStats.episode}</strong> / {roundConfig.episodesPerRound}</span>
            <span>Round Interventions: <strong>{roundInterventions.length}</strong></span>
          </div>
        </div> */}
        
        {/* <div className="info-card">
          <h4>Assigned Intervention Rule</h4>
          <div className="rule-info">
            <strong>{interventionRule}</strong>
            <span>{getRuleDescription(interventionRule)}</span>
          </div>
          <div className="rule-note">
            This rule is assigned based on your Participant ID.
          </div>
        </div> */}
      </div>
    </div>
  );
};