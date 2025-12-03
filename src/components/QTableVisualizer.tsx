// src/components/QTableVisualizer.tsx
import React, { useMemo } from 'react';
import { QTableVisualizerProps, Position, Action } from '../types';
import './QTableVisualizer.css';

export const QTableVisualizer: React.FC<QTableVisualizerProps> = ({
  qtable,
  mapDesc,
  currentState
}) => {
  // Get map dimensions
  const nrow = mapDesc.length;
  const ncol = mapDesc[0].length;

  // Action direction mapping
  const actionDirections = useMemo(() => ({
    0: '←', // Left
    1: '↓', // Down
    2: '→', // Right  
    3: '↑'  // Up
  }), []);

  // 🎯 NEW: Get available actions for a state (considering boundaries)
  const getAvailableActions = useMemo(() => {
    return qtable.map((_, state) => {
      const row = Math.floor(state / ncol);
      const col = state % ncol;
      const availableActions: Action[] = [];
      
      // Check each direction for availability (not out of bounds)
      if (col > 0) availableActions.push(0); // Left
      if (row < nrow - 1) availableActions.push(1); // Down
      if (col < ncol - 1) availableActions.push(2); // Right
      if (row > 0) availableActions.push(3); // Up
      
      return availableActions;
    });
  }, [qtable, nrow, ncol]);

  // 🎯 UPDATED: Get best action and Q-value for each state (considering available actions only)
  const getPolicyData = useMemo(() => {
    return qtable.map((stateQValues, state) => {
      const availableActions = getAvailableActions[state];
      
      // If no available actions (shouldn't happen), return default
      if (availableActions.length === 0) {
        return {
          state,
          bestAction: 0 as Action,
          maxQValue: 0,
          qValues: stateQValues,
          availableActions: []
        };
      }

      // 🎯 KEY CHANGE: Only consider available actions when finding best action
      const availableQValues = availableActions.map(action => ({
        action,
        qValue: stateQValues[action]
      }));

      // Find maximum Q-value among available actions
      const maxQValue = Math.max(...availableQValues.map(item => item.qValue));
      
      // Select actions with maximum Q-value (there might be multiple)
      const bestActions = availableQValues
        .filter(({ qValue }) => qValue === maxQValue)
        .map(({ action }) => action);

      // For display, just pick the first best action
      const bestAction = bestActions[0] || availableActions[0];
      
      return {
        state,
        bestAction,
        maxQValue,
        qValues: stateQValues,
        availableActions
      };
    });
  }, [qtable, getAvailableActions]);

  // Get Q-value range for color mapping (considering only available actions)
  const qValueRange = useMemo(() => {
    const allQValues = getPolicyData.map(data => data.maxQValue);
    return {
      min: Math.min(...allQValues),
      max: Math.max(...allQValues)
    };
  }, [getPolicyData]);

  // Calculate color intensity for Q-value (0-1)
  const getQValueIntensity = (qValue: number): number => {
    if (qValueRange.max === qValueRange.min) return 0.5;
    return (qValue - qValueRange.min) / (qValueRange.max - qValueRange.min);
  };

  // Get cell background color
  const getCellBackgroundColor = (qValue: number): string => {
    const intensity = getQValueIntensity(qValue);
    // Gradient from blue (low) to red (high)
    const hue = (1 - intensity) * 240; // Blue(240°) to Red(0°)
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Check if an action is available
  const isActionAvailable = (state: number, action: Action): boolean => {
    return getPolicyData[state].availableActions.includes(action);
  };

  // Render single Q-table cell
  const renderQTableCell = (row: number, col: number) => {
    const state = row * ncol + col;
    const policyData = getPolicyData[state];
    const cellType = mapDesc[row][col];
    
    // Special handling for terminal states
    if (cellType === 'H' || cellType === 'G') {
      return (
        <div
          key={`${row}-${col}`}
          className={`qtable-cell terminal cell-${cellType.toLowerCase()} ${
            state === currentState ? 'current-state' : ''
          }`}
        >
          <div className="terminal-content">
            {cellType === 'H' ? '🕳️' : '🎯'}
          </div>
        </div>
      );
    }

    const isCurrentState = state === currentState;
    const backgroundColor = getCellBackgroundColor(policyData.maxQValue);

    // Build tooltip with availability information
    const tooltipLines = [
      `State: ${state}`,
      `Best Available Action: ${actionDirections[policyData.bestAction]}`,
      `Q-value: ${policyData.maxQValue.toFixed(3)}`,
      '---',
      'All Actions:',
      `← Left: ${policyData.qValues[0].toFixed(2)} ${isActionAvailable(state, 0) ? '(available)' : '(unavailable)'}`,
      `↓ Down: ${policyData.qValues[1].toFixed(2)} ${isActionAvailable(state, 1) ? '(available)' : '(unavailable)'}`,
      `→ Right: ${policyData.qValues[2].toFixed(2)} ${isActionAvailable(state, 2) ? '(available)' : '(unavailable)'}`,
      `↑ Up: ${policyData.qValues[3].toFixed(2)} ${isActionAvailable(state, 3) ? '(available)' : '(unavailable)'}`,
      '---',
      `Available Actions: ${policyData.availableActions.map(a => actionDirections[a]).join(', ')}`
    ];

    return (
      <div
        key={`${row}-${col}`}
        className={`qtable-cell ${isCurrentState ? 'current-state' : ''} ${
          policyData.availableActions.length === 0 ? 'no-actions' : ''
        }`}
        style={{ backgroundColor }}
        title={tooltipLines.join('\n')}
      >
        <div className="qtable-cell-content">
          <div className="action-arrow">
            {policyData.availableActions.length > 0 
              ? actionDirections[policyData.bestAction]
              : '✕'}
          </div>
          <div className="q-value">
            {policyData.maxQValue.toFixed(2)}
          </div>
        </div>
        {isCurrentState && <div className="current-state-indicator">📍</div>}
        
        {policyData.availableActions.length < 4 && (
          <div className="availability-badge">
            {policyData.availableActions.length}/4
          </div>
        )}
      </div>
    );
  };

  // Render Q-value legend (updated)
  const renderLegend = () => (
    <div className="qtable-legend">
      <h4>Q-value Legend</h4>
      <div className="legend-gradient">
        <span>Low {qValueRange.min.toFixed(2)}</span>
        <div className="gradient-bar" />
        <span>High {qValueRange.max.toFixed(2)}</span>
      </div>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-color current-state-indicator">📍</div>
          <span>Current State</span>
        </div>
        <div className="legend-item">
          <div className="legend-color terminal-hole">🕳️</div>
          <span>Hole (Terminal)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color terminal-goal">🎯</div>
          <span>Goal (Terminal)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color unavailable-action">✕</div>
          <span>No Available Actions</span>
        </div>
        <div className="legend-item">
          <div className="legend-color availability-badge">2/4</div>
          <span>Limited Actions</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="qtable-visualizer">
      <div className="visualizer-header">
        <h3>Q-table Visualization</h3>
        <div className="stats-overview">
          <span>Q-value Range: {qValueRange.min.toFixed(2)} to {qValueRange.max.toFixed(2)}</span>
          <span>States: {qtable.length}</span>
          <span>Map: {nrow}×{ncol}</span>
        </div>
      </div>

      <div className="qtable-grid-container">
        <div 
          className="qtable-grid"
          style={{
            gridTemplateColumns: `repeat(${ncol}, 80px)`,
            gridTemplateRows: `repeat(${nrow}, 80px)`
          }}
        >
          {Array.from({ length: nrow }, (_, row) =>
            Array.from({ length: ncol }, (_, col) => renderQTableCell(row, col))
          )}
        </div>
        
        {renderLegend()}
      </div>

      {/* Detailed Q-value panel (updated) */}
      {currentState !== undefined && (
        <div className="detailed-view">
          <h4>Detailed Q-values for State {currentState}</h4>
          <div className="q-value-details">
            {getPolicyData[currentState].qValues.map((qValue, action) => {
              const isAvailable = isActionAvailable(currentState, action as Action);
              return (
                <div 
                  key={action} 
                  className={`action-q-value ${isAvailable ? 'available' : 'unavailable'}`}
                  title={isAvailable ? 'Available action' : 'Unavailable action (out of bounds)'}
                >
                  <span className="action-direction">{actionDirections[action as Action]}</span>
                  <span className="action-label">
                    {action === 0 ? 'Left' : action === 1 ? 'Down' : action === 2 ? 'Right' : 'Up'}
                    {!isAvailable && ' (✕)'}
                  </span>
                  <span className="q-value-number">{qValue.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
          <div className="availability-summary">
            <p>Available Actions: {getPolicyData[currentState].availableActions.map(a => 
              actionDirections[a]).join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
};