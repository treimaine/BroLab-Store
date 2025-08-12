import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Script de migration pour nettoyer les références Supabase obsolètes
 * et s'assurer que toutes les données sont correctement migrées vers Convex
 */

/**
 * Analyser les données existantes pour identifier les références Supabase
 */
export const analyzeSupabaseReferences = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔍 Analyzing Supabase references...");

      const analysis = {
        users: {
          total: 0,
          withSupabaseIds: 0,
          missingClerkIds: 0,
          inactive: 0,
        },
        orders: {
          total: 0,
          withWooCommerceIds: 0,
          orphaned: 0,
          missingUserIds: 0,
        },
        downloads: {
          total: 0,
          orphaned: 0,
          missingUserIds: 0,
        },
        reservations: {
          total: 0,
          orphaned: 0,
          missingUserIds: 0,
        },
        favorites: {
          total: 0,
          orphaned: 0,
          missingUserIds: 0,
        },
      };

      // Analyser les utilisateurs
      const users = await ctx.db.query("users").collect();
      analysis.users.total = users.length;
      
      for (const user of users) {
        if (!user.clerkId) {
          analysis.users.missingClerkIds++;
        }
        if (!user.isActive) {
          analysis.users.inactive++;
        }
        // Vérifier s'il y a des références Supabase dans les métadonnées
        if (user.metadata && typeof user.metadata === 'object') {
          const metadata = user.metadata as any;
          if (metadata.supabaseId || metadata.supabase_id) {
            analysis.users.withSupabaseIds++;
          }
        }
      }

      // Analyser les commandes
      const orders = await ctx.db.query("orders").collect();
      analysis.orders.total = orders.length;
      
      for (const order of orders) {
        if (order.woocommerceId) {
          analysis.orders.withWooCommerceIds++;
        }
        if (!order.userId) {
          analysis.orders.missingUserIds++;
        } else {
          // Vérifier si l'utilisateur existe encore
          const user = await ctx.db.get(order.userId);
          if (!user) {
            analysis.orders.orphaned++;
          }
        }
      }

      // Analyser les téléchargements
      const downloads = await ctx.db.query("downloads").collect();
      analysis.downloads.total = downloads.length;
      
      for (const download of downloads) {
        if (!download.userId) {
          analysis.downloads.missingUserIds++;
        } else {
          const user = await ctx.db.get(download.userId);
          if (!user) {
            analysis.downloads.orphaned++;
          }
        }
      }

      // Analyser les réservations
      const reservations = await ctx.db.query("reservations").collect();
      analysis.reservations.total = reservations.length;
      
      for (const reservation of reservations) {
        if (!reservation.userId) {
          analysis.reservations.missingUserIds++;
        } else {
          const user = await ctx.db.get(reservation.userId);
          if (!user) {
            analysis.reservations.orphaned++;
          }
        }
      }

      // Analyser les favoris
      const favorites = await ctx.db.query("favorites").collect();
      analysis.favorites.total = favorites.length;
      
      for (const favorite of favorites) {
        if (!favorite.userId) {
          analysis.favorites.missingUserIds++;
        } else {
          const user = await ctx.db.get(favorite.userId);
          if (!user) {
            analysis.favorites.orphaned++;
          }
        }
      }

      console.log("✅ Analysis completed:", analysis);
      return analysis;
    } catch (error) {
      console.error("❌ Error analyzing Supabase references:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze: ${errorMessage}`);
    }
  },
});

/**
 * Nettoyer les références Supabase obsolètes
 */
export const cleanupSupabaseReferences = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const dryRun = args.dryRun ?? true;
      console.log(`🧹 ${dryRun ? 'DRY RUN:' : ''} Cleaning up Supabase references...`);

      const results = {
        usersUpdated: 0,
        ordersUpdated: 0,
        orphanedRecordsRemoved: 0,
        errors: [] as string[],
      };

      // Nettoyer les métadonnées des utilisateurs
      const users = await ctx.db.query("users").collect();
      for (const user of users) {
        try {
          let needsUpdate = false;
          const updates: any = {};

          // Nettoyer les métadonnées Supabase
          if (user.metadata && typeof user.metadata === 'object') {
            const metadata = { ...user.metadata } as any;
            if (metadata.supabaseId || metadata.supabase_id) {
              delete metadata.supabaseId;
              delete metadata.supabase_id;
              updates.metadata = metadata;
              needsUpdate = true;
            }
          }

          // S'assurer que les champs requis sont présents
          if (!user.role) {
            updates.role = "user";
            needsUpdate = true;
          }

          if (user.isActive === undefined) {
            updates.isActive = true;
            needsUpdate = true;
          }

          if (needsUpdate && !dryRun) {
            await ctx.db.patch(user._id, {
              ...updates,
              updatedAt: Date.now(),
            });
            results.usersUpdated++;
          } else if (needsUpdate) {
            results.usersUpdated++;
          }
        } catch (error) {
          const errorMsg = `Error updating user ${user._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Nettoyer les commandes orphelines
      const orders = await ctx.db.query("orders").collect();
      for (const order of orders) {
        try {
          if (order.userId) {
            const user = await ctx.db.get(order.userId);
            if (!user) {
              console.log(`🗑️ Found orphaned order: ${order._id}`);
              if (!dryRun) {
                await ctx.db.delete(order._id);
              }
              results.orphanedRecordsRemoved++;
            }
          }
        } catch (error) {
          const errorMsg = `Error checking order ${order._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Nettoyer les téléchargements orphelins
      const downloads = await ctx.db.query("downloads").collect();
      for (const download of downloads) {
        try {
          if (download.userId) {
            const user = await ctx.db.get(download.userId);
            if (!user) {
              console.log(`🗑️ Found orphaned download: ${download._id}`);
              if (!dryRun) {
                await ctx.db.delete(download._id);
              }
              results.orphanedRecordsRemoved++;
            }
          }
        } catch (error) {
          const errorMsg = `Error checking download ${download._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Nettoyer les réservations orphelines
      const reservations = await ctx.db.query("reservations").collect();
      for (const reservation of reservations) {
        try {
          if (reservation.userId) {
            const user = await ctx.db.get(reservation.userId);
            if (!user) {
              console.log(`🗑️ Found orphaned reservation: ${reservation._id}`);
              if (!dryRun) {
                await ctx.db.delete(reservation._id);
              }
              results.orphanedRecordsRemoved++;
            }
          }
        } catch (error) {
          const errorMsg = `Error checking reservation ${reservation._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Nettoyer les favoris orphelins
      const favorites = await ctx.db.query("favorites").collect();
      for (const favorite of favorites) {
        try {
          if (favorite.userId) {
            const user = await ctx.db.get(favorite.userId);
            if (!user) {
              console.log(`🗑️ Found orphaned favorite: ${favorite._id}`);
              if (!dryRun) {
                await ctx.db.delete(favorite._id);
              }
              results.orphanedRecordsRemoved++;
            }
          }
        } catch (error) {
          const errorMsg = `Error checking favorite ${favorite._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      console.log(`✅ Cleanup ${dryRun ? 'simulation' : 'execution'} completed:`, results);
      return results;
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup: ${errorMessage}`);
    }
  },
});

/**
 * Valider l'intégrité des données après migration
 */
export const validateDataIntegrity = query({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔍 Validating data integrity...");

      const validation = {
        users: {
          total: 0,
          valid: 0,
          issues: [] as string[],
        },
        orders: {
          total: 0,
          valid: 0,
          issues: [] as string[],
        },
        downloads: {
          total: 0,
          valid: 0,
          issues: [] as string[],
        },
        reservations: {
          total: 0,
          valid: 0,
          issues: [] as string[],
        },
        favorites: {
          total: 0,
          valid: 0,
          issues: [] as string[],
        },
      };

      // Valider les utilisateurs
      const users = await ctx.db.query("users").collect();
      validation.users.total = users.length;
      
      for (const user of users) {
        let isValid = true;
        
        if (!user.clerkId) {
          validation.users.issues.push(`User ${user._id} missing clerkId`);
          isValid = false;
        }
        
        if (!user.email) {
          validation.users.issues.push(`User ${user._id} missing email`);
          isValid = false;
        }
        
        if (!user.role) {
          validation.users.issues.push(`User ${user._id} missing role`);
          isValid = false;
        }
        
        if (user.isActive === undefined) {
          validation.users.issues.push(`User ${user._id} missing isActive flag`);
          isValid = false;
        }
        
        if (isValid) {
          validation.users.valid++;
        }
      }

      // Valider les commandes
      const orders = await ctx.db.query("orders").collect();
      validation.orders.total = orders.length;
      
      for (const order of orders) {
        let isValid = true;
        
        if (!order.userId) {
          validation.orders.issues.push(`Order ${order._id} missing userId`);
          isValid = false;
        } else {
          const user = await ctx.db.get(order.userId);
          if (!user) {
            validation.orders.issues.push(`Order ${order._id} references non-existent user`);
            isValid = false;
          }
        }
        
        if (!order.email) {
          validation.orders.issues.push(`Order ${order._id} missing email`);
          isValid = false;
        }
        
        if (!order.status) {
          validation.orders.issues.push(`Order ${order._id} missing status`);
          isValid = false;
        }
        
        if (!order.items || order.items.length === 0) {
          validation.orders.issues.push(`Order ${order._id} has no items`);
          isValid = false;
        }
        
        if (isValid) {
          validation.orders.valid++;
        }
      }

      // Valider les téléchargements
      const downloads = await ctx.db.query("downloads").collect();
      validation.downloads.total = downloads.length;
      
      for (const download of downloads) {
        let isValid = true;
        
        if (!download.userId) {
          validation.downloads.issues.push(`Download ${download._id} missing userId`);
          isValid = false;
        } else {
          const user = await ctx.db.get(download.userId);
          if (!user) {
            validation.downloads.issues.push(`Download ${download._id} references non-existent user`);
            isValid = false;
          }
        }
        
        if (!download.beatId) {
          validation.downloads.issues.push(`Download ${download._id} missing beatId`);
          isValid = false;
        }
        
        if (isValid) {
          validation.downloads.valid++;
        }
      }

      // Valider les réservations
      const reservations = await ctx.db.query("reservations").collect();
      validation.reservations.total = reservations.length;
      
      for (const reservation of reservations) {
        let isValid = true;
        
        if (!reservation.userId) {
          validation.reservations.issues.push(`Reservation ${reservation._id} missing userId`);
          isValid = false;
        } else {
          const user = await ctx.db.get(reservation.userId);
          if (!user) {
            validation.reservations.issues.push(`Reservation ${reservation._id} references non-existent user`);
            isValid = false;
          }
        }
        
        if (!reservation.serviceType) {
          validation.reservations.issues.push(`Reservation ${reservation._id} missing serviceType`);
          isValid = false;
        }
        
        if (isValid) {
          validation.reservations.valid++;
        }
      }

      // Valider les favoris
      const favorites = await ctx.db.query("favorites").collect();
      validation.favorites.total = favorites.length;
      
      for (const favorite of favorites) {
        let isValid = true;
        
        if (!favorite.userId) {
          validation.favorites.issues.push(`Favorite ${favorite._id} missing userId`);
          isValid = false;
        } else {
          const user = await ctx.db.get(favorite.userId);
          if (!user) {
            validation.favorites.issues.push(`Favorite ${favorite._id} references non-existent user`);
            isValid = false;
          }
        }
        
        if (!favorite.beatId) {
          validation.favorites.issues.push(`Favorite ${favorite._id} missing beatId`);
          isValid = false;
        }
        
        if (isValid) {
          validation.favorites.valid++;
        }
      }

      console.log("✅ Data integrity validation completed:", validation);
      return validation;
    } catch (error) {
      console.error("❌ Error validating data integrity:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate: ${errorMessage}`);
    }
  },
});