import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListPosts, getListPostsQueryKey, useGetTrendingFeed, getGetTrendingFeedQueryKey,
  useGetPost, getGetPostQueryKey, useListReplies, getListRepliesQueryKey,
  useGetUser, getGetUserQueryKey, useGetUserPosts, getGetUserPostsQueryKey,
  useCreatePost, useLikePost, useUnlikePost, useCreateReply,
  useListRelays, getListRelaysQueryKey, useGetNetworkStats, getGetNetworkStatsQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import * as tauri from "@/lib/tauri-api";
import { getSessionToken, getCurrentHandle } from "@/lib/auth";

export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Simple mock data so web/preview mode (no backend) shows content instead of perpetual loading spinners.
const MOCK_POSTS = [
  {
    id: 1,
    authorHandle: "demo_user",
    authorDisplayName: "Demo User",
    authorAvatarUrl: "",
    content: "Just stepped on the yard for the first time. This place is incredible! 🏆",
    townTag: "tsu",
    repliesCount: 12,
    repostsCount: 5,
    likesCount: 47,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-14T09:00:00Z",
  },
  {
    id: 2,
    authorHandle: "jane_doe",
    authorDisplayName: "Jane Doe",
    authorAvatarUrl: "",
    content: "Hot take: the best HBCU homecoming is... (drop yours below) 👇",
    townTag: "howard",
    repliesCount: 34,
    repostsCount: 18,
    likesCount: 89,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-14T10:30:00Z",
  },
  {
    id: 3,
    authorHandle: "campus_king",
    authorDisplayName: "Campus King",
    authorAvatarUrl: "",
    content: "New mix just dropped. Link in bio. Who's bumping this at the next tailgate? 🎧",
    townTag: "famu",
    repliesCount: 8,
    repostsCount: 23,
    likesCount: 156,
    liked: true,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-14T11:15:00Z",
  },
];

function getMockPosts(town?: string) {
  if (!town) return MOCK_POSTS;
  return MOCK_POSTS.filter((p) => p.townTag === town || town === "tsu");
}

function getMockUser(handle: string) {
  const found = MOCK_POSTS.find((p) => p.authorHandle === handle);
  return {
    id: 1,
    handle,
    displayName: found?.authorDisplayName || handle,
    bio: "HBCU student exploring the yard.",
    avatarUrl: "",
    university: "Tennessee State University",
    town: found?.townTag || "tsu",
    followersCount: 245,
    followingCount: 89,
    weixBucks: 1250,
    engagementQuality: 1.0,
    createdAt: "2026-06-01T00:00:00Z",
  };
}

// ─── Users ───────────────────────────────────────────────

export function useAppGetUser(handle: string) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "user", handle],
    queryFn: () => tauri.tauriGetUser(handle),
    enabled: IS_TAURI && !!handle,
  });
  const webResult = useQuery({
    queryKey: ["web", "user", handle],
    queryFn: () => Promise.resolve(getMockUser(handle)),
    enabled: !IS_TAURI && !!handle,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

// ─── Posts ───────────────────────────────────────────────

export function useAppListPosts(town: string, currentUser: string) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "posts", town, currentUser],
    queryFn: () => tauri.tauriListPosts(town, currentUser),
    enabled: IS_TAURI,
  });
  const webResult = useQuery({
    queryKey: ["web", "posts", town],
    queryFn: () => Promise.resolve(getMockPosts(town)),
    enabled: !IS_TAURI,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

export function useAppGetTrendingFeed(currentUser: string) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "trending", currentUser],
    queryFn: () => tauri.tauriGetTrendingFeed(currentUser),
    enabled: IS_TAURI,
  });
  const webResult = useQuery({
    queryKey: ["web", "trending"],
    queryFn: () => Promise.resolve(getMockPosts()),
    enabled: !IS_TAURI,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

function getMockPost(id: number) {
  return MOCK_POSTS.find((p) => p.id === id) || MOCK_POSTS[0];
}

function getMockReplies(_postId: number) {
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
  { id: 1, name: "TSU Stray Relay", university: "Tennessee State", town: "tsu", status: "online", uptimePercent: 99, connectedPeers: 42, eventsPerHour: 128 },
  { id: 2, name: "Howard Hub", university: "Howard", town: "howard", status: "online", uptimePercent: 97, connectedPeers: 67, eventsPerHour: 203 },
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
    queryFn: () => tauri.tauriGetPost(id, currentUser),
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
    queryFn: () => tauri.tauriGetUserPosts(handle, currentUser),
    enabled: IS_TAURI && !!handle,
  });
  const webResult = useQuery({
    queryKey: ["web", "userPosts", handle],
    queryFn: () => Promise.resolve(getMockPosts(handle ? undefined : "tsu")),
    enabled: !IS_TAURI && !!handle,
    staleTime: Infinity,
  });
  return IS_TAURI ? tauriResult : webResult;
}

// ─── Replies ─────────────────────────────────────────────

export function useAppListReplies(postId: number) {
  const tauriResult = useQuery({
    queryKey: ["tauri", "replies", postId],
    queryFn: () => tauri.tauriListReplies(postId),
    enabled: IS_TAURI && !!postId,
  });
  const webResult = useQuery({
    queryKey: ["web", "replies", postId],
    queryFn: () => Promise.resolve(getMockReplies(postId)),
    enabled: !IS_TAURI && !!postId,
    staleTime: Infinity,
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
    queryFn: () => tauri.tauriListPostsForChannel(channelId, getCurrentHandle()),
    enabled: IS_TAURI && !!channelId,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useAppCreatePost() {
  const qc = useQueryClient();
  const web = useCreatePost();
  const tauriMut = useMutation({
    mutationFn: (input: { session_token: string; content: string; town_tag: string; channel_id?: string; media_hashes?: string }) =>
      tauri.tauriCreatePost(input.session_token, input.content, input.town_tag, input.channel_id, input.media_hashes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (input: { content: string; town_tag: string; channel_id?: string; media_hashes?: string[] }, opts?: any) =>
          tauriMut.mutate({
            session_token: getSessionToken() || "",
            content: input.content,
            town_tag: input.town_tag,
            channel_id: input.channel_id,
            media_hashes: input.media_hashes ? JSON.stringify(input.media_hashes) : undefined,
          }, opts)
      : (input: any, opts?: any) =>
          web.mutate(
            { data: { content: input.content, authorHandle: "demo_user", townTag: input.town_tag } },
            opts,
          ),
    isPending: IS_TAURI ? tauriMut.isPending : web.isPending,
  };
}

export function useAppToggleLike() {
  const qc = useQueryClient();
  const webLike = useLikePost();
  const webUnlike = useUnlikePost();
  const tauriMut = useMutation({
    mutationFn: ({ postId }: { postId: number }) =>
      tauri.tauriToggleLike(getSessionToken() || "", postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (args: { postId: number }, opts?: any) =>
          tauriMut.mutate(args, opts)
      : (args: { postId: number; liked: boolean }, opts?: any) => {
          if (args.liked) {
            webUnlike.mutate({ id: args.postId }, opts);
          } else {
            webLike.mutate({ id: args.postId }, opts);
          }
        },
    isPending: IS_TAURI ? tauriMut.isPending : (webLike.isPending || webUnlike.isPending),
  };
}

export function useAppCreateReply() {
  const qc = useQueryClient();
  const web = useCreateReply();
  const tauriMut = useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) =>
      tauri.tauriCreateReply(getSessionToken() || "", postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "replies"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (input: { postId: number; content: string }, opts?: any) =>
          tauriMut.mutate(input, opts)
      : (input: any, opts?: any) =>
          web.mutate(
            { id: input.postId, data: { content: input.content, authorHandle: "demo_user" } },
            opts,
          ),
    isPending: IS_TAURI ? tauriMut.isPending : web.isPending,
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

export function useTauriGetNotifications() {
  return useQuery({
    queryKey: ["tauri", "notifications"],
    queryFn: () => tauri.tauriGetNotifications(getSessionToken() || ""),
    enabled: IS_TAURI,
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

export function useAppWithdrawToSolana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentSolanaAddress, amountWb }: { studentSolanaAddress: string; amountWb: number }) =>
      tauri.tauriWithdrawToSolana(getSessionToken() || "", studentSolanaAddress, amountWb),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "wallet"] });
      qc.invalidateQueries({ queryKey: ["tauri", "user"] });
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
    mutationFn: ({ url, name, town }: { url: string; name: string; town: string }) =>
      tauri.tauriConnectToRelay(getSessionToken() || "", url, name, town),
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

export function useTauriCombinedFeed(town?: string) {
  return useQuery({
    queryKey: ["tauri", "combinedFeed", town],
    queryFn: () => tauri.tauriListCombinedFeed(town, getCurrentHandle()),
    enabled: IS_TAURI,
  });
}

// ─── NIP-65 Relay List Hooks ───────────────────────────────

export function useTauriPublishRelayList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tauri.tauriPublishRelayList(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "relayStatuses"] });
    },
  });
}

export function useTauriFetchUserRelayList(pubkey: string) {
  return useQuery({
    queryKey: ["tauri", "userRelayList", pubkey],
    queryFn: () => tauri.tauriFetchUserRelayList(getSessionToken() || "", pubkey),
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
    mutationFn: () => tauri.tauriPublishTrendingSummary(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "trendingSummaries"] });
    },
  });
}

export function useTauriFetchTrendingSummaries(town: string) {
  return useQuery({
    queryKey: ["tauri", "trendingSummaries", town],
    queryFn: () => tauri.tauriFetchTrendingSummaries(getSessionToken() || "", town),
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
    mutationFn: ({ hash, contentType, source }: { hash: string; contentType: string; source: string }) =>
      tauri.tauriAddToOfflineCache(getSessionToken() || "", hash, contentType, source),
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
    mutationFn: ({ actionType, payload }: { actionType: string; payload: string }) =>
      tauri.tauriQueueOfflineAction(getSessionToken() || "", actionType, payload),
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
    mutationFn: () => tauri.tauriClearSyncedOfflineActions(getSessionToken() || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "offlineQueue"] });
    },
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
    mutationFn: ({ deviceId, syncType, itemsCount, durationMs, success }: 
      { deviceId: string; syncType: string; itemsCount: number; durationMs: number; success: boolean }) =>
      tauri.tauriLogDeviceSync(deviceId, syncType, itemsCount, durationMs, success),
  });
}

export function useTauriGetDeviceSyncHistory(deviceId: string) {
  return useQuery({
    queryKey: ["tauri", "syncHistory", deviceId],
    queryFn: () => tauri.tauriGetDeviceSyncHistory(deviceId),
    enabled: IS_TAURI && !!deviceId,
  });
}

// ─── Relay Consensus (Cache Poisoning Prevention) ─────

export function useTauriRecordRelayConsensus() {
  return useMutation({
    mutationFn: ({ eventId, relayUrl, contentHash }: 
      { eventId: string; relayUrl: string; contentHash: string }) =>
      tauri.tauriRecordRelayConsensus(eventId, relayUrl, contentHash),
  });
}

export function useTauriValidateRelayConsensus(eventId: string, minRelays: number) {
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
  minRelays?: number
) {
  return useQuery({
    queryKey: ["tauri", "relayEventsWithConsensus", limit, kindFilter, minRelays],
    queryFn: () => tauri.tauriListRelayEventsWithConsensus(
      getSessionToken() || "",
      limit,
      kindFilter,
      minRelays
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
    mutationFn: () => tauri.tauriRecalculateAllMaliciousIntentScores(),
  });
}
