// src/components/FrozenLakeBoard.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FrozenLakeBoardProps, Position, CellType, Action, QTable } from '../types';
import './FrozenLakeBoard.css';

export const FrozenLakeBoard: React.FC<FrozenLakeBoardProps> = ({
  mapDesc,
  agentState,
  onCellClick,
  onAgentDrop,
  isIntervening = false,
  qtable,
  onDragStart,
  onDragEnd,
  announcedAction,
  isGameRunning = false,
  isGamePaused = false,
}) => {
  const [dragging, setDragging] = useState(false);
  const [dragStartState, setDragStartState] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Get map dimensions
  const nrow = mapDesc.length;
  const ncol = mapDesc[0].length;
  const cellSize = 60;

  const shouldShowQTable = useMemo(() => {
    if (typeof window === 'undefined') return true;
    
    try {
      const userId = sessionStorage.getItem('user_id');
      
      if (!userId) return true;
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) return true;
      const positionInCycle = ((userIdNum - 1) % 8) + 1;
      return positionInCycle <= 4;
    } catch (error) {
      console.error('Error determining Q-table visibility:', error);
      return true;
    }
  }, []);

  // Determine if drag is currently allowed
  const isDragAllowed = isGameRunning && !isGamePaused && !isIntervening;

  // Get agent position
  const getAgentPosition = useCallback((state: number): Position => {
    return {
      row: Math.floor(state / ncol),
      col: state % ncol
    };
  }, [ncol]);

  // Convert position to state number
  const positionToState = useCallback((position: Position): number => {
    return position.row * ncol + position.col;
  }, [ncol]);

  // Get cell type
  const getCellType = useCallback((row: number, col: number): CellType => {
    return mapDesc[row][col] as CellType;
  }, [mapDesc]);

  // Get action direction arrow
  const getActionDirection = useCallback((action: Action): string => {
    const directions = { 
      0: '←', // Left
      1: '↓', // Down
      2: '→', // Right  
      3: '↑'  // Up
    };
    return directions[action] || '?';
  }, []);

  // Get color class for action type
  const getActionColorClass = useCallback((type: 'exploration' | 'exploitation'): string => {
    switch (type) {
      case 'exploration':
        return 'action-exploration';
      case 'exploitation':
        return 'action-exploitation';
      default:
        return 'action-none';
    }
  }, []);

  // Get tooltip text for announced action
  const getAnnouncementTooltip = useCallback(() => {
    if (!announcedAction) return '';
    
    const direction = getActionDirection(announcedAction.action);
    const typeText = announcedAction.type === 'exploration' ? 'Exploration' : 'Exploitation';
    
    return `Next action: ${direction} (${typeText})`;
  }, [announcedAction, getActionDirection]);

  // Get tooltip text for disabled state
  const getDisabledTooltip = useCallback(() => {
    if (!isGameRunning) return 'Start game to move agent';
    if (isGamePaused) return 'Game is paused';
    if (isIntervening) return 'Intervention in progress';
    return '';
  }, [isGameRunning, isGamePaused, isIntervening]);

  // Get grid position from pixel coordinates
  const getGridPositionFromPixel = useCallback((clientX: number, clientY: number): Position | null => {
    if (!boardRef.current) return null;
    
    const rect = boardRef.current.getBoundingClientRect();
    
    const contentX = clientX - rect.left;
    const contentY = clientY - rect.top;
    
    if (contentX < 0 || contentY < 0 || contentX >= rect.width || contentY >= rect.height) {
      return null;
    }
    
    const col = Math.floor(contentX / cellSize);
    const row = Math.floor(contentY / cellSize);
    
    if (row >= 0 && row < nrow && col >= 0 && col < ncol) {
      return { row, col };
    }
    
    return null;
  }, [nrow, ncol, cellSize]);

  // Get closest valid grid position
  const getClosestGridPosition = useCallback((clientX: number, clientY: number): Position => {
    if (!boardRef.current) return { row: 0, col: 0 };
    
    const rect = boardRef.current.getBoundingClientRect();
    const contentX = clientX - rect.left;
    const contentY = clientY - rect.top;
    
    const col = Math.max(0, Math.min(ncol - 1, Math.floor(contentX / cellSize)));
    const row = Math.max(0, Math.min(nrow - 1, Math.floor(contentY / cellSize)));
    
    return { row, col };
  }, [nrow, ncol, cellSize]);

  // Get cell emoji representation
  const getCellEmoji = useCallback((cellType: CellType): string => {
    switch (cellType) {
      case 'S': return '🏁';
      case 'F': return '❄️';
      case 'H': return '🕳️';
      case 'G': return '🎯';
      default: return '';
    }
  }, []);

  // Drag and drop event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!dragging) return;
      
      setMousePosition({ x: event.clientX, y: event.clientY });
      
      const gridPos = getGridPositionFromPixel(event.clientX, event.clientY);
      setDragPosition(gridPos);
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (!dragging || dragStartState === null) return;
      
      const gridPos = getClosestGridPosition(event.clientX, event.clientY);
      const toState = positionToState(gridPos);
      
      if (toState !== dragStartState && onAgentDrop) {
        onAgentDrop(dragStartState, toState);
      }
      
      setDragging(false);
      setDragStartState(null);
      setDragPosition(null);
      onDragEnd?.();
    };

    if (dragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragging, dragStartState, onAgentDrop, onDragEnd, getGridPositionFromPixel, getClosestGridPosition, positionToState]);

  // Handle mouse down for dragging agent
  const handleMouseDown = useCallback((event: React.MouseEvent, state: number) => {
    if (!isDragAllowed) {
      console.log('Drag not allowed - game state:', { 
        isRunning: isGameRunning, 
        isPaused: isGamePaused, 
        isIntervening 
      });
      return;
    }
    
    if (state !== agentState) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setDragging(true);
    setDragStartState(state);
    setMousePosition({ x: event.clientX, y: event.clientY });
    
    const gridPos = getGridPositionFromPixel(event.clientX, event.clientY);
    setDragPosition(gridPos);
    
    onDragStart?.();
  }, [agentState, isDragAllowed, isGameRunning, isGamePaused, isIntervening, onDragStart, getGridPositionFromPixel]);

  // ==================== Q-TABLE VISUALIZATION LOGIC ====================

  // Calculate Q-table visualization data
  const qtableData = useMemo(() => {
    if (!qtable) return null;

    // Get available actions for each state (considering boundaries)
    const getAvailableActions = (state: number): Action[] => {
      const row = Math.floor(state / ncol);
      const col = state % ncol;
      const availableActions: Action[] = [];
      
      if (col > 0) availableActions.push(0);
      if (row < nrow - 1) availableActions.push(1);
      if (col < ncol - 1) availableActions.push(2);
      if (row > 0) availableActions.push(3);
      
      return availableActions;
    };

    // Calculate policy data for each state
    const policyData = qtable.map((stateQValues, state) => {
      const availableActions = getAvailableActions(state);
      
      if (availableActions.length === 0) {
        return {
          bestAction: 0 as Action,
          maxQValue: 0,
          availableActions: [],
          allEqual: true,
          qValues: stateQValues
        };
      }

      // Only consider available actions
      const availableQValues = availableActions.map(action => ({
        action,
        qValue: stateQValues[action]
      }));

      const maxQValue = Math.max(...availableQValues.map(item => item.qValue));
      const minQValue = Math.min(...availableQValues.map(item => item.qValue));
      const allEqual = Math.abs(maxQValue - minQValue) < 0.001;

      const bestActions = availableQValues
        .filter(({ qValue }) => qValue === maxQValue)
        .map(({ action }) => action);

      const bestAction = bestActions[0] || availableActions[0];
      
      return {
        bestAction,
        maxQValue,
        availableActions,
        allEqual,
        qValues: stateQValues
      };
    });

    // Calculate Q-value range for color mapping
    const allQValues = policyData.map(data => data.maxQValue);
    const qValueRange = {
      min: Math.min(...allQValues),
      max: Math.max(...allQValues)
    };

    return { policyData, qValueRange };
  }, [qtable, nrow, ncol]);

  // Calculate background color based on Q-value
  const getQValueColor = useCallback((qValue: number, qValueRange: { min: number; max: number }): string => {
    if (qValueRange.max === qValueRange.min) return 'hsl(120, 60%, 85%)';
    
    const intensity = (qValue - qValueRange.min) / (qValueRange.max - qValueRange.min);
    
    const hue = 120; 
    const saturation = 60; 
    const lightness = 85 - (intensity * 50); 
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, []);

  // Render Q-table cell
  const renderQTableCell = useCallback((row: number, col: number) => {
    if (!qtableData || !shouldShowQTable) return null;
    
    const { policyData, qValueRange } = qtableData;
    const state = row * ncol + col;
    const data = policyData[state];
    const cellType = getCellType(row, col);
    
    // Terminal states
    if (cellType === 'H' || cellType === 'G') {
      return (
        <div
          key={`q-${row}-${col}`}
          className={`qtable-cell terminal-cell ${
            cellType === 'H' ? 'hole-cell' : 'goal-cell'
          }`}
        >
          {cellType === 'H' ? '🕳️' : '🎯'}
        </div>
      );
    }

    const backgroundColor = getQValueColor(data.maxQValue, qValueRange);
    const isAgentHere = agentState === state;

    const shouldShowArrow = !data.allEqual && data.availableActions.length > 0;

    return (
      <div
        key={`q-${row}-${col}`}
        className={`qtable-cell ${isAgentHere ? 'agent-cell' : ''} ${
          data.availableActions.length === 0 ? 'no-actions' : ''
        }`}
        style={{ backgroundColor }}
        title={`State ${state}: Q=${data.maxQValue.toFixed(2)}, Action=${getActionDirection(data.bestAction)}`}
      >
        <div className="qtable-cell-content">
          {shouldShowArrow ? (
            <div className="qtable-action-arrow">
              {getActionDirection(data.bestAction || 0)}
            </div>
          ) : data.availableActions.length > 0 ? (
            <div className="qtable-na-indicator">N/A</div>
          ) : (
            <div className="qtable-no-actions">✕</div>
          )}
        </div>
        {isAgentHere && <div className="agent-indicator">📍</div>}
      </div>
    );
  }, [qtableData, ncol, getCellType, getQValueColor, agentState, getActionDirection]);

  // Render dragging agent overlay
  const renderDraggingAgent = useCallback(() => {
    if (!dragging) return null;
    
    const style: React.CSSProperties = {
      position: 'fixed',
      left: mousePosition.x - cellSize / 2,
      top: mousePosition.y - cellSize / 2,
      width: cellSize,
      height: cellSize,
      pointerEvents: 'none',
      zIndex: 1000,
      fontSize: '24px',
      textAlign: 'center',
      lineHeight: `${cellSize}px`,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '8px',
      border: '2px solid #007acc',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      margin: 0,
      padding: 0
    };
    
    return (
      <div className="dragging-agent" style={style}>
        🤖
      </div>
    );
  }, [dragging, mousePosition, cellSize]);

  // Render game cell
  const renderCell = useCallback((row: number, col: number) => {
    const state = positionToState({ row, col });
    const cellType = getCellType(row, col);
    const isAgentHere = !dragging && agentState === state;
    const isDragTarget = dragging && dragPosition?.row === row && dragPosition?.col === col;
    
    const showAnnouncement = isAgentHere && announcedAction && announcedAction.action !== undefined;
    const isAgentDisabled = isAgentHere && !isDragAllowed;
    
    return (
      <div
        key={`${row}-${col}`}
        className={`cell cell-${cellType.toLowerCase()} ${
          isAgentHere ? 'cell-with-agent' : ''
        } ${isDragTarget ? 'cell-drag-target' : ''} ${
          isAgentDisabled ? 'cell-disabled' : ''
        }`}
        onMouseDown={(e) => handleMouseDown(e, state)}
        onClick={(e) => {
          const position = getAgentPosition(state);
          onCellClick?.(state, position);
        }}
        // title={
        //   isAgentDisabled 
        //     ? getDisabledTooltip()
        //     : `State: ${state}, Type: ${cellType}${
        //         showAnnouncement ? `\n${getAnnouncementTooltip()}` : ''
        //       }`
        // }
        style={{ margin: 0, padding: 0 }}
      >
        <div className="cell-content">
          {isAgentHere && !dragging ? '🤖' : getCellEmoji(cellType)}
        </div>
        
        {showAnnouncement && (
          <div className={`action-announcement ${getActionColorClass(announcedAction.type)}`}>
            <div className="announcement-arrow">
              {getActionDirection(announcedAction.action)}
            </div>
          </div>
        )}
        
        {isDragTarget && (
          <div className="drag-target-overlay"></div>
        )}
        
        {isAgentDisabled && (
          <div className="disabled-overlay">
            <div className="lock-icon">🔒</div>
          </div>
        )}
      </div>
    );
  }, [
    positionToState, 
    getCellType, 
    dragging, 
    agentState, 
    dragPosition, 
    handleMouseDown,
    getAgentPosition, 
    onCellClick,
    getCellEmoji,
    announcedAction, 
    getAnnouncementTooltip, 
    getActionDirection, 
    getActionColorClass,
    isDragAllowed,
    getDisabledTooltip
  ]);

  return (
    <div 
      className={`frozen-lake-board ${dragging ? 'dragging' : ''} ${
        !isDragAllowed ? 'board-disabled' : ''
      }`}
      ref={boardRef}
      style={{ margin: 0, padding: 0 }}
    >
      <div className="board-container">
        {/* Game Map Section */}
        <div className="game-grid-section">
          <div className="section-title">Game Map</div>
          <div className="grid-container">
            {Array.from({ length: nrow }, (_, row) => (
              <div key={`game-row-${row}`} className="grid-row">
                {Array.from({ length: ncol }, (_, col) => renderCell(row, col))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Q-table Visualization Section */}
        {qtable && qtableData && shouldShowQTable && (
          <div className="qtable-section">
            <div className="section-title">Current best actions in each square for the agent</div>
            <div className="qtable-grid">
              {Array.from({ length: nrow }, (_, row) => (
                <div key={`qtable-row-${row}`} className="qtable-row">
                  {Array.from({ length: ncol }, (_, col) => renderQTableCell(row, col))}
                </div>
              ))}
            </div>
             <div className="qtable-legends">
              <div className="gradient-legend">
                <div className="legend-title">Heatmap regarding the belief strength:</div>
                <div className="gradient-bar">
                  <div className="gradient-fill"></div>
                </div>
                <div className="legend-labels">
                  <span className="legend-label">Weak</span>
                  <span className="legend-label">Strong</span>
                </div>
              </div>

            </div>
          </div>
        )}
        
        {renderDraggingAgent()}
      </div>
      
      {/* Drag hint message */}
      {dragging && (
        <div className="drag-hint">
          Drag agent to the desired position and release it for intervention
          {dragPosition && (
            <span className="position-info">
              Position: ({dragPosition.row}, {dragPosition.col})
            </span>
          )}
        </div>
      )}
      
      {/* Disabled state hint */}
      {/* {!isDragAllowed && !dragging && (
        <div className="disabled-hint">
          {!isGameRunning ? 'Start game to move agent' :
           isGamePaused ? 'Game is paused - resume to move agent' :
           isIntervening ? 'Intervention in progress - please wait' :
           'Ready to move agent'}
        </div>
      )} */}
    </div>
  );
};