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
import type * as activity_getRecent from "../activity/getRecent.js";
import type * as alerts from "../alerts.js";
import type * as audit from "../audit.js";
import type * as auth_roles from "../auth/roles.js";
import type * as backup from "../backup.js";
import type * as clerk_webhooks from "../clerk/webhooks.js";
import type * as consistency from "../consistency.js";
import type * as dashboard from "../dashboard.js";
import type * as data from "../data.js";
import type * as dataConsistency from "../dataConsistency.js";
import type * as dataSynchronization from "../dataSynchronization.js";
import type * as downloads_enriched from "../downloads/enriched.js";
import type * as downloads_record from "../downloads/record.js";
import type * as downloads from "../downloads.js";
import type * as favorites_add from "../favorites/add.js";
import type * as favorites_getFavorites from "../favorites/getFavorites.js";
import type * as favorites_remove from "../favorites/remove.js";
import type * as favorites_restore from "../favorites/restore.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as integrity from "../integrity.js";
import type * as lib_dashboardConfig from "../lib/dashboardConfig.js";
import type * as lib_dashboardValidation from "../lib/dashboardValidation.js";
import type * as lib_statisticsCalculator from "../lib/statisticsCalculator.js";
import type * as lib_validation from "../lib/validation.js";
import type * as messages from "../messages.js";
import type * as migrations_cleanOrders from "../migrations/cleanOrders.js";
import type * as migrations_cleanupSupabase from "../migrations/cleanupSupabase.js";
import type * as orders_createOrder from "../orders/createOrder.js";
import type * as orders_updateOrder from "../orders/updateOrder.js";
import type * as orders from "../orders.js";
import type * as products_forYou from "../products/forYou.js";
import type * as products from "../products.js";
import type * as quotas_getUserQuotas from "../quotas/getUserQuotas.js";
import type * as quotas_updateQuota from "../quotas/updateQuota.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reservations_createReservation from "../reservations/createReservation.js";
import type * as reservations_index from "../reservations/index.js";
import type * as reservations_listReservations from "../reservations/listReservations.js";
import type * as reservations_updateReservationStatus from "../reservations/updateReservationStatus.js";
import type * as restore from "../restore.js";
import type * as rollback from "../rollback.js";
import type * as subscriptions_createOrUpdateFromClerk from "../subscriptions/createOrUpdateFromClerk.js";
import type * as subscriptions_createSubscription from "../subscriptions/createSubscription.js";
import type * as subscriptions_getCurrentSubscription from "../subscriptions/getCurrentSubscription.js";
import type * as subscriptions_getSubscription from "../subscriptions/getSubscription.js";
import type * as subscriptions_invoices from "../subscriptions/invoices.js";
import type * as subscriptions_updateSubscription from "../subscriptions/updateSubscription.js";
import type * as sync_internal from "../sync/internal.js";
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
  "activity/getRecent": typeof activity_getRecent;
  alerts: typeof alerts;
  audit: typeof audit;
  "auth/roles": typeof auth_roles;
  backup: typeof backup;
  "clerk/webhooks": typeof clerk_webhooks;
  consistency: typeof consistency;
  dashboard: typeof dashboard;
  data: typeof data;
  dataConsistency: typeof dataConsistency;
  dataSynchronization: typeof dataSynchronization;
  "downloads/enriched": typeof downloads_enriched;
  "downloads/record": typeof downloads_record;
  downloads: typeof downloads;
  "favorites/add": typeof favorites_add;
  "favorites/getFavorites": typeof favorites_getFavorites;
  "favorites/remove": typeof favorites_remove;
  "favorites/restore": typeof favorites_restore;
  files: typeof files;
  http: typeof http;
  integrity: typeof integrity;
  "lib/dashboardConfig": typeof lib_dashboardConfig;
  "lib/dashboardValidation": typeof lib_dashboardValidation;
  "lib/statisticsCalculator": typeof lib_statisticsCalculator;
  "lib/validation": typeof lib_validation;
  messages: typeof messages;
  "migrations/cleanOrders": typeof migrations_cleanOrders;
  "migrations/cleanupSupabase": typeof migrations_cleanupSupabase;
  "orders/createOrder": typeof orders_createOrder;
  "orders/updateOrder": typeof orders_updateOrder;
  orders: typeof orders;
  "products/forYou": typeof products_forYou;
  products: typeof products;
  "quotas/getUserQuotas": typeof quotas_getUserQuotas;
  "quotas/updateQuota": typeof quotas_updateQuota;
  rateLimits: typeof rateLimits;
  "reservations/createReservation": typeof reservations_createReservation;
  "reservations/index": typeof reservations_index;
  "reservations/listReservations": typeof reservations_listReservations;
  "reservations/updateReservationStatus": typeof reservations_updateReservationStatus;
  restore: typeof restore;
  rollback: typeof rollback;
  "subscriptions/createOrUpdateFromClerk": typeof subscriptions_createOrUpdateFromClerk;
  "subscriptions/createSubscription": typeof subscriptions_createSubscription;
  "subscriptions/getCurrentSubscription": typeof subscriptions_getCurrentSubscription;
  "subscriptions/getSubscription": typeof subscriptions_getSubscription;
  "subscriptions/invoices": typeof subscriptions_invoices;
  "subscriptions/updateSubscription": typeof subscriptions_updateSubscription;
  "sync/internal": typeof sync_internal;
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
