import { ApplePayPaymentRequest, GooglePayPaymentRequest } from "../../../shared/types/api";

declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments(): boolean;
      new (version: number, paymentRequest: ApplePayPaymentRequest): ApplePaySession;
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
          PaymentsClient: new (options: GooglePayClientOptions) => GooglePayClient;
        };
      };
    };
    gtag?: (
      command: "config" | "event" | "js" | "set",
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
  }

  interface ApplePaySession {
    begin(): void;
    abort(): void;
    completeMerchantValidation(merchantSession: ApplePayMerchantSession): void;
    completeShippingMethodSelection(update: ApplePayShippingMethodUpdate): void;
    completeShippingContactSelection(update: ApplePayShippingContactUpdate): void;
    completePaymentMethodSelection(update: ApplePayPaymentMethodUpdate): void;
    completePayment(result: ApplePayPaymentAuthorizationResult): void;

    onvalidatemerchant?: (event: ApplePayValidateMerchantEvent) => void;
    onpaymentmethodselected?: (event: ApplePayPaymentMethodSelectedEvent) => void;
    onshippingcontactselected?: (event: ApplePayShippingContactSelectedEvent) => void;
    onshippingmethodselected?: (event: ApplePayShippingMethodSelectedEvent) => void;
    onpaymentauthorized?: (event: ApplePayPaymentAuthorizedEvent) => void;
    oncancel?: (event: Event) => void;
  }

  interface GooglePayClient {
    isReadyToPay(request: GooglePayIsReadyToPayRequest): Promise<GooglePayIsReadyToPayResponse>;
    loadPaymentData(request: GooglePayPaymentRequest): Promise<GooglePayPaymentData>;
    createButton(options: GooglePayButtonOptions): HTMLElement;
  }

  interface GooglePayClientOptions {
    environment: "TEST" | "PRODUCTION";
    merchantInfo?: {
      merchantName: string;
      merchantId?: string;
    };
  }

  interface GooglePayIsReadyToPayRequest {
    apiVersion: number;
    apiVersionMinor: number;
    allowedPaymentMethods: GooglePayPaymentMethodSpecification[];
  }

  interface GooglePayIsReadyToPayResponse {
    result: boolean;
    paymentMethodPresent?: boolean;
  }

  interface GooglePayPaymentMethodSpecification {
    type: string;
    parameters?: Record<string, unknown>;
  }

  interface GooglePayPaymentData {
    apiVersion: number;
    apiVersionMinor: number;
    paymentMethodData: GooglePayPaymentMethodData;
    email?: string;
    shippingAddress?: GooglePayAddress;
  }

  interface GooglePayPaymentMethodData {
    type: string;
    description: string;
    info: GooglePayPaymentMethodInfo;
    tokenizationData: GooglePayTokenizationData;
  }

  interface GooglePayPaymentMethodInfo {
    cardNetwork: string;
    cardDetails: string;
    billingAddress?: GooglePayAddress;
  }

  interface GooglePayTokenizationData {
    type: string;
    token: string;
  }

  interface GooglePayAddress {
    name: string;
    address1: string;
    address2?: string;
    address3?: string;
    locality: string;
    administrativeArea: string;
    countryCode: string;
    postalCode: string;
  }

  interface GooglePayButtonOptions {
    onClick: () => void;
    allowedPaymentMethods: GooglePayPaymentMethodSpecification[];
    buttonColor?: "default" | "black" | "white";
    buttonType?: "book" | "buy" | "checkout" | "donate" | "order" | "pay" | "plain" | "subscribe";
    buttonSizeMode?: "static" | "fill";
  }

  // Apple Pay specific interfaces
  interface ApplePayMerchantSession {
    epochTimestamp: number;
    expiresAt: number;
    merchantSessionIdentifier: string;
    nonce: string;
    merchantIdentifier: string;
    domainName: string;
    displayName: string;
    signature: string;
  }

  interface ApplePayShippingMethodUpdate {
    newTotal: ApplePayLineItem;
    newLineItems?: ApplePayLineItem[];
    newShippingMethods?: ApplePayShippingMethod[];
  }

  interface ApplePayShippingContactUpdate {
    newTotal: ApplePayLineItem;
    newLineItems?: ApplePayLineItem[];
    newShippingMethods?: ApplePayShippingMethod[];
    errors?: ApplePayError[];
  }

  interface ApplePayPaymentMethodUpdate {
    newTotal: ApplePayLineItem;
    newLineItems?: ApplePayLineItem[];
  }

  interface ApplePayPaymentAuthorizationResult {
    status: number;
    errors?: ApplePayError[];
  }

  interface ApplePayValidateMerchantEvent extends Event {
    validationURL: string;
  }

  interface ApplePayPaymentMethodSelectedEvent extends Event {
    paymentMethod: ApplePayPaymentMethod;
  }

  interface ApplePayShippingContactSelectedEvent extends Event {
    shippingContact: ApplePayPaymentContact;
  }

  interface ApplePayShippingMethodSelectedEvent extends Event {
    shippingMethod: ApplePayShippingMethod;
  }

  interface ApplePayPaymentAuthorizedEvent extends Event {
    payment: ApplePayPayment;
  }

  interface ApplePayPaymentMethod {
    displayName: string;
    network: string;
    type: string;
    paymentPass?: ApplePayPaymentPass;
    billingContact?: ApplePayPaymentContact;
  }

  interface ApplePayPaymentPass {
    primaryAccountIdentifier: string;
    primaryAccountNumberSuffix: string;
    deviceAccountIdentifier?: string;
    deviceAccountNumberSuffix?: string;
    activationState: string;
  }

  interface ApplePayPaymentContact {
    phoneNumber?: string;
    emailAddress?: string;
    givenName?: string;
    familyName?: string;
    phoneticGivenName?: string;
    phoneticFamilyName?: string;
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    countryCode?: string;
    country?: string;
  }

  interface ApplePayPayment {
    token: ApplePayPaymentToken;
    billingContact?: ApplePayPaymentContact;
    shippingContact?: ApplePayPaymentContact;
  }

  interface ApplePayPaymentToken {
    paymentMethod: ApplePayPaymentMethod;
    transactionIdentifier: string;
    paymentData: Record<string, unknown>;
  }

  interface ApplePayError {
    code: string;
    contactField?: string;
    message: string;
  }

  interface ApplePayLineItem {
    label: string;
    amount: string;
    type?: "final" | "pending";
  }

  interface ApplePayShippingMethod {
    label: string;
    detail: string;
    amount: string;
    identifier: string;
  }
}

export {};
