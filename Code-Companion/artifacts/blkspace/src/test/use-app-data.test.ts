import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { IS_TAURI } from "@/hooks/use-app-data";

// Mock the Tauri API
vi.mock("@/lib/tauri-api", () => ({
  isTauri: () => false,
}));

// Mock the API client
vi.mock("@workspace/api-client-react", () => ({
  useListPosts: () => ({
    data: [
      {
        id: 1,
        authorHandle: "demo_user",
        authorDisplayName: "Demo User",
        content: "Test post",
        townTag: "tsu",
        likesCount: 5,
        repliesCount: 2,
        createdAt: "2026-06-15T12:00:00Z",
      },
    ],
    isLoading: false,
  }),
  getListPostsQueryKey: () => ["posts", "tsu"],
  useGetUser: () => ({
    data: {
      handle: "demo_user",
      displayName: "Demo User",
      weixBucks: 1000,
    },
    isLoading: false,
  }),
  getGetUserQueryKey: () => ["user", "demo_user"],
  useGetTrendingFeed: () => ({
    data: [],
    isLoading: false,
  }),
  getGetTrendingFeedQueryKey: () => ["trending"],
  useGetPost: () => ({
    data: null,
    isLoading: false,
  }),
  getGetPostQueryKey: () => ["post", 1],
  useGetUserPosts: () => ({
    data: [],
    isLoading: false,
  }),
  getGetUserPostsQueryKey: () => ["userPosts", "demo_user"],
  useListReplies: () => ({
    data: [],
    isLoading: false,
  }),
  getListRepliesQueryKey: () => ["replies", 1],
  useCreatePost: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useLikePost: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUnlikePost: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateReply: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useListRelays: () => ({
    data: [],
    isLoading: false,
  }),
  getListRelaysQueryKey: () => ["relays"],
  useGetNetworkStats: () => ({
    data: {
      totalUsers: 100,
      totalRelays: 5,
      onlineRelays: 3,
    },
    isLoading: false,
  }),
  getGetNetworkStatsQueryKey: () => ["networkStats"],
  useGetRecentActivity: () => ({
    data: [],
    isLoading: false,
  }),
  getGetRecentActivityQueryKey: () => ["activity"],
}));

describe("use-app-data hooks", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe("IS_TAURI constant", () => {
    it("should be false in test environment", () => {
      expect(IS_TAURI).toBe(false);
    });
  });

  describe("Web mode hooks", () => {
    it("useAppListPosts returns posts in web mode", () => {
      const { useAppListPosts } = require("@/hooks/use-app-data");
      const { result } = renderHook(() => useAppListPosts("tsu", "demo_user"), {
        wrapper,
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it("useAppGetUser returns user data in web mode", () => {
      const { useAppGetUser } = require("@/hooks/use-app-data");
      const { result } = renderHook(() => useAppGetUser("demo_user"), {
        wrapper,
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it("useAppGetNetworkStats returns stats in web mode", () => {
      const { useAppGetNetworkStats } = require("@/hooks/use-app-data");
      const { result } = renderHook(() => useAppGetNetworkStats(), {
        wrapper,
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });
});