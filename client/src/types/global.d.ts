declare global {
  interface Window {
    cartManager?: { addItem: (item: any) => void };
    ApplePaySession?: any;
    google?: any;
  }
}
export { };

