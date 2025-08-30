export const CLIENT_BASE_URL = process.env.CLIENT_URL || "https://brolabentertainment.com";
export const SERVER_BASE_URL = process.env.SERVER_URL || "https://brolabentertainment.com";

export const urls = {
  checkoutSuccess: (sessionId?: string) =>
    `${CLIENT_BASE_URL}/checkout-success${sessionId ? `?session_id=${sessionId}` : ""}`,
  cart: `${CLIENT_BASE_URL}/cart`,
  paypal: {
    captureBase: `${SERVER_BASE_URL}/api/paypal/capture`,
    success: (token: string, payerId?: string | string[]) =>
      `${CLIENT_BASE_URL}/payment/success?token=${token}${payerId ? `&PayerID=${payerId}` : ""}`,
    error: (code: string, token?: string) =>
      `${CLIENT_BASE_URL}/payment/error?error=${code}${token ? `&token=${token}` : ""}`,
    cancel: `${CLIENT_BASE_URL}/payment/cancel`,
  },
  genericCheckout: (reservationId: string, amount: number, currency: string) =>
    `${CLIENT_BASE_URL}/checkout?reservation=${reservationId}&amount=${amount}&currency=${currency}`,
};
