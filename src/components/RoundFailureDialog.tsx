import React from 'react';
import './RoundSurveyDialog.css';

interface RoundFailureDialogProps {
  onRetry: () => void;
}

const RoundFailureDialog: React.FC<RoundFailureDialogProps> = ({
  onRetry,
}) => {
  return (
    <div className="survey-dialog-overlay">
      <div className="survey-dialog">
        <div className="survey-header" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)' }}>
          <h3>⚠️ Round Failed - Please Try Again</h3>
          <p className="survey-instruction">
            Please complete this round with more active teaching
          </p>
        </div>

        <div className="survey-content">
          {/* Part 1: Teaching requirement - you fill this */}
          <section className="intro-section" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #eaeaea' }}>
             <h2>⚠️ Only when the agent reaches the destination🎯 is it considered a success; a round is only considered completed if there is sufficient success within that round.</h2>

          </section>

          {/* Part 2: Operation Guide (copied from IntroductionPage) */}
          <section className="intro-section">
            <h2>🎮 Operation Guide</h2>
            <ol>
              <li>You will interact with an agent that explores an environment and learns from its experience</li>
              <li>When you feel necessary, intervene by dragging the agent and placing it at your desired position</li>
              <li>The agent will learn from interventions</li>
              <li>The goal is to train the agent start at flag 🏁 to independently and smoothly reach the destination🎯 and avoid the trap hole🕳️</li>
              <li>The arrow over the agent's head indicates its intended next action</li>
              <li>Important: Rewards collected by the agent at the moment you drop them does not necessarily count towards an agent's learning. Generally, the agent must move there by its own volition for learning.</li>
            </ol>
          </section>
        </div>

        <div className="survey-footer">
          <div className="button-group">
            <button
              className="submit-button"
              onClick={onRetry}
              style={{ background: '#4f6df5', minWidth: '200px' }}
            >
              🔄 Retry This Round
            </button>
          </div>
          <p className="note">
            This round will restart. Your previous attempts in this round will be cleared.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoundFailureDialog;