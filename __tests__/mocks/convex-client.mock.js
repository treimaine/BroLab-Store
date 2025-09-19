// Mock for Convex client
module.exports = {
  convex: {
    query: jest.fn(),
    mutation: jest.fn(),
    action: jest.fn(),
  },
};
