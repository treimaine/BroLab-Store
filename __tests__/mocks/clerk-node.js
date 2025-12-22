// Mock pour @clerk/clerk-sdk-node (déprécié)
// Redirige vers @clerk/express et @clerk/backend
module.exports = {
  // Fonctions dépréciées - redirigent vers @clerk/express
  ClerkExpressWithAuth: () => (req, res, next) => next(),
  ClerkExpressRequireAuth: () => (req, res, next) => next(),
  // clerkClient est maintenant dans @clerk/backend
  clerkClient: {
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
      }),
    },
  },
};
