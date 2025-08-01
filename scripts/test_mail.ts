#!/usr/bin/env tsx
import { sendMail } from '../server/services/mail';
import { config } from 'dotenv';

// Load environment variables
config();

async function testMail() {
  const testEmail = process.argv[2] || 'test@example.com';
  
  console.log('🧪 Testing mail service...');
  console.log('📧 Sending to:', testEmail);
  
  try {
    await sendMail({
      to: testEmail,
      subject: '🧪 BroLab Mail Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #8B5CF6;">BroLab Entertainment</h2>
            <p>This is a test email from the BroLab mail service.</p>
            <p><strong>Test successful!</strong> ✅</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This email was sent from the BroLab Entertainment mail service testing script.
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Test email sent successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Usage: tsx scripts/test_mail.ts your@email.com
testMail();