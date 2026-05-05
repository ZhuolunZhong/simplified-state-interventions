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
  markActionAsExecuted,
  updateQValue, 
  applyIntervention,
  onStep, 
  onEpisodeEnd,
  onIntervention,
  onRoundEnd,
  onExperimentEnd,
  resetQTable
}: UseGameEngineProps & {
  onRoundEnd?: (roundNumber: number) => void;
  onExperimentEnd?: (totalEpisodes: number) => void;
}) => {
  // Initial agent state from map configuration
  const startState = getStartState(config.mapDesc); 

  // Agent's current state and statistics
  const [agentState, setAgentState] = useState<AgentState>({
    currentState: startState, 
    totalReward: 0,
    steps: 0,
    lastReward: 0,
    isDone: false,
    nextAction: null,
  });

  // Game control status flags
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isRunning: false,
    isPaused: false,
    isIntervening: false,
    isTraining: true
  });

  // Game statistics tracking
  const [gameStats, setGameStats] = useState<GameStats>({
    episode: 1,
    totalReward: 0,
    steps: 0,
    lastReward: 0,
    interventions: 0,
    successRate: 0,
    currentRound: 1
  });

  // Dragging state for manual agent movement
  const [isDragging, setIsDragging] = useState(false);

  // Refs for game loop and timing control
  const gameLoopRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);
  
  // Episode-specific statistics
  const episodeStatsRef = useRef({
    episodeReward: 0,
    episodeSteps: 0,
    episodeInterventions: 0
  });

  // Success tracking for success rate calculation
  const successCountRef = useRef(0);
  
  // Round configuration
  const roundConfigRef = useRef({
    totalRounds: 5,
    episodesPerRound: 15
  });
  
  // Refs for frequently accessed states to avoid re-renders
  const agentStateRef = useRef(agentState);
  const gameStatusRef = useRef(gameStatus);
  const gameStatsRef = useRef(gameStats);

  // Track current episode number to prevent duplicate calls
  const currentEpisodeKeyRef = useRef<string>('');

  // Pending action to be executed in game loop
  const pendingActionRef = useRef<{
    state: number;
    action: Action;
    timestamp: number;
  } | null>(null);

  // Convert state index to grid position
  const getAgentPosition = useCallback((state: number): Position => {
    const ncol = config.mapDesc[0].length;
    return {
      row: Math.floor(state / ncol),
      col: state % ncol
    };
  }, [config.mapDesc]);

  // Convert grid position to state index
  const positionToState = useCallback((position: Position): number => {
    const ncol = config.mapDesc[0].length;
    return position.row * ncol + position.col;
  }, [config.mapDesc]);

  // Check if state is terminal (hole or goal)
  const isTerminalState = useCallback((state: number): boolean => {
    const { row, col } = getAgentPosition(state);
    const cellType = config.mapDesc[row][col];
    return cellType === 'H' || cellType === 'G';
  }, [config.mapDesc, getAgentPosition]);

  // Calculate reward based on cell type
  const calculateReward = useCallback((state: number): number => {
    const { row, col } = getAgentPosition(state);
    const cellType = config.mapDesc[row][col];
    
    switch (cellType) {
      case 'H':
        return config.rewardSchedule[0];
      case 'G':
        return config.rewardSchedule[1];
      case 'S':
      case 'F':
      default:
        return config.rewardSchedule[2];
    }
  }, [config.mapDesc, config.rewardSchedule, getAgentPosition]);

  // Reset round statistics and prepare for new round
  const prepareNewRound = useCallback(() => {
    const newRound = gameStats.currentRound + 1;
    
    // Check if all rounds completed
    if (newRound > roundConfigRef.current.totalRounds) {
      onExperimentEnd?.(gameStats.episode);
      return;
    }

    // Reset game statistics for new round
    setGameStats({
      episode: 1,
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      interventions: 0,
      successRate: 0,
      currentRound: newRound
    });

    // Reset agent to start position
    setAgentState({
      currentState: startState,
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      isDone: false,
      nextAction: null
    });

    // Reset episode statistics
    episodeStatsRef.current = {
      episodeReward: 0,
      episodeSteps: 0,
      episodeInterventions: 0
    };

    successCountRef.current = 0;
    currentEpisodeKeyRef.current = '';

    // Ensure game is stopped
    if (gameStatus.isRunning) {
      setGameStatus(prev => ({
        ...prev,
        isRunning: false,
        isPaused: false
      }));
    }

  }, [gameStats.currentRound, gameStats.episode, gameStatus.isRunning, startState, onExperimentEnd]);

  // Select next action using Q-learning policy
  const selectNextAction = useCallback((state: number) => {
    if (isTerminalState(state)) {
      setAgentState(prev => ({ ...prev, nextAction: null }));
      pendingActionRef.current = null;
      return null;
    }

    if (!chooseAction) return null;

    const action = chooseAction(state);
    
    pendingActionRef.current = {
      state,
      action,
      timestamp: Date.now()
    };

    setAgentState(prev => ({ ...prev, nextAction: action }));

    return action;
  }, [chooseAction, isTerminalState]);

  // Generate episode key for duplicate detection
  const generateEpisodeKey = useCallback((round: number, episode: number): string => {
    return `${round}-${episode}`;
  }, []);

  // Handle episode completion
  const handleEpisodeCompletion = useCallback((reward: number, cellType: string, newState: number) => {
    // Determine if this is a successful episode (reached goal)
    const success = cellType === 'G';
    if (success) {
      successCountRef.current++;
    }

    // Get current round and episode information
    const currentRound = gameStatsRef.current.currentRound;
    const completedEpisode = gameStatsRef.current.episode; // Episode that just finished
    const isRoundEnd = completedEpisode >= roundConfigRef.current.episodesPerRound;
    const nextEpisode = isRoundEnd ? 1 : completedEpisode + 1; // Next episode number

    // Calculate success rate for the completed episode
    const newSuccessRate = completedEpisode > 0 ? successCountRef.current / completedEpisode : 0;

    // Prepare episode data for callback with correct episode number
    const episodeDataForCallback = {
      episode: completedEpisode, // Use the episode that just finished
      totalReward: gameStatsRef.current.totalReward + episodeStatsRef.current.episodeReward,
      steps: gameStatsRef.current.steps + episodeStatsRef.current.episodeSteps,
      lastReward: reward,
      interventions: gameStatsRef.current.interventions + episodeStatsRef.current.episodeInterventions,
      successRate: newSuccessRate,
      currentRound: currentRound
    };

    // Check if this episode has already been processed to avoid duplicates
    const episodeKey = generateEpisodeKey(currentRound, completedEpisode);
    if (currentEpisodeKeyRef.current !== episodeKey) {
      // Notify parent component about episode completion with correct episode number
      onEpisodeEnd?.(episodeDataForCallback);
      currentEpisodeKeyRef.current = episodeKey;
    }

    // Update game statistics with next episode number
    setGameStats({
      episode: nextEpisode, // Set to next episode number
      totalReward: gameStatsRef.current.totalReward + episodeStatsRef.current.episodeReward,
      steps: gameStatsRef.current.steps + episodeStatsRef.current.episodeSteps,
      lastReward: reward,
      interventions: gameStatsRef.current.interventions + episodeStatsRef.current.episodeInterventions,
      successRate: newSuccessRate,
      currentRound: currentRound
    });

    const currentGameStatus = gameStatusRef.current;
    
    if (isRoundEnd) {
      // Handle round completion
      if (currentGameStatus.isRunning) {
        setGameStatus(prev => ({
          ...prev,
          isRunning: false,
          isPaused: false
        }));
      }

      // Notify parent about round completion after delay
      setTimeout(() => {
        onRoundEnd?.(currentRound);
      }, 150);
    } else if (currentGameStatus.isRunning && !currentGameStatus.isPaused) {
      // Prepare for next episode in the same round
      setTimeout(() => {
        // Reset agent state for new episode
        setAgentState({
          currentState: startState, 
          totalReward: 0,
          steps: 0,
          lastReward: 0,
          isDone: false,
          nextAction: null
        });
        
        // Reset episode-specific statistics
        episodeStatsRef.current = {
          episodeReward: 0,
          episodeSteps: 0,
          episodeInterventions: 0
        };
        
        // Select first action for new episode
        selectNextAction(startState);
      }, 1000);
    }
  }, [onEpisodeEnd, onRoundEnd, startState, selectNextAction, generateEpisodeKey]);

  // Execute the pending action and update environment
  const executePendingAction = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    const currentAgentState = agentStateRef.current;
    
    // Validate pending action
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
      case 0:
        if (currentState % ncol > 0) newState = currentState - 1;
        break;
      case 1:
        if (Math.floor(currentState / ncol) < nrow - 1) newState = currentState + ncol;
        break;
      case 2:
        if (currentState % ncol < ncol - 1) newState = currentState + 1;
        break;
      case 3:
        if (Math.floor(currentState / ncol) > 0) newState = currentState - ncol;
        break;
    }

    if (newState === currentState) {
      console.log(`Invalid move: action ${action} at state ${currentState}`);
    }

    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);
    
    // Update Q-table with experience
    if (updateQValue) {
      updateQValue(currentState, action, reward, newState);
    }
    
    // Mark action vaild
    if (markActionAsExecuted) {
      markActionAsExecuted(currentState); 
    }
    // Update agent state
    setAgentState(prev => ({
      currentState: newState,
      totalReward: prev.totalReward + reward,
      steps: prev.steps + 1,
      lastReward: reward,
      isDone,
      nextAction: null
    }));

    // Update episode statistics
    episodeStatsRef.current.episodeReward += reward;
    episodeStatsRef.current.episodeSteps += 1;

    // Notify parent component about step
    onStep?.(currentState, action, reward, newState);

    pendingActionRef.current = null;

    // Handle terminal state (episode end)
    if (isDone) {
      console.log('=== Terminal State Reached ===');
    console.log('Steps to terminal:', agentStateRef.current?.steps);
    console.log('Reward:', reward);
    console.log('Episode stats before update:', episodeStatsRef.current);
      const { row, col } = getAgentPosition(newState);
      const cellType = config.mapDesc[row][col];
      
      // Handle episode completion
      handleEpisodeCompletion(reward, cellType, newState);
    } else {
      // Continue episode with next action
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
    getAgentPosition, 
    handleEpisodeCompletion,
    selectNextAction
  ]);

  // Start dragging agent (pauses game)
  const startDrag = useCallback(() => {
    setIsDragging(true);
    setGameStatus(prev => ({ ...prev, isPaused: true }));
  }, []);

  // End dragging agent (resumes game)
  const endDrag = useCallback(() => {
    setIsDragging(false);
    setGameStatus(prev => ({ ...prev, isPaused: false }));
  }, []);

  // Start game/training
  const startGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false
    }));
    
    // Select first action if agent is not in terminal state
    if (!agentState.isDone) {
      selectNextAction(agentState.currentState);
    }
  }, [agentState.isDone, agentState.currentState, selectNextAction]);

  // Pause game
  const pauseGame = useCallback(() => {
    setGameStatus(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  // Reset game to initial state
  const resetGame = useCallback(() => {
    // Stop game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    // Reset agent state
    setAgentState({
      currentState: startState, 
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      isDone: false,
      nextAction: null
    });

    // Reset game status
    setGameStatus({
      isRunning: false,
      isPaused: false,
      isIntervening: false,
      isTraining: true
    });

    // Reset game statistics
    setGameStats(prev => ({
      episode: 1,
      totalReward: 0,
      steps: 0,
      lastReward: 0,
      interventions: 0,
      successRate: 0,
      currentRound: prev.currentRound
    }));

    // Reset episode statistics
    episodeStatsRef.current = {
      episodeReward: 0,
      episodeSteps: 0,
      episodeInterventions: 0
    };

    // Reset tracking refs
    successCountRef.current = 0;
    lastStepTimeRef.current = 0;
    pendingActionRef.current = null;
    currentEpisodeKeyRef.current = '';

    // Reset Q-table
    resetQTable?.();
  }, [startState, resetQTable]);

  // Execute single step (for manual control)
  const stepGame = useCallback(() => {
    executePendingAction();
  }, [executePendingAction]);

  // Manual agent state change (for interventions)
  const setAgentStateManually = useCallback((newState: number) => {
    if (gameStatus.isIntervening) return;

    const oldState = agentState.currentState;
    const reward = calculateReward(newState);
    const isDone = isTerminalState(newState);

    setGameStatus(prev => ({ ...prev, isIntervening: true }));

    // Get pending action for intervention recording
    const pendingAction = pendingActionRef.current;
    const interventionAction = pendingAction?.action;
    
    // Apply intervention effect to Q-table
    if (applyIntervention && interventionAction !== undefined) {
      applyIntervention(oldState, newState, reward);
    }

    pendingActionRef.current = null;

    // Update agent state with intervention
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

    const { row, col } = getAgentPosition(newState);
    const cellType = config.mapDesc[row][col];
    
    // Update episode statistics
    if (cellType !== 'H') {
      episodeStatsRef.current.episodeReward += reward;
    }
    episodeStatsRef.current.episodeInterventions += 1;

    // Notify parent about intervention
    onIntervention?.(oldState, newState);

    // Handle terminal state after intervention
    if (isDone) {
      const success = cellType === 'G';
      
      if (success) {
        successCountRef.current++;
      }

      const currentRound = gameStats.currentRound;
      const currentEpisode = gameStats.episode;
      const episodeKey = generateEpisodeKey(currentRound, currentEpisode);
      const newSuccessRate = currentEpisode > 0 ? successCountRef.current / currentEpisode : 0;
      const isRoundEnd = currentEpisode >= roundConfigRef.current.episodesPerRound;

      // Update statistics and trigger episode end
      setGameStats(prev => {
        const newStats = {
          episode: prev.episode,
          totalReward: prev.totalReward + episodeStatsRef.current.episodeReward,
          steps: prev.steps + episodeStatsRef.current.episodeSteps,
          lastReward: reward,
          interventions: prev.interventions + episodeStatsRef.current.episodeInterventions,
          successRate: newSuccessRate,
          currentRound: prev.currentRound
        };
        
        // Check if this episode has already been processed
        if (currentEpisodeKeyRef.current !== episodeKey) {
          onEpisodeEnd?.(newStats);
          currentEpisodeKeyRef.current = episodeKey;
        }

        return newStats;
      });

      if (isRoundEnd && gameStatus.isRunning) {
        setGameStatus(prev => ({
          ...prev,
          isRunning: false,
          isPaused: true
        }));

        // Notify round end
        setTimeout(() => {
          onRoundEnd?.(gameStats.currentRound);
        }, 100);
      } else if (gameStatus.isRunning) {
        // Start new episode after delay
        setTimeout(() => {
          setAgentState({
            currentState: startState, 
            totalReward: 0,
            steps: 0,
            lastReward: reward, 
            isDone: false,
            nextAction: null
          });
          
          setGameStats(prev => ({
            ...prev,
            episode: prev.episode + 1
          }));
          
          episodeStatsRef.current = {
            episodeReward: 0,
            episodeSteps: 0,
            episodeInterventions: 0
          };
          
          selectNextAction(startState);
        }, 1500);
      }
    } else {
      // Continue with next action
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
    calculateReward, 
    isTerminalState, 
    applyIntervention, 
    onIntervention, 
    onEpisodeEnd,
    getAgentPosition, 
    config.mapDesc, 
    gameStats.currentRound,
    gameStats.episode,
    startState,
    selectNextAction,
    onRoundEnd,
    roundConfigRef,
    generateEpisodeKey
  ]);

  // Update round configuration
  const setRoundConfig = useCallback((config: { totalRounds?: number; episodesPerRound?: number }) => {
    if (config.totalRounds !== undefined) {
      roundConfigRef.current.totalRounds = config.totalRounds;
    }
    if (config.episodesPerRound !== undefined) {
      roundConfigRef.current.episodesPerRound = config.episodesPerRound;
    }
  }, []);

  // Sync refs with state
  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    gameStatsRef.current = gameStats;
  }, [gameStats]);

  // // Select next action when game starts or resumes
  // useEffect(() => {
  //   if (gameStatus.isRunning && !gameStatus.isPaused && !agentState.isDone) {
  //     selectNextAction(agentState.currentState);
  //   }
  // }, [gameStatus.isRunning, gameStatus.isPaused, agentState.isDone, selectNextAction]);

  // Main game loop for automatic step execution
  useEffect(() => {
    const gameLoop = (currentTime: number) => {
      const currentGameStatus = gameStatusRef.current; 
      
      // Skip if game is not active
      if (!currentGameStatus.isRunning || 
          currentGameStatus.isPaused || 
          currentGameStatus.isIntervening || 
          isDragging) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Execute action at configured interval
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
    selectNextAction,
    prepareNewRound,
    setRoundConfig,
    getRoundConfig: () => roundConfigRef.current,
  };
};