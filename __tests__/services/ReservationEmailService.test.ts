import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ReservationEmailService } from "../../server/services/ReservationEmailService";
import type {
  PaymentData,
  ReservationEmailData,
  User,
} from "../../server/templates/emailTemplates";

// Mock the mail service
jest.mock("../../server/services/mail", () => ({
  sendMailWithResult: jest.fn(),
}));

import { sendMailWithResult } from "../../server/services/mail";

describe("ReservationEmailService", () => {
  let emailService: ReservationEmailService;
  let mockUser: User;
  let mockReservation: ReservationEmailData;
  let mockPayment: PaymentData;

  beforeEach(() => {
    jest.clearAllMocks();

    emailService = new ReservationEmailService({
      adminEmails: ["admin@test.com"],
      fromEmail: "test@brolabentertainment.com",
    });

    mockUser = {
      id: "user_123",
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
    };

    mockReservation = {
      id: "res_123",
      serviceType: "mixing",
      status: "pending",
      preferredDate: new Date("2024-02-01T10:00:00Z").toISOString(),
      durationMinutes: 120,
      totalPrice: 200,
      notes: "Test reservation",
      details: {
        name: "John Doe",
        email: "user@test.com",
        phone: "1234567890",
        requirements: "Test requirements",
      },
    };

    mockPayment = {
      amount: 20000,
      currency: "usd",
      paymentMethod: "card",
      paymentIntentId: "pi_123",
    };

    (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mockResolvedValue({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });
  });

  describe("sendReservationConfirmation", () => {
    it("should send confirmation email with reservation details", async () => {
      const result = await emailService.sendReservationConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Reservation Confirmed"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should include payment information when provided", async () => {
      await emailService.sendReservationConfirmation(mockUser, [mockReservation], mockPayment);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Payment Information");
      expect(callArgs.html).toContain("200.00");
      expect(callArgs.html).toContain("USD");
    });

    it("should handle multiple reservations", async () => {
      const reservation2 = { ...mockReservation, id: "res_456" };

      await emailService.sendReservationConfirmation(mockUser, [mockReservation, reservation2]);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { subject: string; html: string };
      expect(callArgs.subject).toContain("Reservation Confirmed");
      // Email contains reservation details but not IDs in the HTML
      expect(callArgs.html).toContain("Mixing");
      expect(callArgs.html).toContain("120 minutes");
    });

    it("should format service types correctly", async () => {
      await emailService.sendReservationConfirmation(mockUser, [mockReservation]);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Mixing");
    });
  });

  describe("sendAdminNotification", () => {
    it("should send notification to admin emails", async () => {
      const result = await emailService.sendAdminNotification(mockUser, mockReservation);

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@test.com"],
          subject: expect.stringContaining("New Reservation"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should include client information", async () => {
      await emailService.sendAdminNotification(mockUser, mockReservation);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain(mockUser.fullName);
      expect(callArgs.html).toContain(mockUser.email);
    });

    it("should include reservation details", async () => {
      await emailService.sendAdminNotification(mockUser, mockReservation);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("120 minutes");
      expect(callArgs.html).toContain("€200");
    });
  });

  describe("sendStatusUpdate", () => {
    it("should send status update email", async () => {
      const result = await emailService.sendStatusUpdate(
        mockUser,
        mockReservation,
        "pending",
        "confirmed"
      );

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Status Update"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should show old and new status", async () => {
      await emailService.sendStatusUpdate(mockUser, mockReservation, "pending", "confirmed");

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("PENDING");
      expect(callArgs.html).toContain("CONFIRMED");
    });

    it("should include appropriate message for status", async () => {
      await emailService.sendStatusUpdate(mockUser, mockReservation, "pending", "confirmed");

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("confirmed");
    });
  });

  describe("sendPaymentConfirmation", () => {
    it("should send payment confirmation email", async () => {
      const result = await emailService.sendPaymentConfirmation(
        mockUser,
        [mockReservation],
        mockPayment
      );

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Payment Confirmed"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should include payment details", async () => {
      await emailService.sendPaymentConfirmation(mockUser, [mockReservation], mockPayment);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("200.00");
      expect(callArgs.html).toContain("USD");
      expect(callArgs.html).toContain("pi_123");
    });

    it("should include reservation list", async () => {
      await emailService.sendPaymentConfirmation(mockUser, [mockReservation], mockPayment);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Mixing");
    });
  });

  describe("sendPaymentFailure", () => {
    it("should send payment failure email", async () => {
      const result = await emailService.sendPaymentFailure(
        mockUser,
        ["res_123"],
        mockPayment,
        "Insufficient funds"
      );

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Payment Failed"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should include failure reason", async () => {
      await emailService.sendPaymentFailure(
        mockUser,
        ["res_123"],
        mockPayment,
        "Insufficient funds"
      );

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Insufficient funds");
    });

    it("should provide retry instructions", async () => {
      await emailService.sendPaymentFailure(mockUser, ["res_123"], mockPayment);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Try Payment Again");
    });
  });

  describe("sendReservationReminder", () => {
    it("should send reminder email", async () => {
      const result = await emailService.sendReservationReminder(mockUser, mockReservation);

      expect(result.success).toBe(true);
      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: expect.stringContaining("Reminder"),
          html: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it("should include preparation checklist", async () => {
      await emailService.sendReservationReminder(mockUser, mockReservation);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Preparation Checklist");
      expect(callArgs.html).toContain("Arrive 10 minutes early");
    });
  });

  describe("Error Handling", () => {
    it("should handle email sending failures", async () => {
      (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mockResolvedValue({
        success: false,
        error: "SMTP connection failed",
        attempts: 3,
      });

      const result = await emailService.sendReservationConfirmation(mockUser, [mockReservation]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP connection failed");
    });

    it("should use retry options", async () => {
      await emailService.sendReservationConfirmation(mockUser, [mockReservation]);

      expect(sendMailWithResult).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2,
        })
      );
    });
  });

  describe("Service Type Formatting", () => {
    it("should format known service types", async () => {
      const serviceTypes = [
        { input: "mixing_mastering", expected: "Mixing & Mastering" },
        { input: "recording_session", expected: "Recording Session" },
        { input: "custom_beat", expected: "Custom Beat Production" },
        { input: "production_consultation", expected: "Production Consultation" },
      ];

      for (const { input, expected } of serviceTypes) {
        const reservation = { ...mockReservation, serviceType: input };
        await emailService.sendReservationConfirmation(mockUser, [reservation]);

        const callIndex = serviceTypes.indexOf(serviceTypes.find(st => st.input === input)!);
        const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock.calls[
          callIndex
        ][0] as { html: string };
        expect(callArgs.html).toContain(expected);
      }
    });

    it("should format unknown service types", async () => {
      const reservation = { ...mockReservation, serviceType: "unknown_service" };
      await emailService.sendReservationConfirmation(mockUser, [reservation]);

      const callArgs = (sendMailWithResult as jest.Mock<typeof sendMailWithResult>).mock
        .calls[0][0] as { html: string };
      expect(callArgs.html).toContain("Unknown Service");
    });
  });
});
