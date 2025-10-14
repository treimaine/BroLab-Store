import { jest } from "@jest/globals";
import { reservationEmailService } from "../../server/services/ReservationEmailService";
import { sendMailWithResult } from "../../server/services/mail";

// Mock the mail service
jest.mock("../../server/services/mail", () => ({
  sendMail: jest.fn(),
  sendMailWithResult: jest.fn(),
}));

const mockSendMailWithResult = sendMailWithResult as jest.MockedFunction<typeof sendMailWithResult>;

describe("Email System Integration", () => {
  beforeEach(() => {
    mockSendMailWithResult.mockReset();
    process.env.MAIL_DRY_RUN = "true"; // Enable dry run for tests
  });

  afterEach(() => {
    delete process.env.MAIL_DRY_RUN;
  });

  it("should handle complete reservation flow with emails", async () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
    };

    const mockReservation = {
      id: "res123",
      serviceType: "mixing_mastering",
      preferredDate: "2024-12-15T14:00:00Z",
      durationMinutes: 120,
      totalPrice: 200,
      status: "confirmed",
      notes: "Test reservation",
      details: {
        name: "John Doe",
        email: "test@example.com",
        phone: "+1234567890",
        requirements: "High quality mixing",
      },
    };

    const mockPayment = {
      amount: 20000,
      currency: "usd",
      paymentIntentId: "pi_test123",
      paymentMethod: "card",
    };

    // Mock successful email sending
    mockSendMailWithResult.mockResolvedValue({
      success: true,
      messageId: "msg123",
      attempts: 1,
    });

    // Test 1: Send reservation confirmation
    const confirmationResult = await reservationEmailService.sendReservationConfirmation(
      mockUser,
      [mockReservation],
      mockPayment
    );

    expect(confirmationResult.success).toBe(true);
    expect(mockSendMailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockUser.email,
        subject: "🎵 Reservation Confirmed - BroLab Entertainment",
      }),
      expect.any(Object)
    );

    // Test 2: Send admin notification
    const adminResult = await reservationEmailService.sendAdminNotification(
      mockUser,
      mockReservation
    );

    expect(adminResult.success).toBe(true);
    expect(mockSendMailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "🔔 New Reservation - mixing_mastering - BroLab Entertainment",
      }),
      expect.any(Object)
    );

    // Test 3: Send status update
    const statusResult = await reservationEmailService.sendStatusUpdate(
      mockUser,
      mockReservation,
      "pending",
      "confirmed"
    );

    expect(statusResult.success).toBe(true);
    expect(mockSendMailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "📅 Reservation Status Update - CONFIRMED - BroLab Entertainment",
      }),
      expect.any(Object)
    );

    // Test 4: Send payment confirmation
    const paymentResult = await reservationEmailService.sendPaymentConfirmation(
      mockUser,
      [mockReservation],
      mockPayment
    );

    expect(paymentResult.success).toBe(true);
    expect(mockSendMailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "💳 Payment Confirmed - BroLab Entertainment",
      }),
      expect.any(Object)
    );

    // Test 5: Send reminder
    const reminderResult = await reservationEmailService.sendReservationReminder(
      mockUser,
      mockReservation
    );

    expect(reminderResult.success).toBe(true);
    expect(mockSendMailWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "⏰ Reminder: Your session is tomorrow - BroLab Entertainment",
      }),
      expect.any(Object)
    );

    // Verify all emails were attempted
    expect(mockSendMailWithResult).toHaveBeenCalledTimes(5);
  });

  it("should handle email failures gracefully", async () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      fullName: "John Doe",
    };

    const mockReservation = {
      id: "res123",
      serviceType: "mixing_mastering",
      preferredDate: "2024-12-15T14:00:00Z",
      durationMinutes: 120,
      totalPrice: 200,
      status: "confirmed",
      details: {
        name: "John Doe",
        email: "test@example.com",
      },
    };

    // Mock email failure
    mockSendMailWithResult.mockResolvedValue({
      success: false,
      error: "SMTP connection failed",
      attempts: 3,
    });

    const result = await reservationEmailService.sendStatusUpdate(
      mockUser,
      mockReservation,
      "pending",
      "confirmed"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMTP connection failed");
    expect(result.attempts).toBe(3);
  });

  it("should format different service types correctly", async () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      fullName: "John Doe",
    };

    const serviceTypes = [
      { input: "mixing_mastering", expected: "Mixing & Mastering" },
      { input: "recording_session", expected: "Recording Session" },
      { input: "custom_beat", expected: "Custom Beat Production" },
      { input: "production_consultation", expected: "Production Consultation" },
    ];

    mockSendMailWithResult.mockResolvedValue({
      success: true,
      messageId: "msg123",
      attempts: 1,
    });

    for (const { input, expected } of serviceTypes) {
      const mockReservation = {
        id: "res123",
        serviceType: input,
        preferredDate: "2024-12-15T14:00:00Z",
        durationMinutes: 120,
        totalPrice: 200,
        status: "confirmed",
        details: {
          name: "John Doe",
          email: "test@example.com",
        },
      };

      await reservationEmailService.sendAdminNotification(mockUser, mockReservation);

      const lastCall =
        mockSendMailWithResult.mock.calls[mockSendMailWithResult.mock.calls.length - 1];
      const emailHtml = lastCall[0].html;

      expect(emailHtml).toContain(expected);
    }
  });
});
