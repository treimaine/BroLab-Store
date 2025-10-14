import { jest } from "@jest/globals";
import { ReservationEmailService } from "../../server/services/ReservationEmailService";
import { PaymentData, ReservationEmailData, User } from "../../server/templates/emailTemplates";

// Mock the mail service
jest.mock("../../server/services/mail", () => ({
  sendMailWithResult: jest.fn(),
}));

import { sendMailWithResult } from "../../server/services/mail";

const mockSendMailWithResult = sendMailWithResult as jest.MockedFunction<typeof sendMailWithResult>;

describe("ReservationEmailService", () => {
  let emailService: ReservationEmailService;
  let mockUser: User;
  let mockReservation: ReservationEmailData;
  let mockPayment: PaymentData;

  beforeEach(() => {
    emailService = new ReservationEmailService({
      adminEmails: ["admin@test.com"],
      fromEmail: "test@brolabentertainment.com",
    });

    mockUser = {
      id: "user123",
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
    };

    mockReservation = {
      id: "res123",
      serviceType: "mixing_mastering",
      preferredDate: "2024-12-15T14:00:00Z",
      durationMinutes: 120,
      totalPrice: 200,
      status: "confirmed",
      notes: "Test reservation",
      details: {
        name: "John Doe",
        email: "user@test.com",
        phone: "+1234567890",
        requirements: "High quality mixing",
      },
    };

    mockPayment = {
      amount: 20000, // $200.00 in cents
      currency: "usd",
      paymentIntentId: "pi_test123",
      paymentMethod: "card",
    };

    // Reset mocks
    mockSendMailWithResult.mockReset();
  });

  describe("sendReservationConfirmation", () => {
    it("should send reservation confirmation email successfully", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "msg123",
        attempts: 1,
      });

      const result = await emailService.sendReservationConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg123");
      expect(result.attempts).toBe(1);

      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "🎵 Reservation Confirmed - BroLab Entertainment",
          from: "test@brolabentertainment.com",
        }),
        expect.any(Object)
      );
    });

    it("should handle email sending failure with retry", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: false,
        error: "SMTP connection failed",
        attempts: 3,
      });

      const result = await emailService.sendReservationConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP connection failed");
      expect(result.attempts).toBe(3);
    });

    it("should format service types correctly in email", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "msg123",
        attempts: 1,
      });

      await emailService.sendReservationConfirmation(mockUser, [mockReservation], mockPayment);

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("Mixing & Mastering");
      expect(emailHtml).toContain("December 15, 2024");
      expect(emailHtml).toContain("120 minutes");
    });
  });

  describe("sendAdminNotification", () => {
    it("should send admin notification email successfully", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "admin_msg123",
        attempts: 1,
      });

      const result = await emailService.sendAdminNotification(mockUser, mockReservation);

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@test.com"],
          subject: "🔔 New Reservation - mixing_mastering - BroLab Entertainment",
          from: "test@brolabentertainment.com",
        }),
        expect.any(Object)
      );
    });

    it("should include user and reservation details in admin email", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "admin_msg123",
        attempts: 1,
      });

      await emailService.sendAdminNotification(mockUser, mockReservation);

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("John Doe");
      expect(emailHtml).toContain("user@test.com");
      expect(emailHtml).toContain("+1234567890");
      expect(emailHtml).toContain("High quality mixing");
    });
  });

  describe("sendStatusUpdate", () => {
    it("should send status update email with correct status colors", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "status_msg123",
        attempts: 1,
      });

      const result = await emailService.sendStatusUpdate(
        mockUser,
        mockReservation,
        "pending",
        "confirmed"
      );

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "📅 Reservation Status Update - CONFIRMED - BroLab Entertainment",
        }),
        expect.any(Object)
      );

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("PENDING");
      expect(emailHtml).toContain("CONFIRMED");
    });
  });

  describe("sendPaymentConfirmation", () => {
    it("should send payment confirmation email with transaction details", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "payment_msg123",
        attempts: 1,
      });

      const result = await emailService.sendPaymentConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "💳 Payment Confirmed - BroLab Entertainment",
        }),
        expect.any(Object)
      );

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("200.00 USD");
      expect(emailHtml).toContain("pi_test123");
      expect(emailHtml).toContain("card");
    });
  });

  describe("sendPaymentFailure", () => {
    it("should send payment failure email with retry instructions", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "failure_msg123",
        attempts: 1,
      });

      const result = await emailService.sendPaymentFailure(
        mockUser,
        ["res123"],
        mockPayment,
        "Insufficient funds"
      );

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "⚠️ Payment Failed - BroLab Entertainment",
        }),
        expect.any(Object)
      );

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("Insufficient funds");
      expect(emailHtml).toContain("Try Payment Again");
    });
  });

  describe("sendReservationReminder", () => {
    it("should send reminder email with preparation checklist", async () => {
      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "reminder_msg123",
        attempts: 1,
      });

      const result = await emailService.sendReservationReminder(mockUser, mockReservation);

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: "⏰ Reminder: Your session is tomorrow - BroLab Entertainment",
        }),
        expect.any(Object)
      );

      const emailCall = mockSendMailWithResult.mock.calls[0];
      const emailHtml = emailCall[0].html;

      expect(emailHtml).toContain("Arrive 10 minutes early");
      expect(emailHtml).toContain("Bring any reference materials");
      expect(emailHtml).toContain("Preparation Checklist");
    });
  });

  describe("retry logic", () => {
    it("should use custom retry options", async () => {
      const customEmailService = new ReservationEmailService({
        retryOptions: {
          maxRetries: 5,
          baseDelay: 500,
          maxDelay: 10000,
          backoffFactor: 1.5,
        },
      });

      mockSendMailWithResult.mockResolvedValue({
        success: true,
        messageId: "msg123",
        attempts: 3,
      });

      const result = await customEmailService.sendReservationConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(true);
      expect(mockSendMailWithResult).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          maxRetries: 5,
          baseDelay: 500,
          maxDelay: 10000,
          backoffFactor: 1.5,
        })
      );
    });
  });

  describe("service type formatting", () => {
    it("should format different service types correctly", () => {
      const testCases = [
        { input: "mixing_mastering", expected: "Mixing & Mastering" },
        { input: "recording_session", expected: "Recording Session" },
        { input: "custom_beat", expected: "Custom Beat Production" },
        { input: "production_consultation", expected: "Production Consultation" },
        { input: "unknown_service", expected: "Unknown Service" },
      ];

      testCases.forEach(({ input, expected }) => {
        // Access private method for testing (TypeScript hack)
        const formatServiceType = (emailService as any).formatServiceType.bind(emailService);
        expect(formatServiceType(input)).toBe(expected);
      });
    });
  });
});
