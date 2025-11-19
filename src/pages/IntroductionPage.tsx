// src/pages/IntroductionPage.tsx
import React from 'react';
import './IntroductionPage.css';

interface IntroductionPageProps {
  onNextPhase: () => void;
}

export const IntroductionPage: React.FC<IntroductionPageProps> = ({ onNextPhase }) => {
  return (
    <div className="introduction-page">
      <div className="intro-content">
        <h1>🎯 Frozen Lake Reinforcement Learning Experiment</h1>
        <div className="intro-sections">
          <section className="intro-section">
            <h2>🧠 Experiment Purpose</h2>
            <p>Study the impact of different human intervention strategies on Q-learning algorithm performance</p>
          </section>
          
          <section className="intro-section">
            <h2>⚡ Four Intervention Rules</h2>
            <ul>
              <li><strong>Suggestion Rule</strong>: Update Q-value based on movement direction</li>
              <li><strong>Reset Rule</strong>: Update Q-value using target state reward</li>
              <li><strong>Interrupt Rule</strong>: Ignore current timestep</li>
              <li><strong>Impede Rule</strong>: Apply negative reward to original action</li>
            </ul>
          </section>
          
          <section className="intro-section">
            <h2>🎮 Operation Guide</h2>
            <ol>
              <li>Select intervention rule and start training</li>
              <li>Observe the agent's learning process</li>
              <li>Intervene by dragging the agent</li>
              <li>Analyze learning effects under different rules</li>
            </ol>
          </section>
        </div>
        
        <button className="start-button" onClick={onNextPhase}>
          Start Experiment 🚀
        </button>
      </div>
    </div>
  );
};