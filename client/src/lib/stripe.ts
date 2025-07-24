import { loadStripe } from '@stripe/stripe-js';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);