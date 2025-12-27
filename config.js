// Configuration for Mock AI Interview Application

const CONFIG = {
    // Set to false to enable AI features via backend proxy
    // Set to true to use only fallback questions (no API calls)
    USE_FALLBACK_ONLY: false,

    // Backend API Configuration
    // The backend server secures your API key
    API: {
        BASE_URL: 'http://localhost:3000/api',
        ENDPOINTS: {
            GENERATE_QUESTION: '/generate-question',
            GENERATE_FEEDBACK: '/generate-feedback'
        }
    },

    // Interview Settings
    MAX_QUESTIONS: 5,

    // Error Messages
    MESSAGES: {
        API_ERROR: 'Unable to connect to AI service. Using practice questions instead.',
        RATE_LIMIT: 'API rate limit exceeded. Using practice questions instead.',
        NETWORK_ERROR: 'Network error. Please check your connection and ensure the backend server is running.',
        SERVER_NOT_RUNNING: 'Backend server not running. Please start the server with "npm start".'
    }
};

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
