import { describe, expect, test } from "@jest/globals";
import {
  AudioFileSchema,
  BeatDurationSchema,
  BeatFilterSchema,
  BeatGenre,
  BeatInteractionSchema,
  BeatMetadataSchema,
  BeatMood,
  BeatPriceSchema,
  BeatPurchaseSchema,
  BeatSchema,
  BeatStatus,
  BeatTagsSchema,
  BpmSchema,
  CreateBeatSchema,
  LicenseType,
  MusicalKey,
  UpdateBeatSchema,
  validateAudioFormatForLicense,
  validateBeatPricing,
  validateBpmForGenre,
} from "../../shared/validation/BeatValidation";

describe("Beat Validation Tests", () => {
  describe("BeatGenre Validation", () => {
    test("should accept valid genres", () => {
      const validGenres = [
        "hip-hop",
        "trap",
        "r&b",
        "pop",
        "drill",
        "afrobeat",
        "reggaeton",
        "dancehall",
        "uk-drill",
        "jersey-club",
        "amapiano",
        "custom",
      ];

      validGenres.forEach(genre => {
        expect(() => BeatGenre.parse(genre)).not.toThrow();
      });
    });

    test("should reject invalid genres", () => {
      const invalidGenres = ["rock", "jazz", "classical", "", "invalid-genre"];

      invalidGenres.forEach(genre => {
        expect(() => BeatGenre.parse(genre)).toThrow();
      });
    });
  });

  describe("BeatMood Validation", () => {
    test("should accept valid moods", () => {
      const validMoods = [
        "aggressive",
        "chill",
        "dark",
        "energetic",
        "emotional",
        "happy",
        "melancholic",
        "mysterious",
        "romantic",
        "uplifting",
      ];

      validMoods.forEach(mood => {
        expect(() => BeatMood.parse(mood)).not.toThrow();
      });
    });

    test("should reject invalid moods", () => {
      const invalidMoods = ["sad", "angry", "peaceful", "", "invalid-mood"];

      invalidMoods.forEach(mood => {
        expect(() => BeatMood.parse(mood)).toThrow();
      });
    });
  });

  describe("MusicalKey Validation", () => {
    test("should accept valid major keys", () => {
      const majorKeys = [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
      ];

      majorKeys.forEach(key => {
        expect(() => MusicalKey.parse(key)).not.toThrow();
      });
    });

    test("should accept valid minor keys", () => {
      const minorKeys = [
        "Cm",
        "C#m",
        "Dbm",
        "Dm",
        "D#m",
        "Ebm",
        "Em",
        "Fm",
        "F#m",
        "Gbm",
        "Gm",
        "G#m",
        "Abm",
        "Am",
        "A#m",
        "Bbm",
        "Bm",
      ];

      minorKeys.forEach(key => {
        expect(() => MusicalKey.parse(key)).not.toThrow();
      });
    });

    test("should reject invalid keys", () => {
      const invalidKeys = ["H", "Zm", "C##", "", "invalid-key"];

      invalidKeys.forEach(key => {
        expect(() => MusicalKey.parse(key)).toThrow();
      });
    });
  });

  describe("LicenseType Validation", () => {
    test("should accept valid license types", () => {
      const validTypes = ["basic", "premium", "unlimited", "exclusive"];

      validTypes.forEach(type => {
        expect(() => LicenseType.parse(type)).not.toThrow();
      });
    });

    test("should reject invalid license types", () => {
      const invalidTypes = ["free", "standard", "pro", "", "invalid-license"];

      invalidTypes.forEach(type => {
        expect(() => LicenseType.parse(type)).toThrow();
      });
    });
  });

  describe("BeatStatus Validation", () => {
    test("should accept valid statuses", () => {
      const validStatuses = [
        "active",
        "inactive",
        "sold_exclusively",
        "pending_review",
        "rejected",
      ];

      validStatuses.forEach(status => {
        expect(() => BeatStatus.parse(status)).not.toThrow();
      });
    });

    test("should reject invalid statuses", () => {
      const invalidStatuses = ["published", "draft", "archived", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect(() => BeatStatus.parse(status)).toThrow();
      });
    });
  });

  describe("BPM Schema Validation", () => {
    test("should accept valid BPM values", () => {
      const validBpms = [60, 80, 120, 140, 180, 200];

      validBpms.forEach(bpm => {
        expect(() => BpmSchema.parse(bpm)).not.toThrow();
      });
    });

    test("should reject invalid BPM values", () => {
      expect(() => BpmSchema.parse(59)).toThrow("BPM must be at least 60");
      expect(() => BpmSchema.parse(201)).toThrow("BPM cannot exceed 200");
      expect(() => BpmSchema.parse(120.5)).toThrow("BPM must be a whole number");
      expect(() => BpmSchema.parse(-10)).toThrow();
    });
  });

  describe("Beat Price Schema Validation", () => {
    test("should accept valid prices", () => {
      const validPrices = [100, 2999, 4999, 14999, 99999999]; // $1.00 to $999,999.99

      validPrices.forEach(price => {
        expect(() => BeatPriceSchema.parse(price)).not.toThrow();
      });
    });

    test("should reject invalid prices", () => {
      expect(() => BeatPriceSchema.parse(99)).toThrow("Price must be at least $1.00");
      expect(() => BeatPriceSchema.parse(100000000)).toThrow("Price cannot exceed $999,999.99");
      expect(() => BeatPriceSchema.parse(29.99)).toThrow("Price must be in cents");
      expect(() => BeatPriceSchema.parse(-100)).toThrow();
    });
  });

  describe("Beat Duration Schema Validation", () => {
    test("should accept valid durations", () => {
      const validDurations = [30, 60, 120, 180, 300, 600]; // 30 seconds to 10 minutes

      validDurations.forEach(duration => {
        expect(() => BeatDurationSchema.parse(duration)).not.toThrow();
      });
    });

    test("should reject invalid durations", () => {
      expect(() => BeatDurationSchema.parse(29)).toThrow("Beat must be at least 30 seconds");
      expect(() => BeatDurationSchema.parse(601)).toThrow("Beat cannot exceed 10 minutes");
      expect(() => BeatDurationSchema.parse(-30)).toThrow("Duration must be positive");
      expect(() => BeatDurationSchema.parse(0)).toThrow();
    });
  });

  describe("Beat Tags Schema Validation", () => {
    test("should accept valid tags", () => {
      const validTagArrays = [
        ["trap", "dark", "aggressive"],
        ["chill", "lo-fi", "relaxing", "study"],
        [], // Empty array should be valid
        undefined, // Optional field
      ];

      validTagArrays.forEach(tags => {
        expect(() => BeatTagsSchema.parse(tags)).not.toThrow();
      });
    });

    test("should reject invalid tags", () => {
      const tooManyTags = Array(11).fill("tag"); // More than 10 tags
      expect(() => BeatTagsSchema.parse(tooManyTags)).toThrow("Maximum 10 tags allowed");

      const tooLongTag = "a".repeat(21); // More than 20 characters
      expect(() => BeatTagsSchema.parse([tooLongTag])).toThrow();

      const emptyTag = [""];
      expect(() => BeatTagsSchema.parse(emptyTag)).toThrow();
    });
  });

  describe("Audio File Schema Validation", () => {
    test("should accept valid audio file", () => {
      const validAudioFile = {
        url: "https://example.com/audio.mp3",
        format: "mp3" as const,
        quality: "320" as const,
        duration: 180,
        fileSize: 5242880, // 5MB
        waveformData: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      expect(() => AudioFileSchema.parse(validAudioFile)).not.toThrow();
    });

    test("should reject invalid audio file", () => {
      const invalidAudioFile = {
        url: "not-a-url",
        format: "invalid-format",
        quality: "999",
        duration: -10,
        fileSize: -1000,
      };

      expect(() => AudioFileSchema.parse(invalidAudioFile)).toThrow();
    });

    test("should accept audio file without optional waveform data", () => {
      const audioFileWithoutWaveform = {
        url: "https://example.com/audio.wav",
        format: "wav" as const,
        quality: "lossless" as const,
        duration: 240,
        fileSize: 10485760, // 10MB
      };

      expect(() => AudioFileSchema.parse(audioFileWithoutWaveform)).not.toThrow();
    });
  });

  describe("Beat Metadata Schema Validation", () => {
    test("should accept valid metadata", () => {
      const validMetadata = {
        producer: "BroLab Producer",
        credits: "Produced by BroLab Entertainment",
        description: "A dark trap beat with heavy 808s",
        inspiration: "Inspired by modern trap music",
        collaborators: ["Producer A", "Producer B"],
      };

      expect(() => BeatMetadataSchema.parse(validMetadata)).not.toThrow();
    });

    test("should reject invalid metadata", () => {
      const invalidMetadata = {
        producer: "", // Required field cannot be empty
        credits: "a".repeat(501), // Too long
        description: "a".repeat(1001), // Too long
        inspiration: "a".repeat(201), // Too long
        collaborators: Array(6).fill("Producer"), // Too many collaborators
      };

      expect(() => BeatMetadataSchema.parse(invalidMetadata)).toThrow();
    });

    test("should accept metadata with only required fields", () => {
      const minimalMetadata = {
        producer: "BroLab Producer",
      };

      expect(() => BeatMetadataSchema.parse(minimalMetadata)).not.toThrow();
    });
  });

  describe("Complete Beat Schema Validation", () => {
    test("should accept valid complete beat", () => {
      const validBeat = {
        id: 1,
        title: "Dark Trap Beat",
        slug: "dark-trap-beat-2025",
        genre: "trap" as const,
        mood: "dark" as const,
        key: "Am" as const,
        bpm: 140,
        status: "active" as const,
        basicPrice: 2999, // $29.99
        premiumPrice: 4999, // $49.99
        unlimitedPrice: 14999, // $149.99
        exclusivePrice: 99999, // $999.99
        previewFile: {
          url: "https://example.com/preview.mp3",
          format: "mp3" as const,
          quality: "192" as const,
          duration: 30,
          fileSize: 1048576,
        },
        producerId: 123,
        producerName: "BroLab Producer",
        tags: ["trap", "dark", "aggressive"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => BeatSchema.parse(validBeat)).not.toThrow();
    });

    test("should reject beat with invalid title characters", () => {
      const beatWithInvalidTitle = {
        title: "Beat with <script> tags",
        slug: "beat-with-script-tags",
        genre: "trap" as const,
        bpm: 140,
        basicPrice: 2999,
        premiumPrice: 4999,
        unlimitedPrice: 14999,
        previewFile: {
          url: "https://example.com/preview.mp3",
          format: "mp3" as const,
          quality: "192" as const,
          duration: 30,
          fileSize: 1048576,
        },
        producerId: 123,
        producerName: "BroLab Producer",
      };

      expect(() => BeatSchema.parse(beatWithInvalidTitle)).toThrow(
        "Beat title contains invalid characters"
      );
    });

    test("should reject beat with invalid slug format", () => {
      const beatWithInvalidSlug = {
        title: "Valid Beat Title",
        slug: "Invalid_Slug_With_Underscores",
        genre: "trap" as const,
        bpm: 140,
        basicPrice: 2999,
        premiumPrice: 4999,
        unlimitedPrice: 14999,
        previewFile: {
          url: "https://example.com/preview.mp3",
          format: "mp3" as const,
          quality: "192" as const,
          duration: 30,
          fileSize: 1048576,
        },
        producerId: 123,
        producerName: "BroLab Producer",
      };

      expect(() => BeatSchema.parse(beatWithInvalidSlug)).toThrow(
        "Slug must be lowercase with hyphens only"
      );
    });
  });

  describe("Create Beat Schema Validation", () => {
    test("should accept valid beat creation data", () => {
      const validCreateBeat = {
        title: "New Trap Beat",
        slug: "new-trap-beat-2025",
        genre: "trap" as const,
        bpm: 140,
        basicPrice: 2999,
        premiumPrice: 4999,
        unlimitedPrice: 14999,
        previewFile: {
          url: "https://example.com/preview.mp3",
          format: "mp3" as const,
          quality: "192" as const,
          duration: 30,
          fileSize: 1048576,
        },
        producerId: 123,
        producerName: "BroLab Producer",
      };

      expect(() => CreateBeatSchema.parse(validCreateBeat)).not.toThrow();
    });

    test("should reject creation data with auto-generated fields", () => {
      const createBeatWithId = {
        id: 1, // Should not be included in creation
        title: "New Trap Beat",
        slug: "new-trap-beat-2025",
        genre: "trap" as const,
        bpm: 140,
        basicPrice: 2999,
        premiumPrice: 4999,
        unlimitedPrice: 14999,
        previewFile: {
          url: "https://example.com/preview.mp3",
          format: "mp3" as const,
          quality: "192" as const,
          duration: 30,
          fileSize: 1048576,
        },
        producerId: 123,
        producerName: "BroLab Producer",
      };

      // The schema should omit the id field, so this should still pass
      const result = CreateBeatSchema.parse(createBeatWithId);
      expect(result).not.toHaveProperty("id");
    });
  });

  describe("Update Beat Schema Validation", () => {
    test("should accept valid beat update data", () => {
      const validUpdateBeat = {
        id: 1,
        title: "Updated Beat Title",
        bpm: 150,
      };

      expect(() => UpdateBeatSchema.parse(validUpdateBeat)).not.toThrow();
    });

    test("should require ID for updates", () => {
      const updateWithoutId = {
        title: "Updated Beat Title",
        bpm: 150,
      };

      expect(() => UpdateBeatSchema.parse(updateWithoutId)).toThrow();
    });
  });

  describe("Beat Filter Schema Validation", () => {
    test("should accept valid filter parameters", () => {
      const validFilters = {
        genre: "trap" as const,
        mood: "dark" as const,
        bpmMin: 120,
        bpmMax: 160,
        priceMin: 1000,
        priceMax: 5000,
        tags: ["trap", "dark"],
        search: "aggressive beat",
        sortBy: "newest" as const,
        page: 1,
        limit: 20,
      };

      expect(() => BeatFilterSchema.parse(validFilters)).not.toThrow();
    });

    test("should apply default values", () => {
      const minimalFilters = {};
      const result = BeatFilterSchema.parse(minimalFilters);

      expect(result.sortBy).toBe("newest");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    test("should reject invalid BPM ranges", () => {
      const invalidBpmFilters = {
        bpmMin: 50, // Below minimum
        bpmMax: 250, // Above maximum
      };

      expect(() => BeatFilterSchema.parse(invalidBpmFilters)).toThrow();
    });
  });

  describe("Beat Purchase Schema Validation", () => {
    test("should accept valid purchase data", () => {
      const validPurchase = {
        beatId: 123,
        licenseType: "premium" as const,
        quantity: 1,
        customLicenseTerms: "Custom terms for this purchase",
      };

      expect(() => BeatPurchaseSchema.parse(validPurchase)).not.toThrow();
    });

    test("should apply default quantity", () => {
      const purchaseWithoutQuantity = {
        beatId: 123,
        licenseType: "basic" as const,
      };

      const result = BeatPurchaseSchema.parse(purchaseWithoutQuantity);
      expect(result.quantity).toBe(1);
    });
  });

  describe("Beat Interaction Schema Validation", () => {
    test("should accept valid interaction data", () => {
      const validInteractions = [
        { beatId: 123, action: "like" as const },
        { beatId: 456, action: "unlike" as const },
        { beatId: 789, action: "favorite" as const },
        { beatId: 101, action: "unfavorite" as const },
      ];

      validInteractions.forEach(interaction => {
        expect(() => BeatInteractionSchema.parse(interaction)).not.toThrow();
      });
    });

    test("should reject invalid actions", () => {
      const invalidInteraction = {
        beatId: 123,
        action: "invalid-action",
      };

      expect(() => BeatInteractionSchema.parse(invalidInteraction)).toThrow();
    });
  });

  describe("Validation Utilities", () => {
    describe("validateBpmForGenre", () => {
      test("should validate BPM for hip-hop genre", () => {
        expect(validateBpmForGenre(100, "hip-hop")).toBe(true);
        expect(validateBpmForGenre(50, "hip-hop")).toBe(false);
        expect(validateBpmForGenre(150, "hip-hop")).toBe(false);
      });

      test("should validate BPM for trap genre", () => {
        expect(validateBpmForGenre(140, "trap")).toBe(true);
        expect(validateBpmForGenre(120, "trap")).toBe(false);
        expect(validateBpmForGenre(180, "trap")).toBe(false);
      });

      test("should allow any BPM for unknown genres", () => {
        expect(validateBpmForGenre(80, "unknown-genre")).toBe(true);
        expect(validateBpmForGenre(200, "unknown-genre")).toBe(true);
      });
    });

    describe("validateBeatPricing", () => {
      test("should validate correct pricing hierarchy", () => {
        const validPricing = {
          basic: 2999,
          premium: 4999,
          unlimited: 14999,
          exclusive: 99999,
        };

        expect(validateBeatPricing(validPricing)).toBe(true);
      });

      test("should reject incorrect pricing hierarchy", () => {
        const invalidPricing1 = {
          basic: 4999,
          premium: 2999, // Premium should be higher than basic
          unlimited: 14999,
        };

        expect(validateBeatPricing(invalidPricing1)).toBe(false);

        const invalidPricing2 = {
          basic: 2999,
          premium: 4999,
          unlimited: 14999,
          exclusive: 9999, // Exclusive should be higher than unlimited
        };

        expect(validateBeatPricing(invalidPricing2)).toBe(false);
      });
    });

    describe("validateAudioFormatForLicense", () => {
      test("should validate format for basic license", () => {
        expect(validateAudioFormatForLicense("mp3", "basic")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "basic")).toBe(false);
      });

      test("should validate format for premium license", () => {
        expect(validateAudioFormatForLicense("mp3", "premium")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "premium")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "premium")).toBe(false);
      });

      test("should validate format for unlimited license", () => {
        expect(validateAudioFormatForLicense("mp3", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("aiff", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "unlimited")).toBe(false);
      });

      test("should validate format for exclusive license", () => {
        expect(validateAudioFormatForLicense("wav", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("aiff", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("mp3", "exclusive")).toBe(false);
      });

      test("should handle unknown license types", () => {
        expect(validateAudioFormatForLicense("mp3", "unknown")).toBe(false);
      });
    });
  });
});
