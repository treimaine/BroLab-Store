/**
 * ResendContactService - Sync contacts to Resend Audience
 *
 * Automatically adds users to Resend Audience when they:
 * - Create an account (user.created webhook)
 * - Subscribe to a plan
 */

import { Resend } from "resend";

export interface ResendContact {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
}

export interface SyncResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

class ResendContactService {
  private resend: Resend | null = null;
  private audienceId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.audienceId = audienceId || null;

      if (audienceId) {
        console.log("📧 Resend Contact Service initialized with audience:", audienceId);
      } else {
        console.log("📧 Resend Contact Service initialized - will auto-detect audience");
      }
    } else {
      console.warn("⚠️ RESEND_API_KEY not configured - contact sync disabled");
    }
  }

  /**
   * Get or create the default audience ID
   */
  private async getAudienceId(): Promise<string | null> {
    if (this.audienceId) {
      return this.audienceId;
    }

    if (!this.resend) {
      return null;
    }

    try {
      // List existing audiences
      const audiences = await this.resend.audiences.list();

      if (audiences.error) {
        console.error("❌ Failed to list Resend audiences:", audiences.error);
        return null;
      }

      // Use first audience if exists
      if (audiences.data?.data && audiences.data.data.length > 0) {
        this.audienceId = audiences.data.data[0].id;
        console.log(
          "📧 Auto-detected Resend audience:",
          this.audienceId,
          audiences.data.data[0].name
        );
        return this.audienceId;
      }

      // Create a new audience if none exists
      const newAudience = await this.resend.audiences.create({
        name: "BroLab Users",
      });

      if (newAudience.error) {
        console.error("❌ Failed to create Resend audience:", newAudience.error);
        return null;
      }

      this.audienceId = newAudience.data?.id || null;
      console.log("📧 Created new Resend audience:", this.audienceId);
      return this.audienceId;
    } catch (error) {
      console.error("❌ Error getting/creating audience:", error);
      return null;
    }
  }

  /**
   * Add or update a contact in Resend Audience
   */
  async syncContact(contact: ResendContact): Promise<SyncResult> {
    if (!this.resend) {
      console.log("📧 Resend contact sync skipped (not configured):", contact.email);
      return {
        success: false,
        error: "Resend not configured",
      };
    }

    // Get or create audience ID
    const audienceId = await this.getAudienceId();
    if (!audienceId) {
      console.log("📧 Resend contact sync skipped (no audience):", contact.email);
      return {
        success: false,
        error: "No audience available",
      };
    }

    try {
      console.log("📧 Syncing contact to Resend:", contact.email);

      const result = await this.resend.contacts.create({
        audienceId,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        unsubscribed: contact.unsubscribed ?? false,
      });

      if (result.error) {
        // Check if contact already exists (not a real error)
        if (result.error.message?.includes("already exists")) {
          console.log("📧 Contact already exists in Resend:", contact.email);
          return { success: true };
        }

        console.error("❌ Resend contact sync failed:", result.error);
        return {
          success: false,
          error: result.error.message,
        };
      }

      console.log("✅ Contact synced to Resend:", contact.email, result.data?.id);
      return {
        success: true,
        contactId: result.data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Resend contact sync error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Remove a contact from Resend Audience
   */
  async removeContact(email: string): Promise<SyncResult> {
    if (!this.resend) {
      return { success: false, error: "Resend not configured" };
    }

    const audienceId = await this.getAudienceId();
    if (!audienceId) {
      return { success: false, error: "No audience available" };
    }

    try {
      // First, get the contact ID by email
      const contacts = await this.resend.contacts.list({ audienceId });

      if (contacts.error) {
        return { success: false, error: contacts.error.message };
      }

      const contact = contacts.data?.data?.find(c => c.email === email);
      if (!contact) {
        return { success: true }; // Contact doesn't exist, nothing to remove
      }

      const result = await this.resend.contacts.remove({
        audienceId,
        id: contact.id,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      console.log("✅ Contact removed from Resend:", email);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update contact subscription status
   */
  async updateSubscriptionStatus(email: string, unsubscribed: boolean): Promise<SyncResult> {
    if (!this.resend) {
      return { success: false, error: "Resend not configured" };
    }

    const audienceId = await this.getAudienceId();
    if (!audienceId) {
      return { success: false, error: "No audience available" };
    }

    try {
      // Get contact ID first
      const contacts = await this.resend.contacts.list({ audienceId });

      if (contacts.error) {
        return { success: false, error: contacts.error.message };
      }

      const contact = contacts.data?.data?.find(c => c.email === email);
      if (!contact) {
        // Contact doesn't exist, create it
        return this.syncContact({ email, unsubscribed });
      }

      const result = await this.resend.contacts.update({
        audienceId,
        id: contact.id,
        unsubscribed,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      console.log("✅ Contact subscription updated:", email, { unsubscribed });
      return { success: true, contactId: contact.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}

// Singleton instance
let resendContactService: ResendContactService | null = null;

export function getResendContactService(): ResendContactService {
  resendContactService ??= new ResendContactService();
  return resendContactService;
}

export default ResendContactService;
