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
import { getSessionToken } from "@/lib/auth";

const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// ─── Users ───────────────────────────────────────────────

export function useAppGetUser(handle: string) {
  const web = useGetUser(handle, { query: { enabled: !IS_TAURI && !!handle, queryKey: getGetUserQueryKey(handle) } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "user", handle],
    queryFn: () => tauri.tauriGetUser(handle),
    enabled: IS_TAURI && !!handle,
  });
  return IS_TAURI ? tauriResult : web;
}

// ─── Posts ───────────────────────────────────────────────

export function useAppListPosts(town: string, currentUser: string) {
  const web = useListPosts({ town }, {
    query: { enabled: !IS_TAURI, queryKey: getListPostsQueryKey({ town }) },
  });
  const tauriResult = useQuery({
    queryKey: ["tauri", "posts", town, currentUser],
    queryFn: () => tauri.tauriListPosts(town, currentUser),
    enabled: IS_TAURI,
  });
  return IS_TAURI ? tauriResult : web;
}

export function useAppGetTrendingFeed(currentUser: string) {
  const web = useGetTrendingFeed({
    query: { enabled: !IS_TAURI, queryKey: getGetTrendingFeedQueryKey() },
  });
  const tauriResult = useQuery({
    queryKey: ["tauri", "trending", currentUser],
    queryFn: () => tauri.tauriGetTrendingFeed(currentUser),
    enabled: IS_TAURI,
  });
  return IS_TAURI ? tauriResult : web;
}

export function useAppGetPost(id: number, currentUser: string) {
  const web = useGetPost(id, { query: { enabled: !IS_TAURI && !!id, queryKey: getGetPostQueryKey(id) } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "post", id, currentUser],
    queryFn: () => tauri.tauriGetPost(id, currentUser),
    enabled: IS_TAURI && !!id,
  });
  return IS_TAURI ? tauriResult : web;
}

export function useAppGetUserPosts(handle: string, currentUser: string) {
  const web = useGetUserPosts(handle, { query: { enabled: !IS_TAURI && !!handle, queryKey: getGetUserPostsQueryKey(handle) } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "userPosts", handle, currentUser],
    queryFn: () => tauri.tauriGetUserPosts(handle, currentUser),
    enabled: IS_TAURI && !!handle,
  });
  return IS_TAURI ? tauriResult : web;
}

// ─── Replies ─────────────────────────────────────────────

export function useAppListReplies(postId: number) {
  const web = useListReplies(postId, { query: { enabled: !IS_TAURI && !!postId, queryKey: getListRepliesQueryKey(postId) } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "replies", postId],
    queryFn: () => tauri.tauriListReplies(postId),
    enabled: IS_TAURI && !!postId,
  });
  return IS_TAURI ? tauriResult : web;
}

// ─── Relays / Network ────────────────────────────────────

export function useAppListRelays() {
  const web = useListRelays({ query: { enabled: !IS_TAURI, queryKey: getListRelaysQueryKey() } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "relays"],
    queryFn: tauri.tauriListRelays,
    enabled: IS_TAURI,
  });
  return IS_TAURI ? tauriResult : web;
}

export function useAppGetNetworkStats() {
  const web = useGetNetworkStats({ query: { enabled: !IS_TAURI, queryKey: getGetNetworkStatsQueryKey() } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "networkStats"],
    queryFn: tauri.tauriGetNetworkStats,
    enabled: IS_TAURI,
  });
  return IS_TAURI ? tauriResult : web;
}

export function useAppGetRecentActivity() {
  const web = useGetRecentActivity({ query: { enabled: !IS_TAURI, queryKey: getGetRecentActivityQueryKey() } });
  const tauriResult = useQuery({
    queryKey: ["tauri", "activity"],
    queryFn: tauri.tauriGetRecentActivity,
    enabled: IS_TAURI,
  });
  return IS_TAURI ? tauriResult : web;
}

// ─── Mutations ───────────────────────────────────────────

export function useAppCreatePost() {
  const qc = useQueryClient();
  const web = useCreatePost();
  const tauriMut = useMutation({
    mutationFn: (input: { session_token: string; content: string; town_tag: string; media_hashes?: string }) =>
      tauri.tauriCreatePost(input.session_token, input.content, input.town_tag, input.media_hashes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tauri", "posts"] });
    },
  });
  return {
    mutate: IS_TAURI
      ? (input: { content: string; town_tag: string; media_hashes?: string[] }, opts?: any) =>
          tauriMut.mutate({
            session_token: getSessionToken() || "",
            content: input.content,
            town_tag: input.town_tag,
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
