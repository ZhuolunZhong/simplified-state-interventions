// src/components/FrozenLakeBoard.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FrozenLakeBoardProps, Position, CellType, Action } from '../types';
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
  announcedAction, // Changed from predictedAction to announcedAction
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

  const getClosestGridPosition = useCallback((clientX: number, clientY: number): Position => {
    if (!boardRef.current) return { row: 0, col: 0 };
    
    const rect = boardRef.current.getBoundingClientRect();
    const contentX = clientX - rect.left;
    const contentY = clientY - rect.top;
    
    const col = Math.max(0, Math.min(ncol - 1, Math.floor(contentX / cellSize)));
    const row = Math.max(0, Math.min(nrow - 1, Math.floor(contentY / cellSize)));
    
    return { row, col };
  }, [nrow, ncol, cellSize]);

  // Get cell emoji
  const getCellEmoji = useCallback((cellType: CellType): string => {
    switch (cellType) {
      case 'S': return '🏁';
      case 'F': return '❄️';
      case 'H': return '🕳️';
      case 'G': return '🎯';
      default: return '';
    }
  }, []);

  // Drag and drop handlers
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

  const handleMouseDown = useCallback((event: React.MouseEvent, state: number) => {
    if (state !== agentState) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setDragging(true);
    setDragStartState(state);
    setMousePosition({ x: event.clientX, y: event.clientY });
    
    const gridPos = getGridPositionFromPixel(event.clientX, event.clientY);
    setDragPosition(gridPos);
    
    onDragStart?.();
  }, [agentState, onDragStart, getGridPositionFromPixel]);

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

  const renderCell = useCallback((row: number, col: number) => {
    const state = positionToState({ row, col });
    const cellType = getCellType(row, col);
    const isAgentHere = !dragging && agentState === state;
    const isDragTarget = dragging && dragPosition?.row === row && dragPosition?.col === col;
    
    // Check if this is the agent's current position and has announced action
    const showAnnouncement = isAgentHere && announcedAction && announcedAction.action !== undefined;
    
    return (
      <div
        key={`${row}-${col}`}
        className={`cell cell-${cellType.toLowerCase()} ${
          isAgentHere ? 'cell-with-agent' : ''
        } ${isDragTarget ? 'cell-drag-target' : ''}`}
        onMouseDown={(e) => handleMouseDown(e, state)}
        onClick={(e) => {
          const position = getAgentPosition(state);
          onCellClick?.(state, position);
        }}
        title={`State: ${state}, Type: ${cellType}${
          showAnnouncement ? `\n${getAnnouncementTooltip()}` : ''
        }`}
        style={{ margin: 0, padding: 0 }}
      >
        <div className="cell-content">
          {isAgentHere && !dragging ? '🤖' : getCellEmoji(cellType)}
        </div>
        
        {/* Action announcement indicator */}
        {showAnnouncement && (
          <div className={`action-announcement ${getActionColorClass(announcedAction.type)}`}>
            <div className="announcement-arrow">
              {getActionDirection(announcedAction.action)}
            </div>
            <div className="announcement-type">
              {announcedAction.type === 'exploration' ? '🔍' : '🎯'}
            </div>
          </div>
        )}
        
        {/* Drag target highlight */}
        {isDragTarget && (
          <div className="drag-target-overlay"></div>
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
    getActionColorClass 
  ]);

  return (
    <div 
      className={`frozen-lake-board ${dragging ? 'dragging' : ''}`}
      ref={boardRef}
      style={{ margin: 0, padding: 0 }}
    >
      <div className="board-container" style={{ position: 'relative', margin: 0, padding: 0 }}>
        {Array.from({ length: nrow }, (_, row) => (
          <div key={row} className="grid-row" style={{ margin: 0, padding: 0 }}>
            {Array.from({ length: ncol }, (_, col) => renderCell(row, col))}
          </div>
        ))}
        {renderDraggingAgent()}
      </div>
      
      {dragging && (
        <div className="drag-hint">
          🎯 Drag agent to target position for intervention
          {dragPosition && (
            <span className="position-info">
              Position: ({dragPosition.row}, {dragPosition.col})
            </span>
          )}
        </div>
      )}
    </div>
  );
};