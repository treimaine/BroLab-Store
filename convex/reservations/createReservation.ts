import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createReservation = mutation({
  args: {
    serviceType: v.string(),
    details: v.any(),
    preferredDate: v.string(),
    durationMinutes: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    clerkId: v.optional(v.string()), // For server-side calls
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Convex: Creating reservation for service: ${args.serviceType}`);
    console.log(
      `🔄 Convex: ClerkId provided: ${args.clerkId ? `${args.clerkId.substring(0, 8)}...` : "none"}`
    );

    let userId;

    if (args.clerkId) {
      // Server-side call with explicit clerkId
      const clerkId = args.clerkId;
      console.log(`🔍 Convex: Looking up user with clerkId: ${clerkId.substring(0, 8)}...`);

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        // Automatic user creation for server-side calls when user doesn't exist
        console.log(`🆕 Convex: Creating new user for clerkId: ${clerkId.substring(0, 8)}...`);

        const userDetails = args.details as {
          name?: string;
          email?: string;
          [key: string]: unknown;
        };
        const name = userDetails.name || "";
        const nameParts = name.split(" ");

        try {
          userId = await ctx.db.insert("users", {
            clerkId: clerkId,
            email: userDetails.email || "",
            firstName: nameParts[0] || "User",
            lastName: nameParts.slice(1).join(" ") || "",
            name: name,
            role: "user",
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          console.log(`✅ Convex: User created successfully with ID: ${userId}`);
        } catch (createError) {
          console.error("❌ Convex: Failed to create user:", createError);
          throw new Error(
            `Authentication failed: Unable to create user account for clerkId ${clerkId.substring(0, 8)}... Please ensure you are properly authenticated.`
          );
        }
      } else {
        userId = user._id;
        console.log(`✅ Convex: Found existing user with ID: ${userId}`);
      }
    } else {
      // Client-side call with authentication
      console.log(`🔍 Convex: Using client-side authentication`);
      const identity = await ctx.auth.getUserIdentity();

      if (!identity) {
        console.error("❌ Convex: No identity found for client-side call");
        throw new Error("Authentication required: Please log in to create a reservation.");
      }

      console.log(
        `🔍 Convex: Looking up user with identity subject: ${identity.subject.substring(0, 8)}...`
      );
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        console.error(
          `❌ Convex: User not found for identity: ${identity.subject.substring(0, 8)}...`
        );
        throw new Error("User account not found: Please ensure your account is properly set up.");
      }
      userId = user._id;
      console.log(`✅ Convex: Found user via identity with ID: ${userId}`);
    }

    try {
      console.log(`🔄 Convex: Checking time slot availability`);

      // Check if the time slot is available
      const existingReservations = await ctx.db
        .query("reservations")
        .filter(q =>
          q.and(
            q.eq(q.field("serviceType"), args.serviceType),
            q.eq(q.field("preferredDate"), args.preferredDate),
            // Only check non-cancelled reservations
            q.neq(q.field("status"), "cancelled")
          )
        )
        .collect();

      if (existingReservations.length > 0) {
        console.error(
          `❌ Convex: Time slot already booked (${existingReservations.length} existing reservations)`
        );
        throw new Error(
          "This time slot is no longer available. Please select a different date or time."
        );
      }

      console.log(`✅ Convex: Time slot is available`);
      console.log(`🔄 Convex: Inserting reservation into database`);

      // Normalize details object to ensure referenceLinks is in camelCase
      // This handles both reference_links (snake_case) and referenceLinks (camelCase)
      const normalizedDetails = { ...args.details };
      if ("reference_links" in normalizedDetails) {
        normalizedDetails.referenceLinks = normalizedDetails.reference_links;
        delete normalizedDetails.reference_links;
      }

      const reservationId = await ctx.db.insert("reservations", {
        userId: userId,
        serviceType: args.serviceType,
        status: "pending",
        details: normalizedDetails,
        preferredDate: args.preferredDate,
        durationMinutes: args.durationMinutes,
        totalPrice: args.totalPrice,
        notes: args.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log(`✅ Convex: Reservation created successfully with ID: ${reservationId}`);
      return reservationId;
    } catch (insertError) {
      console.error("❌ Convex: Failed to create reservation:", insertError);
      throw new Error(
        `Failed to create reservation: ${insertError instanceof Error ? insertError.message : "Unknown database error"}. Please try again or contact support if the problem persists.`
      );
    }
  },
});
