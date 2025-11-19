// src/pages/ResultsPage.tsx
import React from 'react';
import { downloadExperimentData, generateReadableReport } from '../services/exportService';
import { ExperimentExportData } from '../types';
import './ResultsPage.css';

interface ResultsPageProps {
  experimentData: ExperimentExportData; 
  onRestart: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ experimentData, onRestart }) => {
  if (!experimentData) {
    return (
      <div className="results-page">
        <h2>No Experiment Data Available</h2>
        <button onClick={onRestart}>Return to Start</button>
      </div>
    );
  }

  const {
    experimentConfig,
    results,
    interventionSummary,
    performanceMetrics
  } = experimentData;

  const handleExportJSON = () => {
    downloadExperimentData(experimentData);
  };

  const handleExportReport = () => {
    const report = generateReadableReport(experimentData);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `experiment_report_${experimentConfig.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(experimentData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      alert('Experiment data copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Copy failed, please manually copy the data');
    }
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <h2>📊 Experiment Results Analysis</h2>
        <div className="header-actions">
          <span className="experiment-id">Experiment ID: {experimentConfig.id}</span>
          <button className="restart-button" onClick={onRestart}>
            🔄 Restart
          </button>
        </div>
      </div>
      
      <div className="results-content">
        {/* Main statistics cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-label">Total Episodes</div>
              <div className="stat-value">{results.trainingStats.episode}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value">{(results.trainingStats.successRate * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">Training Time</div>
              <div className="stat-value">{results.trainingTime}s</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <div className="stat-label">Interventions</div>
              <div className="stat-value">{results.trainingStats.interventions}</div>
            </div>
          </div>
        </div>

        {/* Detailed information area */}
        <div className="details-grid">
          {/* Training performance */}
          <div className="detail-section">
            <h3>📈 Training Performance</h3>
            <div className="detail-content">
              <div className="detail-item">
                <span>Average Steps per Episode:</span>
                <span>{performanceMetrics.averageStepsPerEpisode.toFixed(1)}</span>
              </div>
              <div className="detail-item">
                <span>Average Reward per Episode:</span>
                <span>{performanceMetrics.averageRewardPerEpisode.toFixed(2)}</span>
              </div>
              <div className="detail-item">
                <span>Intervention Frequency:</span>
                <span>{(performanceMetrics.interventionFrequency * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Intervention statistics */}
          <div className="detail-section">
            <h3>👆 Intervention Statistics</h3>
            <div className="detail-content">
              <div className="detail-item">
                <span>Total Interventions:</span>
                <span>{interventionSummary.totalCount}</span>
              </div>
              <div className="detail-item">
                <span>Average Intervention Reward:</span>
                <span>{interventionSummary.averageReward.toFixed(2)}</span>
              </div>
              <div className="rule-breakdown">
                <h4>Rule Usage Distribution</h4>
                {Object.entries(interventionSummary.byRule).map(([rule, count]) => (
                  <div key={rule} className="rule-item">
                    <span className="rule-name">{rule}:</span>
                    <span className="rule-count">{count} times</span>
                    <div 
                      className="rule-bar" 
                      style={{ 
                        width: `${(count / interventionSummary.totalCount) * 100}%` 
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Experiment configuration */}
          <div className="detail-section">
            <h3>⚙️ Experiment Configuration</h3>
            <div className="detail-content">
              <div className="detail-item">
                <span>Intervention Rule:</span>
                <span>{experimentConfig.interventionRule}</span>
              </div>
              <div className="detail-item">
                <span>Learning Rate (α):</span>
                <span>{experimentData.learningParams.learningRate}</span>
              </div>
              <div className="detail-item">
                <span>Discount Factor (γ):</span>
                <span>{experimentData.learningParams.gamma}</span>
              </div>
              <div className="detail-item">
                <span>Exploration Rate (ε):</span>
                <span>{experimentData.learningParams.epsilon}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Export actions area */}
        <div className="export-section">
          <h3>💾 Data Export</h3>
          <div className="export-actions">
            <button className="export-button json" onClick={handleExportJSON}>
              📥 Export JSON Data
            </button>
            <button className="export-button report" onClick={handleExportReport}>
              📄 Export Text Report
            </button>
            <button className="export-button copy" onClick={handleCopyToClipboard}>
              📋 Copy to Clipboard
            </button>
          </div>
          <div className="export-info">
            <p>Exported data includes complete experiment records, including:</p>
            <ul>
              <li>Final Q-table and learned policy</li>
              <li>Training data for each episode</li>
              <li>Detailed intervention records</li>
              <li>Performance metrics and statistics</li>
              <li>Experiment configuration and metadata</li>
            </ul>
          </div>
        </div>

        {/* Quick insights */}
        <div className="insights-section">
          <h3>💡 Experiment Insights</h3>
          <div className="insights-grid">
            {results.trainingStats.successRate > 0.7 && (
              <div className="insight positive">
                <span>✅ High Success Rate</span>
                <span>Model learned effectively</span>
              </div>
            )}
            {performanceMetrics.interventionFrequency > 0.1 && (
              <div className="insight info">
                <span>ℹ️ Frequent Interventions</span>
                <span>Human intervention significantly impacted training</span>
              </div>
            )}
            {interventionSummary.averageReward > 0 && (
              <div className="insight positive">
                <span>📈 Positive Interventions</span>
                <span>Interventions brought positive rewards on average</span>
              </div>
            )}
            {results.trainingTime < 30 && (
              <div className="insight positive">
                <span>⚡ Fast Convergence</span>
                <span>Model learned in a short time</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};