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
import { InterventionRecord, ExperimentPhase, Action } from '../types';
import './TrainingPage.css';

interface TrainingPageProps {
  onPhaseChange: (phase: ExperimentPhase, data?: any) => void;
}

export const TrainingPage: React.FC<TrainingPageProps> = ({ onPhaseChange }) => {
  // ==================== State Definitions ====================
  // Game configuration
  const [gameConfig] = useState(() => ({
    ...DEFAULT_GAME_CONFIG,
    mapDesc: MAP_CONFIGS.STANDARD_4x4
  }));

  const [activeInfoTab, setActiveInfoTab] = useState<'status' | 'qtable'>('status');

  // Training data collection
  const [episodeRewards, setEpisodeRewards] = useState<number[]>([]);
  const [episodeSteps, setEpisodeSteps] = useState<number[]>([]);
  const [trainingStartTime, setTrainingStartTime] = useState<number>(0);
  const [trainingTime, setTrainingTime] = useState<number>(0);

  // ==================== Hook Initialization ====================
  // Calculate state space size
  const stateSize = gameConfig.mapDesc.length * gameConfig.mapDesc[0].length;

  // Initialize Q-learning
  const { 
    qtable, 
    learningParams,
    chooseAction, 
    updateQValue,  
    updateQTable,
    resetQTable
  } = useQLearning({
    initialParams: {
      stateSize: stateSize,
      actionSize: 4
    },
    mapDesc: gameConfig.mapDesc
  });

  // ==================== Callback Definitions ====================
  const handleStep = useCallback((state: number, action: number, reward: number, newState: number) => {
    updateQValue(state, action as Action, reward, newState);
  }, [updateQValue]);

  // Episode end callback - collect data
  const handleEpisodeEnd = useCallback((stats: any) => {
    console.log(`Episode ${stats.episode} ended:`, stats);
    
    // Collect data for each episode
    setEpisodeRewards(prev => [...prev, stats.lastReward]);
    setEpisodeSteps(prev => [...prev, stats.steps]);
  }, []);

  // Intervention callback
  const handleIntervention = useCallback((fromState: number, toState: number) => {
    console.log(`Intervention: ${fromState} -> ${toState}`);
  }, []);

  // Intervention applied callback
  const handleInterventionApplied = useCallback((record: InterventionRecord) => {
    console.log('Intervention applied:', record);
  }, []);

  // ==================== More Hook Initialization ====================
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
    isTerminalState,
    getAgentPosition
  } = useGameEngine({
    config: gameConfig,
    chooseAction,        
    updateQValue,        
    onStep: handleStep,
    onEpisodeEnd: handleEpisodeEnd,
    onIntervention: handleIntervention
  });

  // Initialize intervention system
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
    chooseAction,
    learningRate: learningParams.learningRate,
    gamma: learningParams.gamma,
    onInterventionApplied: handleInterventionApplied
  });

  // ==================== Side Effects ====================
  // Training time tracking
  useEffect(() => {
    if (trainingStartTime && gameStatus.isRunning) {
      const interval = setInterval(() => {
        setTrainingTime(Math.floor((Date.now() - trainingStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [trainingStartTime, gameStatus.isRunning]);

  // ==================== Business Logic Functions ====================
  // Start game handler - record start time
  const handleStartGame = useCallback(() => {
    if (!trainingStartTime) {
      setTrainingStartTime(Date.now());
    }
    startGame();
  }, [startGame, trainingStartTime]);

  // Handle agent drag (intervention)
  const handleAgentDrop = useCallback((fromState: number, toState: number) => {
    console.log(`Drag intervention: ${fromState} -> ${toState}`);
    
    const reward = calculateReward(toState);
    applyIntervention(fromState, toState, reward);
    setAgentState(toState);
  }, [applyIntervention, calculateReward, setAgentState]);

  // Handle cell click
  const handleCellClick = useCallback((state: number, position: any) => {
    console.log('Cell clicked:', { state, position });
  }, []);

  // Reset game and Q-table - clear collected data
  const handleReset = useCallback(() => {
    resetGame();
    resetQTable();
    setEpisodeRewards([]);
    setEpisodeSteps([]);
    setTrainingStartTime(0);
    setTrainingTime(0);
  }, [resetGame, resetQTable]);

  // Complete training and go to results page
  const handleCompleteTraining = useCallback(() => {
    const finalTrainingTime = trainingStartTime ? 
      Math.floor((Date.now() - trainingStartTime) / 1000) : trainingTime;

    const exportData = exportExperimentData(
      qtable,
      gameStats,
      episodeRewards,
      episodeSteps,
      interventionHistory,
      learningParams,
      gameConfig,
      interventionRule,
      finalTrainingTime
    );

    onPhaseChange('results', exportData);
  }, [
    qtable, gameStats, episodeRewards, episodeSteps, interventionHistory,
    learningParams, gameConfig, interventionRule, trainingStartTime, trainingTime,
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
          >
            📊 View Training Results
          </button>
          <span className="episode-counter">
            Current Episode: <strong>{gameStats.episode}</strong>
          </span>
          {trainingTime > 0 && (
            <span className="training-time">
              Training Time: <strong>{trainingTime}s</strong>
            </span>
          )}
        </div>
      </div>

      <div className="training-content">
        {/* Left: Game map and status panel */}
        <div className="game-area">
          <div className="map-container">
            <FrozenLakeBoard
              mapDesc={gameConfig.mapDesc}
              agentState={agentState.currentState}
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

        {/* Right: Control panel */}
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
          />
        </div>
      </div>

      {/* Training information panel */}
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