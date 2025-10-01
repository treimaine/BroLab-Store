import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Initialize Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

export { convex };

// Helper functions for common operations
export async function getUserByClerkId(clerkId: string): Promise<any | null> {
  try {
    const user = await convex.query(api.users.getUserByClerkId, { clerkId });
    return user;
  } catch (error) {
    console.error("Error getting user by Clerk ID:", error);
    return null;
  }
}

export async function upsertUser(userData: any): Promise<any | null> {
  try {
    const user = await convex.mutation(api.users.upsertUser, userData);
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    return null;
  }
}

export async function logDownload(downloadData: any): Promise<any | null> {
  try {
    const download = await convex.mutation(api.downloads.logDownload, downloadData);
    return download;
  } catch (error) {
    console.error("Error logging download:", error);
    return null;
  }
}

export async function createOrder(orderData: any) {
  try {
    const order = await convex.mutation(api.orders.createOrder, orderData);
    return order;
  } catch (error) {
    console.error("Error creating order:", error);
    return null;
  }
}

export async function createReservation(reservationData: any) {
  try {
    console.log("🚀 Creating reservation via Convex:", reservationData);
    const reservation = await convex.mutation(api.reservations.createReservation, {
      serviceType: reservationData.service_type,
      details: reservationData.details,
      preferredDate: reservationData.preferred_date,
      durationMinutes: reservationData.duration_minutes,
      totalPrice: reservationData.total_price,
      notes: reservationData.notes,
      clerkId: reservationData.clerkId, // Pass clerkId for server-side authentication
    });
    console.log("✅ Reservation created successfully:", reservation);
    return {
      id: reservation,
      service_type: reservationData.service_type,
      details: reservationData.details,
      preferred_date: reservationData.preferred_date,
      duration_minutes: reservationData.duration_minutes,
      total_price: reservationData.total_price,
      notes: reservationData.notes,
      status: "pending",
      user_id: reservationData.user_id,
    };
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
}

export async function upsertSubscription(subscriptionData: any) {
  try {
    const subscription = await convex.mutation(
      api.subscriptions.upsertSubscription,
      subscriptionData
    );
    return subscription;
  } catch (error) {
    console.error("Error upserting subscription:", error);
    return null;
  }
}

export async function logActivity(activityData: any) {
  try {
    const activity = await convex.mutation(api.activity.logActivity, activityData);
    return activity;
  } catch (error) {
    console.error("Error logging activity:", error);
    return null;
  }
}
