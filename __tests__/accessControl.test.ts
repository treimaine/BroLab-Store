import { isLicenseAllowedForUser, ProductLike } from "../server/lib/accessControl";
// __tests__/accessControl.test.ts

import { MockUser } from "./types/mocks";

describe("isLicenseAllowedForUser", () => {
  const makeUser = (props: Partial<MockUser> = {}): MockUser => ({
    id: 1,
    username: "test",
    email: "test@example.com",
    ...props,
  });

  it("autorise tout pour role=admin", () => {
    const user = makeUser({ role: "admin" });
    expect(isLicenseAllowedForUser(user, "basic")).toBe(true);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(true);
    expect(isLicenseAllowedForUser(user, "exclusive")).toBe(true);
  });

  it("autorise tout pour plan=ultimate", () => {
    const user = makeUser({ plan: "ultimate" });
    expect(isLicenseAllowedForUser(user, "basic")).toBe(true);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(true);
    expect(isLicenseAllowedForUser(user, "exclusive")).toBe(true);
  });

  it("plan=artist : basic/premium OK, exclusive KO", () => {
    const user = makeUser({ plan: "artist" });
    expect(isLicenseAllowedForUser(user, "basic")).toBe(true);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(true);
    expect(isLicenseAllowedForUser(user, "exclusive")).toBe(false);
  });

  it("plan=basic : uniquement basic OK", () => {
    const user = makeUser({ plan: "basic" });
    expect(isLicenseAllowedForUser(user, "basic")).toBe(true);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(false);
    expect(isLicenseAllowedForUser(user, "exclusive")).toBe(false);
  });

  it("product.isExclusive=true : KO sauf admin/ultimate", () => {
    const product: ProductLike = { id: 1, isExclusive: true };
    expect(isLicenseAllowedForUser(makeUser({ plan: "artist" }), "basic", product)).toBe(false);
    expect(isLicenseAllowedForUser(makeUser({ plan: "basic" }), "basic", product)).toBe(false);
    expect(isLicenseAllowedForUser(makeUser({ plan: "ultimate" }), "basic", product)).toBe(true);
    expect(isLicenseAllowedForUser(makeUser({ role: "admin" }), "basic", product)).toBe(true);
  });

  it("trialActive=true : basic OK même sans plan", () => {
    const user = makeUser({ trialActive: true });
    expect(isLicenseAllowedForUser(user, "basic")).toBe(true);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(false);
  });

  it("fallback : refuse tout", () => {
    const user = makeUser({});
    expect(isLicenseAllowedForUser(user, "basic")).toBe(false);
    expect(isLicenseAllowedForUser(user, "premium")).toBe(false);
    expect(isLicenseAllowedForUser(user, "exclusive")).toBe(false);
  });
});
