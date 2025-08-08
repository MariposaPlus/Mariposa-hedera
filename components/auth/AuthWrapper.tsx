'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks/redux';
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from '@/lib/slices/authSlice';
import type { User as ReduxUser, Wallet as ReduxWallet } from '@/lib/slices/authSlice';
import { AuthService } from '@/lib/services/authService';
import AuthPage from './AuthPage';
// Removed WalletOnboarding import - using simplified flow

type AuthPageState = 'loading' | 'login' | 'authenticated';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [authPageState, setAuthPageState] = useState<AuthPageState>('loading');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, token, isLoading } = useAppSelector((state) => state.auth);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    // Already authenticated
    if (isAuthenticated && user && token) {
      if (authPageState !== 'authenticated') setAuthPageState('authenticated');
      return;
    }

    const storedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('mariposa_token') : null);

    // Verify token only once while loading to avoid loops
    if (storedToken && authPageState === 'loading' && !isVerifyingRef.current) {
      isVerifyingRef.current = true;
      checkAuthStatus(storedToken).finally(() => {
        isVerifyingRef.current = false;
      });
      return;
    }

    // No token → show login
    if (!storedToken && authPageState !== 'login') {
      setAuthPageState('login');
    }
  }, [isAuthenticated, user, token, authPageState]);

  // Default redirect to dashboard after authentication is complete
  // This will only trigger if no specific redirectUrl was provided in the callbacks
  useEffect(() => {
    if (authPageState === 'authenticated' && !isLoading) {
      // Only redirect to dashboard if user is on the root path or auth-related paths
      // Preserve user's current location for valid authenticated routes
      const validAuthenticatedRoutes = ['/dashboard', '/pipeline', '/trading', '/cards', '/analytics', '/activity', '/agents', '/agent', '/chat'];
      const isOnValidRoute = validAuthenticatedRoutes.some(route => pathname.startsWith(route));
      
      // Only redirect if not already on a valid authenticated route
      if (!isOnValidRoute || pathname === '/') {
        router.push('/dashboard');
      }
    }
  }, [authPageState, isLoading, router, pathname]);

  const checkAuthStatus = async (providedToken?: string | null) => {
    try {
      dispatch(loginStart());
      
      const storedToken = providedToken || token || (typeof window !== 'undefined' ? localStorage.getItem('mariposa_token') : null);
      if (!storedToken) {
        if (authPageState !== 'login') setAuthPageState('login');
        return;
      }

      const userData = await AuthService.verifyToken(storedToken);
      
      dispatch(loginSuccess({
        user: userData.user,
        wallet: userData.wallet || {
          id: '',
          address: userData.user?.walletAddress || '',
          accountId: userData.user?.walletAddress || '',
          network: 'hedera-testnet',
          walletClass: 'hedera',
          balance: {},
          isActive: true
        },
        token: storedToken
      }));
      
      // Ensure token is also in cookies for middleware
      if (storedToken) {
        document.cookie = `mariposa_token=${storedToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`;
        console.log('🍪 Token cookie set during auth check:', storedToken.substring(0, 20) + '...');
      }
      
      if (authPageState !== 'authenticated') setAuthPageState('authenticated');
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('mariposa_token');
      // Remove cookie as well
      document.cookie = 'mariposa_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      dispatch(loginFailure(error instanceof Error ? error.message : 'Auth check failed'));
      if (authPageState !== 'login') setAuthPageState('login');
    }
  };

  const handleAuthSuccess = (userData: any, redirectUrl?: string) => {
    // The OTP verification now handles user/agent creation automatically
    // Extract user info from the response
    const user = userData.user || userData;
    
    dispatch(loginSuccess({
      user: user,
      wallet: userData.wallet || {
        id: user.walletId || '',
        address: user.walletAddress || '',
        accountId: user.walletAddress || '',
        network: 'hedera-testnet',
        walletClass: 'hedera',
        balance: {},
        isActive: true
      },
      token: user.token
    }));
    
    // Store token in localStorage and cookies
    if (user.token) {
      localStorage.setItem('mariposa_token', user.token);
      // Also set as cookie for middleware access
      document.cookie = `mariposa_token=${user.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`;
      console.log('🍪 Token cookie set:', user.token.substring(0, 20) + '...');
    }
    
    setAuthPageState('authenticated');
    
    // If redirectUrl is provided, use it instead of the default dashboard redirect
    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      // Check if user is on a valid authenticated route and preserve it
      const validAuthenticatedRoutes = ['/dashboard', '/pipeline', '/trading', '/cards', '/analytics', '/activity', '/agents', '/agent', '/chat'];
      const isOnValidRoute = validAuthenticatedRoutes.some(route => pathname.startsWith(route));
      
      // Only redirect to dashboard if not on a valid route
      if (!isOnValidRoute || pathname === '/') {
        router.push('/dashboard');
      }
    }
  };

  const handleCreateAgent = async (user: any, redirectUrl?: string) => {
    try {
      console.log('🚀 Creating Hedera agent for user:', user.id);
      
      // Create agent using the real userId
      const agentData = await AuthService.createUserWithAgent({
        email: user.email,
        name: user.name,
        agentName: `${user.name} Agent`,
        userId: user.id // Pass the real userId
      });
      
      dispatch(loginSuccess({
        user: user,
        wallet: agentData.wallet || {
          id: '',
          address: '',
          accountId: '',
          network: '',
          walletClass: 'trading',
          balance: {},
          isActive: true
        },
        token: user.token
      }));
      setAuthPageState('authenticated');
      
      // If redirectUrl is provided, use it instead of the default dashboard redirect
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      setAuthPageState('login'); // Fall back to login page with error
    }
  };

  const handleNeedsOnboarding = async (email: string, redirectUrl?: string) => {
    // This function should not be called anymore since OTP verification
    // now handles user/agent creation automatically. Redirect to auth success.
    console.log('⚠️ handleNeedsOnboarding called - this should not happen with the new flow');
    
    // Create a basic user object for fallback
    const fallbackUser = {
      id: email,
      name: email.split('@')[0],
      email: email,
      userType: 'human',
      token: btoa(`${email}:${Date.now()}`)
    };
    
    handleAuthSuccess({ user: fallbackUser }, redirectUrl);
  };

  const handleLogout = () => {
    localStorage.removeItem('mariposa_token');
    // Remove cookie as well
    document.cookie = 'mariposa_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    dispatch(logoutAction());
    setAuthPageState('login');
    // Redirect to home if on protected route
    const protectedPaths = ['/dashboard','/pipeline','/trading','/cards','/analytics','/activity','/agents','/agent','/chat'];
    if (protectedPaths.some(p => pathname.startsWith(p))) router.push('/');
  };

  const handleBackToLogin = () => {
    setAuthPageState('login');
    setOnboardingEmail('');
  };

  // Show loading spinner while checking auth
  if (authPageState === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Mariposa...</p>
        </div>
      </div>
    );
  }

  // Show login page
  if (authPageState === 'login') {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onNeedsOnboarding={handleNeedsOnboarding}
      />
    );
  }

  // Simplified flow: no separate onboarding component needed

  // User is authenticated - show the main app
  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create auth context for use throughout the app
export const AuthContext = React.createContext<{
  user: ReduxUser | null;
  logout: () => void;
}>({
  user: null,
  logout: () => {}
});

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthWrapper');
  }
  return context;
};