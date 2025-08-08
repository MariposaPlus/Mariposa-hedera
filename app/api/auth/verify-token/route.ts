import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

// In production, use a proper database
const userStore = new Map<string, any>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No valid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as any;
    
    // Get user data from database
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 401 }
      );
    }

    // Return user data without sensitive information
    const safeUserData = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
      isOnboardingComplete: user.isOnboardingComplete
    };

    return NextResponse.json({
      message: 'Token valid',
      user: safeUserData
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'JsonWebTokenError') {
        return NextResponse.json(
          { message: 'Invalid token' },
          { status: 401 }
        );
      }
      
      if (error.name === 'TokenExpiredError') {
        return NextResponse.json(
          { message: 'Token expired' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Token verification failed' },
      { status: 500 }
    );
  }
}

async function getUserById(userId: string) {
  // In production, query your database
  // Example:
  /*
  const user = await db.user.findUnique({
    where: { id: userId }
  });
  return user;
  */
  
  // For this demo, search through our mock store
  const users = Array.from(userStore.entries());
  for (const [email, user] of users) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}