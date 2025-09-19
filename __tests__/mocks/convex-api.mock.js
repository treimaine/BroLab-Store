// Mock for Convex API
module.exports = {
  api: {
    favorites: {
      list: "favorites:list",
      add: "favorites:add",
      remove: "favorites:remove",
    },
    users: {
      get: "users:get",
      update: "users:update",
    },
    orders: {
      list: "orders:list",
      create: "orders:create",
    },
    reservations: {
      list: "reservations:list",
      create: "reservations:create",
      update: "reservations:update",
    },
  },
};
