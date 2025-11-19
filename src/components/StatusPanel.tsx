// src/components/StatusPanel.tsx
import React from 'react';
import { StatusPanelProps, LearningParams } from '../types';
import './StatusPanel.css';

export const StatusPanel: React.FC<StatusPanelProps> = ({
  stats,
  status,
  learningParams
}) => {
  // Format number display
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${formatNumber(value * 100, 1)}%`;
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!status.isRunning) return '⏹️';
    if (status.isPaused) return '⏸️';
    if (status.isIntervening) return '👆';
    if (status.isTraining) return '🧠';
    return '▶️';
  };

  // Get status description
  const getStatusDescription = () => {
    if (!status.isRunning) return 'Game Stopped';
    if (status.isPaused) return 'Game Paused';
    if (status.isIntervening) return 'Intervention in Progress';
    if (status.isTraining) return 'Training in Progress';
    return 'Game Running';
  };

  // Get success rate color
  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 0.8) return 'success-high';
    if (rate >= 0.5) return 'success-medium';
    if (rate >= 0.2) return 'success-low';
    return 'success-very-low';
  };

  // Get reward color
  const getRewardColor = (reward: number): string => {
    if (reward > 0) return 'reward-positive';
    if (reward < 0) return 'reward-negative';
    return 'reward-neutral';
  };

  return (
    <div className="status-panel">
      {/* Header status indicator */}
      <div className="status-header">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="status-text">
            <div className="status-title">{getStatusDescription()}</div>
            <div className="status-subtitle">Episode #{stats.episode}</div>
          </div>
        </div>
      </div>

      {/* Main statistics */}
      <div className="stats-grid">
        {/* Success rate */}
        <div className="stat-card success-rate">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">Success Rate</div>
            <div className={`stat-value ${getSuccessRateColor(stats.successRate)}`}>
              {formatPercent(stats.successRate)}
            </div>
          </div>
          <div className="stat-progress">
            <div 
              className="stat-progress-bar"
              style={{ width: `${stats.successRate * 100}%` }}
            />
          </div>
        </div>

        {/* Total steps */}
        <div className="stat-card total-steps">
          <div className="stat-icon">👣</div>
          <div className="stat-content">
            <div className="stat-label">Total Steps</div>
            <div className="stat-value">{stats.steps}</div>
          </div>
        </div>

        {/* Total reward */}
        <div className="stat-card total-reward">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-label">Total Reward</div>
            <div className={`stat-value ${getRewardColor(stats.totalReward)}`}>
              {formatNumber(stats.totalReward)}
            </div>
          </div>
        </div>

        {/* Last reward */}
        <div className="stat-card last-reward">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">Last Reward</div>
            <div className={`stat-value ${getRewardColor(stats.lastReward)}`}>
              {formatNumber(stats.lastReward)}
            </div>
          </div>
        </div>

        {/* Interventions */}
        <div className="stat-card interventions">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-label">Interventions</div>
            <div className="stat-value">{stats.interventions}</div>
          </div>
        </div>

        {/* Episodes */}
        <div className="stat-card episodes">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-label">Training Episodes</div>
            <div className="stat-value">{stats.episode}</div>
          </div>
        </div>
      </div>

      {/* Learning parameters */}
      <div className="learning-params-section">
        <h3>Learning Parameters</h3>
        <div className="params-grid">
          <div className="param-item">
            <span className="param-label">Learning Rate (α)</span>
            <span className="param-value">{formatNumber(learningParams.learningRate)}</span>
            <div className="param-bar">
              <div 
                className="param-bar-fill"
                style={{ width: `${learningParams.learningRate * 100}%` }}
              />
            </div>
          </div>
          
          <div className="param-item">
            <span className="param-label">Discount Factor (γ)</span>
            <span className="param-value">{formatNumber(learningParams.gamma)}</span>
            <div className="param-bar">
              <div 
                className="param-bar-fill"
                style={{ width: `${learningParams.gamma * 100}%` }}
              />
            </div>
          </div>
          
          <div className="param-item">
            <span className="param-label">Exploration Rate (ε)</span>
            <span className="param-value">{formatNumber(learningParams.epsilon)}</span>
            <div className="param-bar">
              <div 
                className="param-bar-fill"
                style={{ width: `${learningParams.epsilon * 100}%` }}
              />
            </div>
          </div>
          
          <div className="param-item">
            <span className="param-label">State Space</span>
            <span className="param-value">{learningParams.stateSize}</span>
          </div>
          
          <div className="param-item">
            <span className="param-label">Action Space</span>
            <span className="param-value">{learningParams.actionSize}</span>
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="performance-section">
        <h3>Performance Metrics</h3>
        <div className="performance-metrics">
          <div className="metric-item">
            <span className="metric-label">Avg Steps/Episode</span>
            <span className="metric-value">
              {stats.episode > 0 ? formatNumber(stats.steps / stats.episode, 1) : '0'}
            </span>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Avg Reward/Episode</span>
            <span className="metric-value">
              {stats.episode > 0 ? formatNumber(stats.totalReward / stats.episode, 2) : '0'}
            </span>
          </div>
          
          <div className="metric-item">
            <span className="metric-label">Intervention Frequency</span>
            <span className="metric-value">
              {stats.steps > 0 ? formatNumber(stats.interventions / stats.steps * 100, 1) + '%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Status tags */}
      <div className="status-tags">
        {status.isTraining && <span className="status-tag training">Training Mode</span>}
        {status.isRunning && <span className="status-tag running">Running</span>}
        {status.isPaused && <span className="status-tag paused">Paused</span>}
        {status.isIntervening && <span className="status-tag intervening">Intervening</span>}
        {stats.interventions > 0 && <span className="status-tag has-interventions">Has Interventions</span>}
        {stats.successRate >= 0.8 && <span className="status-tag high-success">High Success Rate</span>}
        {stats.successRate >= 0.5 && stats.successRate < 0.8 && <span className="status-tag medium-success">Medium Success Rate</span>}
        {stats.successRate >= 0.2 && stats.successRate < 0.5 && <span className="status-tag low-success">Low Success Rate</span>}
        {stats.successRate < 0.2 && <span className="status-tag very-low-success">Very Low Success Rate</span>}
      </div>
    </div>
  );
};