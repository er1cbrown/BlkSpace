import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import {
  IS_TAURI,
  useAppListPosts,
  useAppGetUser,
  useAppGetNetworkStats,
} from "@/hooks/use-app-data";

// Mock the Tauri API
vi.mock("@/lib/tauri-api", () => ({
  isTauri: () => false,
  tauriListPosts: () => Promise.resolve([]),
  tauriGetUser: () => Promise.resolve(null),
  tauriGetNetworkStats: () =>
    Promise.resolve({
      totalUsers: 100,
      totalRelays: 5,
      onlineRelays: 3,
      activeTowns: 10,
      weixBucksInCirculation: 50000,
      eventsLast24h: 1200,
    }),
  tauriGetRecentActivity: () => Promise.resolve([]),
  tauriListRelays: () => Promise.resolve([]),
  tauriGetRelayStatuses: () => Promise.resolve([]),
  tauriListRelayConnections: () => Promise.resolve([]),
  tauriGetRelayNetworkStats: () =>
    Promise.resolve({
      totalUsers: 100,
      totalRelays: 5,
      onlineRelays: 3,
      activeTowns: 10,
      weixBucksInCirculation: 50000,
      eventsLast24h: 1200,
    }),
  tauriGetCommunities: () => Promise.resolve([]),
  tauriListUsers: () => Promise.resolve([]),
  tauriGetNotifications: () => Promise.resolve([]),
  tauriGetWalletTx: () => Promise.resolve([]),
  tauriSendWeixBucks: () => Promise.resolve([0, 0]),
  tauriCreatePost: () =>
    Promise.resolve({
      post: { id: 1, authorHandle: "test", content: "hi", townTag: "tsu" },
      earn: { wb: 5, wbNominal: 5, karmaPost: 3, karmaComment: 0, throttled: false, dailyCapLimited: false },
    }),
  tauriToggleLike: () =>
    Promise.resolve({
      liked: true,
      authorHandle: "author",
      authorEarn: {
        wb: 1,
        wbNominal: 1,
        karmaPost: 1,
        karmaComment: 0,
        throttled: false,
        dailyCapLimited: false,
      },
    }),
  tauriCreateReply: () =>
    Promise.resolve({
      reply: { id: 1, postId: 1, authorHandle: "test", content: "reply" },
      earn: { wb: 2, wbNominal: 2, karmaPost: 0, karmaComment: 2, throttled: false, dailyCapLimited: false },
    }),
  tauriListReplies: () => Promise.resolve([]),
  tauriGetTrendingFeed: () => Promise.resolve([]),
  tauriGetPost: () => Promise.resolve(null),
  tauriGetUserPosts: () => Promise.resolve([]),
  tauriStoreKey: () => Promise.resolve(),
  tauriGetKey: () => Promise.resolve(null),
  tauriHasKey: () => Promise.resolve(false),
  tauriGetChallenge: () => Promise.resolve(""),
  tauriLogin: () => Promise.resolve(""),
  tauriLogout: () => Promise.resolve(),
  tauriVerifySession: () => Promise.resolve(""),
  tauriUploadBlob: () => Promise.resolve({}),
  tauriGetBlobBytes: () => Promise.resolve(null),
  tauriListUserBlobs: () => Promise.resolve([]),
  tauriDeleteBlob: () => Promise.resolve(),
  tauriGetBlobMetadata: () => Promise.resolve(null),
  tauriLinkPubkey: () => Promise.resolve(""),
  tauriConnectToRelay: () => Promise.resolve(""),
  tauriDisconnectFromRelay: () => Promise.resolve(""),
  tauriSyncTownEvents: () => Promise.resolve([]),
  tauriListRelayEvents: () => Promise.resolve([]),
  tauriSubscribeToTown: () => Promise.resolve(),
  tauriUnsubscribeFromTown: () => Promise.resolve(),
  tauriListSubscribedTowns: () => Promise.resolve([]),
  tauriListCombinedFeed: () => Promise.resolve([]),
  tauriPublishRelayList: () => Promise.resolve(""),
  tauriFetchUserRelayList: () => Promise.resolve([]),
  tauriAnnounceBlob: () => Promise.resolve(""),
  tauriConnectToDefaultRelays: () => Promise.resolve([]),
  tauriCheckRelayHealth: () => Promise.resolve({ connected: false }),
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

  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

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
    it("useAppListPosts returns posts in web mode", async () => {
      const { result } = renderHook(() => useAppListPosts("tsu", "demo_user"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.isLoading).toBe(false);
    });

    it("useAppGetUser returns user data in web mode", async () => {
      const { result } = renderHook(() => useAppGetUser("demo_user"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.isLoading).toBe(false);
    });

    it("useAppGetNetworkStats returns stats in web mode", async () => {
      const { result } = renderHook(() => useAppGetNetworkStats(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.isLoading).toBe(false);
    });
  });
});
