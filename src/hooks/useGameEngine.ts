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
  // Calculate start state from map description
  const startState = getStartState(config.mapDesc); 

  const [agentState, setAgentState] = useState<AgentState>({
    currentState: startState, 
    totalReward: 0,
    steps: 0,
    lastReward: 0,
    isDone: false
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
  
  // ==================== Utility Functions ====================
  /**
   * Get agent position
   */
  const getAgentPosition = useCallback((state: number): Position => {
    const ncol = config.mapDesc[0].length;
    return {
      row: Math.floor(state / ncol),
      col: state % ncol
    };
  }, [config.mapDesc]);

  /**
   * Convert position to state number
   */
  const positionToState = useCallback((position: Position): number => {
    const ncol = config.mapDesc[0].length;
    return position.row * ncol + position.col;
  }, [config.mapDesc]);

  /**
   * Check if state is terminal state
   */
  const isTerminalState = useCallback((state: number): boolean => {
    const { row, col } = getAgentPosition(state);
    const cellType = config.mapDesc[row][col];
    return cellType === 'H' || cellType === 'G';
  }, [config.mapDesc, getAgentPosition]);

  /**
   * Calculate reward for state
   */
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

  // ==================== Game Control Functions ====================
  /**
   * Start drag
   */
  const startDrag = useCallback(() => {
    setIsDragging(true);
    setGameStatus(prev => ({ ...prev, isPaused: true }));
  }, []);

  /**
   * End drag
   */
  const endDrag = useCallback(() => {
    setIsDragging(false);
    setGameStatus(prev => ({ ...prev, isPaused: false }));
  }, []);

  /**
   * Start game
   */
  const startGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
  }, []);

  /**
   * Pause game
   */
  const pauseGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  /**
   * Reset game
   */
  const resetGame = useCallback(() => {
    // Stop game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    // Reset state - use actual start state from map
    setAgentState({
      currentState: startState, 
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      isDone: false
    });

    setGameStatus({
      isRunning: false,
      isPaused: false,
      isIntervening: false,
      isTraining: true
    });

    // Reset episode statistics
    episodeStatsRef.current = {
      episodeReward: 0,
      episodeSteps: 0,
      episodeInterventions: 0
    };

    // Reset success count
    successCountRef.current = 0;

    lastStepTimeRef.current = 0;
  }, [startState]); 

  /**
   * Single step execution
   */
  const stepGame = useCallback(() => {
    const currentAgentState = agentStateRef.current; 
    const currentGameStatus = gameStatusRef.current; 
    const currentGameStats = gameStatsRef.current;   
    
    if (currentAgentState.isDone) return;

    const currentState = currentAgentState.currentState;

    // Add boundary check
    if (currentState < 0 || currentState >= config.mapDesc.length * config.mapDesc[0].length) {
      console.error(`Invalid state: ${currentState}`);
      return;
    }
    
    const possibleActions = [0, 1, 2, 3];
    const action = chooseAction 
      ? chooseAction(currentState) 
      : Math.floor(Math.random() * 4) as Action;
    
    const ncol = config.mapDesc[0].length;
    const nrow = config.mapDesc.length;
    let newState = currentState;

    switch (action) {
      case 0: // Left
        if (currentState % ncol > 0) {
          newState = currentState - 1;
        }
        break;
      case 1: // Down
        if (Math.floor(currentState / ncol) < nrow - 1) {
          newState = currentState + ncol;
        }
        break;
      case 2: // Right
        if (currentState % ncol < ncol - 1) {
          newState = currentState + 1;
        }
        break;
      case 3: // Up
        if (Math.floor(currentState / ncol) > 0) {
          newState = currentState - ncol;
        }
        break;
    }

    if (newState === currentState) {
      console.log(`Invalid move: action ${action} at state ${currentState}`);
    }

    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);
    
    // Update Q-value (if updateQValue is provided)
    if (updateQValue) {
      updateQValue(currentState, action, reward, newState);
    }
    
    const success = isDone && config.mapDesc[Math.floor(newState / ncol)][newState % ncol] === 'G';

    // Update agent state
    setAgentState(prev => ({
      currentState: newState,
      totalReward: prev.totalReward + reward,
      steps: prev.steps + 1,
      lastReward: reward,
      isDone
    }));

    // Update current episode statistics
    episodeStatsRef.current.episodeReward += reward;
    episodeStatsRef.current.episodeSteps += 1;

    // Callback
    onStep?.(currentState, action, reward, newState);

    // Check episode end
    if (isDone) {
      const { row, col } = getAgentPosition(newState);
      const cellType = config.mapDesc[row][col];
      const success = cellType === 'G'; // Explicitly check if it's goal state
      
      if (success) {
        successCountRef.current++;
      }

      const totalEpisodes = currentGameStats.episode + 1;
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

      // Auto reset - use actual start state
      if (currentGameStatus.isRunning && !currentGameStatus.isPaused) { 
        setTimeout(() => {
          setAgentState({
            currentState: startState, 
            totalReward: 0,
            steps: 0,
            lastReward: 0,
            isDone: false
          });
          episodeStatsRef.current = {
            episodeReward: 0,
            episodeSteps: 0,
            episodeInterventions: 0
          };
        }, 1000);
      }
    }
  }, [
    config.mapDesc, calculateReward, isTerminalState, chooseAction, updateQValue, 
    onStep, onEpisodeEnd, getAgentPosition, startState 
  ]); 

  /**
   * Set agent state (for intervention)
   */
  const setAgentStateManually = useCallback((newState: number) => {
    if (gameStatus.isIntervening) return;

    const oldState = agentState.currentState;
    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);

    setGameStatus(prev => ({ ...prev, isIntervening: true }));

    // Use externally provided intervention system
    if (applyIntervention) {
      applyIntervention(oldState, newState, reward);
    }

    setAgentState(prev => {
      const { row, col } = getAgentPosition(newState);
      const cellType = config.mapDesc[row][col];
      
      let newTotalReward = prev.totalReward;
      
      // Only add to total reward when reaching goal (consistent with Python)
      if (cellType === 'G') {
        newTotalReward += reward; // Goal: add reward
      } 
      // Other non-terminal states add reward normally
      else if (cellType !== 'H') {
        newTotalReward += reward;
      }
      
      return {
        ...prev,
        currentState: newState,
        totalReward: newTotalReward,
        lastReward: reward,
        isDone
      };
    });

    // Update current episode statistics
    const { row, col } = getAgentPosition(newState);
    const cellType = config.mapDesc[row][col];
    
    // Only add to episode reward for non-hole states
    if (cellType !== 'H') {
      episodeStatsRef.current.episodeReward += reward;
    }
    episodeStatsRef.current.episodeInterventions += 1;

    onIntervention?.(oldState, newState);

    // If terminal state, handle episode end
    if (isDone) {
      const success = cellType === 'G';
      
      if (success) {
        successCountRef.current++;
      }

      const totalEpisodes = gameStats.episode + 1;
      const newSuccessRate = totalEpisodes > 0 ? successCountRef.current / totalEpisodes : 0;

      console.log(`🎯 Intervention reached terminal state: ${cellType}, success: ${success}, new episode: ${totalEpisodes}`);

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
        
        console.log('📊 Update global statistics:', newStats);
        onEpisodeEnd?.(newStats);
        return newStats;
      });

      // Key: auto pause game and reset episode
      if (gameStatus.isRunning) {
        console.log('⏸️ Auto pause game and prepare reset');
        
        // Pause game
        setGameStatus(prev => ({
          ...prev,
          isRunning: false, 
          isPaused: true
        }));

        // Delay episode reset - use actual start state
        setTimeout(() => {
          console.log('🔄 Auto reset episode');
          setAgentState({
            currentState: startState, 
            totalReward: 0,
            steps: 0,
            lastReward: reward, 
            isDone: false
          });
          episodeStatsRef.current = {
            episodeReward: 0,
            episodeSteps: 0,
            episodeInterventions: 0
          };
          
          // Auto restart (optional)
          setTimeout(() => {
            if (gameStatusRef.current.isTraining) {
              console.log('▶️ Auto restart game');
              setGameStatus(prev => ({
                ...prev,
                isRunning: true,
                isPaused: false
              }));
            }
          }, 500);
        }, 1500);
      }
    }

    setTimeout(() => {
      setGameStatus(prev => ({ ...prev, isIntervening: false }));
    }, 100);
  }, [
    agentState.currentState, gameStatus.isIntervening, gameStatus.isRunning, gameStatus.isTraining,
    calculateReward, isTerminalState, applyIntervention, onIntervention, onEpisodeEnd,
    getAgentPosition, config.mapDesc, gameStats.episode, startState 
  ]);

  // ==================== Game Main Loop ====================
  useEffect(() => {
    const gameLoop = (currentTime: number) => {
      const currentGameStatus = gameStatusRef.current; 
      
      if (!currentGameStatus.isRunning || currentGameStatus.isPaused || currentGameStatus.isIntervening || isDragging) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (currentTime - lastStepTimeRef.current >= config.agentStepDelay) {
        stepGame();
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
  }, [gameStatus.isRunning, gameStatus.isPaused, gameStatus.isIntervening, isDragging, config.agentStepDelay, stepGame]);

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
  };
};