import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// In production, you'd use a proper database and email service
// This is a simplified implementation for demonstration
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

// Simple rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Rate limiting: max 3 requests per 15 minutes per email
    const now = Date.now();
    const rateKey = email.toLowerCase();
    const rateLimit = rateLimitStore.get(rateKey);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 3) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        }
        rateLimit.count++;
      } else {
        // Reset rate limit
        rateLimitStore.set(rateKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
      }
    } else {
      rateLimitStore.set(rateKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
    }

    // Use constant OTP for development
    const otp = "123456"; // Fixed OTP for development
    
    // Store OTP with 10-minute expiration
    otpStore.set(email.toLowerCase(), {
      code: otp,
      expires: now + 10 * 60 * 1000,
      attempts: 0
    });

    // In production, send email via your email service (SendGrid, SES, etc.)
    console.log(`OTP for ${email}: ${otp}`); // Remove this in production!
    
    // Simulate email sending
    await sendOTPEmail(email, otp);

    return NextResponse.json({
      message: 'Verification code sent successfully',
      // In development, return the OTP for easy testing
      ...(process.env.NODE_ENV === 'development' && { otp: otp, dev_note: 'Use OTP: 123456' })
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

async function sendOTPEmail(email: string, otp: string) {
  // In production, implement actual email sending
  // Example with SendGrid, Nodemailer, or AWS SES
  
  const emailContent = `
    Your Mariposa verification code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, please ignore this email.
  `;

  // Simulate email delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For development, just log the OTP
  console.log(`📧 [DEV MODE] Email would be sent to ${email}`);
  console.log(`🔑 [DEV MODE] OTP Code: ${otp}`);
  console.log(`📝 [DEV MODE] Use this code in the app: 123456`);

  // In production, replace with actual email service:
  /*
  await sendEmail({
    to: email,
    subject: 'Your Mariposa Verification Code',
    text: emailContent,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Mariposa Verification</h2>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
    `
  });
  */

  console.log(`Email sent to ${email} with OTP: ${otp}`);
} 