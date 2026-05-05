// src/pages/IntroductionPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { ApiService } from '../services/apiService';
import './IntroductionPage.css';

interface IntroductionPageProps {
  onNextPhase: () => void;
}

const INTERVENTION_RULES = [
  'Suggestion Rule',
  'Reset Rule', 
  'Interrupt Rule',
  'Impede Rule'
] as const;

const RULE_DESCRIPTIONS = [
  'Update Q-value based on movement direction',
  'Update Q-value using target state reward',
  'Ignore current timestep',
  'Apply negative reward to original action'
] as const;

export const IntroductionPage: React.FC<IntroductionPageProps> = ({ onNextPhase }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [acquiredUserId, setAcquiredUserId] = useState<string | null>(null);

  const shouldShowQTable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    if (!acquiredUserId) return false;
    
    try {
      const userIdNum = parseInt(acquiredUserId);
      if (isNaN(userIdNum)) return false;
      const positionInCycle = ((userIdNum - 1) % 8) + 1;
      return positionInCycle <= 4;
    } catch (error) {
      console.error('Error determining Q-table visibility:', error);
      return true; 
    }
  }, [acquiredUserId]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        
        // First check sessionStorage
        const storedUserId = sessionStorage.getItem('user_id');
        if (storedUserId) {
          console.log('Found existing user ID in sessionStorage:', storedUserId);
          setAcquiredUserId(storedUserId);
          setIsLoading(false);
          return;
        }
        
        // If not in sessionStorage, acquire from backend
        const result = await ApiService.acquireUserId();
        
        if (result.success && result.userId) {
          const userId = result.userId.toString();
          sessionStorage.setItem('user_id', userId);
          setAcquiredUserId(userId);
          console.log(`User ID ${userId} acquired and stored`);
        }
      } catch (err) {
        console.error('Failed to initialize user:', err);
        // Generate temporary ID as fallback
        const tempId = Math.floor(Math.random() * 250) + 1;
        const userId = tempId.toString();
        sessionStorage.setItem('user_id', userId);
        setAcquiredUserId(userId);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const handleStartExperiment = () => {
    if (!acquiredUserId) return;
    
    if (!sessionStorage.getItem('user_id')) {
      sessionStorage.setItem('user_id', acquiredUserId);
    }
    
    console.log('Starting experiment with user ID:', acquiredUserId);
    onNextPhase();
  };

  // Calculate which rule to show based on user ID
  const getAssignedRule = () => {
    if (!acquiredUserId) return { rule: '', description: '' };
    
    const userIdNum = parseInt(acquiredUserId);
    const ruleIndex = (userIdNum - 1) % 4; // 0-3 based on ID
    
    return {
      rule: INTERVENTION_RULES[ruleIndex],
      description: RULE_DESCRIPTIONS[ruleIndex]
    };
  };

  const assignedRule = getAssignedRule();

  if (isLoading) {
    return (
      <div className="introduction-page loading">
        <div className="loading-content">
          <div className="spinner-large"></div>
          <p>Initializing experiment session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="introduction-page">
      <div className="intro-content">
        <h1>Learning Experiment</h1>
        
        <div className="intro-sections">
          <section className="intro-section">
            <h2>🧠 Experiment Purpose</h2>
            <p>Study the impact of different human intervention strategies on a Learning Agent</p>
          </section>
          
          <section className="intro-section">
            <h2>🎮 Operation Guide</h2>
            <ol>
              <li>You will interact with an agent that explores an environment and learns from its experience</li>
              <li>When you feel necessary, intervene by dragging the agent and placing it at your desired position</li>
              <li>The agent will learn from interventions</li>
              <li>The goal is to train the agent start at flag 🏁 to independently and smoothly reach the destination🎯 and avoid the trap hole🕳️</li>
              <li>The arrow over the agent's head indicates its intended next action</li>
              <li>⚠️ Only when the agent reaches the destination🎯 is it considered a success; a round is only considered completed if there is sufficient success within that round.</li>
              <li>Important: Rewards collected by the agent at the moment you drop them does not necessarily count towards an agent's learning. Generally, the agent must move there by its own volition for learning.</li>
            </ol>
          </section>
          
          <div className="user-id-section">
            <h2>Participant ID</h2>
            
            <div className="user-id-display">
              <div className="user-id-value-large">{acquiredUserId}</div>
              <p className="user-id-instruction">
                Your participant ID has been assigned.
                {shouldShowQTable && (<><br />Depends on your ID, you will be able to see best actions in each square for the agent during training.</>)}
                <br />
                {/* This ID determines your assigned intervention rule. */}
              </p>
              
              {/* <div className="assigned-rule">
                <h3>🎯 Your Assigned Intervention Rule</h3>
                <div className="rule-highlight">
                  <strong>{assignedRule.rule}</strong>
                  <p>{assignedRule.description}</p>
                </div>
                <p className="rule-note">
                  This rule has been automatically assigned based on your Participant ID.
                  You will use this rule throughout the experiment.
                </p>
              </div> */}
              
              <button 
                className="start-experiment-button"
                onClick={handleStartExperiment}
              >
                Start Experiment 🚀
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};