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

describe(_"Beat Validation Tests", _() => {
  describe(_"BeatGenre Validation", _() => {
    test(_"should accept valid genres", _() => {
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
        expect_(() => BeatGenre.parse(genre)).not.toThrow();
      });
    });

    test(_"should reject invalid genres", _() => {
      const invalidGenres = ["rock", "jazz", "classical", "", "invalid-genre"];

      invalidGenres.forEach(genre => {
        expect_(() => BeatGenre.parse(genre)).toThrow();
      });
    });
  });

  describe(_"BeatMood Validation", _() => {
    test(_"should accept valid moods", _() => {
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
        expect_(() => BeatMood.parse(mood)).not.toThrow();
      });
    });

    test(_"should reject invalid moods", _() => {
      const invalidMoods = ["sad", "angry", "peaceful", "", "invalid-mood"];

      invalidMoods.forEach(mood => {
        expect_(() => BeatMood.parse(mood)).toThrow();
      });
    });
  });

  describe(_"MusicalKey Validation", _() => {
    test(_"should accept valid major keys", _() => {
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
        expect_(() => MusicalKey.parse(key)).not.toThrow();
      });
    });

    test(_"should accept valid minor keys", _() => {
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
        expect_(() => MusicalKey.parse(key)).not.toThrow();
      });
    });

    test(_"should reject invalid keys", _() => {
      const invalidKeys = ["H", "Zm", "C##", "", "invalid-key"];

      invalidKeys.forEach(key => {
        expect_(() => MusicalKey.parse(key)).toThrow();
      });
    });
  });

  describe(_"LicenseType Validation", _() => {
    test(_"should accept valid license types", _() => {
      const validTypes = ["basic", "premium", "unlimited", "exclusive"];

      validTypes.forEach(type => {
        expect_(() => LicenseType.parse(type)).not.toThrow();
      });
    });

    test(_"should reject invalid license types", _() => {
      const invalidTypes = ["free", "standard", "pro", "", "invalid-license"];

      invalidTypes.forEach(type => {
        expect_(() => LicenseType.parse(type)).toThrow();
      });
    });
  });

  describe(_"BeatStatus Validation", _() => {
    test(_"should accept valid statuses", _() => {
      const validStatuses = [
        "active",
        "inactive",
        "sold_exclusively",
        "pending_review",
        "rejected",
      ];

      validStatuses.forEach(status => {
        expect_(() => BeatStatus.parse(status)).not.toThrow();
      });
    });

    test(_"should reject invalid statuses", _() => {
      const invalidStatuses = ["published", "draft", "archived", "", "invalid-status"];

      invalidStatuses.forEach(status => {
        expect_(() => BeatStatus.parse(status)).toThrow();
      });
    });
  });

  describe(_"BPM Schema Validation", _() => {
    test(_"should accept valid BPM values", _() => {
      const validBpms = [60, 80, 120, 140, 180, 200];

      validBpms.forEach(bpm => {
        expect_(() => BpmSchema.parse(bpm)).not.toThrow();
      });
    });

    test(_"should reject invalid BPM values", _() => {
      expect_(() => BpmSchema.parse(59)).toThrow("BPM must be at least 60");
      expect_(() => BpmSchema.parse(201)).toThrow("BPM cannot exceed 200");
      expect_(() => BpmSchema.parse(120.5)).toThrow("BPM must be a whole number");
      expect_(() => BpmSchema.parse(-10)).toThrow();
    });
  });

  describe(_"Beat Price Schema Validation", _() => {
    test(_"should accept valid prices", _() => {
      const validPrices = [100, 2999, 4999, 14999, 99999999]; // $1.00 to $999,999.99

      validPrices.forEach(price => {
        expect_(() => BeatPriceSchema.parse(price)).not.toThrow();
      });
    });

    test(_"should reject invalid prices", _() => {
      expect_(() => BeatPriceSchema.parse(99)).toThrow("Price must be at least $1.00");
      expect_(() => BeatPriceSchema.parse(100000000)).toThrow("Price cannot exceed $999,999.99");
      expect_(() => BeatPriceSchema.parse(29.99)).toThrow("Price must be in cents");
      expect_(() => BeatPriceSchema.parse(-100)).toThrow();
    });
  });

  describe(_"Beat Duration Schema Validation", _() => {
    test(_"should accept valid durations", _() => {
      const validDurations = [30, 60, 120, 180, 300, 600]; // 30 seconds to 10 minutes

      validDurations.forEach(duration => {
        expect_(() => BeatDurationSchema.parse(duration)).not.toThrow();
      });
    });

    test(_"should reject invalid durations", _() => {
      expect_(() => BeatDurationSchema.parse(29)).toThrow("Beat must be at least 30 seconds");
      expect_(() => BeatDurationSchema.parse(601)).toThrow("Beat cannot exceed 10 minutes");
      expect_(() => BeatDurationSchema.parse(-30)).toThrow("Duration must be positive");
      expect_(() => BeatDurationSchema.parse(0)).toThrow();
    });
  });

  describe(_"Beat Tags Schema Validation", _() => {
    test(_"should accept valid tags", _() => {
      const validTagArrays = [
        ["trap", "dark", "aggressive"],
        ["chill", "lo-fi", "relaxing", "study"],
        [], // Empty array should be valid
        undefined, // Optional field
      ];

      validTagArrays.forEach(tags => {
        expect_(() => BeatTagsSchema.parse(tags)).not.toThrow();
      });
    });

    test(_"should reject invalid tags", _() => {
      const tooManyTags = Array(11).fill("tag"); // More than 10 tags
      expect_(() => BeatTagsSchema.parse(tooManyTags)).toThrow("Maximum 10 tags allowed");

      const tooLongTag = "a".repeat(21); // More than 20 characters
      expect_(() => BeatTagsSchema.parse([tooLongTag])).toThrow();

      const emptyTag = [""];
      expect_(() => BeatTagsSchema.parse(emptyTag)).toThrow();
    });
  });

  describe(_"Audio File Schema Validation", _() => {
    test(_"should accept valid audio file", _() => {
      const validAudioFile = {
        url: "https://example.com/audio.mp3",
        format: "mp3" as const,
        quality: "320" as const,
        duration: 180,
        fileSize: 5242880, // 5MB
        waveformData: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      expect_(() => AudioFileSchema.parse(validAudioFile)).not.toThrow();
    });

    test(_"should reject invalid audio file", _() => {
      const invalidAudioFile = {
        url: "not-a-url",
        format: "invalid-format",
        quality: "999",
        duration: -10,
        fileSize: -1000,
      };

      expect_(() => AudioFileSchema.parse(invalidAudioFile)).toThrow();
    });

    test(_"should accept audio file without optional waveform data", _() => {
      const audioFileWithoutWaveform = {
        url: "https://example.com/audio.wav",
        format: "wav" as const,
        quality: "lossless" as const,
        duration: 240,
        fileSize: 10485760, // 10MB
      };

      expect_(() => AudioFileSchema.parse(audioFileWithoutWaveform)).not.toThrow();
    });
  });

  describe(_"Beat Metadata Schema Validation", _() => {
    test(_"should accept valid metadata", _() => {
      const validMetadata = {
        producer: "BroLab Producer",
        credits: "Produced by BroLab Entertainment",
        description: "A dark trap beat with heavy 808s",
        inspiration: "Inspired by modern trap music",
        collaborators: ["Producer A", "Producer B"],
      };

      expect_(() => BeatMetadataSchema.parse(validMetadata)).not.toThrow();
    });

    test(_"should reject invalid metadata", _() => {
      const invalidMetadata = {
        producer: "", // Required field cannot be empty
        credits: "a".repeat(501), // Too long
        description: "a".repeat(1001), // Too long
        inspiration: "a".repeat(201), // Too long
        collaborators: Array(6).fill("Producer"), // Too many collaborators
      };

      expect_(() => BeatMetadataSchema.parse(invalidMetadata)).toThrow();
    });

    test(_"should accept metadata with only required fields", _() => {
      const minimalMetadata = {
        producer: "BroLab Producer",
      };

      expect_(() => BeatMetadataSchema.parse(minimalMetadata)).not.toThrow();
    });
  });

  describe(_"Complete Beat Schema Validation", _() => {
    test(_"should accept valid complete beat", _() => {
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

      expect_(() => BeatSchema.parse(validBeat)).not.toThrow();
    });

    test(_"should reject beat with invalid title characters", _() => {
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

      expect_(() => BeatSchema.parse(beatWithInvalidTitle)).toThrow(
        "Beat title contains invalid characters"
      );
    });

    test(_"should reject beat with invalid slug format", _() => {
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

      expect_(() => BeatSchema.parse(beatWithInvalidSlug)).toThrow(
        "Slug must be lowercase with hyphens only"
      );
    });
  });

  describe(_"Create Beat Schema Validation", _() => {
    test(_"should accept valid beat creation data", _() => {
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

      expect_(() => CreateBeatSchema.parse(validCreateBeat)).not.toThrow();
    });

    test(_"should reject creation data with auto-generated fields", _() => {
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

  describe(_"Update Beat Schema Validation", _() => {
    test(_"should accept valid beat update data", _() => {
      const validUpdateBeat = {
        id: 1,
        title: "Updated Beat Title",
        bpm: 150,
      };

      expect_(() => UpdateBeatSchema.parse(validUpdateBeat)).not.toThrow();
    });

    test(_"should require ID for updates", _() => {
      const updateWithoutId = {
        title: "Updated Beat Title",
        bpm: 150,
      };

      expect_(() => UpdateBeatSchema.parse(updateWithoutId)).toThrow();
    });
  });

  describe(_"Beat Filter Schema Validation", _() => {
    test(_"should accept valid filter parameters", _() => {
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

      expect_(() => BeatFilterSchema.parse(validFilters)).not.toThrow();
    });

    test(_"should apply default values", _() => {
      const minimalFilters = {};
      const result = BeatFilterSchema.parse(minimalFilters);

      expect(result.sortBy).toBe("newest");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    test(_"should reject invalid BPM ranges", _() => {
      const invalidBpmFilters = {
        bpmMin: 50, // Below minimum
        bpmMax: 250, // Above maximum
      };

      expect_(() => BeatFilterSchema.parse(invalidBpmFilters)).toThrow();
    });
  });

  describe(_"Beat Purchase Schema Validation", _() => {
    test(_"should accept valid purchase data", _() => {
      const validPurchase = {
        beatId: 123,
        licenseType: "premium" as const,
        quantity: 1,
        customLicenseTerms: "Custom terms for this purchase",
      };

      expect_(() => BeatPurchaseSchema.parse(validPurchase)).not.toThrow();
    });

    test(_"should apply default quantity", _() => {
      const purchaseWithoutQuantity = {
        beatId: 123,
        licenseType: "basic" as const,
      };

      const result = BeatPurchaseSchema.parse(purchaseWithoutQuantity);
      expect(result.quantity).toBe(1);
    });
  });

  describe(_"Beat Interaction Schema Validation", _() => {
    test(_"should accept valid interaction data", _() => {
      const validInteractions = [
        { beatId: 123, action: "like" as const },
        { beatId: 456, action: "unlike" as const },
        { beatId: 789, action: "favorite" as const },
        { beatId: 101, action: "unfavorite" as const },
      ];

      validInteractions.forEach(interaction => {
        expect_(() => BeatInteractionSchema.parse(interaction)).not.toThrow();
      });
    });

    test(_"should reject invalid actions", _() => {
      const invalidInteraction = {
        beatId: 123,
        action: "invalid-action",
      };

      expect_(() => BeatInteractionSchema.parse(invalidInteraction)).toThrow();
    });
  });

  describe(_"Validation Utilities", _() => {
    describe(_"validateBpmForGenre", _() => {
      test(_"should validate BPM for hip-hop genre", _() => {
        expect(validateBpmForGenre(100, "hip-hop")).toBe(true);
        expect(validateBpmForGenre(50, "hip-hop")).toBe(false);
        expect(validateBpmForGenre(150, "hip-hop")).toBe(false);
      });

      test(_"should validate BPM for trap genre", _() => {
        expect(validateBpmForGenre(140, "trap")).toBe(true);
        expect(validateBpmForGenre(120, "trap")).toBe(false);
        expect(validateBpmForGenre(180, "trap")).toBe(false);
      });

      test(_"should allow any BPM for unknown genres", _() => {
        expect(validateBpmForGenre(80, "unknown-genre")).toBe(true);
        expect(validateBpmForGenre(200, "unknown-genre")).toBe(true);
      });
    });

    describe(_"validateBeatPricing", _() => {
      test(_"should validate correct pricing hierarchy", _() => {
        const validPricing = {
          basic: 2999,
          premium: 4999,
          unlimited: 14999,
          exclusive: 99999,
        };

        expect(validateBeatPricing(validPricing)).toBe(true);
      });

      test(_"should reject incorrect pricing hierarchy", _() => {
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

    describe(_"validateAudioFormatForLicense", _() => {
      test(_"should validate format for basic license", _() => {
        expect(validateAudioFormatForLicense("mp3", "basic")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "basic")).toBe(false);
      });

      test(_"should validate format for premium license", _() => {
        expect(validateAudioFormatForLicense("mp3", "premium")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "premium")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "premium")).toBe(false);
      });

      test(_"should validate format for unlimited license", _() => {
        expect(validateAudioFormatForLicense("mp3", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("wav", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("aiff", "unlimited")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "unlimited")).toBe(false);
      });

      test(_"should validate format for exclusive license", _() => {
        expect(validateAudioFormatForLicense("wav", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("aiff", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("flac", "exclusive")).toBe(true);
        expect(validateAudioFormatForLicense("mp3", "exclusive")).toBe(false);
      });

      test(_"should handle unknown license types", _() => {
        expect(validateAudioFormatForLicense("mp3", "unknown")).toBe(false);
      });
    });
  });
});
