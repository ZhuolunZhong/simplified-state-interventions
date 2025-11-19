// src/App.tsx
import React, { useState } from 'react';
import { TrainingPage } from './pages/TrainingPage';
import { IntroductionPage } from './pages/IntroductionPage';
import { ResultsPage } from './pages/ResultsPage';
import { ExperimentPhase } from './types';
import './App.css';

const App: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<ExperimentPhase>('introduction');
  const [experimentData, setExperimentData] = useState<any>(null);
  const [hasExperimentData, setHasExperimentData] = useState(false);

  // Handle phase transitions
  const handlePhaseChange = (newPhase: ExperimentPhase, data?: any) => {
    if (data) {
      setExperimentData(data);
      setHasExperimentData(true);
    }
    setCurrentPhase(newPhase);
  };

  // Navigation click handler
  const handleNavClick = (targetPhase: ExperimentPhase) => {
    // Prevent jumping to results page without data
    if (targetPhase === 'results' && !hasExperimentData && currentPhase !== 'results') {
      alert('Please complete training first and click "View Training Results" to generate experiment data');
      return;
    }
    
    handlePhaseChange(targetPhase);
  };

  // Render current page
  const renderCurrentPage = () => {
    switch (currentPhase) {
      case 'introduction':
        return (
          <IntroductionPage 
            onNextPhase={() => handlePhaseChange('training')}
          />
        );
      case 'training':
        return (
          <TrainingPage 
            onPhaseChange={handlePhaseChange}
          />
        );
      case 'results':
        return (
          <ResultsPage 
            experimentData={experimentData}
            onRestart={() => {
              setHasExperimentData(false);
              setExperimentData(null);
              handlePhaseChange('introduction');
            }}
          />
        );
      default:
        return <IntroductionPage onNextPhase={() => handlePhaseChange('training')} />;
    }
  };

  // Render navigation
  const renderNavigation = () => {
    if (currentPhase === 'introduction') return null;

    return (
      <nav className="app-navigation">
        <div className="nav-brand">
          <h1>❄️ Frozen Lake Experiment Platform</h1>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${currentPhase === 'training' ? 'active' : ''}`}
            onClick={() => handleNavClick('training')}
            disabled={currentPhase === 'training'}
          >
            🧠 Training
          </button>
          <button 
            className={`nav-link ${currentPhase === 'results' ? 'active' : ''}`}
            onClick={() => handleNavClick('results')}
            disabled={currentPhase === 'results'}
            title={!hasExperimentData ? "Need to complete training first to generate data" : "View experiment results"}
          >
            📊 Results {!hasExperimentData && "🔒"}
          </button>
        </div>
        <div className="nav-phase">
          <span className="phase-indicator">
            {currentPhase === 'training' ? 'Training Phase' : 'Results Analysis'}
            {currentPhase === 'results' && !experimentData && " (No Data)"}
          </span>
        </div>
      </nav>
    );
  };

  return (
    <div className="app">
      {renderNavigation()}
      <main className="app-main">
        {renderCurrentPage()}
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <p>Reinforcement Learning Human Intervention Research Platform - Based on Q-learning Algorithm</p>
          <div className="footer-links">
            <span>Current Phase: 
              <span className="phase-tag">
                {currentPhase === 'introduction' ? 'Experiment Introduction' :
                 currentPhase === 'training' ? 'Model Training' : 'Results Analysis'}
                {currentPhase === 'results' && !hasExperimentData && " (No Data)"}
              </span>
            </span>
            {hasExperimentData && <span className="data-available">📊 Experiment Data Ready</span>}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;