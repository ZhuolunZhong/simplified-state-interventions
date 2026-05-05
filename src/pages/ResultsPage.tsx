// src/pages/ResultsPage.tsx
import React, { useState } from 'react';
import { ApiService, DemographicSurveyData } from '../services/apiService';
import './ResultsPage.css';

interface ResultsPageProps {
  experimentData?: any;
  onRestart: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ experimentData, onRestart }) => {
  const [hasRobotVacuum, setHasRobotVacuum] = useState<boolean | null>(null);
  const [satisfaction, setSatisfaction] = useState<number>(4);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [gender, setGender] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [age, setAge] = useState<number | ''>('');
  const [understandsScoring, setUnderstandsScoring] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [additionalComment, setAdditionalComment] = useState<string>('');

  const userId = sessionStorage.getItem('user_id');

  const handleSubmit = async () => {
    const validationErrors = [];

    if (hasRobotVacuum === null) {
      validationErrors.push("Please select whether you have a robotic vacuum.");
    }
    if (!gender) {
      validationErrors.push("Please select your gender.");
    }
    if (!race) {
      validationErrors.push("Please select your race.");
    }
    if (age === '' || age <= 0 || age > 120) {
      validationErrors.push("Please enter a valid age (1-120).");
    }
    if (understandsScoring === null) {
      validationErrors.push("Please confirm your understanding of the scoring rule.");
    }
    if (!userId) {
      validationErrors.push("User ID not found. Please refresh the page and try again.");
    }

    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const surveyData: DemographicSurveyData = {
        user_id: userId!,
        has_robot_vacuum: hasRobotVacuum!,
        satisfaction: hasRobotVacuum ? satisfaction : 0,
        gender,
        race,
        age: age as number,
        understands_scoring: understandsScoring!,
         additional_comment: additionalComment.trim() || undefined,
      };

      await ApiService.saveDemographicSurvey(surveyData);

      setShowCompletionDialog(true);
    } catch (error: any) {
      console.error("Error uploading survey response:", error);
      setSubmitError(
        error.message || "There was an error submitting your response. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRadioQuestion = (
    label: string,
    value: boolean | null,
    onChange: (val: boolean) => void
  ) => {
    return (
      <div className="form-question">
        <p className="question-label">{label}</p>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              checked={value === true}
              onChange={() => onChange(true)}
            />
            <span className="radio-label">Yes</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              checked={value === false}
              onChange={() => onChange(false)}
            />
            <span className="radio-label">No</span>
          </label>
        </div>
      </div>
    );
  };

  const renderSliderQuestion = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    min: number = 1,
    max: number = 7
  ) => {
    return (
      <div className="form-question">
        <p className="question-label">
          {label} (1 = Not satisfied, 7 = Very satisfied)
        </p>
        <div className="slider-container">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="satisfaction-slider"
          />
          <div className="slider-value-display">
            <span className="value-label">Value:</span>
            <span className="value-number">{value}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectQuestion = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: Array<{ value: string; label: string }>
  ) => {
    return (
      <div className="form-question">
        <p className="question-label">{label}</p>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-select"
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderNumberInput = (
    label: string,
    value: number | '',
    onChange: (val: number | '') => void,
    placeholder: string
  ) => {
    return (
      <div className="form-question">
        <p className="question-label">{label}</p>
        <input
          type="number"
          value={value}
          onChange={(e) => 
            onChange(e.target.value ? parseInt(e.target.value, 10) : '')
          }
          placeholder={placeholder}
          className="form-input"
          min="1"
          max="120"
        />
      </div>
    );
  };

  return (
    <div className="results-page">
      {showCompletionDialog && (
        <div className="completion-dialog-overlay">
          <div className="completion-dialog">
            <div className="dialog-icon">🎉</div>
            <h2 className="dialog-title">Thank You!</h2>
            <div className="completion-message">
              <p>Thank you for your participation.</p>
              <div className="completion-code">
                <strong>Use this code for Prolific:</strong>
                <div className="code-display">CTXP25I1</div>
              </div>
            </div>
            <p className="dialog-note">
              You may now close this browser tab. Your responses have been recorded.
            </p>
          </div>
        </div>
      )}

      <div className="results-content">
        <div className="results-header">
          <h1>📋 Final Survey</h1>
          <p className="results-subtitle">
            Please complete this final survey about your experience and background
          </p>
        </div>

        <div className="survey-container">
          <div className="user-info-notice">
            <span className="user-id-label">Participant ID:</span>
            <span className="user-id-value">{userId || 'Not found'}</span>
          </div>

          {renderRadioQuestion(
            "1. Do you have a robotic vacuum at home?",
            hasRobotVacuum,
            setHasRobotVacuum
          )}

          {hasRobotVacuum && renderSliderQuestion(
            "2. How satisfied are you with it?",
            satisfaction,
            setSatisfaction
          )}

          {renderSelectQuestion(
            "3. What is your gender?",
            gender,
            setGender,
            [
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
              { value: "prefer_not_to_say", label: "Prefer not to say" }
            ]
          )}

          {renderSelectQuestion(
            "4. What is your race?",
            race,
            setRace,
            [
              { value: "asian", label: "Asian" },
              { value: "black", label: "Black or African American" },
              { value: "white", label: "White" },
              { value: "hispanic", label: "Hispanic or Latino" },
              { value: "other", label: "Other" },
              { value: "prefer_not_to_say", label: "Prefer not to say" }
            ]
          )}

          {renderNumberInput(
            "5. What is your age?",
            age,
            setAge,
            "Enter your age"
          )}

          <div className="form-question">
            <p className="question-label">
              6. During the experiment you just completed, did you understand the following rule?
            </p>
            <div className="rule-reminder">
              <div className="rule-icon">📝</div>
              <div className="rule-text">
                <strong>Important:</strong> Rewards collected by the agent at the moment you drop them does not necessarily count towards an agent's learning. Generally, the agent must move there by its own volition for learning.
              </div>
            </div>
            {renderRadioQuestion(
              "Did you understand this scoring rule during the experiment?",
              understandsScoring,
              setUnderstandsScoring
            )}
          </div>

          <div className="form-question">
            <p className="question-label">
              7. Any additional comments or feedback (optional):
            </p>
            <textarea
              value={additionalComment}
              onChange={(e) => setAdditionalComment(e.target.value)}
              placeholder="Share any additional thoughts about the experiment..."
              className="comment-textarea"
              rows={4}
            />
            <p className="comment-note">
              This field is optional. Your comments will help us improve future studies.
            </p>
          </div>

          {submitError && (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-text">
                {submitError.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}

          <div className="submit-section">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                'Submit Survey'
              )}
            </button>
            {isSubmitting && (
              <p className="submit-note">
                Please wait while we save your responses...
              </p>
            )}
          </div>

          {experimentData && (
            <div className="experiment-summary">
              <h3>Experiment Summary</h3>
              <p>Your training data has been successfully saved.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};