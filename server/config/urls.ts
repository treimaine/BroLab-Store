export const CLIENT_BASE_URL = process.env.CLIENT_URL || "https://brolabentertainment.com";
export const SERVER_BASE_URL = process.env.SERVER_URL || "https://brolabentertainment.com";

export const urls = {
  checkoutSuccess: (sessionId?: string): string => {
    const sessionParam = sessionId ? `?session_id=${sessionId}` : "";
    return `${CLIENT_BASE_URL}/checkout-success${sessionParam}`;
  },
  cart: `${CLIENT_BASE_URL}/cart`,
  paypal: {
    captureBase: `${SERVER_BASE_URL}/api/paypal/capture`,
    success: (token: string, payerId?: string | string[]): string => {
      const payerParam = payerId ? `&PayerID=${payerId}` : "";
      return `${CLIENT_BASE_URL}/payment/success?token=${token}${payerParam}`;
    },
    error: (code: string, token?: string): string => {
      const tokenParam = token ? `&token=${token}` : "";
      return `${CLIENT_BASE_URL}/payment/error?error=${code}${tokenParam}`;
    },
    cancel: `${CLIENT_BASE_URL}/payment/cancel`,
  },
  genericCheckout: (reservationId: string, amount: number, currency: string): string =>
    `${CLIENT_BASE_URL}/checkout?reservation=${reservationId}&amount=${amount}&currency=${currency}`,
};
