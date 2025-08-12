declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments(): boolean;
      new(version: number, paymentRequest: any): any;
      STATUS_SUCCESS: number;
      STATUS_FAILURE: number;
      STATUS_INVALID_BILLING_POSTAL_ADDRESS: number;
      STATUS_INVALID_SHIPPING_POSTAL_ADDRESS: number;
      STATUS_INVALID_SHIPPING_CONTACT: number;
      STATUS_PIN_REQUIRED: number;
      STATUS_PIN_INCORRECT: number;
      STATUS_PIN_LOCKOUT: number;
    };
    google?: {
      pay?: {
        api?: {
          PaymentsClient: new(options: any) => any;
        };
      };
    };
  }
}

export {};

