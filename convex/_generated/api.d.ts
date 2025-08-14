/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as audit from "../audit.js";
import type * as auth_roles from "../auth/roles.js";
import type * as clerk_webhooks from "../clerk/webhooks.js";
import type * as downloads_record from "../downloads/record.js";
import type * as downloads from "../downloads.js";
import type * as favorites_add from "../favorites/add.js";
import type * as favorites_getFavorites from "../favorites/getFavorites.js";
import type * as favorites_remove from "../favorites/remove.js";
import type * as lib_validation from "../lib/validation.js";
import type * as messages from "../messages.js";
import type * as migrations_cleanupSupabase from "../migrations/cleanupSupabase.js";
import type * as orders_createOrder from "../orders/createOrder.js";
import type * as orders_updateOrder from "../orders/updateOrder.js";
import type * as orders from "../orders.js";
import type * as products_forYou from "../products/forYou.js";
import type * as quotas_getUserQuotas from "../quotas/getUserQuotas.js";
import type * as quotas_updateQuota from "../quotas/updateQuota.js";
import type * as reservations_createReservation from "../reservations/createReservation.js";
import type * as reservations_index from "../reservations/index.js";
import type * as reservations_listReservations from "../reservations/listReservations.js";
import type * as reservations_updateReservationStatus from "../reservations/updateReservationStatus.js";
import type * as subscriptions_createSubscription from "../subscriptions/createSubscription.js";
import type * as subscriptions_getCurrentSubscription from "../subscriptions/getCurrentSubscription.js";
import type * as subscriptions_getSubscription from "../subscriptions/getSubscription.js";
import type * as subscriptions_updateSubscription from "../subscriptions/updateSubscription.js";
import type * as sync_woocommerce from "../sync/woocommerce.js";
import type * as sync_wordpress from "../sync/wordpress.js";
import type * as users_clerkSync from "../users/clerkSync.js";
import type * as users_getUserStats from "../users/getUserStats.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  "auth/roles": typeof auth_roles;
  "clerk/webhooks": typeof clerk_webhooks;
  "downloads/record": typeof downloads_record;
  downloads: typeof downloads;
  "favorites/add": typeof favorites_add;
  "favorites/getFavorites": typeof favorites_getFavorites;
  "favorites/remove": typeof favorites_remove;
  "lib/validation": typeof lib_validation;
  messages: typeof messages;
  "migrations/cleanupSupabase": typeof migrations_cleanupSupabase;
  "orders/createOrder": typeof orders_createOrder;
  "orders/updateOrder": typeof orders_updateOrder;
  orders: typeof orders;
  "products/forYou": typeof products_forYou;
  "quotas/getUserQuotas": typeof quotas_getUserQuotas;
  "quotas/updateQuota": typeof quotas_updateQuota;
  "reservations/createReservation": typeof reservations_createReservation;
  "reservations/index": typeof reservations_index;
  "reservations/listReservations": typeof reservations_listReservations;
  "reservations/updateReservationStatus": typeof reservations_updateReservationStatus;
  "subscriptions/createSubscription": typeof subscriptions_createSubscription;
  "subscriptions/getCurrentSubscription": typeof subscriptions_getCurrentSubscription;
  "subscriptions/getSubscription": typeof subscriptions_getSubscription;
  "subscriptions/updateSubscription": typeof subscriptions_updateSubscription;
  "sync/woocommerce": typeof sync_woocommerce;
  "sync/wordpress": typeof sync_wordpress;
  "users/clerkSync": typeof users_clerkSync;
  "users/getUserStats": typeof users_getUserStats;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
