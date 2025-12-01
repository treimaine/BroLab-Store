import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Synchroniser les produits WordPress avec Convex
export const syncWordPressProducts = mutation({
  args: {
    products: v.array(
      v.object({
        id: v.number(),
        title: v.string(),
        description: v.optional(v.string()),
        genre: v.optional(v.string()),
        bpm: v.optional(v.number()),
        key: v.optional(v.string()),
        mood: v.optional(v.string()),
        price: v.number(),
        audioUrl: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        featured: v.optional(v.boolean()),
        downloads: v.optional(v.number()),
        views: v.optional(v.number()),
        duration: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { products }) => {
    console.log(`🔄 Syncing ${products.length} WordPress products to Convex`);

    const results = [];

    for (const product of products) {
      try {
        // Vérifier si le produit existe déjà
        const existingBeat = await ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", product.id))
          .first();

        if (existingBeat) {
          // Mettre à jour le produit existant
          await ctx.db.patch(existingBeat._id, {
            title: product.title,
            description: product.description,
            genre: product.genre || "Unknown",
            bpm: product.bpm || 0,
            key: product.key,
            mood: product.mood,
            price: product.price,
            audioUrl: product.audioUrl,
            imageUrl: product.imageUrl,
            tags: product.tags,
            featured: product.featured || false,
            downloads: product.downloads || 0,
            views: product.views || 0,
            duration: product.duration,
            isActive: product.isActive !== false,
            updatedAt: Date.now(),
          });
          results.push({ id: product.id, action: "updated", success: true });
        } else {
          // Créer un nouveau produit
          await ctx.db.insert("beats", {
            wordpressId: product.id,
            title: product.title,
            description: product.description,
            genre: product.genre || "Unknown",
            bpm: product.bpm || 0,
            key: product.key,
            mood: product.mood,
            price: product.price,
            audioUrl: product.audioUrl,
            imageUrl: product.imageUrl,
            tags: product.tags,
            featured: product.featured || false,
            downloads: product.downloads || 0,
            views: product.views || 0,
            duration: product.duration,
            isActive: product.isActive !== false,
            createdAt: Date.now(),
          });
          results.push({ id: product.id, action: "created", success: true });
        }
      } catch (error) {
        console.error(`❌ Error syncing product ${product.id}:`, error);
        results.push({ id: product.id, action: "error", success: false, error: String(error) });
      }
    }

    return results;
  },
});

// Obtenir tous les produits synchronisés
export const getSyncedProducts = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    genre: v.optional(v.string()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 50, offset: _offset = 0, genre, featured }) => {
    const beats = await ctx.db.query("beats").order("desc").collect();

    // Filtrer par genre si spécifié
    let filteredBeats = genre ? beats.filter(beat => beat.genre === genre) : beats;

    // Filtrer par featured si spécifié
    if (featured !== undefined) {
      filteredBeats = filteredBeats.filter(beat => beat.featured === featured);
    }

    return { page: filteredBeats.slice(0, limit), isDone: true, continueCursor: null };
  },
});

// Obtenir un produit par son ID WordPress
export const getProductByWordPressId = query({
  args: { wordpressId: v.number() },
  handler: async (ctx, { wordpressId }) => {
    return await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", wordpressId))
      .first();
  },
});

// Marquer un produit comme désactivé
export const deactivateProduct = mutation({
  args: { wordpressId: v.number() },
  handler: async (ctx, { wordpressId }) => {
    const beat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", wordpressId))
      .first();

    if (beat) {
      await ctx.db.patch(beat._id, { isActive: false });
      return { success: true, message: "Product deactivated" };
    }

    return { success: false, message: "Product not found" };
  },
});
