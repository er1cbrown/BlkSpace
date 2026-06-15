import { invoke } from "@tauri-apps/api/core";

export interface TauriUser {
  id: number;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  university: string;
  town: string;
  followersCount: number;
  followingCount: number;
  weixBucks: number;
  engagementQuality: number;
  createdAt: string;
}

export interface TauriPost {
  id: number;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  townTag: string;
  repliesCount: number;
  repostsCount: number;
  likesCount: number;
  liked: boolean;
  mediaBlobs: string[];
  nostrEventId: string;
  relayUrl: string;
  createdAt: string;
}

export interface TauriReply {
  id: number;
  postId: number;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
}

export interface TauriNotification {
  id: number;
  userHandle: string;
  notificationType: string;
  fromHandle: string;
  fromDisplayName: string;
  message: string;
  unread: boolean;
  createdAt: string;
}

export interface TauriWalletTx {
  id: number;
  userHandle: string;
  txType: string;
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface TauriCommunity {
  id: string;
  name: string;
  school: string;
  location: string;
  description: string;
  members: number;
  color: string;
}

export interface TauriRelay {
  id: number;
  name: string;
  university: string;
  town: string;
  status: string;
  uptimePercent: number;
  connectedPeers: number;
  eventsPerHour: number;
}

export interface TauriNetworkStats {
  onlineRelays: number;
  totalRelays: number;
  totalUsers: number;
  activeTowns: number;
  weixBucksInCirculation: number;
  eventsLast24h: number;
}

export interface TauriBlobInfo {
  hash: string;
  cid?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  uploaderHandle: string;
  createdAt: string;
}

export interface TauriActivityEvent {
  id: number;
  type: string;
  description: string;
  town: string;
  userHandle: string | null;
  createdAt: string;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// ─── Auth Commands ──────────────────────────────────────

export function tauriGetChallenge(handle: string): Promise<string> {
  return invoke("get_challenge", { handle });
}

export function tauriLogin(handle: string, pubkey: string, challenge: string, authEvent: string): Promise<string> {
  return invoke("login", { handle, pubkey, challenge, authEvent });
}

export function tauriVerifySession(sessionToken: string): Promise<string> {
  return invoke("verify_session", { sessionToken });
}

export function tauriLogout(sessionToken: string): Promise<void> {
  return invoke("logout", { sessionToken });
}

// ─── Secure Key Store (Tauri-only) ─────────────────────

export function tauriStoreKey(sessionToken: string, handle: string, key: string): Promise<void> {
  return invoke("store_key", { sessionToken, handle, key });
}

export function tauriGetKey(sessionToken: string, handle: string): Promise<string | null> {
  return invoke("get_key", { sessionToken, handle });
}

export function tauriHasKey(sessionToken: string, handle: string): Promise<boolean> {
  return invoke("has_key", { sessionToken, handle });
}

export function tauriGetUser(handle: string): Promise<TauriUser | null> {
  return invoke("get_user", { handle });
}

export function tauriListUsers(): Promise<TauriUser[]> {
  return invoke("list_users");
}

export function tauriCreateUser(handle: string, displayName: string, pubkey: string = ""): Promise<TauriUser> {
  return invoke("create_user", { handle, displayName, pubkey });
}

export function tauriUpdateUser(sessionToken: string, displayName: string, bio: string, town: string): Promise<void> {
  return invoke("update_user", { sessionToken, displayName, bio, town });
}

export function tauriListPosts(town?: string, currentUser?: string): Promise<TauriPost[]> {
  return invoke("list_posts", { town: town || null, currentUser: currentUser || null });
}

export function tauriGetPost(id: number, currentUser?: string): Promise<TauriPost | null> {
  return invoke("get_post", { id, currentUser: currentUser || null });
}

export function tauriCreatePost(sessionToken: string, content: string, townTag: string, mediaHashes?: string | null): Promise<TauriPost> {
  return invoke("create_post", { sessionToken, content, townTag, mediaHashes: mediaHashes || null });
}

export function tauriGetUserPosts(handle: string, currentUser?: string): Promise<TauriPost[]> {
  return invoke("get_user_posts", { handle, currentUser: currentUser || null });
}

export function tauriGetTrendingFeed(currentUser?: string): Promise<TauriPost[]> {
  return invoke("get_trending_feed", { currentUser: currentUser || null });
}

export function tauriListReplies(postId: number): Promise<TauriReply[]> {
  return invoke("list_replies", { postId });
}

export function tauriCreateReply(sessionToken: string, postId: number, content: string): Promise<TauriReply> {
  return invoke("create_reply", { sessionToken, postId, content });
}

export function tauriToggleLike(sessionToken: string, postId: number): Promise<boolean> {
  return invoke("toggle_like", { sessionToken, postId });
}

export function tauriGetNotifications(sessionToken: string): Promise<TauriNotification[]> {
  return invoke("get_notifications", { sessionToken });
}

export function tauriGetWalletTx(sessionToken: string): Promise<TauriWalletTx[]> {
  return invoke("get_wallet_tx", { sessionToken });
}

export function tauriSendWeixBucks(sessionToken: string, toHandle: string, amount: number): Promise<[number, number]> {
  return invoke("send_weixbucks", { sessionToken, toHandle, amount });
}

export function tauriGetNetworkStats(): Promise<TauriNetworkStats> {
  return invoke("get_network_stats");
}

export function tauriListRelays(): Promise<TauriRelay[]> {
  return invoke("list_relays");
}

export function tauriGetRecentActivity(): Promise<TauriActivityEvent[]> {
  return invoke("get_recent_activity");
}

export function tauriGetCommunities(): Promise<TauriCommunity[]> {
  return invoke("get_communities");
}

// ─── Blob (Media) Commands ──────────────────────────────

export function tauriUploadBlob(sessionToken: string, data: string, filename: string): Promise<TauriBlobInfo> {
  return invoke("upload_blob", { sessionToken, data, filename });
}

export function tauriGetBlobBytes(sessionToken: string, hash: string): Promise<string | null> {
  return invoke("get_blob_bytes", { sessionToken, hash });
}

export function tauriListUserBlobs(sessionToken: string): Promise<TauriBlobInfo[]> {
  return invoke("list_user_blobs", { sessionToken });
}

export function tauriDeleteBlob(sessionToken: string, hash: string): Promise<void> {
  return invoke("delete_blob", { sessionToken, hash });
}

export function tauriGetBlobMetadata(sessionToken: string, hash: string): Promise<TauriBlobInfo | null> {
  return invoke("get_blob_metadata", { sessionToken, hash });
}

export function tauriLinkPubkey(handle: string, newPubkey: string, authEvent: string): Promise<string> {
  return invoke("link_pubkey", { handle, newPubkey, authEvent });
}

// ─── Relay Networking Commands ──────────────────────────

export interface TauriRelayStatus {
  url: string;
  connected: boolean;
  eventsReceived: number;
  sinceConnect: number;
  latencyMs?: number;
}

export interface TauriRelayConnectionRecord {
  id: number;
  url: string;
  name: string;
  town: string;
  status: string;
  connectedAt: string | null;
  createdAt: string;
}

export interface TauriRelayEventRecord {
  id: number;
  eventId: string;
  relayUrl: string;
  kind: number;
  pubkey: string;
  content: string;
  tags: string;
  createdAtUnix: number;
  firstSeen: string;
}

export interface TauriNostrEventData {
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  createdAt: number;
  tags: string[][];
}

export function tauriConnectToRelay(sessionToken: string, url: string, name: string, town: string): Promise<string> {
  return invoke("connect_to_relay", { sessionToken, url, name, town });
}

export function tauriDisconnectFromRelay(sessionToken: string, url: string): Promise<string> {
  return invoke("disconnect_from_relay", { sessionToken, url });
}

export function tauriGetRelayStatuses(): Promise<TauriRelayStatus[]> {
  return invoke("get_relay_statuses");
}

export function tauriListRelayConnections(): Promise<TauriRelayConnectionRecord[]> {
  return invoke("list_relay_connections");
}

export function tauriCheckRelayHealth(url: string): Promise<{ connected: boolean; latencyMs?: number }> {
  return invoke("check_relay_health", { url }).then((result: [boolean, number | null]) => {
    const [connected, latency] = result;
    return { connected, latencyMs: latency ?? undefined };
  });
}

export function tauriConnectToDefaultRelays(): Promise<string[]> {
  return invoke("connect_to_default_relays");
}

export function tauriSyncTownEvents(sessionToken: string, town: string): Promise<TauriNostrEventData[]> {
  return invoke("sync_town_events", { sessionToken, town });
}

export function tauriListRelayEvents(sessionToken: string, limit?: number, kindFilter?: number): Promise<TauriRelayEventRecord[]> {
  return invoke("list_relay_events", { sessionToken, limit: limit ?? null, kindFilter: kindFilter ?? null });
}

export function tauriGetRelayNetworkStats(): Promise<TauriNetworkStats> {
  return invoke("get_relay_network_stats");
}

export interface TauriCrossTownEvent {
  id: string;
  eventId: string;
  pubkey: string;
  content: string;
  townTag: string;
  relayUrl: string;
  createdAt: string;
  createdAtUnix: number;
}

export function tauriSubscribeToTown(sessionToken: string, town: string): Promise<void> {
  return invoke("subscribe_to_town", { sessionToken, town });
}

export function tauriUnsubscribeFromTown(sessionToken: string, town: string): Promise<void> {
  return invoke("unsubscribe_from_town", { sessionToken, town });
}

export function tauriListSubscribedTowns(): Promise<string[]> {
  return invoke("list_subscribed_towns");
}

// ─── Cross-Town Feed ──────────────────────────────────────

export function tauriListCombinedFeed(town?: string, currentUser?: string): Promise<TauriCrossTownEvent[]> {
  return invoke("list_combined_feed", { town: town || null, currentUser: currentUser || null });
}

// ─── Relay List (NIP-65) ─────────────────────────────────

export function tauriPublishRelayList(sessionToken: string): Promise<string> {
  return invoke("publish_relay_list", { sessionToken });
}

export function tauriFetchUserRelayList(sessionToken: string, pubkey: string): Promise<string[]> {
  return invoke("fetch_user_relay_list", { sessionToken, pubkey });
}

// ─── Blob Announcement (NIP-94) ───────────────────────────

export function tauriAnnounceBlob(sessionToken: string, hash: string, filename: string): Promise<string> {
  return invoke("announce_blob", { sessionToken, hash, filename });
}

// ─── Trending Gossip (Cross-Town Sync) ───────────────────

export function tauriPublishTrendingSummary(sessionToken: string): Promise<string> {
  return invoke("publish_trending_summary", { sessionToken });
}

export function tauriFetchTrendingSummaries(sessionToken: string, town: string): Promise<string[]> {
  return invoke("fetch_trending_summaries", { sessionToken, town });
}
