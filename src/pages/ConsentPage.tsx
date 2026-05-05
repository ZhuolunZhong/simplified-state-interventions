import React from 'react';
import { ExperimentPhase } from '../types';
import './ConsentPage.css';

interface ConsentPageProps {
  onNextPhase: () => void;
}

export const ConsentPage: React.FC<ConsentPageProps> = ({ onNextPhase }) => {
  const handleAgree = () => {
    onNextPhase();
  };

  return (
    <div className="consent-page">
      <div className="consent-content">
        <div className="consent-header">
          <h1>📋 We need your consent to proceed</h1>
          <div className="institution-badge">
            UNIVERSITY OF WISCONSIN-MADISON
          </div>
        </div>

        <div className="consent-scrollable">
          <div className="consent-body">
            <div className="consent-section">
              <h2>Research Participant Information and Consent Form</h2>
              
              <div className="consent-info-item">
                <h3>Title of the Study:</h3>
                <p>Studying human and machine interactions</p>
              </div>

              <div className="consent-info-item">
                <h3>Principal Investigator:</h3>
                <p>Joseph Austerweil (phone: 608-262-9932) (email: austerweil@wisc.edu)</p>
              </div>

              <div className="consent-section">
                <h3>DESCRIPTION OF THE RESEARCH</h3>
                <p>You are invited to participate in a research study about how people interact with an artificial machine agents in simple online environments.</p>
                
                <p>You have been asked to participate because we are analyzing whether people interact with each other in a manner comparable to that predicted by formal models of how to cooperate, act selfishly, and act when people's interests are unaligned.</p>
                
                <p>The purpose of the research is to understand how people act with other agents when those agents are controlled by other people or a computational model. The goal is to understand how people interact by formulating a computational model that interacts in a similar manner as another person. We hope to make interacting with machine agents more natural.</p>
                
                <p>This study will include native-English speakers who are 18 years old or older.</p>
                
                <p>The experiment will be conducted through Prolific.</p>
              </div>

              {/* <div className="consent-section">
                <h3>WHAT WILL MY PARTICIPATION INVOLVE?</h3>
                <p>Your task is to teach control of learning agents who take sequential actions in a simple virtual environment. The environments are typically "gridworlds" in which agents can move in eight directions (primary and diagonal directions). The agents have two objectives:</p>
                
                <ol>
                  <li>To acquire points generated on the grid</li>
                  <li>To learn the better movement strategies that make it easier to get these points</li>
                </ol>
                
                <p>The agent learns successful movements by acquiring points, but it cannot see where the points are. <strong>Your task is to help the agent learn</strong>.</p>
                
                <p>You can assist by clicking and dragging the agent with your mouse, moving it to the desired location. When you release the mouse, the agent will drop and continue its actions.</p>
                
                <p>You will need to teach a single agent or take care of two agents simultaneously.</p>
                
                <div className="important-note">
                  <p>📝 <strong>Important:</strong> Points collected by the agent immediately when you drop the agent do not count towards the agent's score and its learning. To get a point, the agent must move there by its own volition.</p>
                </div>
                
                <p>Each game round lasts for 100 seconds, with a total of 17 rounds. After each round, you can take a break before pressing confirm to proceed. The first round is a trial, giving you a chance to observe and get a feel for the game. The remaining 16 rounds consist of 4 different settings, each repeated 4 times. Before entering a new setting, there will be a reminder on the screen.</p>
                
                <p>After completing a set of four rounds, you will be asked to briefly describe your teaching strategy and the reasons behind your approach. Your participation will require 1 session lasting between 30 and 40 minutes total.</p>
              </div> */}

              <div className="consent-section">
                <h3>ARE THERE ANY RISKS TO ME?</h3>
                <p>The only potential risk of the study is a breach of confidentiality in the event of a data breach. We have safeguards in place to prevent this from happening and we don't anticipate any other risks to you from participation in this study.</p>
              </div>

              <div className="consent-section">
                <h3>ARE THERE ANY BENEFITS TO ME?</h3>
                <p>We don't expect any direct benefits to you from participation in this study.</p>
              </div>

              <div className="consent-section">
                <h3>WILL I BE COMPENSATED FOR MY PARTICIPATION?</h3>
                <p>You will receive a base payment of $10 per hour with a $2-4 per hour bonus depending on your performance for participating in this study.</p>
                <p>If you do withdraw prior to the end of the study, you will not receive any payment.</p>
              </div>

              <div className="consent-section">
                <h3>HOW WILL MY CONFIDENTIALITY BE PROTECTED?</h3>
                <p>Your worker ID will be stored in a separate file from your experiment data. The worker ID will not be linked to the data. We store your worker ID so that we can ensure people only participate once and it is deleted from our server once the experiment (or series of experiments) are complete.</p>
              </div>

              <div className="consent-section">
                <h3>WHOM SHOULD I CONTACT IF I HAVE QUESTIONS?</h3>
                <p>You may ask any questions about the research at any time. If you have questions about the research after you leave today you should contact the Principal Investigator Joseph Austerweil at 608-262-9932.</p>
                
                <p>If you are not satisfied with response of research team, have more questions, or want to talk with someone about your rights as a research participant, you should contact the Education and Social/Behavioral Science IRB Office at 608-263-2320.</p>
                
                <p>Your participation is completely voluntary. If you begin participation and change your mind you may end your participation at any time without penalty.</p>
                
                <p>You may print or save a copy of this form for your records.</p>
              </div>

              <div className="consent-final">
                <p>By clicking the "I am informed" button you consent to participating in this experiment.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="consent-footer">
          <div className="consent-agreement">
            <h4>Do you understand and consent to these terms?</h4>
            <button 
              className="consent-agree-button"
              onClick={handleAgree}
            >
              ✓ I am informed, start the experiment
            </button>
            <p className="consent-note">
              Your consent will be recorded electronically. You may withdraw at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};