// src/components/RoundSurveyDialog.tsx
import React, { useState } from 'react';
import './RoundSurveyDialog.css';

interface RoundSurveyDialogProps {
  roundNumber: number;
  totalRounds: number;
  isFinalRound: boolean;
  onComplete: (responses: any) => void;
  onContinue: () => void;
}

const RoundSurveyDialog: React.FC<RoundSurveyDialogProps> = ({
  roundNumber,
  totalRounds,
  isFinalRound,
  onComplete,
  onContinue,
}) => {
  // State for survey responses
  const [q1, setQ1] = useState<number | null>(null);
  const [q2, setQ2] = useState<number | null>(null);
  const [q3, setQ3] = useState<number | null>(null);
  const [q4, setQ4] = useState<string>('');
  const [q5, setQ5] = useState<string>('');

  // Check if all required questions are answered
  const isFormComplete = () => {
    return q1 !== null && q2 !== null && q3 !== null;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!isFormComplete()) {
      return;
    }

    const responses = {
      round: roundNumber,
      q1_naturality: q1,
      q2_learning_effect: q2,
      q3_enjoyment: q3,
      q4_teaching_strategy: q4.trim(),
      q5_comments: q5.trim(),
      timestamp: Date.now(),
    };
    
    onComplete(responses);
  };

  // Handle skip survey
  const handleSkip = () => {
    onContinue();
  };

  // Render slider for Likert scale questions
  const renderLikertQuestion = (
    question: string,
    value: number | null,
    onChange: (val: number) => void,
    leftLabel: string,
    rightLabel: string
  ) => {
    return (
      <div className="survey-question">
        <p className="question-text">{question} *</p>
        <div className="likert-scale">
          <span className="scale-label">{leftLabel}</span>
          <div className="slider-container">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                className={`scale-point ${value === num ? 'selected' : ''}`}
                onClick={() => onChange(num)}
                type="button"
              >
                {num}
              </button>
            ))}
          </div>
          <span className="scale-label">{rightLabel}</span>
        </div>
        <div className="scale-numbers">
          {[1, 2, 3, 4, 5].map((num) => (
            <span key={num} className="number-label">
              {num}
            </span>
          ))}
        </div>
        {value === null && (
          <p className="validation-message">Please select a rating</p>
        )}
      </div>
    );
  };

  // Render text area for open-ended questions
  const renderTextQuestion = (
    question: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    rows: number = 3,
    required: boolean = false
  ) => {
    return (
      <div className="survey-question">
        <p className="question-text">{question} {required ? '' : '(optional)'}</p>
        <textarea
          className="text-response"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      </div>
    );
  };

  // Check if text questions are answered
  const areTextQuestionsAnswered = () => {
    return true;
  };

  return (
    <div className="survey-dialog-overlay">
      <div className="survey-dialog">
        <div className="survey-header">
          <h3>
            {isFinalRound ? '🎉 Final Round Complete!' : `✅ Round ${roundNumber} Complete`}
          </h3>
          <p className="round-info">
            Round {roundNumber} of {totalRounds}
          </p>
          <p className="survey-instruction">
            Please complete this short survey:
          </p>
          <p className="required-note">
            * Required questions must be answered
          </p>
        </div>

        <div className="survey-content">
          {/* Question 1: Naturality */}
          {renderLikertQuestion(
            "1. How natural was it to teach the agent?",
            q1,
            setQ1,
            "Very unnatural",
            "Very natural"
          )}

          {/* Question 2: Learning effect */}
          {renderLikertQuestion(
            "2. How well do you think the agent learned?",
            q2,
            setQ2,
            "Very poorly",
            "Very well"
          )}

          {/* Question 3: Enjoyment */}
          {renderLikertQuestion(
            "3. How enjoyable was it to teach the agent?",
            q3,
            setQ3,
            "Not enjoyable",
            "Very enjoyable"
          )}

          {/* Question 4: Teaching strategy */}
          {renderTextQuestion(
            "4. Briefly describe your teaching strategy:",
            q4,
            setQ4,
            "Describe how you taught the agent...",
            3,
            false
          )}

          {/* Question 5: Comments */}
          {renderTextQuestion(
            "5. Any additional comments or feedback:",
            q5,
            setQ5,
            "Share any thoughts or suggestions...",
            3,
            false
          )}
        </div>

        <div className="survey-footer">
          <div className="button-group">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={!isFormComplete()}
              title={!isFormComplete() ? "Please answer all required questions and at least one text response" : ""}
            >
              Submit & Continue
            </button>
            <button
              className="skip-button"
              onClick={handleSkip}
            >
              Skip Survey
            </button>
          </div>
          <div className="validation-summary">
            {!areTextQuestionsAnswered() && (
              <p className="validation-error">At least one text response is required</p>
            )}
            <p className="note">
              Note: Survey is optional. If skipped, only round number will be recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundSurveyDialog;