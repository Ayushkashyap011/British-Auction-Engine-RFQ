/**
 * API client for interacting with the FastAPI British Auction Backend
 */

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://british-auction-engine-rfq-backend.onrender.com"
    : "");

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((d) => d.msg).join(", ");
          } else {
            errorMessage = errorData.detail;
          }
        }
      } catch (e) {
        // Non-JSON error payload
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error on [${options.method || "GET"} ${url}]:`, error);
    throw error;
  }
}

export const api = {
  // RFQs
  getRFQs: () => request("/api/v1/rfqs"),
  getRFQById: (id) => request(`/api/v1/rfqs/${id}`),
  createRFQ: (data) =>
    request("/api/v1/rfqs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Quotes
  getQuotes: (rfqId) => request(`/api/v1/rfqs/${rfqId}/quotes`),
  submitQuote: (rfqId, data) =>
    request(`/api/v1/rfqs/${rfqId}/quotes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Activity Logs
  getActivityLogs: (rfqId) => request(`/api/v1/rfqs/${rfqId}/activity-logs`),

  // Health
  checkHealth: () => request("/api/health"),
};
