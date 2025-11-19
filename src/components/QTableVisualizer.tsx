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

  // Get best action and Q-value for each state
  const getPolicyData = useMemo(() => {
    return qtable.map((stateQValues, state) => {
      const maxQValue = Math.max(...stateQValues);
      const bestAction = stateQValues.indexOf(maxQValue) as Action;
      return {
        state,
        bestAction,
        maxQValue,
        qValues: stateQValues
      };
    });
  }, [qtable]);

  // Get Q-value range for color mapping
  const qValueRange = useMemo(() => {
    const allQValues = qtable.flat();
    return {
      min: Math.min(...allQValues),
      max: Math.max(...allQValues)
    };
  }, [qtable]);

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

    return (
      <div
        key={`${row}-${col}`}
        className={`qtable-cell ${isCurrentState ? 'current-state' : ''}`}
        style={{ backgroundColor }}
        title={`State ${state}
Best Action: ${actionDirections[policyData.bestAction]}
Q-value: ${policyData.maxQValue.toFixed(3)}
[Left:${policyData.qValues[0].toFixed(2)} Down:${policyData.qValues[1].toFixed(2)} Right:${policyData.qValues[2].toFixed(2)} Up:${policyData.qValues[3].toFixed(2)}]`}
      >
        <div className="qtable-cell-content">
          <div className="action-arrow">
            {actionDirections[policyData.bestAction]}
          </div>
          <div className="q-value">
            {policyData.maxQValue.toFixed(2)}
          </div>
        </div>
        {isCurrentState && <div className="current-state-indicator">📍</div>}
      </div>
    );
  };

  // Render Q-value legend
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

      {/* Detailed Q-value panel */}
      {currentState !== undefined && (
        <div className="detailed-view">
          <h4>Detailed Q-values for State {currentState}</h4>
          <div className="q-value-details">
            {getPolicyData[currentState].qValues.map((qValue, action) => (
              <div key={action} className="action-q-value">
                <span className="action-direction">{actionDirections[action as Action]}</span>
                <span className="action-label">
                  {action === 0 ? 'Left' : action === 1 ? 'Down' : action === 2 ? 'Right' : 'Up'}
                </span>
                <span className="q-value-number">{qValue.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};