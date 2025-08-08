import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'human' | 'agent';
  walletAddress: string;
  walletId: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  address: string;
  accountId:string;
  network: string;
  walletClass: string;
  balance: Record<string, any>;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  wallet: Wallet | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingCompleted: boolean;
}

const initialState: AuthState = {
  user: null,
  wallet: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  onboardingCompleted: false,
};

export interface LoginSuccessPayload {
  user: User;
  wallet: Wallet;
  token: string;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<LoginSuccessPayload>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.wallet = action.payload.wallet;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.onboardingCompleted = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.wallet = null;
      state.token = null;
      state.isAuthenticated = false;
      state.onboardingCompleted = false;
      state.error = null;
      state.isLoading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateWallet: (state, action: PayloadAction<Partial<Wallet>>) => {
      if (state.wallet) {
        state.wallet = { ...state.wallet, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateWallet,
  clearError,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer; 