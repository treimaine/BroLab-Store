import { memStorage } from "../../server/storage";
import { ReservationStatus, ServiceType } from "../../shared/schema";

describe(_"Reservation System", _() => {
  // Use memStorage directly for tests and clear it between tests
  const storage = memStorage;

  beforeEach_(() => {
    // Clear all reservations before each test
    (storage as any).reservations.clear();
  });
  const mockReservation = {
    user_id: 1,
    service_type: "mixing" as (typeof ServiceType)[number],
    status: "pending" as (typeof ReservationStatus)[number],
    details: {
      name: "Test User",
      email: "test@example.com",
      phone: "1234567890",
      requirements: "Test Track - Hip-Hop genre",
    },
    preferred_date: new Date("2024-02-01T10:00:00Z").toISOString(),
    duration_minutes: 120,
    total_price: 9900,
    notes: "Test reservation",
  };

  describe(_"createReservation", _() => {
    it(_"should create a new reservation", _async () => {
      const reservation = await storage.createReservation(mockReservation);
      expect(reservation).toMatchObject({
        ...mockReservation,
        id: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });

  describe(_"getReservation", _() => {
    it(_"should retrieve a reservation by id", _async () => {
      const created = await storage.createReservation(mockReservation);
      const retrieved = await storage.getReservation(created.id);
      expect(retrieved).toEqual(created);
    });

    it(_"should return undefined for non-existent reservation", _async () => {
      const retrieved = await storage.getReservation("non-existent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe(_"getUserReservations", _() => {
    it(_"should retrieve all reservations for a user", _async () => {
      const reservation1 = await storage.createReservation(mockReservation);
      const reservation2 = await storage.createReservation({
        ...mockReservation,
        preferred_date: new Date("2024-02-02T10:00:00Z").toISOString(),
      });

      const userReservations = await storage.getUserReservations(mockReservation.user_id);
      expect(userReservations).toHaveLength(2);
      expect(userReservations).toEqual(expect.arrayContaining([reservation1, reservation2]));
    });

    it(_"should return empty array for user with no reservations", _async () => {
      const userReservations = await storage.getUserReservations(999);
      expect(userReservations).toEqual([]);
    });
  });

  describe(_"updateReservationStatus", _() => {
    it(_"should update reservation status", _async () => {
      const created = await storage.createReservation(mockReservation);
      const updated = await storage.updateReservationStatus(created.id, "confirmed");
      expect(updated).toMatchObject({
        ...created,
        status: "confirmed",
        updated_at: expect.any(String),
      });
    });

    it(_"should throw error for non-existent reservation", _async () => {
      await expect(storage.updateReservationStatus("non-existent-id", "confirmed")).rejects.toThrow(
        "Reservation not found"
      );
    });
  });

  describe(_"getReservationsByDateRange", _() => {
    beforeEach(_async () => {
      await storage.createReservation({
        ...mockReservation,
        preferred_date: new Date("2024-02-01T10:00:00Z").toISOString(),
      });
      await storage.createReservation({
        ...mockReservation,
        preferred_date: new Date("2024-02-15T10:00:00Z").toISOString(),
      });
      await storage.createReservation({
        ...mockReservation,
        preferred_date: new Date("2024-03-01T10:00:00Z").toISOString(),
      });
    });

    it(_"should retrieve reservations within date range", _async () => {
      const startDate = new Date("2024-02-01T00:00:00Z").toISOString();
      const endDate = new Date("2024-02-28T23:59:59Z").toISOString();
      const reservations = await storage.getReservationsByDateRange(startDate, endDate);
      expect(reservations).toHaveLength(2);
      reservations.forEach(reservation => {
        const date = new Date(reservation.preferred_date);
        expect(date >= new Date(startDate) && date <= new Date(endDate)).toBe(true);
      });
    });

    it(_"should return empty array for date range with no reservations", _async () => {
      const startDate = new Date("2025-01-01T00:00:00Z").toISOString();
      const endDate = new Date("2025-01-31T23:59:59Z").toISOString();
      const reservations = await storage.getReservationsByDateRange(startDate, endDate);
      expect(reservations).toEqual([]);
    });
  });
});
