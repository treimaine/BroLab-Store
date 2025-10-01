import { describe, expect, test } from "@jest/globals";
import {
  AvailabilityCheckSchema,
  ClientInfoSchema,
  CreateReservationSchema,
  EquipmentRequirementsSchema,
  PricingInfoSchema,
  PriorityLevel,
  RescheduleRequestSchema,
  ReservationFilterSchema,
  ReservationSchema,
  ReservationStatus,
  ServiceDetailsSchema,
  ServiceType,
  StudioRoom,
  TimeSlotSchema,
  UpdateReservationSchema,
  validateRoomForService,
  validateServicePricing,
  validateTimeSlot,
} from "../../shared/validation/ReservationValidation";

describe(_"Reservation Validation Tests", _() => {
  describe(_"ServiceType Validation", _() => {
    test(_"should accept valid service types", _() => {
      const validTypes = [
        "mixing",
        "mastering",
        "recording",
        "custom_beat",
        "consultation",
        "vocal_tuning",
        "beat_remake",
        "full_production",
      ];

      validTypes.forEach(type => {
        expect_(() => ServiceType.parse(type)).not.toThrow();
      });
    });

    test(_"should reject invalid service types", _() => {
      const invalidTypes = ["editing", "composing", "arrangement", "", "invalid-service"];

      invalidTypes.forEach(type => {
        expect_(() => ServiceType.parse(type)).toThrow();
      });
    });
  });

  describe(_"ReservationStatus Validation", _() => {
    test(_"should accept valid reservation statuses", _() => {
      const validStatuses = [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ];

      validStatuses.forEach(status => {
        expect_(() => ReservationStatus.parse(status)).not.toThrow();
      });
    });

    test(_"should reject invalid reservation statuses", _() => {
      const invalidStatuses = ["draft", "scheduled", "active", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect_(() => ReservationStatus.parse(status)).toThrow();
      });
    });
  });

  describe(_"PriorityLevel Validation", _() => {
    test(_"should accept valid priority levels", _() => {
      const validPriorities = ["standard", "priority", "rush", "emergency"];

      validPriorities.forEach(priority => {
        expect_(() => PriorityLevel.parse(priority)).not.toThrow();
      });
    });

    test(_"should reject invalid priority levels", _() => {
      const invalidPriorities = ["low", "high", "urgent", "", "invalid-priority"];

      invalidPriorities.forEach(priority => {
        expect_(() => PriorityLevel.parse(priority)).toThrow();
      });
    });
  });

  describe(_"StudioRoom Validation", _() => {
    test(_"should accept valid studio rooms", _() => {
      const validRooms = [
        "studio_a",
        "studio_b",
        "vocal_booth_1",
        "vocal_booth_2",
        "mixing_room",
        "mastering_suite",
        "remote",
      ];

      validRooms.forEach(room => {
        expect_(() => StudioRoom.parse(room)).not.toThrow();
      });
    });

    test(_"should reject invalid studio rooms", _() => {
      const invalidRooms = ["studio_c", "booth_3", "control_room", "", "invalid-room"];

      invalidRooms.forEach(room => {
        expect_(() => StudioRoom.parse(room)).toThrow();
      });
    });
  });

  describe(_"EquipmentRequirements Schema Validation", _() => {
    test(_"should accept valid equipment requirements", _() => {
      const validRequirements = {
        microphones: ["Neumann U87", "Shure SM7B"],
        instruments: ["Piano", "Guitar"],
        software: ["Pro Tools", "FL Studio"],
        specialRequests: "Need vintage compressor for vocal chain",
      };

      expect_(() => EquipmentRequirementsSchema.parse(validRequirements)).not.toThrow();
    });

    test(_"should accept empty equipment requirements", _() => {
      const emptyRequirements = {};
      expect_(() => EquipmentRequirementsSchema.parse(emptyRequirements)).not.toThrow();
    });

    test(_"should reject equipment requirements with too long special requests", _() => {
      const invalidRequirements = {
        specialRequests: "a".repeat(501), // Too long
      };

      expect_(() => EquipmentRequirementsSchema.parse(invalidRequirements)).toThrow();
    });
  });

  describe(_"ServiceDetails Schema Validation", _() => {
    test(_"should accept valid service details", _() => {
      const validDetails = {
        trackCount: 5,
        estimatedDuration: 120, // 2 hours
        stemCount: 8,
        referenceTrack: "https://example.com/reference.mp3",
        targetLoudness: -14,
        genre: "Hip-Hop",
        bpm: 140,
        key: "Am",
        mood: "Dark",
        deliveryFormat: "wav" as const,
        bitRate: "24bit" as const,
        sampleRate: "48000" as const,
        includeStems: true,
        includeRevisions: 3,
        rushDelivery: false,
      };

      expect_(() => ServiceDetailsSchema.parse(validDetails)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalDetails = {};
      const result = ServiceDetailsSchema.parse(minimalDetails);

      expect(result.includeStems).toBe(false);
      expect(result.includeRevisions).toBe(2);
      expect(result.rushDelivery).toBe(false);
    });

    test(_"should reject invalid track count", _() => {
      const invalidDetails = {
        trackCount: 0, // Must be at least 1
      };

      expect_(() => ServiceDetailsSchema.parse(invalidDetails)).toThrow();
    });

    test(_"should reject invalid BPM", _() => {
      const invalidDetails = {
        bpm: 300, // Too high
      };

      expect_(() => ServiceDetailsSchema.parse(invalidDetails)).toThrow();
    });

    test(_"should reject too many revisions", _() => {
      const invalidDetails = {
        includeRevisions: 10, // Maximum is 5
      };

      expect_(() => ServiceDetailsSchema.parse(invalidDetails)).toThrow();
    });
  });

  describe(_"ClientInfo Schema Validation", _() => {
    test(_"should accept valid client information", _() => {
      const validClientInfo = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1-555-123-4567",
        artistName: "J-Doe",
        recordLabel: "BroLab Records",
        website: "https://johndoe.com",
        experienceLevel: "intermediate" as const,
        isPreviousClient: true,
        referralSource: "Google Search",
      };

      expect_(() => ClientInfoSchema.parse(validClientInfo)).not.toThrow();
    });

    test(_"should reject client info with missing required fields", _() => {
      const invalidClientInfo = {
        firstName: "",
        lastName: "",
        email: "invalid-email",
        phone: "123", // Too short
      };

      expect_(() => ClientInfoSchema.parse(invalidClientInfo)).toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalClientInfo = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1-555-123-4567",
      };

      const result = ClientInfoSchema.parse(minimalClientInfo);
      expect(result.isPreviousClient).toBe(false);
    });

    test(_"should reject invalid website URL", _() => {
      const invalidClientInfo = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1-555-123-4567",
        website: "not-a-valid-url",
      };

      expect_(() => ClientInfoSchema.parse(invalidClientInfo)).toThrow();
    });
  });

  describe(_"PricingInfo Schema Validation", _() => {
    test(_"should accept valid pricing information", _() => {
      const validPricing = {
        basePrice: 15000, // $150.00
        additionalFees: [
          {
            name: "Rush Delivery",
            amount: 5000, // $50.00
            description: "24-hour delivery",
          },
        ],
        discounts: [
          {
            name: "Returning Customer",
            amount: 2500, // $25.00
            type: "fixed" as const,
            description: "10% discount for returning customers",
          },
        ],
        totalPrice: 17500, // $175.00
        currency: "USD" as const,
        depositRequired: true,
        depositAmount: 8750, // 50% deposit
        paymentDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      expect_(() => PricingInfoSchema.parse(validPricing)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalPricing = {
        basePrice: 10000,
        totalPrice: 10000,
      };

      const result = PricingInfoSchema.parse(minimalPricing);
      expect(result.additionalFees).toEqual([]);
      expect(result.discounts).toEqual([]);
      expect(result.currency).toBe("USD");
      expect(result.depositRequired).toBe(false);
    });

    test(_"should reject negative prices", _() => {
      const invalidPricing = {
        basePrice: -100, // Negative price
        totalPrice: -100,
      };

      expect_(() => PricingInfoSchema.parse(invalidPricing)).toThrow();
    });
  });

  describe(_"TimeSlot Schema Validation", _() => {
    test(_"should accept valid time slot", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      const validTimeSlot = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 120, // 2 hours
        timezone: "America/New_York",
        setupTime: 15,
        teardownTime: 15,
      };

      expect_(() => TimeSlotSchema.parse(validTimeSlot)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const minimalTimeSlot = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 60,
      };

      const result = TimeSlotSchema.parse(minimalTimeSlot);
      expect(result.timezone).toBe("UTC");
      expect(result.setupTime).toBe(15);
      expect(result.teardownTime).toBe(15);
    });

    test(_"should reject invalid duration", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const invalidTimeSlot = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 15, // Too short (minimum 30 minutes)
      };

      expect_(() => TimeSlotSchema.parse(invalidTimeSlot)).toThrow();
    });
  });

  describe(_"Complete Reservation Schema Validation", _() => {
    test(_"should accept valid complete reservation", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const validReservation = {
        id: "res_1234567890",
        serviceType: "mixing" as const,
        status: "confirmed" as const,
        priority: "standard" as const,
        userId: "user_1234567890",
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1-555-123-4567",
          artistName: "J-Doe",
          experienceLevel: "intermediate" as const,
        },
        timeSlot: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: 120,
        },
        studioRoom: "mixing_room" as const,
        serviceDetails: {
          stemCount: 8,
          deliveryFormat: "wav" as const,
          includeRevisions: 2,
        },
        pricing: {
          basePrice: 20000, // $200.00
          totalPrice: 20000,
          currency: "USD" as const,
        },
        notes: "Client wants a modern trap sound with heavy 808s",
        assignedEngineer: "Mike Johnson",
        deliverables: [
          {
            name: "Mixed Track",
            description: "Final mixed version of the track",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect_(() => ReservationSchema.parse(validReservation)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const minimalReservation = {
        serviceType: "consultation" as const,
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1-555-123-4567",
        },
        timeSlot: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: 60,
        },
        serviceDetails: {},
        pricing: {
          basePrice: 5000,
          totalPrice: 5000,
        },
      };

      const result = ReservationSchema.parse(minimalReservation);
      expect(result.status).toBe("pending");
      expect(result.priority).toBe("standard");
      expect(result.deliverables).toEqual([]);
    });
  });

  describe(_"CreateReservation Schema Validation", _() => {
    test(_"should accept valid reservation creation", _() => {
      const validCreateReservation = {
        serviceType: "recording" as const,
        clientInfo: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@example.com",
          phone: "+1-555-987-6543",
          artistName: "Jane S",
          experienceLevel: "advanced" as const,
          referralSource: "Instagram",
        },
        preferredDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        preferredDuration: 180, // 3 hours
        alternativeDates: [
          new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        ],
        serviceDetails: {
          trackCount: 3,
          genre: "R&B",
          deliveryFormat: "wav" as const,
          includeRevisions: 3,
          rushDelivery: false,
        },
        notes: "Looking to record vocals for an EP",
        budget: 45000, // $450.00
        acceptTerms: true,
      };

      expect_(() => CreateReservationSchema.parse(validCreateReservation)).not.toThrow();
    });

    test(_"should reject creation without accepting terms", _() => {
      const invalidCreateReservation = {
        serviceType: "mixing" as const,
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1-555-123-4567",
        },
        preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        preferredDuration: 120,
        acceptTerms: false, // Must be true
      };

      expect_(() => CreateReservationSchema.parse(invalidCreateReservation)).toThrow(
        "You must accept the terms and conditions"
      );
    });

    test(_"should limit alternative dates", _() => {
      const invalidCreateReservation = {
        serviceType: "mixing" as const,
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1-555-123-4567",
        },
        preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        preferredDuration: 120,
        alternativeDates: Array(5).fill(new Date().toISOString()), // Too many alternatives
        acceptTerms: true,
      };

      expect_(() => CreateReservationSchema.parse(invalidCreateReservation)).toThrow();
    });
  });

  describe(_"UpdateReservation Schema Validation", _() => {
    test(_"should accept valid reservation update", _() => {
      const validUpdate = {
        id: "res_1234567890",
        status: "in_progress" as const,
        studioRoom: "studio_a" as const,
        notes: "Updated notes for the session",
        assignedEngineer: "Sarah Wilson",
      };

      expect_(() => UpdateReservationSchema.parse(validUpdate)).not.toThrow();
    });

    test(_"should require ID for updates", _() => {
      const updateWithoutId = {
        status: "completed" as const,
        notes: "Session completed successfully",
      };

      expect_(() => UpdateReservationSchema.parse(updateWithoutId)).toThrow();
    });
  });

  describe(_"ReservationFilter Schema Validation", _() => {
    test(_"should accept valid filter parameters", _() => {
      const validFilters = {
        serviceType: "mixing" as const,
        status: "confirmed" as const,
        priority: "rush" as const,
        studioRoom: "mixing_room" as const,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedEngineer: "Mike Johnson",
        clientEmail: "client@example.com",
        search: "trap beat",
        page: 2,
        limit: 50,
        sortBy: "start_time" as const,
        sortOrder: "desc" as const,
      };

      expect_(() => ReservationFilterSchema.parse(validFilters)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalFilters = {};
      const result = ReservationFilterSchema.parse(minimalFilters);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe("start_time");
      expect(result.sortOrder).toBe("asc");
    });
  });

  describe(_"AvailabilityCheck Schema Validation", _() => {
    test(_"should accept valid availability check", _() => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const validAvailabilityCheck = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        serviceType: "recording" as const,
        studioRoom: "studio_a" as const,
        excludeReservationId: "res_existing_123",
      };

      expect_(() => AvailabilityCheckSchema.parse(validAvailabilityCheck)).not.toThrow();
    });
  });

  describe(_"RescheduleRequest Schema Validation", _() => {
    test(_"should accept valid reschedule request", _() => {
      const validRescheduleRequest = {
        reservationId: "res_1234567890",
        newStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        newDuration: 120,
        reason: "Client requested different time",
        notifyClient: true,
      };

      expect_(() => RescheduleRequestSchema.parse(validRescheduleRequest)).not.toThrow();
    });

    test(_"should apply default notification setting", _() => {
      const rescheduleWithoutNotification = {
        reservationId: "res_1234567890",
        newStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        newDuration: 120,
      };

      const result = RescheduleRequestSchema.parse(rescheduleWithoutNotification);
      expect(result.notifyClient).toBe(true);
    });
  });

  describe(_"Validation Utilities", _() => {
    describe(_"validateTimeSlot", _() => {
      test(_"should validate valid time slot", _() => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

        const result = validateTimeSlot(tomorrow.toISOString(), 120, "mixing");
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test(_"should reject past time slots", _() => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = validateTimeSlot(yesterday.toISOString(), 120, "mixing");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Reservation must be scheduled for a future time");
      });

      test(_"should reject time slots outside business hours", _() => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(8, 0, 0, 0); // 8 AM (before business hours)

        const result = validateTimeSlot(tomorrow.toISOString(), 60, "consultation");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Reservations must start between 9 AM and 10 PM");
      });

      test(_"should reject time slots ending too late", _() => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(21, 0, 0, 0); // 9 PM

        const result = validateTimeSlot(tomorrow.toISOString(), 120, "recording"); // Would end at 11 PM
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Reservations must end by 10 PM");
      });

      test(_"should validate service-specific duration limits", _() => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(14, 0, 0, 0);

        // Too short for consultation
        const shortResult = validateTimeSlot(tomorrow.toISOString(), 15, "consultation");
        expect(shortResult.isValid).toBe(false);
        expect(shortResult.errors).toContain("Minimum duration for consultation is 30 minutes");

        // Too long for consultation
        const longResult = validateTimeSlot(tomorrow.toISOString(), 180, "consultation");
        expect(longResult.isValid).toBe(false);
        expect(longResult.errors).toContain("Maximum duration for consultation is 120 minutes");
      });
    });

    describe(_"validateServicePricing", _() => {
      test(_"should calculate correct pricing for hourly services", _() => {
        const mixingPrice = validateServicePricing("mixing", 120); // 2 hours
        expect(mixingPrice).toBe(20000); // $200 (2 hours * $100/hour)

        const recordingPrice = validateServicePricing("recording", 180); // 3 hours
        expect(recordingPrice).toBe(45000); // $450 (3 hours * $150/hour)
      });

      test(_"should calculate correct pricing for flat rate services", _() => {
        const customBeatPrice = validateServicePricing("custom_beat", 60);
        expect(customBeatPrice).toBe(20000); // $200 flat rate

        const fullProductionPrice = validateServicePricing("full_production", 240);
        expect(fullProductionPrice).toBe(200000); // $2000 (4 hours * $500/hour)
      });

      test(_"should add additional service fees", _() => {
        const basePrice = validateServicePricing("mixing", 60); // 1 hour mixing
        const priceWithRush = validateServicePricing("mixing", 60, ["rush_delivery"]);

        expect(priceWithRush).toBe(basePrice + 5000); // Base price + $50 rush fee
      });

      test(_"should handle multiple additional services", _() => {
        const priceWithMultiple = validateServicePricing("mixing", 60, [
          "rush_delivery",
          "include_stems",
          "weekend_booking",
        ]);

        const expectedPrice = 10000 + 5000 + 2500 + 2500; // Base + rush + stems + weekend
        expect(priceWithMultiple).toBe(expectedPrice);
      });

      test(_"should use default pricing for unknown services", _() => {
        const unknownServicePrice = validateServicePricing("unknown_service", 60);
        expect(unknownServicePrice).toBe(10000); // Default $100/hour
      });
    });

    describe(_"validateRoomForService", _() => {
      test(_"should validate correct room-service combinations", _() => {
        expect(validateRoomForService("recording", "studio_a")).toBe(true);
        expect(validateRoomForService("mixing", "mixing_room")).toBe(true);
        expect(validateRoomForService("mastering", "mastering_suite")).toBe(true);
        expect(validateRoomForService("vocal_tuning", "vocal_booth_1")).toBe(true);
        expect(validateRoomForService("consultation", "remote")).toBe(true);
      });

      test(_"should reject incorrect room-service combinations", _() => {
        expect(validateRoomForService("mastering", "vocal_booth_1")).toBe(false);
        expect(validateRoomForService("recording", "mastering_suite")).toBe(false);
        expect(validateRoomForService("mixing", "vocal_booth_2")).toBe(false);
      });

      test(_"should handle unknown rooms", _() => {
        expect(validateRoomForService("mixing", "unknown_room")).toBe(false);
      });

      test(_"should validate multi-purpose rooms", _() => {
        // Studio A can handle multiple services
        expect(validateRoomForService("recording", "studio_a")).toBe(true);
        expect(validateRoomForService("mixing", "studio_a")).toBe(true);
        expect(validateRoomForService("full_production", "studio_a")).toBe(true);

        // Remote can handle online services
        expect(validateRoomForService("consultation", "remote")).toBe(true);
        expect(validateRoomForService("mixing", "remote")).toBe(true);
        expect(validateRoomForService("mastering", "remote")).toBe(true);
      });
    });
  });
});
