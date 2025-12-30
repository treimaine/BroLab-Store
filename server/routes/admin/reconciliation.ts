/**
 * Admin Reconciliation Routes
 *
 * Provides endpoints for:
 * - Resyncing orders by sessionId or paymentIntentId
 * - Running batch reconciliation for pending orders
 * - Checking subscription sync status
 *
 * @module server/routes/admin/reconciliation
 */

import { Request, Response, Router } from "express";
import { randomUUID } from "node:crypto";
import { getReconciliationService } from "../../services/ReconciliationService";
import { PaymentErrorCode, createErrorResponse } from "../../utils/errorHandling";

const router = Router();

/**
 * Resync order by Stripe checkout session ID
 * POST /api/admin/reconciliation/order/session/:sessionId
 */
router.post("/order/session/:sessionId", async (req: Request, res: Response): Promise<void> => {
  const requestId = randomUUID();
  const { sessionId } = req.params;

  try {
    console.log(`🔄 [${requestId}] Admin resync order by session: ${sessionId}`);

    if (!sessionId) {
      res
        .status(400)
        .json(
          createErrorResponse(
            "Missing sessionId",
            "VALIDATION_ERROR",
            "Session ID is required",
            requestId
          )
        );
      return;
    }

    const reconciliationService = getReconciliationService();
    const result = await reconciliationService.resyncOrderBySessionId(sessionId);

    res.status(result.success ? 200 : 400).json({
      ...result,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error resyncing order:`, error);
    res
      .status(500)
      .json(
        createErrorResponse(
          "Reconciliation failed",
          PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
          error instanceof Error ? error.message : String(error),
          requestId
        )
      );
  }
});

/**
 * Resync order by Stripe payment intent ID
 * POST /api/admin/reconciliation/order/payment-intent/:paymentIntentId
 */
router.post(
  "/order/payment-intent/:paymentIntentId",
  async (req: Request, res: Response): Promise<void> => {
    const requestId = randomUUID();
    const { paymentIntentId } = req.params;

    try {
      console.log(`🔄 [${requestId}] Admin resync order by payment intent: ${paymentIntentId}`);

      if (!paymentIntentId) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Missing paymentIntentId",
              "VALIDATION_ERROR",
              "Payment Intent ID is required",
              requestId
            )
          );
        return;
      }

      const reconciliationService = getReconciliationService();
      const result = await reconciliationService.resyncOrderByPaymentIntentId(paymentIntentId);

      res.status(result.success ? 200 : 400).json({
        ...result,
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ [${requestId}] Error resyncing order:`, error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "Reconciliation failed",
            PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
            error instanceof Error ? error.message : String(error),
            requestId
          )
        );
    }
  }
);

/**
 * Run batch reconciliation for all pending orders
 * POST /api/admin/reconciliation/orders/pending
 */
router.post("/orders/pending", async (_req: Request, res: Response): Promise<void> => {
  const requestId = randomUUID();

  try {
    console.log(`🔄 [${requestId}] Admin batch reconciliation for pending orders`);

    const reconciliationService = getReconciliationService();
    const summary = await reconciliationService.reconcilePendingOrders();

    res.status(200).json({
      success: summary.failed === 0,
      summary,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Error during batch reconciliation:`, error);
    res
      .status(500)
      .json(
        createErrorResponse(
          "Batch reconciliation failed",
          PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
          error instanceof Error ? error.message : String(error),
          requestId
        )
      );
  }
});

/**
 * Check subscription sync status
 * GET /api/admin/reconciliation/subscription/:clerkSubscriptionId
 */
router.get(
  "/subscription/:clerkSubscriptionId",
  async (req: Request, res: Response): Promise<void> => {
    const requestId = randomUUID();
    const { clerkSubscriptionId } = req.params;

    try {
      console.log(`🔍 [${requestId}] Checking subscription sync: ${clerkSubscriptionId}`);

      if (!clerkSubscriptionId) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Missing clerkSubscriptionId",
              "VALIDATION_ERROR",
              "Clerk Subscription ID is required",
              requestId
            )
          );
        return;
      }

      const reconciliationService = getReconciliationService();
      const result = await reconciliationService.checkSubscriptionSyncStatus(clerkSubscriptionId);

      res.status(200).json({
        ...result,
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ [${requestId}] Error checking subscription sync:`, error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "Sync check failed",
            PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
            error instanceof Error ? error.message : String(error),
            requestId
          )
        );
    }
  }
);

export default router;
