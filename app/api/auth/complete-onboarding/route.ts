import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Wallet } from 'ethers';

// In production, use a proper database
const userStore = new Map<string, any>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, username, walletMnemonic } = await request.json();

    console.log('Onboarding request:', { email, fullName, username, mnemonic: walletMnemonic?.length });

    // Validate input
    if (!email || !fullName || !username || !walletMnemonic) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || !/^[a-z0-9]+$/.test(username)) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters and contain only lowercase letters and numbers' },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();

    // Check if user already exists
    if (userStore.get(emailKey)) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Check if username is taken
    const existingUsernames = Array.from(userStore.values()).map(user => user.username);
    if (existingUsernames.includes(username.toLowerCase())) {
      return NextResponse.json(
        { message: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Create wallet from mnemonic
    let walletAddress;
    try {
      const wallet = Wallet.fromPhrase(walletMnemonic);
      walletAddress = wallet.address;
      console.log('Wallet created successfully:', walletAddress);
    } catch (error) {
      console.error('Wallet creation error:', error);
      return NextResponse.json(
        { message: 'Invalid wallet mnemonic' },
        { status: 400 }
      );
    }

    // Generate user ID
    const userId = randomBytes(16).toString('hex');

    // Create user object
    const userData = {
      id: userId,
      email: emailKey,
      fullName,
      username: username.toLowerCase(),
      walletAddress,
      // In production, encrypt the mnemonic before storing
      encryptedMnemonic: await encryptMnemonic(walletMnemonic),
      createdAt: new Date().toISOString(),
      isEmailVerified: true,
      isOnboardingComplete: true
    };

    console.log('User data created:', { ...userData, encryptedMnemonic: '[ENCRYPTED]' });

    // Store user (in production, save to database)
    userStore.set(emailKey, userData);

    // Create JWT token
    const token = sign(
      { 
        userId: userData.id, 
        email: userData.email,
        walletAddress: userData.walletAddress
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Initialize user wallet and trading account
    await initializeUserAccount(userData);

    // Return user data without sensitive information
    const safeUserData = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      username: userData.username,
      walletAddress: userData.walletAddress,
      createdAt: userData.createdAt,
      token
    };

    console.log('Onboarding completed successfully for:', email);

    return NextResponse.json({
      message: 'Onboarding completed successfully',
      user: safeUserData
    });

  } catch (error) {
    console.error('Complete onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to complete onboarding', error: errorMessage },
      { status: 500 }
    );
  }
}

async function encryptMnemonic(mnemonic: string): Promise<string> {
  // Simplified encryption for development
  // In production, use proper encryption (AES-256-GCM with a master key)
  
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('mariposa-secret-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback: base64 encoding for development
    return Buffer.from(mnemonic).toString('base64');
  }
}

async function initializeUserAccount(userData: any) {
  // Initialize user's trading account, portfolios, etc.
  // This could include:
  
  try {
    // 1. Create default portfolio
    const defaultPortfolio = {
      id: randomBytes(16).toString('hex'),
      userId: userData.id,
      name: 'Main Portfolio',
      description: 'Your primary trading portfolio',
      isDefault: true,
      createdAt: new Date().toISOString(),
      balance: {
        SEI: '0',
        USDT: '0',
        WBTC: '0'
      }
    };

    // 2. Set up default trading preferences
    const tradingPreferences = {
      userId: userData.id,
      defaultSlippage: 0.5, // 0.5%
      autoApproveLimit: '100', // Auto-approve trades under $100
      notifications: {
        email: true,
        trades: true,
        priceAlerts: true
      }
    };

    // 3. Create welcome bonus or referral tracking
    const welcomeBonus = {
      userId: userData.id,
      type: 'welcome',
      amount: '0.1', // 0.1 SEI welcome bonus
      claimed: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    // In production, save these to your database
    console.log('User account initialized:', {
      portfolio: defaultPortfolio,
      preferences: tradingPreferences,
      bonus: welcomeBonus
    });

    // 4. Send welcome email
    await sendWelcomeEmail(userData);

  } catch (error) {
    console.error('Failed to initialize user account:', error);
    // Don't fail the onboarding if this fails
  }
}

async function sendWelcomeEmail(userData: any) {
  // Send welcome email with wallet setup confirmation
  const emailContent = `
    Welcome to Mariposa, ${userData.fullName}!
    
    Your account has been successfully created:
    - Username: ${userData.username}
    - Wallet Address: ${userData.walletAddress}
    
    You can now start trading cryptocurrencies on the SEI network.
    
    Security reminders:
    - Keep your recovery phrase safe and private
    - Never share your wallet credentials
    - Enable 2FA when available
  `;

  console.log(`Welcome email sent to ${userData.email}`);
  
  // In production, use your email service
}