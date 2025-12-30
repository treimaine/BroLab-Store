/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity_getRecent from "../activity/getRecent.js";
import type * as activity_getUserActivity from "../activity/getUserActivity.js";
import type * as activity_logActivity from "../activity/logActivity.js";
import type * as admin_cleanSubscriptions from "../admin/cleanSubscriptions.js";
import type * as admin_verifySubscriptions from "../admin/verifySubscriptions.js";
import type * as audit from "../audit.js";
import type * as auth_roles from "../auth/roles.js";
import type * as beats_fetchFromWooCommerce from "../beats/fetchFromWooCommerce.js";
import type * as beats_trackView from "../beats/trackView.js";
import type * as beats_trending from "../beats/trending.js";
import type * as cartItems from "../cartItems.js";
import type * as clerk_billing from "../clerk/billing.js";
import type * as clerk_simpleWebhook from "../clerk/simpleWebhook.js";
import type * as clerk_webhooks from "../clerk/webhooks.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as data from "../data.js";
import type * as downloads from "../downloads.js";
import type * as downloads_enriched from "../downloads/enriched.js";
import type * as downloads_listDownloads from "../downloads/listDownloads.js";
import type * as downloads_record from "../downloads/record.js";
import type * as emailVerifications from "../emailVerifications.js";
import type * as favorites_add from "../favorites/add.js";
import type * as favorites_getFavorites from "../favorites/getFavorites.js";
import type * as favorites_remove from "../favorites/remove.js";
import type * as favorites_restore from "../favorites/restore.js";
import type * as favorites_serverFunctions from "../favorites/serverFunctions.js";
import type * as files from "../files.js";
import type * as files_createFile from "../files/createFile.js";
import type * as files_deleteFile from "../files/deleteFile.js";
import type * as files_getFile from "../files/getFile.js";
import type * as files_listFiles from "../files/listFiles.js";
import type * as files_storage from "../files/storage.js";
import type * as health_check from "../health/check.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as invoices_createInvoiceRecord from "../invoices/createInvoiceRecord.js";
import type * as invoices_generateInvoiceNumber from "../invoices/generateInvoiceNumber.js";
import type * as invoices_updateInvoiceUrl from "../invoices/updateInvoiceUrl.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_dashboardConfig from "../lib/dashboardConfig.js";
import type * as lib_dashboardValidation from "../lib/dashboardValidation.js";
import type * as lib_statisticsCalculator from "../lib/statisticsCalculator.js";
import type * as lib_validation from "../lib/validation.js";
import type * as licenses from "../licenses.js";
import type * as migrations_archive_cleanOrders from "../migrations/archive/cleanOrders.js";
import type * as migrations_archive_cleanupGenericDownloads from "../migrations/archive/cleanupGenericDownloads.js";
import type * as migrations_archive_cleanupSupabase from "../migrations/archive/cleanupSupabase.js";
import type * as migrations_archive_fixOrderPrices from "../migrations/archive/fixOrderPrices.js";
import type * as migrations_archive_fixReservationPrices from "../migrations/archive/fixReservationPrices.js";
import type * as migrations_archive_markSpecificFreeBeats from "../migrations/archive/markSpecificFreeBeats.js";
import type * as orders from "../orders.js";
import type * as orders_confirmPayment from "../orders/confirmPayment.js";
import type * as orders_getOrdersByEmail from "../orders/getOrdersByEmail.js";
import type * as orders_listOrderItems from "../orders/listOrderItems.js";
import type * as orders_listUserOrders from "../orders/listUserOrders.js";
import type * as orders_reconciliation from "../orders/reconciliation.js";
import type * as orders_updateOrder from "../orders/updateOrder.js";
import type * as passwordResets from "../passwordResets.js";
import type * as products from "../products.js";
import type * as products_forYou from "../products/forYou.js";
import type * as quotas_getUserQuotas from "../quotas/getUserQuotas.js";
import type * as quotas_updateQuota from "../quotas/updateQuota.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reservations_checkAndSendReminders from "../reservations/checkAndSendReminders.js";
import type * as reservations_checkAvailability from "../reservations/checkAvailability.js";
import type * as reservations_createReservation from "../reservations/createReservation.js";
import type * as reservations_getByDateRange from "../reservations/getByDateRange.js";
import type * as reservations_getReservationById from "../reservations/getReservationById.js";
import type * as reservations_index from "../reservations/index.js";
import type * as reservations_listReservations from "../reservations/listReservations.js";
import type * as reservations_reminderScheduler from "../reservations/reminderScheduler.js";
import type * as reservations_sendAdminNotification from "../reservations/sendAdminNotification.js";
import type * as reservations_sendPaymentConfirmation from "../reservations/sendPaymentConfirmation.js";
import type * as reservations_sendReminderEmail from "../reservations/sendReminderEmail.js";
import type * as reservations_sendStatusUpdateEmail from "../reservations/sendStatusUpdateEmail.js";
import type * as reservations_updateReservationStatus from "../reservations/updateReservationStatus.js";
import type * as subscriptions from "../subscriptions.js";
import type * as subscriptions_checkDownloadQuota from "../subscriptions/checkDownloadQuota.js";
import type * as subscriptions_createOrUpdateFromClerk from "../subscriptions/createOrUpdateFromClerk.js";
import type * as subscriptions_createSubscription from "../subscriptions/createSubscription.js";
import type * as subscriptions_getCurrentSubscription from "../subscriptions/getCurrentSubscription.js";
import type * as subscriptions_getSubscription from "../subscriptions/getSubscription.js";
import type * as subscriptions_incrementDownloadUsage from "../subscriptions/incrementDownloadUsage.js";
import type * as subscriptions_invoices from "../subscriptions/invoices.js";
import type * as subscriptions_updateSubscription from "../subscriptions/updateSubscription.js";
import type * as subscriptions_upsertSubscription from "../subscriptions/upsertSubscription.js";
import type * as sync_internal from "../sync/internal.js";
import type * as sync_woocommerce from "../sync/woocommerce.js";
import type * as sync_wordpress from "../sync/wordpress.js";
import type * as test_checkOrderPrices from "../test/checkOrderPrices.js";
import type * as test_checkReservationPrices from "../test/checkReservationPrices.js";
import type * as test_checkReservationTransform from "../test/checkReservationTransform.js";
import type * as users from "../users.js";
import type * as users_clerkSync from "../users/clerkSync.js";
import type * as users_getUserStats from "../users/getUserStats.js";
import type * as utils_priceCorrection from "../utils/priceCorrection.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "activity/getRecent": typeof activity_getRecent;
  "activity/getUserActivity": typeof activity_getUserActivity;
  "activity/logActivity": typeof activity_logActivity;
  "admin/cleanSubscriptions": typeof admin_cleanSubscriptions;
  "admin/verifySubscriptions": typeof admin_verifySubscriptions;
  audit: typeof audit;
  "auth/roles": typeof auth_roles;
  "beats/fetchFromWooCommerce": typeof beats_fetchFromWooCommerce;
  "beats/trackView": typeof beats_trackView;
  "beats/trending": typeof beats_trending;
  cartItems: typeof cartItems;
  "clerk/billing": typeof clerk_billing;
  "clerk/simpleWebhook": typeof clerk_simpleWebhook;
  "clerk/webhooks": typeof clerk_webhooks;
  crons: typeof crons;
  dashboard: typeof dashboard;
  data: typeof data;
  downloads: typeof downloads;
  "downloads/enriched": typeof downloads_enriched;
  "downloads/listDownloads": typeof downloads_listDownloads;
  "downloads/record": typeof downloads_record;
  emailVerifications: typeof emailVerifications;
  "favorites/add": typeof favorites_add;
  "favorites/getFavorites": typeof favorites_getFavorites;
  "favorites/remove": typeof favorites_remove;
  "favorites/restore": typeof favorites_restore;
  "favorites/serverFunctions": typeof favorites_serverFunctions;
  files: typeof files;
  "files/createFile": typeof files_createFile;
  "files/deleteFile": typeof files_deleteFile;
  "files/getFile": typeof files_getFile;
  "files/listFiles": typeof files_listFiles;
  "files/storage": typeof files_storage;
  "health/check": typeof health_check;
  http: typeof http;
  invoices: typeof invoices;
  "invoices/createInvoiceRecord": typeof invoices_createInvoiceRecord;
  "invoices/generateInvoiceNumber": typeof invoices_generateInvoiceNumber;
  "invoices/updateInvoiceUrl": typeof invoices_updateInvoiceUrl;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/dashboardConfig": typeof lib_dashboardConfig;
  "lib/dashboardValidation": typeof lib_dashboardValidation;
  "lib/statisticsCalculator": typeof lib_statisticsCalculator;
  "lib/validation": typeof lib_validation;
  licenses: typeof licenses;
  "migrations/archive/cleanOrders": typeof migrations_archive_cleanOrders;
  "migrations/archive/cleanupGenericDownloads": typeof migrations_archive_cleanupGenericDownloads;
  "migrations/archive/cleanupSupabase": typeof migrations_archive_cleanupSupabase;
  "migrations/archive/fixOrderPrices": typeof migrations_archive_fixOrderPrices;
  "migrations/archive/fixReservationPrices": typeof migrations_archive_fixReservationPrices;
  "migrations/archive/markSpecificFreeBeats": typeof migrations_archive_markSpecificFreeBeats;
  orders: typeof orders;
  "orders/confirmPayment": typeof orders_confirmPayment;
  "orders/getOrdersByEmail": typeof orders_getOrdersByEmail;
  "orders/listOrderItems": typeof orders_listOrderItems;
  "orders/listUserOrders": typeof orders_listUserOrders;
  "orders/reconciliation": typeof orders_reconciliation;
  "orders/updateOrder": typeof orders_updateOrder;
  passwordResets: typeof passwordResets;
  products: typeof products;
  "products/forYou": typeof products_forYou;
  "quotas/getUserQuotas": typeof quotas_getUserQuotas;
  "quotas/updateQuota": typeof quotas_updateQuota;
  rateLimits: typeof rateLimits;
  "reservations/checkAndSendReminders": typeof reservations_checkAndSendReminders;
  "reservations/checkAvailability": typeof reservations_checkAvailability;
  "reservations/createReservation": typeof reservations_createReservation;
  "reservations/getByDateRange": typeof reservations_getByDateRange;
  "reservations/getReservationById": typeof reservations_getReservationById;
  "reservations/index": typeof reservations_index;
  "reservations/listReservations": typeof reservations_listReservations;
  "reservations/reminderScheduler": typeof reservations_reminderScheduler;
  "reservations/sendAdminNotification": typeof reservations_sendAdminNotification;
  "reservations/sendPaymentConfirmation": typeof reservations_sendPaymentConfirmation;
  "reservations/sendReminderEmail": typeof reservations_sendReminderEmail;
  "reservations/sendStatusUpdateEmail": typeof reservations_sendStatusUpdateEmail;
  "reservations/updateReservationStatus": typeof reservations_updateReservationStatus;
  subscriptions: typeof subscriptions;
  "subscriptions/checkDownloadQuota": typeof subscriptions_checkDownloadQuota;
  "subscriptions/createOrUpdateFromClerk": typeof subscriptions_createOrUpdateFromClerk;
  "subscriptions/createSubscription": typeof subscriptions_createSubscription;
  "subscriptions/getCurrentSubscription": typeof subscriptions_getCurrentSubscription;
  "subscriptions/getSubscription": typeof subscriptions_getSubscription;
  "subscriptions/incrementDownloadUsage": typeof subscriptions_incrementDownloadUsage;
  "subscriptions/invoices": typeof subscriptions_invoices;
  "subscriptions/updateSubscription": typeof subscriptions_updateSubscription;
  "subscriptions/upsertSubscription": typeof subscriptions_upsertSubscription;
  "sync/internal": typeof sync_internal;
  "sync/woocommerce": typeof sync_woocommerce;
  "sync/wordpress": typeof sync_wordpress;
  "test/checkOrderPrices": typeof test_checkOrderPrices;
  "test/checkReservationPrices": typeof test_checkReservationPrices;
  "test/checkReservationTransform": typeof test_checkReservationTransform;
  users: typeof users;
  "users/clerkSync": typeof users_clerkSync;
  "users/getUserStats": typeof users_getUserStats;
  "utils/priceCorrection": typeof utils_priceCorrection;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
