import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserProfile } from "../../client/src/hooks/useUserProfile";

jest.mock("convex/react", () => {
  return {
    useQuery: jest.fn(() => ({ _id: "users:1", clerkId: "user_1", email: "a@b.com" })),
  } as any;
});

jest.mock("@clerk/clerk-react", () => {
  return {
    useUser: () => ({ user: { id: "user_1" } }),
  } as any;
});

describe("useUserProfile", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  const wrapper = ({ children }: any) => children;

  it("returns user profile", async () => {
    const { result } = renderHook(() => useUserProfile(), { wrapper });
    await waitFor(() => {
      expect(result.current?._id).toBeDefined();
    });
  });
});
