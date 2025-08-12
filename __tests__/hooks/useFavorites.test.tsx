import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../../client/src/hooks/useFavorites";

jest.mock("convex/react", () => {
  return {
    useQuery: jest.fn(() => []),
    useMutation: jest.fn(() => jest.fn()),
  } as any;
});

describe("useFavorites", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("returns favorites array", async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => {
      expect(Array.isArray(result.current.favorites)).toBe(true);
    });
  });

  it("supports add/remove", async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await result.current.addToFavorites(1);
    await result.current.removeFromFavorites(1);
    expect(typeof result.current.isAdding).toBe("boolean");
    expect(typeof result.current.isRemoving).toBe("boolean");
  });
});
