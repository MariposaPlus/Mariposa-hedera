'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (userData: any, redirectUrl?: string) => void;
  onNeedsOnboarding: (email: string, redirectUrl?: string) => void;
}

export default function AuthPage({ onAuthSuccess, onNeedsOnboarding }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleGetCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call your backend API to send OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verification code sent to your email!');
        setOtpSent(true);
      } else {
        setError(data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // Prefer unified flow: if backend returns user, proceed directly
        if (data.user) {
          onAuthSuccess(data.user, data.redirectUrl);
        } else if (data.isNewUser) {
          onNeedsOnboarding(email, data.redirectUrl);
        }
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Removed handleBackToEmail - using single page flow

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Mariposa</CardTitle>
          <CardDescription>
            Enter your email and verification code to get started with secure crypto trading
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || otpSent}
                  className="flex-1"
                />
                <Button 
                  onClick={handleGetCode}
                  disabled={loading || !email || !email.includes('@') || otpSent}
                  className="px-4"
                >
                  {loading && !otpSent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : otpSent ? (
                    'Sent'
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </div>
            </div>

            {/* OTP Field - Always visible for single-page experience */}
            <div className="space-y-2">
              <Label htmlFor="otp">6-Digit Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter OTP (use 123456 for demo)"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyOtp()}
                disabled={loading || !otpSent}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            {/* Verify Button */}
            <Button 
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6 || !otpSent}
              className="w-full"
            >
              {loading && otpSent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </Button>

            {/* Reset Button */}
            {otpSent && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setSuccess('');
                  setError('');
                }}
                disabled={loading}
                className="w-full"
              >
                Change Email
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Secure authentication powered by email verification</p>
            <p className="mt-1">Your data is encrypted and protected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}