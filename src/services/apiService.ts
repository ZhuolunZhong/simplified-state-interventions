// src/services/apiService.ts
export interface SaveExperimentResponse {
  success: boolean;
  message: string;
  experimentId: string;
  savedAt?: string;
  dataSummary?: {
    episodes: number;
    interventions: number;
    qtableEntries: number;
  };
}

export interface ExperimentData {
  experiment_id: string;
  intervention_rule: string;
  total_episodes: number;
  success_rate: number;
  created_at: string;
}

export interface ApiError {
  success: boolean;
  message: string;
  error?: string;
  errorCode?: string;
}

export class ApiService {
  private static readonly BASE_URL = '/api';

  /**
   * Save experiment data to backend database
   */
  static async saveExperiment(experimentData: any): Promise<SaveExperimentResponse> {
    try {
      console.log('Sending experiment data to backend...', {
        experimentId: experimentData.experimentConfig.id,
        dataSize: JSON.stringify(experimentData).length
      });

      const response = await fetch(`${this.BASE_URL}/experiments/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experimentData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      console.log('Backend save successful:', result);
      return result;
    } catch (error) {
      console.error('Failed to save experiment data:', error);
      throw error;
    }
  }

  /**
   * Get experiment list
   */
  static async getExperiments(limit: number = 50, offset: number = 0): Promise<{
    data: ExperimentData[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/experiments/list?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get experiment list:', error);
      return {
        data: [],
        pagination: { total: 0, limit, offset }
      };
    }
  }

  /**
   * Get single experiment details
   */
  static async getExperiment(id: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/experiments/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get experiment details:', error);
      throw error;
    }
  }

  /**
   * Test backend connection
   */
  static async testConnection(): Promise<{ status: string; database?: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Optional: Test database connection
      const dbResponse = await fetch(`${this.BASE_URL}/health/db`);
      const dbResult = dbResponse.ok ? await dbResponse.json() : null;
      
      return {
        status: 'connected',
        database: dbResult?.database || 'unknown'
      };
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return {
        status: 'disconnected',
        database: 'unknown'
      };
    }
  }

  /**
   * Get API information
   */
  static async getApiInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/info`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get API information:', error);
      return null;
    }
  }
}