// src/hooks/useGameEngine.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { getStartState } from '../services/gameConfig';
import { 
  AgentState, 
  GameStatus, 
  GameStats, 
  GameConfig,
  Position,
  UseGameEngineProps,
  Action 
} from '../types';

export const useGameEngine = ({ 
  config, 
  chooseAction,       
  updateQValue, 
  applyIntervention,
  onStep, 
  onEpisodeEnd,
  onIntervention 
}: UseGameEngineProps) => {
  // ==================== State Definitions ====================
  const startState = getStartState(config.mapDesc); 

  const [agentState, setAgentState] = useState<AgentState>({
    currentState: startState, 
    totalReward: 0,
    steps: 0,
    lastReward: 0,
    isDone: false,
    nextAction: null, // 新增：存储即将执行的动作
  });

  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isRunning: false,
    isPaused: false,
    isIntervening: false,
    isTraining: true
  });

  const [gameStats, setGameStats] = useState<GameStats>({
    episode: 0,
    totalReward: 0,  
    steps: 0,        
    lastReward: 0,
    interventions: 0,
    successRate: 0
  });

  const [isDragging, setIsDragging] = useState(false);

  // ==================== Ref Definitions ====================
  const gameLoopRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  const episodeStatsRef = useRef({
    episodeReward: 0,    
    episodeSteps: 0,     
    episodeInterventions: 0
  });

  const successCountRef = useRef(0); 
  
  const agentStateRef = useRef(agentState);
  const gameStatusRef = useRef(gameStatus);
  const gameStatsRef = useRef(gameStats);

  // Store the action that will be executed
  const pendingActionRef = useRef<{
    state: number;
    action: Action;
    timestamp: number;
  } | null>(null);

  // Synchronize refs with state
  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    gameStatsRef.current = gameStats;
  }, [gameStats]);

  // Initialize: select first action when game starts
  useEffect(() => {
    if (gameStatus.isRunning && !gameStatus.isPaused && !agentState.isDone) {
      selectNextAction(agentState.currentState);
    }
  }, [gameStatus.isRunning, gameStatus.isPaused, agentState.isDone]);

  // ==================== Utility Functions ====================
  const getAgentPosition = useCallback((state: number): Position => {
    const ncol = config.mapDesc[0].length;
    return {
      row: Math.floor(state / ncol),
      col: state % ncol
    };
  }, [config.mapDesc]);

  const positionToState = useCallback((position: Position): number => {
    const ncol = config.mapDesc[0].length;
    return position.row * ncol + position.col;
  }, [config.mapDesc]);

  const isTerminalState = useCallback((state: number): boolean => {
    const { row, col } = getAgentPosition(state);
    const cellType = config.mapDesc[row][col];
    return cellType === 'H' || cellType === 'G';
  }, [config.mapDesc, getAgentPosition]);

  const calculateReward = useCallback((state: number): number => {
    const { row, col } = getAgentPosition(state);
    const cellType = config.mapDesc[row][col];
    
    switch (cellType) {
      case 'H': // Hole
        return config.rewardSchedule[0];
      case 'G': // Goal
        return config.rewardSchedule[1];
      case 'S': // Start
      case 'F': // Frozen
      default:
        return config.rewardSchedule[2];
    }
  }, [config.mapDesc, config.rewardSchedule, getAgentPosition]);

  // ==================== Core Action Functions ====================
  /**
   * Select next action for the given state
   * This generates the announcement for UI and stores the action for execution
   */
  const selectNextAction = useCallback((state: number) => {
    if (isTerminalState(state)) {
      // Terminal states don't have next actions
      setAgentState(prev => ({ ...prev, nextAction: null }));
      pendingActionRef.current = null;
      return null;
    }

    if (!chooseAction) return null;

    const action = chooseAction(state);
    
    // Store the pending action for execution
    pendingActionRef.current = {
      state,
      action,
      timestamp: Date.now()
    };

    // Update agent state with next action (for UI display)
    setAgentState(prev => ({ ...prev, nextAction: action }));

    return action;
  }, [chooseAction, isTerminalState]);

  /**
   * Execute the pending action
   */
  const executePendingAction = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    const currentAgentState = agentStateRef.current;
    
    if (!pendingAction || 
        pendingAction.state !== currentAgentState.currentState ||
        currentAgentState.isDone) {
      return;
    }

    const currentState = currentAgentState.currentState;
    const action = pendingAction.action;
    const ncol = config.mapDesc[0].length;
    const nrow = config.mapDesc.length;
    let newState = currentState;

    // Calculate new state based on action
    switch (action) {
      case 0: // Left
        if (currentState % ncol > 0) newState = currentState - 1;
        break;
      case 1: // Down
        if (Math.floor(currentState / ncol) < nrow - 1) newState = currentState + ncol;
        break;
      case 2: // Right
        if (currentState % ncol < ncol - 1) newState = currentState + 1;
        break;
      case 3: // Up
        if (Math.floor(currentState / ncol) > 0) newState = currentState - ncol;
        break;
    }

    if (newState === currentState) {
      console.log(`Invalid move: action ${action} at state ${currentState}`);
    }

    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);
    
    // Update Q-value using the action that was executed
    if (updateQValue) {
      updateQValue(currentState, action, reward, newState);
    }
    
    // Update agent state
    setAgentState(prev => ({
      currentState: newState,
      totalReward: prev.totalReward + reward,
      steps: prev.steps + 1,
      lastReward: reward,
      isDone,
      nextAction: null // Clear next action since we just executed it
    }));

    // Update episode statistics
    episodeStatsRef.current.episodeReward += reward;
    episodeStatsRef.current.episodeSteps += 1;

    // Callback
    onStep?.(currentState, action, reward, newState);

    // Clear pending action
    pendingActionRef.current = null;

    // Check episode end
    if (isDone) {
      const { row, col } = getAgentPosition(newState);
      const cellType = config.mapDesc[row][col];
      const success = cellType === 'G';
      
      if (success) {
        successCountRef.current++;
      }

      const totalEpisodes = gameStatsRef.current.episode + 1;
      const newSuccessRate = successCountRef.current / totalEpisodes;

      setGameStats(prev => {
        const newStats = {
          episode: totalEpisodes,
          totalReward: prev.totalReward + episodeStatsRef.current.episodeReward,
          steps: prev.steps + episodeStatsRef.current.episodeSteps,
          lastReward: reward,
          interventions: prev.interventions + episodeStatsRef.current.episodeInterventions,
          successRate: newSuccessRate
        };
        
        onEpisodeEnd?.(newStats);
        return newStats;
      });

      // Auto reset for next episode
      const currentGameStatus = gameStatusRef.current;
      if (currentGameStatus.isRunning && !currentGameStatus.isPaused) { 
        setTimeout(() => {
          setAgentState({
            currentState: startState, 
            totalReward: 0,
            steps: 0,
            lastReward: 0,
            isDone: false,
            nextAction: null
          });
          episodeStatsRef.current = {
            episodeReward: 0,
            episodeSteps: 0,
            episodeInterventions: 0
          };
          // Select first action for new episode
          selectNextAction(startState);
        }, 1000);
      }
    } else {
      // Select next action for the new state (creates new announcement)
      setTimeout(() => {
        selectNextAction(newState);
      }, 0);
    }
  }, [
    config.mapDesc, 
    calculateReward, 
    isTerminalState, 
    updateQValue, 
    onStep, 
    onEpisodeEnd, 
    getAgentPosition, 
    startState,
    selectNextAction
  ]);

  // ==================== Game Control Functions ====================
  const startDrag = useCallback(() => {
    setIsDragging(true);
    setGameStatus(prev => ({ ...prev, isPaused: true }));
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setGameStatus(prev => ({ ...prev, isPaused: false }));
  }, []);

  const startGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
    
    // Select first action when game starts
    if (!agentState.isDone) {
      selectNextAction(agentState.currentState);
    }
  }, [agentState.isDone, agentState.currentState, selectNextAction]);

  const pauseGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    setAgentState({
      currentState: startState, 
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      isDone: false,
      nextAction: null
    });

    setGameStatus({
      isRunning: false,
      isPaused: false,
      isIntervening: false,
      isTraining: true
    });

    episodeStatsRef.current = {
      episodeReward: 0,
      episodeSteps: 0,
      episodeInterventions: 0
    };

    successCountRef.current = 0;
    lastStepTimeRef.current = 0;
    pendingActionRef.current = null;
  }, [startState]);

  // ==================== Step Function (for manual stepping) ====================
  const stepGame = useCallback(() => {
    executePendingAction();
  }, [executePendingAction]);

  // ==================== Intervention Handler ====================
  const setAgentStateManually = useCallback((newState: number) => {
    if (gameStatus.isIntervening) return;

    const oldState = agentState.currentState;
    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);

    setGameStatus(prev => ({ ...prev, isIntervening: true }));

    // Get the pending action for intervention
    const pendingAction = pendingActionRef.current;
    const interventionAction = pendingAction?.action;
    
    // Apply intervention using the pending action
    if (applyIntervention && interventionAction !== undefined) {
      applyIntervention(oldState, newState, reward);
    }

    // Clear pending action since we're intervening
    pendingActionRef.current = null;

    // Update agent state
    setAgentState(prev => {
      const { row, col } = getAgentPosition(newState);
      const cellType = config.mapDesc[row][col];
      
      let newTotalReward = prev.totalReward;
      
      if (cellType === 'G') {
        newTotalReward += reward;
      } else if (cellType !== 'H') {
        newTotalReward += reward;
      }
      
      return {
        ...prev,
        currentState: newState,
        totalReward: newTotalReward,
        lastReward: reward,
        isDone,
        nextAction: null
      };
    });

    // Update episode statistics
    const { row, col } = getAgentPosition(newState);
    const cellType = config.mapDesc[row][col];
    
    if (cellType !== 'H') {
      episodeStatsRef.current.episodeReward += reward;
    }
    episodeStatsRef.current.episodeInterventions += 1;

    onIntervention?.(oldState, newState);

    // Handle terminal state from intervention
    if (isDone) {
      const success = cellType === 'G';
      
      if (success) {
        successCountRef.current++;
      }

      const totalEpisodes = gameStats.episode + 1;
      const newSuccessRate = totalEpisodes > 0 ? successCountRef.current / totalEpisodes : 0;

      // Update global statistics
      setGameStats(prev => {
        const newStats = {
          episode: totalEpisodes,
          totalReward: prev.totalReward + episodeStatsRef.current.episodeReward,
          steps: prev.steps + episodeStatsRef.current.episodeSteps,
          lastReward: reward,
          interventions: prev.interventions + episodeStatsRef.current.episodeInterventions,
          successRate: newSuccessRate
        };
        
        onEpisodeEnd?.(newStats);
        return newStats;
      });

      // Auto pause and reset
      if (gameStatus.isRunning) {
        setGameStatus(prev => ({
          ...prev,
          isRunning: false, 
          isPaused: true
        }));

        setTimeout(() => {
          setAgentState({
            currentState: startState, 
            totalReward: 0,
            steps: 0,
            lastReward: reward, 
            isDone: false,
            nextAction: null
          });
          episodeStatsRef.current = {
            episodeReward: 0,
            episodeSteps: 0,
            episodeInterventions: 0
          };
          
          // Auto restart if training
          setTimeout(() => {
            if (gameStatusRef.current.isTraining) {
              setGameStatus(prev => ({
                ...prev,
                isRunning: true,
                isPaused: false
              }));
              // Select first action
              selectNextAction(startState);
            }
          }, 500);
        }, 1500);
      }
    } else {
      // Select next action for the new state after intervention
      setTimeout(() => {
        selectNextAction(newState);
      }, 100);
    }

    // Reset intervention flag
    setTimeout(() => {
      setGameStatus(prev => ({ ...prev, isIntervening: false }));
    }, 100);
  }, [
    agentState.currentState, 
    gameStatus.isIntervening, 
    gameStatus.isRunning, 
    gameStatus.isTraining,
    calculateReward, 
    isTerminalState, 
    applyIntervention, 
    onIntervention, 
    onEpisodeEnd,
    getAgentPosition, 
    config.mapDesc, 
    gameStats.episode, 
    startState,
    selectNextAction
  ]);

  // ==================== Game Main Loop ====================
  useEffect(() => {
    const gameLoop = (currentTime: number) => {
      const currentGameStatus = gameStatusRef.current; 
      
      if (!currentGameStatus.isRunning || 
          currentGameStatus.isPaused || 
          currentGameStatus.isIntervening || 
          isDragging) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Execute pending action after the delay
      if (currentTime - lastStepTimeRef.current >= config.agentStepDelay) {
        executePendingAction();
        lastStepTimeRef.current = currentTime;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const currentGameStatus = gameStatusRef.current; 
    if (currentGameStatus.isRunning && !currentGameStatus.isPaused) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStatus.isRunning, gameStatus.isPaused, gameStatus.isIntervening, isDragging, config.agentStepDelay, executePendingAction]);

  // ==================== Return Interface ====================
  return {
    agentState,
    gameStatus,
    gameStats,
    getAgentPosition,
    positionToState,
    isTerminalState,
    calculateReward,
    startGame,
    pauseGame,
    resetGame,
    stepGame,
    setAgentState: setAgentStateManually,
    isDragging,
    startDrag,
    endDrag,
    selectNextAction, // Export for testing/debugging
  };
};