// src/components/GameControls.tsx
import React, { useEffect } from 'react';
import { GameControlsProps, InterventionRule } from '../types';
import './GameControls.css';

const RULE_DESCRIPTIONS: Record<InterventionRule, string> = {
  suggestion: 'Update Q-value based on movement direction',
  reset: 'Update Q-value using target state reward', 
  interrupt: 'Ignore current timestep',
  impede: 'Apply negative reward to original action'
};

const RULE_LABELS: Record<InterventionRule, string> = {
  suggestion: 'Suggestion Rule',
  reset: 'Reset Rule',
  interrupt: 'Interrupt Rule',
  impede: 'Impede Rule'
};

export const GameControls: React.FC<GameControlsProps> = ({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onReset,
  onStep,
  interventionRule,
  onRuleChange,
  episode,
  agentStepDelay, 
  onStepDelayChange 
}) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLSelectElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (isRunning && !isPaused) {
            onPause();
          } else if (isRunning && isPaused) {
            onStart();
          } else {
            onStart();
          }
          break;
        
        // case 'r':
        // case 'R':
        //   event.preventDefault();
        //   onReset();
        //   break;
        
        // case 's':
        // case 'S':
        //   event.preventDefault();
        //   if (!isRunning || isPaused) {
        //     onStep();
        //   }
        //   break;
          
        // case 'Escape':
        //   event.preventDefault();
        //   if (isRunning) {
        //     onPause();
        //   }
        //   break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, isPaused, onStart, onPause, onReset, onStep]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(event.target.value, 10);
    const actualDelay = 2100 - sliderValue;
    onStepDelayChange(actualDelay);
  };

  const sliderValue = 2100 - agentStepDelay;

  return (
    <div className="game-controls">
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
          
          {/* <button
            className="control-button step-button"
            onClick={onStep}
            disabled={isRunning && !isPaused}
            title="Single step (S key)"
          >
            ⏭️ Step
          </button> */}
          
          {/* <button
            className="control-button reset-button"
            onClick={onReset}
            title="Reset game (R key)"
          >
            🔄 Reset
          </button> */}
        </div>
      </div>

      {/* <div className="control-section">
        <h3>Agent's moving speed</h3>
        <div className="speed-control">
          <div className="speed-labels">
            <span>slow</span>
            <span className="current-speed">{(agentStepDelay / 1000).toFixed(1)}s/step</span>
            <span>fast</span>
          </div>
          <input
            type="range"
            className="speed-slider"
            min="100"
            max="2000"
            step="100"
            value={sliderValue}
            onChange={handleSliderChange}
            title={`Adjust the movement speed of the agent: ${agentStepDelay}ms`}
          />
          <div className="speed-presets">
            <button
              className={`speed-preset ${agentStepDelay === 2000 ? 'active' : ''}`}
              onClick={() => onStepDelayChange(2000)}
              title="Slow speed: 2s/step"
            >
              Slow
            </button>
            <button
              className={`speed-preset ${agentStepDelay === 1000 ? 'active' : ''}`}
              onClick={() => onStepDelayChange(1000)}
              title="Normal: 1s/step"
            >
              Normal
            </button>
            <button
              className={`speed-preset ${agentStepDelay === 500 ? 'active' : ''}`}
              onClick={() => onStepDelayChange(500)}
              title="Fast: 0.5s/step"
            >
              Fast
            </button>
            <button
              className={`speed-preset ${agentStepDelay === 200 ? 'active' : ''}`}
              onClick={() => onStepDelayChange(200)}
              title="Super fast: 0.2s/step"
            >
              Super fast
            </button>
          </div>
        </div>
      </div> */}

      {/* <div className="control-section">
        <h3>Assigned Intervention Rule</h3>
        <div className="rule-display">
          <div className="rule-name">{RULE_LABELS[interventionRule]}</div>
          <div className="rule-description">
            {RULE_DESCRIPTIONS[interventionRule]}
          </div>
          <div className="rule-note">
            This rule is assigned based on your Participant ID and cannot be changed.
          </div>
        </div>
      </div> */}

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
          
          {/* <div className="status-item">
            <span className="status-label">Intervention Rule:</span>
            <span className="status-value rule-indicator">
              {RULE_LABELS[interventionRule]}
            </span>
          </div> */}
        </div>
      </div>

      <div className="control-section hints">
        <h4>Operation Hints</h4>
        <ul className="hints-list">
          <li>🎯 <strong>Spacebar</strong> - Start/Pause training</li>
          <li>🖱️ Drag agent on map for intervention</li>
          {/* <li>🐢 <strong>drag the slider</strong> - adjust the agent speed</li> */}
          {/* <li>⚡ <strong>S key</strong> - Single step execution</li> */}
          {/* <li>🔄 <strong>R key</strong> - Reset game</li> */}
          {/* <li>ESC - Stop training</li> */}
        </ul>
      </div>
    </div>
  );
};