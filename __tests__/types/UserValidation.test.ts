import { describe, expect, test } from "@jest/globals";
import { UserRole } from "../../shared/validation/UserValidation";

describe(_"User Validation Tests", _() => {
  test(_"should accept valid user roles", _() => {
    expect_(() => UserRole.parse("user")).not.toThrow();
    expect_(() => UserRole.parse("producer")).not.toThrow();
    expect_(() => UserRole.parse("admin")).not.toThrow();
  });

  test(_"should reject invalid user roles", _() => {
    expect_(() => UserRole.parse("invalid")).toThrow();
    expect_(() => UserRole.parse("")).toThrow();
  });
});
