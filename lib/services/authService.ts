import { API_ENDPOINTS, DEFAULT_FETCH_OPTIONS, createAuthenticatedRequest } from '@/lib/config/api';
import type { User, Wallet } from '@/lib/slices/authSlice';

export interface RegisterWithWalletRequest {
  name: string;
  email: string;
  walletAddress: string;
  privateKey: string;
  userType?: 'human' | 'agent';
}

export interface RegisterWithWalletResponse {
  success: boolean;
  data: {
    user: User;
    wallet: Wallet;
    token: string;
  };
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface VerifyTokenResponse {
  user: User;
  wallet?: Wallet;
}

export interface CreateUserWithAgentRequest {
  email: string;
  name: string;
  agentName: string;
  userId?: string; // Add userId parameter for existing users
}

export interface CreateUserWithAgentResponse {
  success: boolean;
  user: User;
  agent: any;
  wallet?: Wallet;
  token: string;
  message: string;
}

export interface CreateUserWithHederaWalletRequest {
  name: string;
  email: string;
  userType?: 'human' | 'agent';
  password?: string;
  preferences?: any;
  initialBalance?: number;
}

export interface CreateUserWithHederaWalletResponse {
  success: boolean;
  data: {
    user: User;
    wallet: Wallet;
    hedera: {
      accountId: string;
      transactionId: string;
      initialBalance: number;
      network: string;
    };
    token?: string;
  };
  message: string;
}

export class AuthService {
  static async registerWithWallet(data: RegisterWithWalletRequest): Promise<RegisterWithWalletResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER_WITH_WALLET, {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static async createUserWithHederaWallet(data: CreateUserWithHederaWalletRequest): Promise<CreateUserWithHederaWalletResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_WITH_HEDERA_WALLET, {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'User creation with Hedera wallet failed');
      }

      return result;
    } catch (error) {
      console.error('Hedera wallet user creation error:', error);
      throw error;
    }
  }

  static async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async verifyToken(token: string): Promise<VerifyTokenResponse> {
    try {
      // Call the Next.js local endpoint to avoid backend JWT secret mismatch
      const response = await fetch('/api/auth/verify-token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Token verification failed');
      }

      return result;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      return result;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  }

  static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; needsOnboarding?: boolean }> {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify({ email, otp }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'OTP verification failed');
      }

      return result;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  }

  static async createUserWithAgent(data: CreateUserWithAgentRequest): Promise<CreateUserWithAgentResponse> {
    try {
      // Create agent using the simple endpoint with Hedera wallet
      const agentResponse = await fetch(API_ENDPOINTS.AGENTS_SIMPLE, {
        method: 'POST',
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify({
          name: data.agentName || `${data.name} Agent`,
          userId: data.userId || data.email, // Use real userId if provided, fallback to email
          initialBalance: 30 // Initial HBAR balance for the wallet
        }),
      });

      const agentResult = await agentResponse.json();

      if (!agentResponse.ok) {
        throw new Error(agentResult.message || 'Failed to create agent');
      }

      // Extract user info from the new response structure
      const user = agentResult.data.user ? {
        id: agentResult.data.user._id,
        name: agentResult.data.user.name,
        email: agentResult.data.user.email,
        userType: agentResult.data.user.userType,
        createdAt: agentResult.data.user.createdAt,
        walletAddress: agentResult.data.wallet?.accountId || '',
        walletId: agentResult.data.agent?._id || ''
      } : {
        // Fallback if user data is missing
        id: data.email,
        name: data.name,
        email: data.email,
        userType: 'human',
        createdAt: new Date().toISOString(),
        walletAddress: agentResult.data.wallet?.accountId || '',
        walletId: agentResult.data.agent?._id || ''
      };

      // Generate token for the user
      const token = btoa(`${user.email}:${Date.now()}`);

      // Return result matching the expected format
      return {
        success: true,
        user: user,
        agent: agentResult.data.agent,
        wallet: {
          accountId: agentResult.data.wallet?.accountId,
          address: agentResult.data.wallet?.accountId,
          network: agentResult.data.wallet?.network || 'testnet',
          balance: { native: agentResult.data.wallet?.initialBalance || 0 },
          isActive: agentResult.data.wallet?.enabled || false,
          id: agentResult.data.agent?._id || '',
          walletClass: 'hedera'
        },
        token: token,
        message: agentResult.data.wallet?.enabled 
          ? 'Agent created successfully with Hedera wallet'
          : 'Agent created successfully, but wallet creation failed'
      };
    } catch (error) {
      console.error('Create agent error:', error);
      throw error;
    }
  }
}

export default AuthService;