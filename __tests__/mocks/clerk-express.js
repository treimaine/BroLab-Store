module.exports = {
  ClerkExpressWithAuth: () => (req, res, next) => next(),
  requireAuth: () => (req, res, next) => next(),
  clerkMiddleware: () => (req, res, next) => {
    req.auth = req.auth || { userId: undefined, sessionId: undefined, sessionClaims: undefined };
    next();
  },
  getAuth: () => ({ userId: undefined, sessionId: undefined, sessionClaims: undefined }),
};
