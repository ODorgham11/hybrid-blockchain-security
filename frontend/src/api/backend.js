import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export const analyzeSecurityAlert = async (alert, context) => {
  try {
    const response = await axios.post(`${API_URL}/api/analyze-alert`, {
      alert,
      context
    });
    return response.data;
  } catch (error) {
    console.error("Error analyzing alert:", error);
    throw error;
  }
};

export const analyzeDailyLogs = async (logs) => {
  try {
    const response = await axios.post(`${API_URL}/api/analyze-daily-logs`, {
      daily_logs: JSON.stringify(logs)
    });
    return response.data;
  } catch (error) {
    console.error("Error analyzing logs:", error);
    throw error;
  }
};

export const processClaim = async (claimId, claimData, posture) => {
  try {
    const response = await axios.post(`${API_URL}/api/analyze-claim`, {
      claim_id: claimId,
      claim_data: claimData,
      historical_posture: posture
    });
    return response.data;
  } catch (error) {
    console.error("Error processing claim:", error);
    throw error;
  }
};
