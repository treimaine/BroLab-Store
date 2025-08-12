module.exports = {
  ClerkExpressWithAuth: () => (req, res, next) => next(),
  requireAuth: () => (req, res, next) => next(),
};
