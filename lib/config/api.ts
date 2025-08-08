// API Configuration  
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER_WITH_WALLET: `${API_BASE_URL}/api/users/register-with-wallet`,
  CREATE_WITH_HEDERA_WALLET: `${API_BASE_URL}/api/users/create-with-hedera-wallet`,
  LOGIN: `${API_BASE_URL}/api/users/login`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify-token`,
  
  // User endpoints
  USERS: `${API_BASE_URL}/api/users`,
  USER_BY_ID: (id: string) => `${API_BASE_URL}/api/users/${id}`,
  USER_WITH_WALLET: (id: string) => `${API_BASE_URL}/api/users/${id}/wallet`,
  
  // Agent endpoints
  AGENTS: `${API_BASE_URL}/api/agents`,
  AGENTS_SIMPLE: `${API_BASE_URL}/api/agents/simple`,
  AGENTS_HEDERA: `${API_BASE_URL}/api/agents/hedera`,
  AGENT_STRATEGY: `${API_BASE_URL}/api/agent/strategy`,
  AGENT_CHAT: `${API_BASE_URL}/api/agent/chat`,
  AGENT_PRICES: `${API_BASE_URL}/api/agent/prices`,
  
  // Wallet endpoints
  WALLETS: `${API_BASE_URL}/api/wallets`,
} as const;

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

// Default fetch options
export const DEFAULT_FETCH_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function to make authenticated requests
export const createAuthenticatedRequest = (token: string): RequestInit => ({
  ...DEFAULT_FETCH_OPTIONS,
  headers: {
    ...DEFAULT_FETCH_OPTIONS.headers,
    'Authorization': `Bearer ${token}`,
  },
});

export default API_ENDPOINTS;