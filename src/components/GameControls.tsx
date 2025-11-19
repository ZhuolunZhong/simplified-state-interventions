// src/components/GameControls.tsx
import React, { useEffect } from 'react'; // Added useEffect import
import { GameControlsProps, InterventionRule } from '../types';
import './GameControls.css';

export const GameControls: React.FC<GameControlsProps> = ({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onReset,
  onStep,
  interventionRule,
  onRuleChange,
  episode
}) => {
  // Intervention rule options
  const interventionRules: { value: InterventionRule; label: string; description: string }[] = [
    {
      value: 'suggestion',
      label: 'Suggestion Rule',
      description: 'Update Q-value based on movement direction'
    },
    {
      value: 'reset',
      label: 'Reset Rule', 
      description: 'Update Q-value using target state reward'
    },
    {
      value: 'interrupt',
      label: 'Interrupt Rule',
      description: 'Ignore current timestep'
    },
    {
      value: 'impede',
      label: 'Impede Rule',
      description: 'Apply negative reward to original action'
    }
  ];

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger when no form element has focus
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLSelectElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ': // Spacebar - Pause/Resume
          event.preventDefault();
          if (isRunning && !isPaused) {
            // Running → Pause
            onPause();
          } else if (isRunning && isPaused) {
            // Paused → Resume
            onStart();
          } else {
            // Stopped → Start
            onStart();
          }
          break;
        
        case 'r': // R key - Reset
        case 'R':
          event.preventDefault();
          onReset();
          break;
        
        case 's': // S key - Single step
        case 'S':
          event.preventDefault();
          if (!isRunning || isPaused) {
            onStep();
          }
          break;
          
        case 'Escape': // ESC key - Stop
          event.preventDefault();
          if (isRunning) {
            onPause();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, isPaused, onStart, onPause, onReset, onStep]);

  // Handle rule change
  const handleRuleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onRuleChange(event.target.value as InterventionRule);
  };

  // Get current rule description
  const getCurrentRuleDescription = () => {
    const currentRule = interventionRules.find(rule => rule.value === interventionRule);
    return currentRule?.description || '';
  };

  return (
    <div className="game-controls">
      {/* Main control area */}
      <div className="control-section">
        <h3>Game Controls</h3>
        <div className="control-buttons">
          {!isRunning ? (
            <button
              className="control-button start-button"
              onClick={onStart}
              title="Start training (Spacebar)"
            >
              ▶️ Start
            </button>
          ) : isPaused ? (
            <button
              className="control-button resume-button"
              onClick={onStart}
              title="Resume training (Spacebar)"
            >
              ⏯️ Resume
            </button>
          ) : (
            <button
              className="control-button pause-button"
              onClick={onPause}
              title="Pause training (Spacebar)"
            >
              ⏸️ Pause
            </button>
          )}
          
          <button
            className="control-button step-button"
            onClick={onStep}
            disabled={isRunning && !isPaused}
            title="Single step (S key)"
          >
            ⏭️ Step
          </button>
          
          <button
            className="control-button reset-button"
            onClick={onReset}
            title="Reset game (R key)"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Intervention rule selection area */}
      <div className="control-section">
        <h3>Intervention Rules</h3>
        <div className="rule-selection">
          <select
            className="rule-select"
            value={interventionRule}
            onChange={handleRuleChange}
            title="Select intervention rule"
          >
            {interventionRules.map(rule => (
              <option key={rule.value} value={rule.value}>
                {rule.label}
              </option>
            ))}
          </select>
          
          <div className="rule-description">
            {getCurrentRuleDescription()}
          </div>
        </div>
        
        {/* Rule quick selection buttons */}
        <div className="rule-quick-buttons">
          {interventionRules.map(rule => (
            <button
              key={rule.value}
              className={`rule-quick-button ${
                interventionRule === rule.value ? 'active' : ''
              }`}
              onClick={() => onRuleChange(rule.value)}
              title={rule.description}
            >
              {rule.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      <div className="control-section">
        <h3>Status Indicators</h3>
        <div className="status-indicators">
          <div className="status-item">
            <span className="status-label">Current Episode:</span>
            <span className="status-value">{episode}</span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Run Status:</span>
            <span className={`status-value status-${isRunning ? (isPaused ? 'paused' : 'running') : 'stopped'}`}>
              {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Intervention Rule:</span>
            <span className="status-value rule-indicator">
              {interventionRules.find(r => r.value === interventionRule)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Operation hints - Updated to include shortcuts */}
      <div className="control-section hints">
        <h4>Operation Hints</h4>
        <ul className="hints-list">
          <li>🎯 <strong>Spacebar</strong> - Start/Pause training</li>
          <li>🖱️ Drag agent on map for intervention</li>
          <li>⚡ <strong>S key</strong> - Single step execution</li>
          <li>🔄 <strong>R key</strong> - Reset game</li>
          <li>ESC - Stop training</li>
        </ul>
      </div>
    </div>
  );
};