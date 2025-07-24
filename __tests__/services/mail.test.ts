import { jest } from '@jest/globals';
import { sendMail, sendAdminNotification } from '../../server/services/mail.js';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('Mail Service', () => {
  let mockTransporter: any;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };
    
    mockedNodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Set up environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'testpass';
    process.env.DEFAULT_FROM = 'BroLab <contact@brolabentertainment.com>';
    process.env.MAIL_DRY_RUN = 'false';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMail', () => {
    it('should send email successfully', async () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
      };

      await sendMail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'BroLab <contact@brolabentertainment.com>',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test HTML content',
        replyTo: undefined,
      });
    });

    it('should handle DRY_RUN mode', async () => {
      process.env.MAIL_DRY_RUN = 'true';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const payload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
      };

      await sendMail(payload);

      expect(consoleSpy).toHaveBeenCalledWith('📧 MAIL DRY RUN:', {
        to: 'test@example.com',
        subject: 'Test Subject',
        from: 'BroLab <contact@brolabentertainment.com>',
      });

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should strip HTML for text fallback', async () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Hello <strong>World</strong>&nbsp;!</p>',
      };

      await sendMail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World !',
        })
      );
    });
  });

  describe('sendAdminNotification', () => {
    it('should send notification to admin emails', async () => {
      process.env.ADMIN_EMAILS = 'admin1@test.com,admin2@test.com';

      await sendAdminNotification('TEST_TYPE', {
        subject: 'Test Admin Subject',
        html: '<p>Admin content</p>',
        metadata: { key: 'value' },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['admin1@test.com', 'admin2@test.com'],
          subject: '[BroLab Admin] Test Admin Subject',
        })
      );
    });
  });
});