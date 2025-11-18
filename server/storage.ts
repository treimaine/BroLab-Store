import {
  type Beat,
  type CartItem,
  type InsertBeat,
  type InsertCartItem,
  type InsertOrder,
  type InsertReservation,
  type InsertUser,
  type LicenseTypeEnum,
  type Order,
  type OrderStatusEnum,
  type Reservation,
  type ReservationStatusEnum,
  type User,
} from "@shared/schema";
import * as crypto from "node:crypto";
import { ErrorMessages } from "../shared/constants/ErrorMessages";
import {
  createReservation,
  getOrderInvoiceData,
  getReservationById,
  getReservationsByDateRange,
  getUserByEmail,
  getUserById,
  getUserReservations,
  listUserOrders,
  updateReservationStatus,
} from "./lib/db";
import { logger } from "./lib/logger";

interface Download {
  id: number;
  userId: number;
  beatId: number;
  licenseType: string;
  downloadUrl: string;
  timestamp: string;
}

// === Helpers for snake_case <-> camelCase mapping ===

// For Order: ensure items is always an array
interface DbOrder {
  id: number;
  user_id?: number;
  session_id?: string;
  items: string | unknown[];
  total: number;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

function fromDbOrder(row: DbOrder): Order {
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : [],
  } as Order;
}

export interface IStorage {
  // Reservation management
  createReservation(reservation: InsertReservation & { clerkId?: string }): Promise<Reservation>;
  getReservation(id: string): Promise<Reservation | undefined>;
  getUserReservations(userId: string | number): Promise<Reservation[]>;
  updateReservationStatus(id: string, status: ReservationStatusEnum): Promise<Reservation>;
  getReservationsByDateRange(startDate: string, endDate: string): Promise<Reservation[]>;

  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Beat management
  getBeat(id: number): Promise<Beat | undefined>;
  getBeats(filters?: {
    genre?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Beat[]>;
  createBeat(beat: InsertBeat): Promise<Beat>;
  updateBeat(id: number, beat: Partial<Beat>): Promise<Beat | undefined>;

  // Cart management
  getCartItems(sessionId: string): Promise<CartItem[]>;
  saveCartItems(sessionId: string, items: unknown[]): Promise<void>;
  addCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, item: Partial<CartItem>): Promise<CartItem | undefined>;
  removeCartItem(id: number): Promise<boolean>;

  // Order management
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Downloads management
  getUserDownloads(userId: number): Promise<Download[]>;
  logDownload(download: {
    userId: number;
    beatId: number;
    licenseType: string;
    downloadUrl: string;
    timestamp: string;
  }): Promise<Download>;

  // Newsletter and contact
  subscribeToNewsletter(email: string): Promise<void>;
  saveContactMessage(message: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void>;
}

export class MemStorage implements IStorage {
  private readonly reservations: Map<string, Reservation>;
  private readonly users: Map<number, User>;
  private readonly beats: Map<number, Beat>;
  private readonly cartItems: Map<number, CartItem>;
  private readonly orders: Map<number, Order>;
  private readonly newsletterSubscriptions: Set<string>;
  private readonly contactMessages: Array<{
    id: number;
    name: string;
    email: string;
    message: string;
    createdAt: string;
  }>;
  private currentUserId: number;
  private currentBeatId: number;
  private currentCartId: number;
  private currentOrderId: number;
  private readonly downloads: Map<number, Download[]> = new Map();

  constructor() {
    this.users = new Map();
    this.beats = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.reservations = new Map();
    this.newsletterSubscriptions = new Set();
    this.contactMessages = [];
    this.currentUserId = 1;
    this.currentBeatId = 1;
    this.currentCartId = 1;
    this.currentOrderId = 1;

    // Initialize with some sample beats for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample beats data matching the design reference
    const sampleBeats = [
      {
        wordpressId: 1,
        title: "Dark Trap Vibes",
        description:
          "This dark trap beat combines heavy 808s with atmospheric pads and crisp hi-hats.",
        genre: "Trap",
        bpm: 140,
        key: "A minor",
        mood: "Dark",
        price: 2500, // $25.00 in cents
        audioUrl: "https://example.com/audio/dark-trap-vibes.mp3",
        imageUrl: "https://example.com/images/dark-trap-vibes.jpg",
        isActive: true,
      },
      {
        wordpressId: 2,
        title: "Melodic Pop",
        description: "A melodic pop beat perfect for commercial releases and radio play.",
        genre: "Pop",
        bpm: 128,
        key: "C major",
        mood: "Uplifting",
        price: 3000, // $30.00 in cents
        audioUrl: "https://example.com/audio/melodic-pop.mp3",
        imageUrl: "https://example.com/images/melodic-pop.jpg",
        isActive: true,
      },
      {
        wordpressId: 3,
        title: "Hip-Hop Classic",
        description: "Classic hip-hop vibes with boom-bap drums and soulful samples.",
        genre: "Hip-Hop",
        bpm: 95,
        key: "F# minor",
        mood: "Nostalgic",
        price: 3500, // $35.00 in cents
        audioUrl: "https://example.com/audio/hip-hop-classic.mp3",
        imageUrl: "https://example.com/images/hip-hop-classic.jpg",
        isActive: true,
      },
    ];

    for (const beat of sampleBeats) {
      const id = this.currentBeatId++;
      this.beats.set(id, {
        id,
        ...beat,
        key: beat.key || null,
        description: beat.description || null,
        mood: beat.mood || null,
        audio_url: beat.audioUrl || null,
        image_url: beat.imageUrl || null,
        is_active: beat.isActive ?? true,
        created_at: new Date().toISOString(),
        wordpress_id: beat.wordpressId ?? 0,
      });
    }
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(_username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === _username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      stripeCustomerId: null,
      created_at: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  // Beat management
  async getBeat(id: number): Promise<Beat | undefined> {
    return this.beats.get(id);
  }

  async getBeats(filters?: {
    genre?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Beat[]> {
    let beats = Array.from(this.beats.values()).filter(beat => beat.is_active);

    if (filters) {
      if (filters.genre) {
        beats = beats.filter(beat =>
          beat.genre.toLowerCase().includes(filters.genre!.toLowerCase())
        );
      }
      if (filters.search) {
        beats = beats.filter(
          beat =>
            beat.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            beat.description?.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
      if (filters.minPrice) {
        beats = beats.filter(beat => beat.price >= filters.minPrice!);
      }
      if (filters.maxPrice) {
        beats = beats.filter(beat => beat.price <= filters.maxPrice!);
      }
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;

    return beats.slice(offset, offset + limit);
  }

  async createBeat(insertBeat: InsertBeat): Promise<Beat> {
    const id = this.currentBeatId++;
    const beat: Beat = {
      ...insertBeat,
      id,
      key: insertBeat.key || null,
      description: insertBeat.description || null,
      mood: insertBeat.mood || null,
      audio_url: insertBeat.audio_url || null,
      image_url: insertBeat.image_url || null,
      is_active: insertBeat.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    this.beats.set(id, beat);
    return beat;
  }

  async updateBeat(id: number, updates: Partial<Beat>): Promise<Beat | undefined> {
    const beat = this.beats.get(id);
    if (beat) {
      const updatedBeat = { ...beat, ...updates };
      this.beats.set(id, updatedBeat);
      return updatedBeat;
    }
    return undefined;
  }

  // Cart management
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(item => item.session_id === sessionId);
  }

  async saveCartItems(sessionId: string, items: unknown[]): Promise<void> {
    // Clear existing cart items for this session
    for (const [id, item] of Array.from(this.cartItems.entries())) {
      if (item.session_id === sessionId) {
        this.cartItems.delete(id);
      }
    }

    // Add new items
    if (Array.isArray(items)) {
      for (const item of items) {
        const cartItem = item as {
          beatId: number;
          licenseType: LicenseTypeEnum;
          price: number;
          quantity: number;
          userId?: number;
        };
        await this.addCartItem({
          beat_id: cartItem.beatId,
          license_type: cartItem.licenseType,
          price: cartItem.price,
          quantity: cartItem.quantity,
          session_id: sessionId,
          user_id: cartItem.userId || null,
        });
      }
    }
  }

  async addCartItem(insertItem: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartId++;
    const item: CartItem = {
      ...insertItem,
      id,
      quantity: insertItem.quantity || 1,
      session_id: insertItem.session_id || null,
      user_id: insertItem.user_id || null,
      created_at: new Date().toISOString(),
    };
    this.cartItems.set(id, item);
    return item;
  }

  async updateCartItem(id: number, updates: Partial<CartItem>): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      this.cartItems.set(id, updatedItem);
      return updatedItem;
    }
    return undefined;
  }

  async removeCartItem(id: number): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  // Order management
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.user_id === userId);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    // Convert order items to CartItem format for compatibility
    const cartItems: CartItem[] = (insertOrder.items ?? []).map((item, index) => {
      const licenseType = item.license || "basic";
      const validLicense: LicenseTypeEnum =
        licenseType === "basic" || licenseType === "premium" || licenseType === "unlimited"
          ? licenseType
          : "basic";

      return {
        id: index + 1,
        beat_id: item.productId || 0,
        license_type: validLicense,
        price: item.price || 0,
        quantity: item.quantity || 1,
        session_id: insertOrder.session_id || null,
        user_id: insertOrder.user_id || null,
        created_at: new Date().toISOString(),
      };
    });

    const order: Order = {
      ...insertOrder,
      id,
      session_id: insertOrder.session_id || null,
      user_id: insertOrder.user_id || null,
      stripe_payment_intent_id: insertOrder.stripe_payment_intent_id || null,
      created_at: new Date().toISOString(),
      email: insertOrder.email,
      status: insertOrder.status,
      total: insertOrder.total,
      items: cartItems,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatusEnum): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
  }

  // Downloads management
  async getUserDownloads(userId: number): Promise<Download[]> {
    return this.downloads.get(userId) || [];
  }

  async logDownload(download: {
    userId: number;
    beatId: number;
    licenseType: string;
    downloadUrl: string;
    timestamp: string;
  }): Promise<Download> {
    const userDownloads = this.downloads.get(download.userId) || [];
    const newDownload: Download = {
      id: Date.now(),
      ...download,
    };
    userDownloads.push(newDownload);
    this.downloads.set(download.userId, userDownloads);
    return newDownload;
  }

  // Newsletter and contact
  async subscribeToNewsletter(email: string): Promise<void> {
    this.newsletterSubscriptions.add(email.toLowerCase());
  }

  async saveContactMessage(message: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    this.contactMessages.push({
      id: Date.now(), // Generate a simple ID
      name: `${message.firstName} ${message.lastName}`,
      email: message.email,
      message: message.message,
      createdAt: new Date().toISOString(),
    });
  }

  // Reservation methods
  async createReservation(
    reservation: InsertReservation & { clerkId?: string }
  ): Promise<Reservation> {
    const id = crypto.randomUUID();
    const newReservation: Reservation = {
      ...reservation,
      id,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.reservations.set(id, newReservation);
    return newReservation;
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async getUserReservations(userId: string | number): Promise<Reservation[]> {
    const numericUserId = typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
    return Array.from(this.reservations.values())
      .filter(reservation => reservation.user_id === numericUserId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async updateReservationStatus(id: string, status: ReservationStatusEnum): Promise<Reservation> {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new Error(ErrorMessages.RESERVATION.NOT_FOUND);
    }
    const updatedReservation = {
      ...reservation,
      status,
      updated_at: new Date().toISOString(),
    };
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }

  async getReservationsByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return Array.from(this.reservations.values())
      .filter(reservation => {
        const date = new Date(reservation.preferred_date).getTime();
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(a.preferred_date).getTime() - new Date(b.preferred_date).getTime());
  }
}

export class DatabaseStorage implements IStorage {
  private readonly orders: Map<number, Order> = new Map();

  // Reservation methods
  async createReservation(
    reservation: InsertReservation & { clerkId?: string }
  ): Promise<Reservation> {
    logger.info("DatabaseStorage: Creating reservation", {
      hasClerkId: !!reservation.clerkId,
      serviceType: reservation.service_type,
    });

    if (!reservation.clerkId) {
      throw new Error("Authentication error: clerkId is required for reservation creation");
    }

    return await createReservation(reservation);
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    const reservation = await getReservationById(id);
    return reservation || undefined;
  }

  async getUserReservations(userId: string | number): Promise<Reservation[]> {
    return await getUserReservations(userId);
  }

  async updateReservationStatus(id: string, status: ReservationStatusEnum): Promise<Reservation> {
    return await updateReservationStatus(id, status);
  }

  async getReservationsByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
    return await getReservationsByDateRange(startDate, endDate);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await getUserById(id);
    return user || undefined;
  }

  async getUserByUsername(_username: string): Promise<User | undefined> {
    // getUserByUsername not implemented in current helpers
    // Would require new helper in lib/db.ts
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await getUserByEmail(email);
    return user || undefined;
  }

  async createUser(_insertUser: InsertUser): Promise<User> {
    // For DatabaseStorage, we need a clerkId which should be provided separately
    // This is a limitation of the current implementation
    // In production, user creation should go through Clerk webhooks
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }

  // Beat methods - Not implemented (WooCommerce handles beats)
  async getBeat(_id: number): Promise<Beat | undefined> {
    // Beats are managed via WooCommerce API, not database
    return undefined;
  }

  async getBeats(_filters?: {
    genre?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Beat[]> {
    // Beats are managed via WooCommerce API, not database
    return [];
  }

  async createBeat(_insertBeat: InsertBeat): Promise<Beat> {
    // Beats are managed via WooCommerce API, not database
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }

  async updateBeat(_id: number, _updates: Partial<Beat>): Promise<Beat | undefined> {
    // Beats are managed via WooCommerce API, not database
    return undefined;
  }

  // Cart methods - Not implemented (client-side cart management)
  async getCartItems(_sessionId: string): Promise<CartItem[]> {
    // Cart is managed client-side with localStorage
    return [];
  }

  async saveCartItems(_sessionId: string, _items: unknown[]): Promise<void> {
    // Cart is managed client-side with localStorage
  }

  async addCartItem(_insertItem: InsertCartItem): Promise<CartItem> {
    // Cart is managed client-side with localStorage
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }

  async updateCartItem(_id: number, _updates: Partial<CartItem>): Promise<CartItem | undefined> {
    // Cart is managed client-side with localStorage
    return undefined;
  }

  async removeCartItem(_id: number): Promise<boolean> {
    // Cart is managed client-side with localStorage
    return false;
  }

  // Order methods - Not fully implemented
  async getOrdersByUser(userId: number): Promise<Order[]> {
    const orders = await listUserOrders(userId);
    return orders.map(order => fromDbOrder(order as DbOrder));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const { order } = await getOrderInvoiceData(id);
    return fromDbOrder(order as DbOrder);
  }

  async createOrder(_insertOrder: InsertOrder): Promise<Order> {
    // Orders are not directly implemented in current helpers
    // This would require a new helper in lib/db.ts
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }

  async updateOrderStatus(_id: number, _status: string): Promise<Order | undefined> {
    // Orders not implemented in current helpers
    return undefined;
  }

  // Downloads management
  async getUserDownloads(userId: number): Promise<Download[]> {
    // Downloads would be retrieved from database
    // For now, return empty array as downloads are not fully implemented
    logger.info("Getting downloads for user", { hasUserId: !!userId });
    return [];
  }

  async logDownload(download: {
    userId: number;
    beatId: number;
    licenseType: string;
    downloadUrl: string;
    timestamp: string;
  }): Promise<Download> {
    // Download logging would go to database
    logger.info("Logging download", {
      beatId: download.beatId,
      hasUserId: !!download.userId,
    });
    return {
      id: Date.now(), // Temporary ID
      ...download,
    };
  }

  // Newsletter and contact
  async subscribeToNewsletter(email: string): Promise<void> {
    // Newsletter subscription logic would go here
    // For now, we'll implement a simple log
    logger.info("Newsletter subscription", { hasEmail: !!email });
  }

  async saveContactMessage(message: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    // Contact message storage logic would go here
    // For now, we'll implement a simple log
    logger.info("Contact message received", {
      hasEmail: !!message.email,
      subject: message.subject,
    });
  }
}

// Export both storage implementations
export const memStorage = new MemStorage();
export const databaseStorage = new DatabaseStorage();

// Use MemStorage for tests, DatabaseStorage for production
export const storage = process.env.NODE_ENV === "test" ? memStorage : databaseStorage;
