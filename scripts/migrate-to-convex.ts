import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Configuration
const CONVEX_URL = process.env.CONVEX_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const convex = new ConvexHttpClient(CONVEX_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateUsers() {
  console.log("🔄 Migrating users...");

  try {
    const { data: supabaseUsers, _error} = await supabase.from("users").select("*");

    if (error) throw error;

    console.log(`Found ${supabaseUsers.length} users to migrate`);

    for (const user of supabaseUsers) {
      try {
        await convex.mutation(api.users.upsertUser, {
          clerkId: user.clerk_id || user.id.toString(),
          email: user.email,
          username: user.username,
          stripeCustomerId: user.stripe_customer_id,
        });
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (err) {
        console.error(`❌ Failed to migrate user ${user.email}:`, err);
      }
    }

    console.log("✅ Users migration completed");
  } catch (error) {
    console.error("❌ Users migration failed:", error);
  }
}

async function migrateBeats() {
  console.log("🔄 Migrating beats...");

  try {
    const { data: supabaseBeats, _error} = await supabase.from("beats").select("*");

    if (error) throw error;

    console.log(`Found ${supabaseBeats.length} beats to migrate`);

    for (const beat of supabaseBeats) {
      try {
        await convex.mutation(api.beats.createBeat, {
          wordpressId: beat.wordpress_id,
          title: beat.title,
          description: beat.description,
          genre: beat.genre,
          bpm: beat.bpm,
          key: beat.key,
          mood: beat.mood,
          price: beat.price,
          audioUrl: beat.audio_url,
          imageUrl: beat.image_url,
          tags: beat.tags,
          featured: beat.featured,
          downloads: beat.downloads,
          views: beat.views,
          duration: beat.duration,
          isActive: beat.is_active,
          createdAt: new Date(beat.created_at).getTime(),
        });
        console.log(`✅ Migrated beat: ${beat.title}`);
      } catch (err) {
        console.error(`❌ Failed to migrate beat ${beat.title}:`, err);
      }
    }

    console.log("✅ Beats migration completed");
  } catch (error) {
    console.error("❌ Beats migration failed:", error);
  }
}

async function migrateReservations() {
  console.log("🔄 Migrating reservations...");

  try {
    const { data: supabaseReservations, _error} = await supabase.from("reservations").select("*");

    if (error) throw error;

    console.log(`Found ${supabaseReservations.length} reservations to migrate`);

    for (const reservation of supabaseReservations) {
      try {
        await convex.mutation(api.reservations.createReservation, {
          userId: reservation.user_id ? `users:${reservation.user_id}` : undefined,
          serviceType: reservation.service_type,
          status: reservation.status,
          details: reservation.details,
          preferredDate: reservation.preferred_date,
          durationMinutes: reservation.duration_minutes,
          totalPrice: reservation.total_price,
          notes: reservation.notes,
          createdAt: new Date(reservation.created_at).getTime(),
          updatedAt: new Date(reservation.updated_at).getTime(),
        });
        console.log(`✅ Migrated reservation: ${reservation.id}`);
      } catch (err) {
        console.error(`❌ Failed to migrate reservation ${reservation.id}:`, err);
      }
    }

    console.log("✅ Reservations migration completed");
  } catch (error) {
    console.error("❌ Reservations migration failed:", error);
  }
}

async function migrateDownloads() {
  console.log("🔄 Migrating downloads...");

  try {
    const { data: supabaseDownloads, _error} = await supabase.from("downloads").select("*");

    if (error) throw error;

    console.log(`Found ${supabaseDownloads.length} downloads to migrate`);

    for (const download of supabaseDownloads) {
      try {
        await convex.mutation(api.downloads.recordDownload, {
          beatId: download.beat_id,
          licenseType: download.license_type || "basic",
          downloadUrl: download.download_url,
          timestamp: new Date(download.downloaded_at).getTime(),
        });
        console.log(`✅ Migrated download: ${download.id}`);
      } catch (err) {
        console.error(`❌ Failed to migrate download ${download.id}:`, err);
      }
    }

    console.log("✅ Downloads migration completed");
  } catch (error) {
    console.error("❌ Downloads migration failed:", error);
  }
}

async function migrateOrders() {
  console.log("🔄 Migrating orders...");

  try {
    const { data: supabaseOrders, _error} = await supabase.from("orders").select("*");

    if (error) throw error;

    console.log(`Found ${supabaseOrders.length} orders to migrate`);

    for (const order of supabaseOrders) {
      try {
        await convex.mutation(api.orders.createOrder, {
          userId: order.user_id ? `users:${order.user_id}` : undefined,
          sessionId: order.session_id,
          email: order.email,
          total: order.total,
          status: order.status,
          stripePaymentIntentId: order.stripe_payment_intent_id,
          items: order.items,
          createdAt: new Date(order.created_at).getTime(),
        });
        console.log(`✅ Migrated order: ${order.id}`);
      } catch (err) {
        console.error(`❌ Failed to migrate order ${order.id}:`, err);
      }
    }

    console.log("✅ Orders migration completed");
  } catch (error) {
    console.error("❌ Orders migration failed:", error);
  }
}

async function main() {
  console.log("🚀 Starting migration from Supabase to Convex...");

  try {
    // Migrer dans l'ordre pour respecter les dépendances
    await migrateUsers();
    await migrateBeats();
    await migrateReservations();
    await migrateDownloads();
    await migrateOrders();

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  main();
}

export { main as migrateToConvex };
