import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

interface UserDetails {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface ReservationDetails {
  name: string;
  email: string;
  phone: string;
  requirements?: string;
  referenceLinks?: string[];
  projectDescription?: string;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  additionalServices?: string[];
  communicationPreference?: "email" | "phone" | "video";
}

interface ReservationArgs {
  serviceType: string;
  details: unknown;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
  clerkId?: string;
}

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
    const clerkIdPreview = args.clerkId ? args.clerkId.substring(0, 8) + "..." : "none";
    console.log(`🔄 Convex: ClerkId provided: ${clerkIdPreview}`);

    const userId = args.clerkId
      ? await handleServerSideAuth(ctx, args)
      : await handleClientSideAuth(ctx);

    return await createReservationRecord(ctx, args, userId);
  },
});

async function handleServerSideAuth(ctx: MutationCtx, args: ReservationArgs): Promise<Id<"users">> {
  const clerkId = args.clerkId!;
  const clerkIdPreview = clerkId.substring(0, 8) + "...";
  console.log(`🔍 Convex: Looking up user with clerkId: ${clerkIdPreview}`);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
    .first();

  if (user) {
    console.log(`✅ Convex: Found existing user with ID: ${user._id}`);
    return user._id;
  }

  // User doesn't exist, create new user
  console.log(`🆕 Convex: Creating new user for clerkId: ${clerkIdPreview}`);
  return await createNewUser(ctx, clerkId, args.details);
}

async function createNewUser(
  ctx: MutationCtx,
  clerkId: string,
  details: unknown
): Promise<Id<"users">> {
  const userDetails = details as UserDetails;
  const name = userDetails.name || "";
  const nameParts = name.split(" ");

  try {
    const userId = await ctx.db.insert("users", {
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
    return userId;
  } catch (createError) {
    console.error("❌ Convex: Failed to create user:", createError);
    const clerkIdPreview = clerkId.substring(0, 8) + "...";
    throw new Error(
      `Authentication failed: Unable to create user account for clerkId ${clerkIdPreview} Please ensure you are properly authenticated.`
    );
  }
}

async function handleClientSideAuth(ctx: MutationCtx): Promise<Id<"users">> {
  console.log(`🔍 Convex: Using client-side authentication`);
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    console.error("❌ Convex: No identity found for client-side call");
    throw new Error("Authentication required: Please log in to create a reservation.");
  }

  const identityPreview = identity.subject.substring(0, 8) + "...";
  console.log(`🔍 Convex: Looking up user with identity subject: ${identityPreview}`);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  if (user) {
    console.log(`✅ Convex: Found user via identity with ID: ${user._id}`);
    return user._id;
  }

  console.error(`❌ Convex: User not found for identity: ${identityPreview}`);
  throw new Error("User account not found: Please ensure your account is properly set up.");
}

async function createReservationRecord(
  ctx: MutationCtx,
  args: ReservationArgs,
  userId: Id<"users">
): Promise<Id<"reservations">> {
  try {
    // Only check time slot availability for services that require exclusive time slots
    // Custom Beats, Mixing, and Mastering can have multiple concurrent requests
    const servicesRequiringExclusiveSlots = ["Recording Session", "Consultation"];

    if (servicesRequiringExclusiveSlots.includes(args.serviceType)) {
      console.log(`🔄 Convex: Checking time slot availability for ${args.serviceType}`);

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
    } else {
      console.log(
        `🔄 Convex: Skipping time slot check for ${args.serviceType} (allows concurrent requests)`
      );
    }

    console.log(`🔄 Convex: Inserting reservation into database`);

    // Normalize details object to ensure referenceLinks is in camelCase
    const normalizedDetails = normalizeReservationDetails(args.details);

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
}

function normalizeReservationDetails(details: unknown): ReservationDetails {
  // This handles both reference_links (snake_case) and referenceLinks (camelCase)
  const rawDetails = details as Record<string, unknown>;
  const normalizedDetails: Record<string, unknown> = { ...rawDetails };

  if ("reference_links" in normalizedDetails) {
    normalizedDetails.referenceLinks = normalizedDetails.reference_links;
    delete normalizedDetails.reference_links;
  }

  // Validate required fields
  if (!normalizedDetails.name || typeof normalizedDetails.name !== "string") {
    throw new Error("Missing required field: name");
  }
  if (!normalizedDetails.email || typeof normalizedDetails.email !== "string") {
    throw new Error("Missing required field: email");
  }
  if (!normalizedDetails.phone || typeof normalizedDetails.phone !== "string") {
    throw new Error("Missing required field: phone");
  }

  return normalizedDetails as unknown as ReservationDetails;
}
