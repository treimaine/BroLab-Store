import { describe, expect, test } from "@jest/globals";
import { UserRole } from "../../shared/validation/UserValidation";

describe("User Validation Tests", () => {
  test("should accept valid user roles", () => {
    expect(() => UserRole.parse("user")).not.toThrow();
    expect(() => UserRole.parse("producer")).not.toThrow();
    expect(() => UserRole.parse("admin")).not.toThrow();
  });

  test("should reject invalid user roles", () => {
    expect(() => UserRole.parse("invalid")).toThrow();
    expect(() => UserRole.parse("")).toThrow();
  });
});
