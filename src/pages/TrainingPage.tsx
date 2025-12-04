// src/pages/TrainingPage.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { FrozenLakeBoard } from '../components/FrozenLakeBoard';
import { GameControls } from '../components/GameControls';
import { StatusPanel } from '../components/StatusPanel';
import { QTableVisualizer } from '../components/QTableVisualizer';
import { useGameEngine } from '../hooks/useGameEngine';
import { useQLearning } from '../hooks/useQLearning';
import { useIntervention } from '../hooks/useIntervention';
import { DEFAULT_GAME_CONFIG, MAP_CONFIGS } from '../services/gameConfig';
import { exportExperimentData } from '../services/exportService';
import { ApiService } from '../services/apiService';
import { InterventionRecord, ExperimentPhase, Action } from '../types';
import './TrainingPage.css';

interface TrainingPageProps {
  onPhaseChange: (phase: ExperimentPhase, data?: any) => void;
}

export const TrainingPage: React.FC<TrainingPageProps> = ({ onPhaseChange }) => {
  // ==================== State Definitions ====================
  const [gameConfig, setGameConfig] = useState(() => ({
    ...DEFAULT_GAME_CONFIG,
    mapDesc: MAP_CONFIGS.LINEAR_1x16,
    agentStepDelay: 500
  }));

  const [activeInfoTab, setActiveInfoTab] = useState<'status' | 'qtable'>('status');
  const [episodeRewards, setEpisodeRewards] = useState<number[]>([]);
  const [episodeSteps, setEpisodeSteps] = useState<number[]>([]);
  const [trainingStartTime, setTrainingStartTime] = useState<number>(0);
  const [trainingTime, setTrainingTime] = useState<number>(0);

  // Announced action state for UI display
  const [announcedAction, setAnnouncedAction] = useState<{
    action: Action;
    type: 'exploration' | 'exploitation';
  } | null>(null);

  const [backendStatus, setBackendStatus] = useState<{
    connected: boolean;
    database: string;
    loading: boolean;
  }>({
    connected: false,
    database: 'unknown',
    loading: true
  });

  // ==================== Hook Initialization ====================
  const stateSize = gameConfig.mapDesc.length * gameConfig.mapDesc[0].length;

  const { 
    qtable, 
    learningParams,
    chooseAction, 
    updateQValue,  
    updateQTable,
    resetQTable,
    getAnnouncedAction,
    clearActionHistory
  } = useQLearning({
    initialParams: {
      stateSize: stateSize,
      actionSize: 4
    },
    mapDesc: gameConfig.mapDesc
  });

  // ==================== Callback Definitions ====================
  const handleStep = useCallback((state: number, action: Action, reward: number, newState: number) => {
    updateQValue(state, action, reward, newState);
  }, [updateQValue]);

  const handleEpisodeEnd = useCallback((stats: any) => {
    console.log(`Episode ${stats.episode} ended:`, stats);
    setEpisodeRewards(prev => [...prev, stats.lastReward]);
    setEpisodeSteps(prev => [...prev, stats.steps]);
    clearActionHistory();
    setAnnouncedAction(null);
  }, [clearActionHistory]);

  const handleIntervention = useCallback((fromState: number, toState: number) => {
    console.log(`Intervention: ${fromState} -> ${toState}`);
  }, []);

  const handleInterventionApplied = useCallback((record: InterventionRecord) => {
    console.log('Intervention applied:', record);
  }, []);

  // ==================== More Hook Initialization ====================
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
    getAgentPosition
  } = useGameEngine({
    config: gameConfig,
    chooseAction,        
    updateQValue,        
    onStep: handleStep,
    onEpisodeEnd: handleEpisodeEnd,
    onIntervention: handleIntervention
  });

  const {
    interventionRule,
    isIntervening,
    applyIntervention,
    setInterventionRule,
    interventionHistory,
    getInterventionStats
  } = useIntervention({
    qtable,
    updateQTable,
    getAnnouncedAction,
    learningRate: learningParams.learningRate,
    gamma: learningParams.gamma,
    learningParams: learningParams,
    onInterventionApplied: handleInterventionApplied
  });

  // ==================== Side Effects ====================
  useEffect(() => {
    if (trainingStartTime && gameStatus.isRunning) {
      const interval = setInterval(() => {
        setTrainingTime(Math.floor((Date.now() - trainingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [trainingStartTime, gameStatus.isRunning]);

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
        
        if (status.status === 'connected') {
          console.log('✅ Backend service connected');
        } else {
          console.warn('⚠️ Backend service unavailable, data will be saved locally only');
        }
      } catch (error) {
        console.error('Backend connection check failed:', error);
        setBackendStatus({
          connected: false,
          database: 'unknown',
          loading: false
        });
      }
    };
    
    checkBackendConnection();
  }, []);

  // ==================== Business Logic Functions ====================
  const handleStepDelayChange = useCallback((newDelay: number) => {
    setGameConfig(prev => ({
      ...prev,
      agentStepDelay: newDelay
    }));
    console.log(`Agent speed adjusted to: ${newDelay}ms`);
  }, []);

  const handleStartGame = useCallback(() => {
    if (!trainingStartTime) {
      setTrainingStartTime(Date.now());
    }
    startGame();
  }, [startGame, trainingStartTime]);

  const handleAgentDrop = useCallback((fromState: number, toState: number) => {
    console.log(`Drag intervention: ${fromState} -> ${toState}`);
    
    const reward = calculateReward(toState);
    applyIntervention(fromState, toState, reward);
    setAgentState(toState);
  }, [applyIntervention, calculateReward, setAgentState]);

  const handleCellClick = useCallback((state: number, position: any) => {
    console.log('Cell clicked:', { state, position });
  }, []);

  const handleReset = useCallback(() => {
    resetGame();
    resetQTable();
    clearActionHistory();
    setEpisodeRewards([]);
    setEpisodeSteps([]);
    setTrainingStartTime(0);
    setTrainingTime(0);
    setAnnouncedAction(null);
  }, [resetGame, resetQTable, clearActionHistory]);

  const getFilteredEpisodeData = useCallback(() => {
    const actualEpisodes = gameStats.episode;
    
    if (episodeRewards.length <= actualEpisodes) {
      return {
        rewards: episodeRewards,
        steps: episodeSteps
      };
    }
    
    console.warn(`Detected duplicate episode data: ${episodeRewards.length} entries for ${actualEpisodes} episodes. Filtering...`);
    
    return {
      rewards: episodeRewards.slice(-actualEpisodes),
      steps: episodeSteps.slice(-actualEpisodes)
    };
  }, [episodeRewards, episodeSteps, gameStats.episode]);

  const handleCompleteTraining = useCallback(async () => {
    const finalTrainingTime = trainingStartTime ? 
      Math.floor((Date.now() - trainingStartTime) / 1000) : trainingTime;

    const filteredData = getFilteredEpisodeData();
    
    const exportData = exportExperimentData(
      qtable,
      gameStats,
      filteredData.rewards,
      filteredData.steps,
      interventionHistory,
      learningParams,
      gameConfig,
      interventionRule,
      finalTrainingTime
    );

    try {
      let saveResult = null;
      
      if (backendStatus.connected) {
        try {
          console.log('📤 Saving experiment data to database...');
          saveResult = await ApiService.saveExperiment(exportData);
          
          if (saveResult.success) {
            console.log('✅ Experiment data saved to database:', {
              experimentId: saveResult.experimentId,
              episodes: saveResult.dataSummary?.episodes,
              interventions: saveResult.dataSummary?.interventions
            });
          }
        } catch (saveError) {
          console.warn('⚠️ Database save failed, but continuing with local processing:', saveError);
        }
      } else {
        console.warn('⚠️ Backend unavailable, skipping database save');
      }

      const enhancedData = {
        ...exportData,
        backendInfo: {
          savedToDatabase: saveResult?.success || false,
          experimentId: saveResult?.experimentId || null,
          savedAt: saveResult?.savedAt || null,
          backendConnected: backendStatus.connected
        }
      };

      onPhaseChange('results', enhancedData);

    } catch (error) {
      console.error('Error processing experiment data:', error);
      alert('An error occurred while processing experiment data, but local results have been generated.');
      onPhaseChange('results', exportData);
    }
  }, [
    qtable, 
    gameStats, 
    getFilteredEpisodeData,
    interventionHistory,
    learningParams, 
    gameConfig, 
    interventionRule, 
    trainingStartTime, 
    trainingTime,
    backendStatus.connected, 
    onPhaseChange
  ]);

  // ==================== Render Section ====================
  return (
    <div className="training-page">
      <div className="page-header">
        <h2>🧠 Model Training Phase</h2>
        <p>Observe Q-learning process and perform human intervention by dragging the agent</p>
        <div className="header-actions">
          <button 
            className="complete-button"
            onClick={handleCompleteTraining}
            disabled={gameStats.episode === 0}
            title={backendStatus.connected ? 
              "Complete training and save to database" : 
              "Complete training (backend unavailable, local save only)"
            }
          >
            📊 View Training Results
            {!backendStatus.connected && !backendStatus.loading && (
              <span className="backend-status offline">(offline)</span>
            )}
            {backendStatus.connected && (
              <span className="backend-status online">(connected)</span>
            )}
          </button>
          
          <span className="episode-counter">
            Current Episode: <strong>{gameStats.episode}</strong>
          </span>
          
          {trainingTime > 0 && (
            <span className="training-time">
              Training Time: <strong>{trainingTime}s</strong>
            </span>
          )}
          
          <div className="backend-indicator">
            {backendStatus.loading ? (
              <span className="status loading">🔵 Checking backend...</span>
            ) : backendStatus.connected ? (
              <span className="status connected">✅ Backend connected</span>
            ) : (
              <span className="status disconnected">⚠️ Backend disconnected</span>
            )}
          </div>
        </div>
      </div>

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
            />
          </div>
          
          <div className="info-tabs-container">
            <div className="info-tabs">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeInfoTab === 'status' ? 'active' : ''}`}
                  onClick={() => setActiveInfoTab('status')}
                >
                  📊 Live Status
                </button>
                <button 
                  className={`tab-button ${activeInfoTab === 'qtable' ? 'active' : ''}`}
                  onClick={() => setActiveInfoTab('qtable')}
                >
                  🧠 Q-table Analysis
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
          </div>
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

      <div className="training-info">
        <div className="info-card">
          <h4>📈 Learning Progress</h4>
          <div className="progress-stats">
            <span>Success Rate: <strong>{(gameStats.successRate * 100).toFixed(1)}%</strong></span>
            <span>Total Steps: <strong>{gameStats.steps}</strong></span>
            <span>Interventions: <strong>{gameStats.interventions}</strong></span>
          </div>
        </div>
        
        <div className="info-card">
          <h4>🎯 Current Rule</h4>
          <div className="rule-info">
            <strong>{interventionRule}</strong>
            <span>{
              interventionRule === 'suggestion' ? 'Update Q-value based on movement direction' :
              interventionRule === 'reset' ? 'Update Q-value using target state reward' :
              interventionRule === 'interrupt' ? 'Ignore current timestep' :
              'Apply negative reward to original action'
            }</span>
          </div>
        </div>
      </div>
    </div>
  );
};