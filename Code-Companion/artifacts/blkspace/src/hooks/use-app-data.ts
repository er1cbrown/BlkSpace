import { useEffect } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useListPosts,
  getListPostsQueryKey,
  useGetTrendingFeed,
  getGetTrendingFeedQueryKey,
  useGetPost,
  getGetPostQueryKey,
  useListReplies,
  getListRepliesQueryKey,
  useGetUser,
  getGetUserQueryKey,
  useGetUserPosts,
  getGetUserPostsQueryKey,
  useListRelays,
  getListRelaysQueryKey,
  useGetNetworkStats,
  getGetNetworkStatsQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import * as tauri from "@/lib/tauri-api";
import { getSessionToken, getCurrentHandle } from "@/lib/auth";
import { getSeedPosts } from "@/lib/seed-content";
import { listWebNotifications } from "@/lib/project-connect";
import {
  createWebReply,
  listWebReplies,
  listWebUserPosts,
  refreshPortfolioFromTurso,
} from "@/lib/web-posts";
import {
  applyLikesToPosts,
  buildWebUser,
  createInteractivePost,
  getFollowing,
  isWebYardMember,
  joinWebYard,
  listInteractiveFeed,
  listInteractiveUserPosts,
  toggleWebFollow,
  toggleWebLike,
  toggleWebRepost,
} from "@/lib/web-userspace";

export const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const MOCK_POSTS = getSeedPosts();

function getMockPosts(town?: string) {
  // User posts + seed + live like state (browser userspace)
  return listInteractiveFeed(town);
}

function getMockUser(handle: string) {
  return buildWebUser(handle);
}

// ─── Users ───────────────────────────────────────────────

export function useAppGetUser(handle: string, enabled = true) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "user", handle],
    queryFn: () => tauri.tauriGetUser(handle),
    enabled: IS_TAURI && !!handle && enabled,
  });
  const webResult = useQuery({
    queryKey: ["web", "user", handle],
    queryFn: () => Promise.resolve(getMockUser(handle)),
    enabled: !IS_TAURI && !!handle && enabled,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

// ─── Posts ───────────────────────────────────────────────

export const FEED_PAGE_SIZE = 20;

export function useAppListPosts(
  town: string,
  currentUser: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const syncTown = town === "all" ? undefined : town;
  const cloudSync = useQuery({
    queryKey: ["tauri", "portfolio-sync", town],
    queryFn: async () => {
      const token = getSessionToken();
      if (!token) {
        return {
          pulled: 0,
          cached: 0,
          pushed: 0,
          failed: 0,
          pending: 0,
          disabled: true,
        };
      }
      try {
        return await tauri.tauriSyncPortfolioOnce(token, syncTown);
      } catch {
        // Hosted sync is best-effort; the local/offline feed remains usable.
        return {
          pulled: 0,
          cached: 0,
          pushed: 0,
          failed: 0,
          pending: 0,
          disabled: true,
        };
      }
    },
    enabled: IS_TAURI && enabled,
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const hostedPosts = useQuery({
    queryKey: ["tauri", "hosted-posts", syncTown || "all"],
    queryFn: () => tauri.tauriListHostedPosts(syncTown, 100),
    enabled: IS_TAURI && enabled,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (cloudSync.data?.pulled || cloudSync.data?.cached) {
      queryClient.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
      queryClient.invalidateQueries({ queryKey: ["tauri", "posts"] });
    }
  }, [cloudSync.data?.cached, cloudSync.data?.pulled, queryClient]);

  const tauriInfinite = useInfiniteQuery({
    queryKey: ["tauri", "posts", town, currentUser],
    queryFn: ({ pageParam }) =>
      tauri.tauriListPosts(
        town,
        currentUser,
        FEED_PAGE_SIZE,
        pageParam as number | undefined,
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.posts.length > 0
        ? lastPage.posts[lastPage.posts.length - 1]!.id
        : undefined,
    enabled: IS_TAURI && enabled,
  });
  const webResult = useQuery({
    queryKey: ["web", "posts", town],
    queryFn: async () => {
      await refreshPortfolioFromTurso();
      return getMockPosts(town);
    },
    enabled: !IS_TAURI && enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5_000,
  });

  if (IS_TAURI) {
    const local = tauriInfinite.data?.pages.flatMap((page) => page.posts) ?? [];
    const merged = [...local, ...(hostedPosts.data ?? [])]
      .filter(
        (post, index, all) =>
          all.findIndex((candidate) => candidate.id === post.id) === index,
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    return {
      data: merged.length ? merged : undefined,
      isLoading: tauriInfinite.isLoading || hostedPosts.isLoading,
      isFetchingNextPage: tauriInfinite.isFetchingNextPage,
      fetchNextPage: tauriInfinite.fetchNextPage,
      hasNextPage: tauriInfinite.hasNextPage ?? false,
    };
  }

  return {
    data: webResult.data,
    isLoading: webResult.isLoading,
    isFetchingNextPage: false,
    // Browser branch has no cursor pagination, so this shim is a genuine no-op
    // rather than a swallowed error. It exists only to match the Tauri
    // infinite-query shape callers already destructure.
    // eslint-disable-next-line no-empty-function
    fetchNextPage: async () => {},
    hasNextPage: false,
  };
}

export function useAppGetTrendingFeed(currentUser: string, enabled = true) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "trending", currentUser],
    queryFn: () => tauri.tauriGetTrendingFeed(currentUser),
    enabled: IS_TAURI && enabled,
  });
  const webResult = useQuery({
    queryKey: ["web", "trending"],
    queryFn: () => Promise.resolve(getMockPosts()),
    enabled: !IS_TAURI && enabled,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

function getMockPost(id: number) {
  return (
    listWebUserPosts().find((post) => post.id === id) ||
    MOCK_POSTS.find((post) => post.id === id) ||
    MOCK_POSTS[0]
  );
}

function getMockReplies(_postId: number) {
  const localReplies = listWebReplies(_postId);
  if (localReplies.length > 0) return localReplies;
  if (listWebUserPosts().some((post) => post.id === _postId)) return [];
  return [
    {
      id: 101,
      postId: _postId,
      authorHandle: "jane_doe",
      authorDisplayName: "Jane Doe",
      authorAvatarUrl: "",
      content: "Welcome! You're gonna love it here 🔥",
      createdAt: "2026-06-14T09:15:00Z",
    },
    {
      id: 102,
      postId: _postId,
      authorHandle: "campus_king",
      authorDisplayName: "Campus King",
      authorAvatarUrl: "",
      content: "Ayyy what's good! Welcome to the yard!",
      createdAt: "2026-06-14T09:20:00Z",
    },
  ];
}

const MOCK_RELAYS = [
  {
    id: 1,
    name: "TSU Stray Relay",
    university: "Tennessee State",
    town: "tsu",
    status: "online",
    uptimePercent: 99,
    connectedPeers: 42,
    eventsPerHour: 128,
  },
  {
    id: 2,
    name: "Howard Hub",
    university: "Howard",
    town: "howard",
    status: "online",
    uptimePercent: 97,
    connectedPeers: 67,
    eventsPerHour: 203,
  },
];

const MOCK_NETWORK = {
  onlineRelays: 12,
  totalRelays: 18,
  totalUsers: 1240,
  activeTowns: 7,
  weixBucksInCirculation: 89200,
  eventsLast24h: 14560,
};

export function useAppGetPost(id: number, currentUser: string) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "post", id, currentUser],
    queryFn: () =>
      id < 0
        ? tauri.tauriGetHostedPost(id)
        : tauri.tauriGetPost(id, currentUser),
    enabled: IS_TAURI && !!id,
  });
  const webResult = useQuery({
    queryKey: ["web", "post", id],
    queryFn: () => Promise.resolve(getMockPost(id)),
    enabled: !IS_TAURI && !!id,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

export function useAppGetUserPosts(handle: string, currentUser: string) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "userPosts", handle, currentUser],
    queryFn: async () => {
      const local = await tauri.tauriGetUserPosts(handle, currentUser);
      const hosted = await tauri.tauriListHostedPosts(undefined, 100);
      return [
        ...local,
        ...hosted.filter((post) => post.authorHandle === handle),
      ].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    },
    enabled: IS_TAURI && !!handle,
  });
  const webResult = useQuery({
    queryKey: ["web", "userPosts", handle],
    queryFn: () => Promise.resolve(listInteractiveUserPosts(handle)),
    enabled: !IS_TAURI && !!handle,
    staleTime: 0,
    refetchOnMount: true,
  });
  return IS_TAURI ? tauriResult : webResult;
}

// ─── Replies ─────────────────────────────────────────────

export function useAppListReplies(postId: number) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "replies", postId],
    queryFn: async () => {
      if (postId < 0) {
        const hosted = await tauri.tauriListHostedReplies(postId);
        return hosted.map((reply) => ({
          id: reply.replyUid,
          replyUid: reply.replyUid,
          postId,
          authorHandle: reply.authorHandle,
          authorDisplayName: reply.authorHandle,
          authorAvatarUrl: "",
          content: reply.content,
          createdAt: reply.createdAt,
        }));
      }
      return tauri.tauriListReplies(postId);
    },
    enabled: IS_TAURI && !!postId,
  });
  const webResult = useQuery({
    queryKey: ["web", "replies", postId],
    queryFn: () => Promise.resolve(getMockReplies(postId)),
    enabled: !IS_TAURI && !!postId,
    staleTime: 0,
    refetchOnMount: true,
  });
  return IS_TAURI ? tauriResult : webResult;
}

// ─── Relays / Network ────────────────────────────────────

export function useAppListRelays() {
  const tauriResult = useQuery({
    queryKey: ["tauri", "relays"],
    queryFn: tauri.tauriListRelays,
    enabled: IS_TAURI,
  });
  const webResult = useQuery({
    queryKey: ["web", "relays"],
    queryFn: () => Promise.resolve(MOCK_RELAYS),
    enabled: !IS_TAURI,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

export function useAppGetNetworkStats() {
  const tauriResult = useQuery({
    queryKey: ["tauri", "networkStats"],
    queryFn: tauri.tauriGetNetworkStats,
    enabled: IS_TAURI,
  });
  const webResult = useQuery({
    queryKey: ["web", "networkStats"],
    queryFn: () => Promise.resolve(MOCK_NETWORK),
    enabled: !IS_TAURI,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

export function useAppGetRecentActivity() {
  const tauriResult = useQuery({
    queryKey: ["tauri", "activity"],
    queryFn: tauri.tauriGetRecentActivity,
    enabled: IS_TAURI,
  });
  const webResult = useQuery({
    queryKey: ["web", "activity"],
    queryFn: () => Promise.resolve([]),
    enabled: !IS_TAURI,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

export function useTauriListChannels(communityId: string) {
  return useQuery({
    queryKey: ["tauri", "channels", communityId],
    queryFn: () => tauri.tauriListChannels(communityId),
    enabled: IS_TAURI && !!communityId,
  });
}

export function useTauriListPostsForChannel(channelId: string) {
  return useQuery({
    queryKey: ["tauri", "channelPosts", channelId],
    queryFn: () =>
      tauri.tauriListPostsForChannel(channelId, getCurrentHandle()),
    enabled: IS_TAURI && !!channelId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useAppCreatePost() {
  const qc = useQueryClient();
  const web = useMutation({
    mutationFn: (input: {
      content: string;
      town_tag: string;
      media_hashes?: string[];
    }) =>
      createInteractivePost({
        content: input.content,
        townTag: input.town_tag,
        mediaHashes: input.media_hashes,
      }),
  });
  const tauriMut = useMutation({
    mutationFn: (input: {
      session_token: string;
      content: string;
      town_tag: string;
      channel_id?: string;
      media_hashes?: string;
    }) =>
      tauri.tauriCreatePost(
        input.session_token,
        input.content,
        input.town_tag,
        input.channel_id,
        input.media_hashes,
      ),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "replies"] });
      qc.invalidateQueries({ queryKey: ["tauri", "following"] });
      qc.invalidateQueries({ queryKey: ["tauri", "notifications"] });
      const token = getSessionToken();
      if (token) {
        void (async () => {
          await Promise.allSettled([
            tauri.tauriSyncPortfolioOnce(token, variables.town_tag),
            tauri.tauriSyncSocialOnce(token, variables.town_tag),
          ]);
          await qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
          await qc.invalidateQueries({ queryKey: ["tauri", "notifications"] });
          await qc.invalidateQueries({ queryKey: ["tauri", "following"] });
          await qc.invalidateQueries({ queryKey: ["tauri", "replies"] });
        })();
      }
    },
  });
  return {
    mutate: IS_TAURI
      ? (
          input: {
            content: string;
            town_tag: string;
            channel_id?: string;
            media_hashes?: string[];
          },
          opts?: any,
        ) => {
          const token = getSessionToken();
          if (!token) {
            const err = new Error("Sign in to post — open Welcome or Log in");
            opts?.onError?.(err);
            return;
          }
          tauriMut.mutate(
            {
              session_token: token,
              content: input.content,
              town_tag: input.town_tag,
              channel_id: input.channel_id,
              media_hashes: input.media_hashes
                ? JSON.stringify(input.media_hashes)
                : undefined,
            },
            opts,
          );
        }
      : (
          input: {
            content: string;
            town_tag: string;
            channel_id?: string;
            media_hashes?: string[];
          },
          opts?: any,
        ) => {
          web.mutate(input, {
            onSuccess: (post) => {
              qc.invalidateQueries({ queryKey: ["web", "posts"] });
              qc.invalidateQueries({ queryKey: ["web", "userPosts"] });
              qc.invalidateQueries({ queryKey: ["web", "user"] });
              opts?.onSuccess?.({
                post,
                earn: {
                  wb: 5,
                  wbNominal: 5,
                  karmaPost: 3,
                  karmaComment: 0,
                  throttled: false,
                },
              });
            },
            onError: (e) => opts?.onError?.(e),
          });
        },
    isPending: IS_TAURI ? tauriMut.isPending : web.isPending,
  };
}

export function useAppToggleLike() {
  const qc = useQueryClient();
  const tauriMut = useMutation({
    mutationFn: ({
      postId,
      desiredState,
    }: {
      postId: number;
      desiredState?: boolean;
    }) =>
      tauri.tauriQueueSocialAction(getSessionToken() || "", "like", {
        postId,
        desiredState,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (args: { postId: number; desiredState?: boolean }, opts?: any) =>
          tauriMut.mutate(args, opts)
      : (args: { postId: number; liked?: boolean }, opts?: any) => {
          try {
            const { liked, likesDelta } = toggleWebLike(args.postId);
            qc.invalidateQueries({ queryKey: ["web", "posts"] });
            qc.invalidateQueries({ queryKey: ["web", "userPosts"] });
            qc.invalidateQueries({ queryKey: ["web", "user"] });
            opts?.onSuccess?.({
              liked,
              likesDelta,
              authorEarn: liked
                ? {
                    wb: 0.5,
                    wbNominal: 0.5,
                    karmaPost: 0,
                    karmaComment: 0,
                    throttled: false,
                  }
                : undefined,
            });
          } catch (e) {
            opts?.onError?.(e);
          }
        },
    isPending: IS_TAURI ? tauriMut.isPending : false,
  };
}

export function useTauriToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      followedHandle,
      desiredState,
    }: {
      followedHandle: string;
      desiredState?: boolean;
    }) => {
      if (!IS_TAURI) {
        const now = toggleWebFollow(followedHandle);
        return Promise.resolve(now);
      }
      return tauri
        .tauriQueueSocialAction(getSessionToken() || "", "follow", {
          targetHandle: followedHandle,
          desiredState,
        })
        .then((result) => result.desiredState ?? true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "following"] });
      qc.invalidateQueries({ queryKey: ["tauri", "users"] });
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
      qc.invalidateQueries({ queryKey: ["web", "following"] });
      qc.invalidateQueries({ queryKey: ["web", "user"] });
    },
  });
}

export function useTauriGetFollowing(enabled: boolean = true) {
  const token = getSessionToken();
  const tauriQ = useQuery({
    queryKey: ["tauri", "following", token],
    queryFn: () => tauri.tauriGetFollowing(token || ""),
    enabled: IS_TAURI && enabled && !!token,
    staleTime: 30_000,
    refetchInterval: IS_TAURI && enabled ? 60_000 : false,
  });
  const webQ = useQuery({
    queryKey: ["web", "following"],
    queryFn: () => Promise.resolve(getFollowing()),
    enabled: !IS_TAURI && enabled,
    staleTime: 0,
  });
  return IS_TAURI ? tauriQ : webQ;
}

export function useAppCreateReply() {
  const qc = useQueryClient();
  const webMut = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: number;
      content: string;
    }) => {
      const reply = createWebReply(postId, content);
      return { reply };
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["web", "replies", variables.postId] });
      qc.invalidateQueries({ queryKey: ["web", "post", variables.postId] });
      qc.invalidateQueries({ queryKey: ["web", "posts"] });
      qc.invalidateQueries({ queryKey: ["web", "userPosts"] });
    },
  });
  const tauriMut = useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) =>
      tauri.tauriQueueSocialAction(getSessionToken() || "", "reply", {
        postId,
        content,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "replies"] });
      qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (input: { postId: number; content: string }, opts?: any) =>
          tauriMut.mutate(input, opts)
      : (input: { postId: number; content: string }, opts?: any) =>
          webMut.mutate(input, opts),
    isPending: IS_TAURI ? tauriMut.isPending : webMut.isPending,
  };
}

// ─── Tauri-only data hooks ───────────────────────────────

export function useTauriListUsers() {
  return useQuery({
    queryKey: ["tauri", "users"],
    queryFn: tauri.tauriListUsers,
    enabled: IS_TAURI,
  });
}

export function useTauriSearchUsers(query: string, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["tauri", "search", "users", q],
    queryFn: () => tauri.tauriSearchUsers(q),
    enabled: IS_TAURI && enabled && q.length >= 1,
    staleTime: 10_000,
  });
}

export function useTauriSearchPosts(query: string, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["tauri", "search", "posts", q],
    queryFn: () => tauri.tauriSearchPosts(q, 50, getCurrentHandle()),
    enabled: IS_TAURI && enabled && q.length >= 1,
    staleTime: 10_000,
  });
}

export function useTauriUpdateProfileCustomization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      theme,
      musicHash,
    }: {
      theme: string;
      musicHash?: string | null;
    }) =>
      tauri.tauriUpdateProfileCustomization(
        getSessionToken() || "",
        theme,
        musicHash,
      ),
    onSuccess: (_user, vars) => {
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "users"] });
    },
  });
}

export function useTauriSearchCommunities(query: string, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["tauri", "search", "communities", q],
    queryFn: () => tauri.tauriSearchCommunities(q),
    enabled: IS_TAURI && enabled && q.length >= 1,
    staleTime: 10_000,
  });
}

export function useTauriMarketplace() {
  return useQuery({
    queryKey: ["tauri", "marketplace"],
    queryFn: async () => {
      const { listMarketplace } = await import("@/lib/marketplace-escrow");
      return listMarketplace();
    },
    // Web demo store works without Tauri
    enabled: true,
  });
}

export function useMyEscrows() {
  return useQuery({
    queryKey: ["tauri", "escrows"],
    queryFn: async () => {
      const { listMyEscrows } = await import("@/lib/marketplace-escrow");
      return listMyEscrows();
    },
    enabled: true,
  });
}

export function useTauriGetNotifications() {
  return useQuery({
    queryKey: ["tauri", "notifications", getCurrentHandle()],
    queryFn: async () => {
      if (!IS_TAURI) {
        return listWebNotifications().map((notification) => ({
          id: notification.id,
          userHandle: "",
          notificationType: notification.notificationType,
          fromHandle: notification.fromHandle,
          fromDisplayName: notification.fromHandle,
          message: notification.message,
          unread: notification.unread,
          createdAt: notification.createdAt,
        }));
      }
      const token = getSessionToken() || "";
      const [local, hosted] = await Promise.all([
        tauri.tauriGetNotifications(token),
        tauri.tauriGetSocialNotifications(token).catch(() => []),
      ]);
      return [
        ...local,
        ...hosted.map((notification) => ({
          id: notification.notificationUid,
          userHandle: "",
          notificationType: notification.kind,
          fromHandle: notification.actorHandle,
          fromDisplayName: notification.actorHandle,
          message: notification.message,
          unread: notification.unread,
          createdAt: notification.createdAt,
        })),
      ].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    },
    enabled: true,
    refetchInterval: IS_TAURI ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useTauriGetWalletTx() {
  return useQuery({
    queryKey: ["tauri", "wallet"],
    queryFn: () => tauri.tauriGetWalletTx(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

export function useAppSendWeixBucks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toHandle, amount }: { toHandle: string; amount: number }) =>
      tauri.tauriSendWeixBucks(getSessionToken() || "", toHandle, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
    },
  });
}

export function useAppCreateMarketplaceListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      itemType: string;
      itemRef: string | null;
      price: number;
      title: string;
      description: string | null;
      isNft: boolean;
      townTag?: string | null;
      fulfillmentMode?: string | null;
      orgId?: string | null;
      orgSplitBps?: number | null;
      deliveryHint?: string | null;
    }) => {
      const { createMarketplaceListing } =
        await import("@/lib/marketplace-escrow");
      return createMarketplaceListing({
        itemType: args.itemType,
        itemRef: args.itemRef,
        price: args.price,
        title: args.title,
        description: args.description,
        isNft: args.isNft,
        townTag: args.townTag ?? null,
        fulfillmentMode: (args.fulfillmentMode as "instant" | "escrow") ?? null,
        orgId: args.orgId ?? null,
        orgSplitBps: args.orgSplitBps ?? null,
        deliveryHint: args.deliveryHint ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "ownedNfts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
    },
  });
}

export function useTauriPublishMix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      cid: string;
      title: string;
      bpm?: number;
      key?: string;
      tracklist?: string;
    }) =>
      tauri.tauriPublishMix(
        getSessionToken() || "",
        args.cid,
        args.title,
        args.bpm,
        args.key,
        args.tracklist,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
    },
  });
}

export function useAppBuyMarketplaceListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: number) => {
      const { buyMarketplaceListing } =
        await import("@/lib/marketplace-escrow");
      return buyMarketplaceListing(listingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "ownedNfts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
    },
  });
}

export function useEscrowMarkDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      escrowId: number;
      deliveryRef: string;
      deliveryNote?: string | null;
    }) => {
      const { escrowMarkDelivered } = await import("@/lib/marketplace-escrow");
      return escrowMarkDelivered(
        args.escrowId,
        args.deliveryRef,
        args.deliveryNote,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
    },
  });
}

export function useEscrowConfirmRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (escrowId: number) => {
      const { escrowConfirmRelease } = await import("@/lib/marketplace-escrow");
      return escrowConfirmRelease(escrowId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
    },
  });
}

export function useEscrowOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { escrowId: number; reason?: string | null }) => {
      const { escrowOpenDispute } = await import("@/lib/marketplace-escrow");
      return escrowOpenDispute(args.escrowId, args.reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
    },
  });
}

export function useEscrowRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (escrowId: number) => {
      const { escrowRefund } = await import("@/lib/marketplace-escrow");
      return escrowRefund(escrowId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "escrows"] });
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
    },
  });
}

export function useAppBuyMarketplaceListingBkspc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      listingId: number;
      buyerSolanaAddress: string;
      burnTxSignature: string;
    }) =>
      tauri.tauriBuyMarketplaceListingBkspc(
        getSessionToken() || "",
        args.listingId,
        args.buyerSolanaAddress,
        args.burnTxSignature,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "ownedNfts"] });
    },
  });
}

export function useTauriListOwnedNfts() {
  return useQuery({
    queryKey: ["tauri", "ownedNfts"],
    queryFn: () => tauri.tauriListOwnedNfts(getSessionToken() || ""),
    enabled: IS_TAURI && !!getSessionToken(),
  });
}

export function useTauriMintMixNft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      recipientSolanaAddress: string;
      cid: string;
      title: string;
      itemType: string;
      listingId?: number;
    }) =>
      tauri.tauriMintMixNft(
        getSessionToken() || "",
        args.recipientSolanaAddress,
        args.cid,
        args.title,
        args.itemType,
        args.listingId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "marketplace"] });
      qc.invalidateQueries({ queryKey: ["tauri", "ownedNfts"] });
    },
  });
}

export function useTauriGetTokenomicsPolicy() {
  return useQuery({
    queryKey: ["tauri", "tokenomics-policy"],
    queryFn: tauri.tauriGetTokenomicsPolicy,
    enabled: IS_TAURI,
    staleTime: 60_000,
  });
}

export function useAppSubmitEconomyAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appealType,
      reason,
    }: {
      appealType: string;
      reason: string;
    }) =>
      tauri.tauriSubmitEconomyAppeal(
        getSessionToken() || "",
        appealType,
        reason,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "economy-appeals"] });
    },
  });
}

export function useTauriListEconomyAppeals() {
  return useQuery({
    queryKey: ["tauri", "economy-appeals"],
    queryFn: () => tauri.tauriListEconomyAppeals(getSessionToken() || ""),
    enabled: IS_TAURI && !!getSessionToken(),
  });
}

export function useTauriGetWithdrawEligibility(amountWb?: number) {
  const parsed =
    amountWb !== undefined && !Number.isNaN(amountWb) ? amountWb : undefined;
  return useQuery({
    queryKey: ["tauri", "withdraw-eligibility", parsed ?? null],
    queryFn: () =>
      tauri.tauriGetWithdrawEligibility(getSessionToken() || "", parsed),
    enabled: IS_TAURI && !!getSessionToken(),
  });
}

export function useAppWithdrawToSolana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentSolanaAddress,
      amountWb,
    }: {
      studentSolanaAddress: string;
      amountWb: number;
    }) =>
      tauri.tauriWithdrawToSolana(
        getSessionToken() || "",
        studentSolanaAddress,
        amountWb,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "withdraw-eligibility"] });
    },
  });
}

export function useTauriGetCommunities() {
  return useQuery({
    queryKey: ["tauri", "communities"],
    queryFn: tauri.tauriGetCommunities,
    enabled: IS_TAURI,
  });
}

// ─── Relay Hooks ─────────────────────────────────────────

export function useTauriRelayStatuses() {
  return useQuery({
    queryKey: ["tauri", "relayStatuses"],
    queryFn: tauri.tauriGetRelayStatuses,
    enabled: IS_TAURI,
    refetchInterval: 15_000,
  });
}

export function useTauriListRelayConnections() {
  return useQuery({
    queryKey: ["tauri", "relayConnections"],
    queryFn: tauri.tauriListRelayConnections,
    enabled: IS_TAURI,
  });
}

export function useTauriRelayNetworkStats() {
  return useQuery({
    queryKey: ["tauri", "relayNetworkStats"],
    queryFn: tauri.tauriGetRelayNetworkStats,
    enabled: IS_TAURI,
    refetchInterval: 30_000,
  });
}

export function useTauriConnectToRelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      url,
      name,
      town,
    }: {
      url: string;
      name: string;
      town: string;
    }) => tauri.tauriConnectToRelay(getSessionToken() || "", url, name, town),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayStatuses"] });
      qc.invalidateQueries({ queryKey: ["tauri", "relayConnections"] });
    },
  });
}

export function useTauriDisconnectFromRelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url }: { url: string }) =>
      tauri.tauriDisconnectFromRelay(getSessionToken() || "", url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayStatuses"] });
      qc.invalidateQueries({ queryKey: ["tauri", "relayConnections"] });
    },
  });
}

export function useTauriSyncTownEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ town }: { town: string }) =>
      tauri.tauriSyncTownEvents(getSessionToken() || "", town),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayEvents"] });
    },
  });
}

export function useTauriConnectToDefaultRelays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tauri.tauriConnectToDefaultRelays(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayStatuses"] });
      qc.invalidateQueries({ queryKey: ["tauri", "relayConnections"] });
    },
  });
}

export function useTauriPublishNostrVisibilityTest() {
  return useMutation({
    mutationFn: () =>
      tauri.tauriPublishNostrVisibilityTest(getSessionToken() || ""),
  });
}

export function useTauriCheckRelayHealth() {
  return useMutation({
    mutationFn: (url: string) => tauri.tauriCheckRelayHealth(url),
  });
}

export function useTauriSubscribeToTown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ town }: { town: string }) =>
      tauri.tauriSubscribeToTown(getSessionToken() || "", town),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "subscribedTowns"] });
    },
  });
}

export function useTauriUnsubscribeFromTown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ town }: { town: string }) =>
      tauri.tauriUnsubscribeFromTown(getSessionToken() || "", town),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "subscribedTowns"] });
    },
  });
}

export function useTauriListSubscribedTowns() {
  return useQuery({
    queryKey: ["tauri", "subscribedTowns"],
    queryFn: tauri.tauriListSubscribedTowns,
    enabled: IS_TAURI,
  });
}

// ─── Cross-Town Feed Hooks ─────────────────────────────────

export function useTauriCombinedFeed(town?: string, enabled = true) {
  return useQuery({
    queryKey: ["tauri", "combinedFeed", town],
    queryFn: () => tauri.tauriListCombinedFeed(town, getCurrentHandle()),
    enabled: IS_TAURI && enabled,
  });
}

// ─── NIP-65 Relay List Hooks ───────────────────────────────

export function useTauriPublishRelayList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tauri.tauriPublishRelayList(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayStatuses"] });
      qc.invalidateQueries({ queryKey: ["tauri", "userRelayList"] });
    },
  });
}

export function useTauriFetchUserRelayList(pubkey: string) {
  return useQuery({
    queryKey: ["tauri", "userRelayList", pubkey],
    queryFn: () =>
      tauri.tauriFetchUserRelayList(getSessionToken() || "", pubkey),
    enabled: IS_TAURI && !!pubkey,
  });
}

// ─── Blob Announce Hook ────────────────────────────────────

export function useTauriAnnounceBlob() {
  return useMutation({
    mutationFn: ({ hash, filename }: { hash: string; filename: string }) =>
      tauri.tauriAnnounceBlob(getSessionToken() || "", hash, filename),
  });
}

// ─── Trending Gossip Hooks ─────────────────────────────────

export function useTauriPublishTrendingSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      tauri.tauriPublishTrendingSummary(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "trendingSummaries"] });
    },
  });
}

export function useTauriFetchTrendingSummaries(town: string) {
  return useQuery({
    queryKey: ["tauri", "trendingSummaries", town],
    queryFn: () =>
      tauri.tauriFetchTrendingSummaries(getSessionToken() || "", town),
    enabled: IS_TAURI && !!town,
  });
}

// ─── Pinning & Content Persistence Hooks ──────────────

export function useTauriPinContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ hash }: { hash: string }) =>
      tauri.tauriPinContent(getSessionToken() || "", hash),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "pinnedContent"] });
    },
  });
}

export function useTauriListPinnedContent() {
  return useQuery({
    queryKey: ["tauri", "pinnedContent"],
    queryFn: () => tauri.tauriListPinnedContent(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

// ─── Node Rewards Hooks ─────────────────────────────────

export function useTauriReportPinServe() {
  return useMutation({
    mutationFn: ({ hash }: { hash: string }) =>
      tauri.tauriReportPinServe(getSessionToken() || "", hash),
  });
}

export function useTauriClaimNodeRewards() {
  return useQuery({
    queryKey: ["tauri", "nodeRewards"],
    queryFn: () => tauri.tauriClaimNodeRewards(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

// ─── Cross-Device Sync Hooks ──────────────────────────

export function useTauriSyncAccountContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tauri.tauriSyncAccountContent(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "blobs"] });
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
    },
  });
}

// ─── Offline Cache Hooks ───────────────────────────────

export function useTauriAddToOfflineCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      hash,
      contentType,
      source,
    }: {
      hash: string;
      contentType: string;
      source: string;
    }) =>
      tauri.tauriAddToOfflineCache(
        getSessionToken() || "",
        hash,
        contentType,
        source,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineCache"] });
    },
  });
}

export function useTauriRemoveFromOfflineCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ hash }: { hash: string }) =>
      tauri.tauriRemoveFromOfflineCache(getSessionToken() || "", hash),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineCache"] });
    },
  });
}

export function useTauriListOfflineCache() {
  return useQuery({
    queryKey: ["tauri", "offlineCache"],
    queryFn: () => tauri.tauriListOfflineCache(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

export function useTauriPrefetchContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ hashes }: { hashes: string[] }) =>
      tauri.tauriPrefetchContent(getSessionToken() || "", hashes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineCache"] });
    },
  });
}

// ─── Offline Queue Hooks ─────────────────────────────────

export function useTauriQueueOfflineAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actionType,
      payload,
    }: {
      actionType: string;
      payload: string;
    }) =>
      tauri.tauriQueueOfflineAction(
        getSessionToken() || "",
        actionType,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
  });
}

export function useTauriGetPendingOfflineActions() {
  return useQuery({
    queryKey: ["tauri", "offlineQueue"],
    queryFn: () => tauri.tauriGetPendingOfflineActions(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

export function useTauriMarkOfflineActionSynced() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      tauri.tauriMarkOfflineActionSynced(getSessionToken() || "", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
  });
}

export function useTauriClearSyncedOfflineActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      tauri.tauriClearSyncedOfflineActions(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
  });
}

export function useTauriFlushOfflineQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<tauri.TauriFlushOfflineResult> => {
      const token = getSessionToken();
      if (!token) {
        return Promise.resolve({
          synced: 0,
          failed: 0,
          remaining: 0,
          nostrSynced: 0,
          nostrFailed: 0,
          nostrPending: 0,
        });
      }
      return tauri.tauriFlushOfflineQueue(token);
    },
    onSuccess: (result) => {
      if (
        result.synced > 0 ||
        result.failed > 0 ||
        result.nostrSynced > 0 ||
        result.nostrFailed > 0 ||
        result.nostrPending > 0
      ) {
        qc.invalidateQueries({ queryKey: ["tauri"] });
      }
    },
  });
}

/// Durable Nostr outbox: signed events committed locally but not yet accepted
/// by a relay. `pending > 0` with `relaysConnected === 0` is the offline case.
export function useTauriGetNostrOutboxStatus() {
  return useQuery({
    queryKey: ["tauri", "nostrOutbox"],
    queryFn: () => tauri.tauriGetNostrOutboxStatus(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

/// Which delivery regime the device is in: online (Nostr), local (Iroh LAN),
/// mesh (Reticulum, not yet live), or offline. Refetched on an interval so the
/// badge reflects current reality rather than state at mount.
export function useTauriGetDeliveryTier() {
  return useQuery({
    queryKey: ["tauri", "deliveryTier"],
    queryFn: () => tauri.tauriGetDeliveryTier(),
    enabled: IS_TAURI,
    refetchInterval: 30_000,
  });
}

// ─── Cross-Device Sync Hooks ────────────────────────────

export function useTauriGetUserAccountData() {
  return useQuery({
    queryKey: ["tauri", "accountData"],
    queryFn: () => tauri.tauriGetUserAccountData(getSessionToken() || ""),
    enabled: IS_TAURI,
  });
}

export function useTauriLogDeviceSync() {
  return useMutation({
    mutationFn: ({
      deviceId,
      syncType,
      itemsCount,
      durationMs,
      success,
    }: {
      deviceId: string;
      syncType: string;
      itemsCount: number;
      durationMs: number;
      success: boolean;
    }) =>
      tauri.tauriLogDeviceSync(
        deviceId,
        syncType,
        itemsCount,
        durationMs,
        success,
      ),
  });
}

export function useTauriGetDeviceSyncHistory(deviceId: string) {
  return useQuery({
    queryKey: ["tauri", "syncHistory", deviceId],
    queryFn: () => tauri.tauriGetDeviceSyncHistory(deviceId),
    enabled: IS_TAURI && !!deviceId,
  });
}

export function useTauriRunTier0Benchmark() {
  return useMutation({
    mutationFn: () => tauri.tauriRunTier0Benchmark(),
  });
}

// ─── Relay Consensus (Cache Poisoning Prevention) ─────

export function useTauriRecordRelayConsensus() {
  return useMutation({
    mutationFn: ({
      eventId,
      relayUrl,
      contentHash,
    }: {
      eventId: string;
      relayUrl: string;
      contentHash: string;
    }) => {
      const sessionToken = getSessionToken() || "";
      if (!sessionToken) return Promise.reject(new Error("Not authenticated"));
      return tauri.tauriRecordRelayConsensus(
        sessionToken,
        eventId,
        relayUrl,
        contentHash,
      );
    },
  });
}

export function useTauriValidateRelayConsensus(
  eventId: string,
  minRelays: number,
) {
  return useQuery({
    queryKey: ["tauri", "consensus", eventId, minRelays],
    queryFn: () => tauri.tauriValidateRelayConsensus(eventId, minRelays),
    enabled: IS_TAURI && !!eventId,
  });
}

export function useTauriGetRelayConsensusStats(eventId: string) {
  return useQuery({
    queryKey: ["tauri", "consensusStats", eventId],
    queryFn: () => tauri.tauriGetRelayConsensusStats(eventId),
    enabled: IS_TAURI && !!eventId,
  });
}

// ─── Relay Events with Consensus ───────────────────────

export function useTauriListRelayEventsWithConsensus(
  limit?: number,
  kindFilter?: number,
  minRelays?: number,
) {
  return useQuery({
    queryKey: [
      "tauri",
      "relayEventsWithConsensus",
      limit,
      kindFilter,
      minRelays,
    ],
    queryFn: () =>
      tauri.tauriListRelayEventsWithConsensus(
        getSessionToken() || "",
        limit,
        kindFilter,
        minRelays,
      ),
    enabled: IS_TAURI,
  });
}

// ─── MIDF Graph Analysis (Malicious Intent Detection) ──

export function useTauriGetFollowerGraph(handle: string, depth: number = 2) {
  return useQuery({
    queryKey: ["tauri", "followerGraph", handle, depth],
    queryFn: () => tauri.tauriGetFollowerGraph(handle, depth),
    enabled: IS_TAURI && !!handle,
  });
}

export function useTauriCalculateMaliciousIntentVector(handle: string) {
  return useQuery({
    queryKey: ["tauri", "maliciousIntent", handle],
    queryFn: () => tauri.tauriCalculateMaliciousIntentVector(handle),
    enabled: IS_TAURI && !!handle,
  });
}

export function useTauriGetMaliciousIntentScores(handle: string) {
  return useQuery({
    queryKey: ["tauri", "maliciousIntentScores", handle],
    queryFn: () => tauri.tauriGetMaliciousIntentScores(handle),
    enabled: IS_TAURI && !!handle,
  });
}

export function useTauriRecalculateAllMaliciousIntentScores() {
  return useMutation({
    mutationFn: () => {
      const sessionToken = getSessionToken() || "";
      if (!sessionToken) return Promise.reject(new Error("Not authenticated"));
      return tauri.tauriRecalculateAllMaliciousIntentScores(sessionToken);
    },
  });
}

// ─── Karma, yards, profile extensions ──────────────────

export function useTauriJoinYard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) => {
      if (!IS_TAURI) {
        const r = joinWebYard(communityId);
        return Promise.resolve({
          joined: r.joined,
          earn: {
            wb: r.wb,
            wbNominal: r.wb,
            karmaPost: 0,
            karmaComment: 0,
            throttled: false,
          },
        });
      }
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriJoinYard(token, communityId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "earnSummary"] });
      qc.invalidateQueries({ queryKey: ["web", "user"] });
      qc.invalidateQueries({ queryKey: ["web", "yardMember"] });
    },
  });
}

export function useTauriIsYardMember(communityId: string) {
  return useQuery({
    queryKey: IS_TAURI
      ? ["tauri", "yardMember", communityId]
      : ["web", "yardMember", communityId],
    queryFn: () => {
      if (!IS_TAURI) return Promise.resolve(isWebYardMember(communityId));
      const token = getSessionToken();
      if (!token) return false;
      return tauri.tauriIsYardMember(token, communityId);
    },
    enabled: !!communityId,
    staleTime: 0,
  });
}

export function useTauriListYardMembers(communityId: string) {
  return useQuery({
    queryKey: ["tauri", "yardMembers", communityId],
    queryFn: () => tauri.tauriListYardMembers(communityId),
    enabled: IS_TAURI && !!communityId,
  });
}

export function useTauriListCommunityRoles(communityId: string) {
  return useQuery({
    queryKey: ["tauri", "communityRoles", communityId],
    queryFn: () => tauri.tauriListCommunityRoles(communityId),
    enabled: IS_TAURI && !!communityId,
  });
}

export function useTauriSetCommunityRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      communityId: string;
      handle: string;
      role: string;
    }) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriSetCommunityRole(
        token,
        args.communityId,
        args.handle,
        args.role,
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "communityRoles", vars.communityId],
      });
      qc.invalidateQueries({ queryKey: ["tauri", "users"] });
    },
  });
}

export function useTauriListYardEvents(communityId: string) {
  return useQuery({
    queryKey: ["tauri", "yardEvents", communityId],
    queryFn: async () => {
      const { listYardEvents } = await import("@/lib/yard-events");
      return listYardEvents(communityId, getCurrentHandle() || undefined);
    },
    enabled: !!communityId,
  });
}

export function useTauriCreateYardEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      communityId: string;
      title: string;
      description: string;
      location: string;
      startsAt: string;
      endsAt?: string;
      capacity?: number | null;
      orgId?: string | null;
      requiresOrgMember?: boolean;
      ticketPriceWb?: number;
      eventKind?: string;
    }) => {
      const { createYardEvent } = await import("@/lib/yard-events");
      return createYardEvent(args);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "yardEvents", vars.communityId],
      });
    },
  });
}

export function useTauriRsvpYardEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      communityId: string;
      eventId: number;
      status: "going" | "interested";
    }) => {
      const { rsvpYardEvent } = await import("@/lib/yard-events");
      return rsvpYardEvent(args.eventId, args.status);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "yardEvents", vars.communityId],
      });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
      qc.invalidateQueries({ queryKey: ["tauri", "earnSummary"] });
      qc.invalidateQueries({ queryKey: ["tauri", "eventGuests"] });
    },
  });
}

export function useEventGuests(eventId: number | null) {
  return useQuery({
    queryKey: ["tauri", "eventGuests", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { listEventGuests } = await import("@/lib/yard-events");
      return listEventGuests(eventId);
    },
    enabled: !!eventId,
  });
}

export function useCheckInEventGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      eventId: number;
      ticketOrHandle: string;
      communityId: string;
    }) => {
      const { checkInEventGuest } = await import("@/lib/yard-events");
      return checkInEventGuest(args.eventId, args.ticketOrHandle);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "eventGuests", vars.eventId],
      });
      qc.invalidateQueries({
        queryKey: ["tauri", "yardEvents", vars.communityId],
      });
    },
  });
}

export function useOpenToBoard(filter: "all" | "work" | "research" = "all") {
  return useQuery({
    queryKey: ["connect", "open-to", filter],
    queryFn: async () => {
      const { listOpenToOpportunities } = await import("@/lib/yard-events");
      return listOpenToOpportunities(filter);
    },
  });
}

export function useTauriCancelYardEventRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { communityId: string; eventId: number }) => {
      const { cancelYardEventRsvp } = await import("@/lib/yard-events");
      return cancelYardEventRsvp(args.eventId);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "yardEvents", vars.communityId],
      });
      qc.invalidateQueries({ queryKey: ["tauri", "eventGuests"] });
    },
  });
}

export function useTauriGetEarnSummary() {
  return useQuery({
    queryKey: ["tauri", "earnSummary"],
    queryFn: () => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriGetEarnSummary(token);
    },
    enabled: IS_TAURI,
  });
}

export function useTauriGetKarmaLeaderboard(yard?: string, limit = 25) {
  return useQuery({
    queryKey: ["tauri", "karmaLeaderboard", yard, limit],
    queryFn: () => tauri.tauriGetKarmaLeaderboard(yard, limit),
    enabled: IS_TAURI,
  });
}

export function useTauriRepostPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => {
      if (!IS_TAURI) {
        const result = toggleWebRepost(postId);
        return Promise.resolve({
          reposted: result.reposted,
          repostsDelta: result.repostsDelta,
        });
      }
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri
        .tauriQueueSocialAction(token, "repost", { postId })
        .then((result) => ({
          reposted: result.desiredState ?? true,
          repostsDelta: 0,
        }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "hosted-posts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "followingReposts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
      qc.invalidateQueries({ queryKey: ["web", "posts"] });
      qc.invalidateQueries({ queryKey: ["web", "userPosts"] });
    },
  });
}

export function useTauriFollowingReposts(enabled = true) {
  return useQuery({
    queryKey: ["tauri", "followingReposts"],
    queryFn: () => {
      const token = getSessionToken();
      if (!token) return [];
      return tauri.tauriListFollowingReposts(token);
    },
    enabled: IS_TAURI && enabled,
  });
}

export function useTauriListWallPosts(wallOwner: string) {
  return useQuery({
    queryKey: ["tauri", "wallPosts", wallOwner],
    queryFn: () => {
      const token = getSessionToken();
      if (!token) return [];
      return tauri.tauriListWallPosts(token, wallOwner);
    },
    enabled: IS_TAURI && !!wallOwner,
  });
}

export function useTauriCreateWallPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      wallOwner,
      content,
    }: {
      wallOwner: string;
      content: string;
    }) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriCreateWallPost(token, wallOwner, content);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["tauri", "wallPosts", vars.wallOwner],
      });
    },
  });
}

export function useTauriApproveWallPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriApproveWallPost(token, postId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "wallPosts"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
    },
  });
}

export function useTauriUpdateProProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: string) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriUpdateProProfile(token, json);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tauri", "user"] }),
  });
}

export function useTauriUpdateTopFriends() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: string) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriUpdateTopFriends(token, json);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tauri", "user"] }),
  });
}

export function useTauriUpdateProfileLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: string) => {
      const token = getSessionToken();
      if (!token) throw new Error("Not signed in");
      return tauri.tauriUpdateProfileLayout(token, json);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tauri", "user"] }),
  });
}
