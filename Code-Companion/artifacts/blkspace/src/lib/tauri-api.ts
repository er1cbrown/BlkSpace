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
  pubkey: string;
  engagementQuality: number;
  themeId: number;
  musicHash: string;
  nodeRole: string;
  createdAt: string;
  postKarma?: number;
  commentKarma?: number;
  proProfileJson?: string;
  profileLayoutJson?: string;
  topFriendsJson?: string;
}

export interface TauriWallPost {
  id: number;
  wallOwnerHandle: string;
  authorHandle: string;
  authorDisplayName: string;
  content: string;
  approved: boolean;
  createdAt: string;
}

export interface TauriEarnResult {
  wb: number;
  wbNominal: number;
  karmaPost: number;
  karmaComment: number;
  throttled: boolean;
  dailyCapLimited: boolean;
}

export interface TauriCreatePostResult {
  post: TauriPost;
  earn: TauriEarnResult;
}

export interface TauriCreateReplyResult {
  reply: TauriReply;
  earn: TauriEarnResult;
}

export interface TauriJoinYardResult {
  joined: boolean;
  earn: TauriEarnResult;
}

export interface TauriYardEvent {
  id: number;
  communityId: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string | null;
  createdBy: string;
  createdByDisplayName: string;
  rsvpCount: number;
  userRsvp?: string | null;
}

export interface TauriRsvpYardEventResult {
  rsvped: boolean;
  status: string;
  earn: TauriEarnResult;
}

export interface TauriCommunityRoleEntry {
  handle: string;
  role: string;
}

export const YARD_ROLES = [
  "Student",
  "Yard Mod",
  "Alum",
  "Admin",
] as const;

export type YardRole = (typeof YARD_ROLES)[number];

export interface TauriWallPostResult {
  wallPost: TauriWallPost;
  earn: TauriEarnResult;
}

export interface TauriApproveWallPostResult {
  approved: boolean;
  earn: TauriEarnResult;
}

export interface TauriKarmaEntry {
  handle: string;
  displayName: string;
  postKarma: number;
  commentKarma: number;
  town: string;
}

export interface TauriEarnSummary {
  totalWb: number;
  postKarma: number;
  commentKarma: number;
  yardsJoined: number;
  uploadsCount: number;
}

export interface TauriTokenomicsPolicy {
  model: string;
  uniformModel: string;
  softCurrencySymbol: string;
  softCurrencyName: string;
  marketplaceEnabled: boolean;
  tipFeeBps: number;
  marketplaceFeeBps: number;
  withdrawSettlementFeeBps: number;
  dailyEarnCapWb: number;
  minWithdrawWb: number;
  weeklyWithdrawCapWb: number;
  wbToBkspcRatio: number;
  bkspcSymbol: string;
  bkspcName: string;
  midfThrottleThreshold: number;
  wbPurchasable: boolean;
  bkspcTradableAfterCounsel: boolean;
  treasuryMintOnly: boolean;
  onChainReady: boolean;
  neverRules: string[];
}

export interface TauriEconomyAppeal {
  id: number;
  handle: string;
  appealType: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface TauriWithdrawEligibility {
  eligible: boolean;
  reasons: string[];
  minAmountWb: number;
  weeklyCapWb: number;
  weeklyWithdrawnWb: number;
  weeklyRemainingWb: number;
  cooldownDays: number;
  daysUntilNextWithdraw: number;
  accountAgeDays: number;
  minAccountAgeDays: number;
  totalKarma: number;
  minKarma: number;
  postCount: number;
  minPosts: number;
  balanceWb: number;
  wbToBkspcRatio: number;
  bkspcSymbol: string;
  bkspcName: string;
  onChainReady: boolean;
}

export interface TauriNostrEventVerification {
  valid: boolean;
  status: string;
  message?: string | null;
  eventId?: string | null;
  pubkey?: string | null;
  kind?: number | null;
}

export interface TauriPost {
  id: number;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  townTag: string;
  channelId: string;
  repliesCount: number;
  repostsCount: number;
  likesCount: number;
  liked: boolean;
  mediaBlobs: string[];
  nostrEventId: string;
  relayUrl: string;
  createdAt: string;
  engagementQuality: number;
  maliciousScore: number;
  riskLevel: "low" | "medium" | "high";
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
  packActive?: boolean;
  purchaseCount?: number;
  packId?: string;
}

export interface TauriChannel {
  id: string;
  communityId: string;
  name: string;
  description: string;
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

export interface TauriUploadBlobResult extends TauriBlobInfo {
  earn: TauriEarnResult;
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

export function tauriLogin(
  handle: string,
  pubkey: string,
  challenge: string,
  authEvent: string,
): Promise<string> {
  return invoke("login", { handle, pubkey, challenge, authEvent });
}

export function tauriVerifySession(sessionToken: string): Promise<string> {
  return invoke("verify_session", { sessionToken });
}

export function tauriLogout(sessionToken: string): Promise<void> {
  return invoke("logout", { sessionToken });
}

// ─── Secure Key Store (Tauri-only) ─────────────────────

export function tauriStoreKey(
  sessionToken: string,
  handle: string,
  key: string,
): Promise<void> {
  return invoke("store_key", { sessionToken, handle, key });
}

export function tauriGetKey(
  sessionToken: string,
  handle: string,
): Promise<string | null> {
  return invoke("get_key", { sessionToken, handle });
}

export function tauriHasKey(
  sessionToken: string,
  handle: string,
): Promise<boolean> {
  return invoke("has_key", { sessionToken, handle });
}

export function tauriGetUser(handle: string): Promise<TauriUser | null> {
  return invoke("get_user", { handle });
}

export function tauriListUsers(): Promise<TauriUser[]> {
  return invoke("list_users");
}

export function tauriSearchUsers(
  query: string,
  limit?: number,
): Promise<TauriUser[]> {
  return invoke("search_users", { query, limit: limit ?? null });
}

export function tauriSearchPosts(
  query: string,
  limit?: number,
  currentUser?: string,
): Promise<TauriPost[]> {
  return invoke("search_posts", {
    query,
    limit: limit ?? null,
    currentUser: currentUser ?? null,
  });
}

export function tauriSearchCommunities(query: string): Promise<TauriCommunity[]> {
  return invoke("search_communities", { query });
}

export function tauriCreateUser(
  handle: string,
  displayName: string,
  pubkey: string = "",
): Promise<TauriUser> {
  return invoke("create_user", { handle, displayName, pubkey });
}

export function tauriUpdateUser(
  sessionToken: string,
  displayName: string,
  bio: string,
  town: string,
): Promise<void> {
  return invoke("update_user", { sessionToken, displayName, bio, town });
}

export function tauriUpdateProfileCustomization(
  sessionToken: string,
  theme: string,
  musicHash?: string | null,
): Promise<TauriUser> {
  return invoke("update_profile_customization", {
    sessionToken,
    theme,
    musicHash: musicHash ?? null,
  });
}

export function tauriVerifyNostrEvent(
  eventJson: string,
): Promise<TauriNostrEventVerification> {
  return invoke("verify_nostr_event", { eventJson });
}

export function tauriVerifyNostrEventById(
  eventId: string,
): Promise<TauriNostrEventVerification> {
  return invoke("verify_nostr_event_by_id", { eventId });
}

export function tauriGetNostrEventJson(
  eventId: string,
): Promise<string | null> {
  return invoke("get_nostr_event_json", { eventId });
}

export function tauriSetNodeRole(
  sessionToken: string,
  handle: string,
  role: string,
): Promise<void> {
  return invoke("set_node_role", { sessionToken, handle, role });
}

export function tauriSetCommunityRole(
  sessionToken: string,
  communityId: string,
  handle: string,
  role: string,
): Promise<void> {
  return invoke("set_community_role", {
    sessionToken,
    communityId,
    handle,
    role,
  });
}

export function tauriGetCommunityRole(
  sessionToken: string,
  communityId: string,
  handle: string,
): Promise<string> {
  return invoke("get_community_role", { sessionToken, communityId, handle });
}

export function tauriListMarketplace(sessionToken: string): Promise<any[]> {
  return invoke("list_marketplace", { sessionToken });
}

export function tauriCreateMarketplaceListing(
  sessionToken: string,
  itemType: string,
  itemRef: string | null,
  price: number,
  title: string,
  description: string | null,
  isNft: boolean,
  townTag: string | null = null,
): Promise<number> {
  return invoke("create_marketplace_listing", {
    sessionToken,
    itemType,
    itemRef,
    price,
    title,
    description,
    isNft,
    townTag,
  });
}

export function tauriBuyMarketplaceListing(
  sessionToken: string,
  listingId: number,
): Promise<any> {
  return invoke("buy_marketplace_listing", { sessionToken, listingId });
}

export interface TauriBkspcPurchaseQuote {
  listingPriceWb: number;
  platformFeeWb: number;
  totalWb: number;
  burnRawAmount?: number;
  burnBkspcDisplay?: string;
  mint?: string;
  wbToBkspcRatio?: number;
  decimals?: number;
  marketplaceFeeBps?: number;
  wired?: boolean;
  reason?: string;
}

export function tauriGetBkspcPurchaseQuote(
  sessionToken: string,
  listingId: number,
): Promise<TauriBkspcPurchaseQuote> {
  return invoke("get_bkspc_purchase_quote", { sessionToken, listingId });
}

export function tauriBuyMarketplaceListingBkspc(
  sessionToken: string,
  listingId: number,
  buyerSolanaAddress: string,
  burnTxSignature: string,
): Promise<any> {
  return invoke("buy_marketplace_listing_bkspc", {
    sessionToken,
    listingId,
    buyerSolanaAddress,
    burnTxSignature,
  });
}

export interface TauriNftMintResult {
  mintAddress: string;
  metadataAddress: string;
  txSignature: string;
  metadataUri: string;
  recipient: string;
  simulated: boolean;
}

export function tauriListOwnedNfts(sessionToken: string): Promise<
  Array<{
    mintAddress: string;
    itemType: string;
    itemRef?: string | null;
    title: string;
    metadataUri?: string | null;
    createdAt: string;
  }>
> {
  return invoke("list_owned_nfts", { sessionToken });
}

export function tauriMintMixNft(
  sessionToken: string,
  recipientSolanaAddress: string,
  cid: string,
  title: string,
  itemType: string,
  listingId?: number | null,
): Promise<TauriNftMintResult> {
  return invoke("mint_mix_nft", {
    sessionToken,
    recipientSolanaAddress,
    cid,
    title,
    itemType,
    listingId: listingId ?? null,
  });
}

export function tauriPublishMix(
  sessionToken: string,
  cid: string,
  title: string,
  bpm?: number,
  key?: string,
  tracklist?: string,
): Promise<string> {
  return invoke("publish_mix", { sessionToken, cid, title, bpm, key, tracklist });
}

export interface TauriPaginatedPosts {
  posts: TauriPost[];
  hasMore: boolean;
}

export function tauriListPosts(
  town?: string,
  currentUser?: string,
  limit?: number,
  beforeId?: number,
): Promise<TauriPaginatedPosts> {
  return invoke("list_posts", {
    town: town || null,
    currentUser: currentUser || null,
    limit: limit ?? null,
    beforeId: beforeId ?? null,
  });
}

export interface TauriBkspcBurnPrepare {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

export function tauriPrepareBkspcBurnTx(
  buyerSolanaAddress: string,
  burnRawAmount: number,
): Promise<TauriBkspcBurnPrepare> {
  return invoke("prepare_bkspc_burn_transaction", {
    buyerSolanaAddress,
    burnRawAmount,
  });
}

export function tauriSubmitBkspcBurnTx(
  signedTxBase64: string,
): Promise<string> {
  return invoke("submit_bkspc_burn_transaction", { signedTxBase64 });
}

export function tauriGetPost(
  id: number,
  currentUser?: string,
): Promise<TauriPost | null> {
  return invoke("get_post", { id, currentUser: currentUser || null });
}

export function tauriCreatePost(
  sessionToken: string,
  content: string,
  townTag: string,
  channelId?: string | null,
  mediaHashes?: string | null,
): Promise<TauriCreatePostResult> {
  return invoke("create_post", {
    sessionToken,
    content,
    townTag,
    channelId: channelId || null,
    mediaHashes: mediaHashes || null,
  });
}

export function tauriGetUserPosts(
  handle: string,
  currentUser?: string,
): Promise<TauriPost[]> {
  return invoke("get_user_posts", { handle, currentUser: currentUser || null });
}

export function tauriGetTrendingFeed(
  currentUser?: string,
): Promise<TauriPost[]> {
  return invoke("get_trending_feed", { currentUser: currentUser || null });
}

export function tauriListReplies(postId: number): Promise<TauriReply[]> {
  return invoke("list_replies", { postId });
}

export function tauriCreateReply(
  sessionToken: string,
  postId: number,
  content: string,
): Promise<TauriCreateReplyResult> {
  return invoke("create_reply", { sessionToken, postId, content });
}

export interface TauriToggleLikeResult {
  liked: boolean;
  authorHandle?: string | null;
  authorEarn: TauriEarnResult;
}

export function tauriToggleLike(
  sessionToken: string,
  postId: number,
): Promise<TauriToggleLikeResult> {
  return invoke("toggle_like", { sessionToken, postId });
}

export function tauriToggleFollow(
  sessionToken: string,
  followedHandle: string,
): Promise<boolean> {
  return invoke("toggle_follow", { sessionToken, followedHandle });
}

export function tauriGetFollowing(sessionToken: string): Promise<string[]> {
  return invoke<string[]>("get_following", { sessionToken }).catch(
    () => [] as string[],
  );
}

export function tauriGetNotifications(
  sessionToken: string,
): Promise<TauriNotification[]> {
  return invoke("get_notifications", { sessionToken });
}

export function tauriGetWalletTx(
  sessionToken: string,
): Promise<TauriWalletTx[]> {
  return invoke("get_wallet_tx", { sessionToken });
}

export function tauriSendWeixBucks(
  sessionToken: string,
  toHandle: string,
  amount: number,
): Promise<[number, number]> {
  return invoke("send_weixbucks", { sessionToken, toHandle, amount });
}

export function tauriGetTokenomicsPolicy(): Promise<TauriTokenomicsPolicy> {
  return invoke("get_tokenomics_policy");
}

export function tauriSubmitEconomyAppeal(
  sessionToken: string,
  appealType: string,
  reason: string,
): Promise<TauriEconomyAppeal> {
  return invoke("submit_economy_appeal", {
    sessionToken,
    appealType,
    reason,
  });
}

export function tauriListEconomyAppeals(
  sessionToken: string,
): Promise<TauriEconomyAppeal[]> {
  return invoke("list_economy_appeals", { sessionToken });
}

export function tauriGetWithdrawEligibility(
  sessionToken: string,
  amountWb?: number | null,
): Promise<TauriWithdrawEligibility> {
  return invoke("get_withdraw_eligibility", {
    sessionToken,
    amountWb: amountWb ?? null,
  });
}

export function tauriWithdrawToSolana(
  sessionToken: string,
  studentSolanaAddress: string,
  amountWb: number,
): Promise<string> {
  return invoke("withdraw_to_solana", {
    sessionToken,
    studentSolanaAddress,
    amountWb,
  });
}

export interface TauriBkspcSettlementStatus {
  wired: boolean;
  cluster?: string;
  mint?: string;
  mintAuthority?: string;
  reason?: string;
}

export function tauriGetBkspcSettlementStatus(): Promise<TauriBkspcSettlementStatus> {
  return invoke("get_bkspc_settlement_status");
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

export function tauriListChannels(
  communityId: string,
): Promise<TauriChannel[]> {
  return invoke("list_channels", { communityId });
}

export function tauriCreateChannel(
  sessionToken: string,
  communityId: string,
  name: string,
  description?: string | null,
): Promise<TauriChannel> {
  return invoke("create_channel", {
    sessionToken,
    communityId,
    name,
    description: description || null,
  });
}

export function tauriListPostsForChannel(
  channelId: string,
  currentUser?: string,
): Promise<TauriPost[]> {
  return invoke("list_posts_for_channel", {
    channelId,
    currentUser: currentUser || null,
  });
}

// ─── Blob (Media) Commands ──────────────────────────────

export function tauriUploadBlob(
  sessionToken: string,
  data: string,
  filename: string,
): Promise<TauriUploadBlobResult> {
  return invoke("upload_blob", { sessionToken, data, filename });
}

export function tauriGetBlobBytes(
  sessionToken: string,
  hash: string,
): Promise<string | null> {
  return invoke("get_blob_bytes", { sessionToken, hash });
}

export function tauriListUserBlobs(
  sessionToken: string,
): Promise<TauriBlobInfo[]> {
  return invoke("list_user_blobs", { sessionToken });
}

export function tauriDeleteBlob(
  sessionToken: string,
  hash: string,
): Promise<void> {
  return invoke("delete_blob", { sessionToken, hash });
}

export function tauriGetBlobMetadata(
  sessionToken: string,
  hash: string,
): Promise<TauriBlobInfo | null> {
  return invoke("get_blob_metadata", { sessionToken, hash });
}

export function tauriLinkPubkey(
  handle: string,
  newPubkey: string,
  authEvent: string,
): Promise<string> {
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

export function tauriConnectToRelay(
  sessionToken: string,
  url: string,
  name: string,
  town: string,
): Promise<string> {
  return invoke("connect_to_relay", { sessionToken, url, name, town });
}

export function tauriDisconnectFromRelay(
  sessionToken: string,
  url: string,
): Promise<string> {
  return invoke("disconnect_from_relay", { sessionToken, url });
}

export function tauriGetRelayStatuses(): Promise<TauriRelayStatus[]> {
  return invoke("get_relay_statuses");
}

export function tauriListRelayConnections(): Promise<
  TauriRelayConnectionRecord[]
> {
  return invoke("list_relay_connections");
}

export function tauriCheckRelayHealth(
  url: string,
): Promise<{ connected: boolean; latencyMs?: number }> {
  return invoke("check_relay_health", { url }).then(
    (result: [boolean, number | null]) => {
      const [connected, latency] = result;
      return { connected, latencyMs: latency ?? undefined };
    },
  );
}

export function tauriConnectToDefaultRelays(): Promise<string[]> {
  return invoke("connect_to_default_relays");
}

export function tauriSyncTownEvents(
  sessionToken: string,
  town: string,
): Promise<TauriNostrEventData[]> {
  return invoke("sync_town_events", { sessionToken, town });
}

export function tauriListRelayEvents(
  sessionToken: string,
  limit?: number,
  kindFilter?: number,
): Promise<TauriRelayEventRecord[]> {
  return invoke("list_relay_events", {
    sessionToken,
    limit: limit ?? null,
    kindFilter: kindFilter ?? null,
  });
}

export function tauriListRelayEventsWithConsensus(
  sessionToken: string,
  limit?: number,
  kindFilter?: number,
  minRelays?: number,
): Promise<
  {
    id: number;
    eventId: string;
    relayUrl: string;
    kind: number;
    pubkey: string;
    content: string;
    tags: string;
    createdAtUnix: number;
    firstSeen: string;
    consensus: {
      totalSightings: number;
      uniqueHashes: number;
      agreementPercent: number;
      consensusValid: boolean;
    };
  }[]
> {
  return invoke("list_relay_events_with_consensus", {
    sessionToken,
    limit: limit ?? null,
    kindFilter: kindFilter ?? null,
    minRelays: minRelays ?? null,
  });
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
  consensusValid: boolean;
  consensusAgreement: number;
  maliciousScore: number;
  riskLevel: "low" | "medium" | "high";
}

export interface TauriRepostResult {
  reposted: boolean;
  repostsCount: number;
}

export interface TauriRepostFeedItem {
  reposterHandle: string;
  reposterDisplayName: string;
  repostedAt: string;
  post: TauriPost;
}

export function tauriSubscribeToTown(
  sessionToken: string,
  town: string,
): Promise<void> {
  return invoke("subscribe_to_town", { sessionToken, town });
}

export function tauriUnsubscribeFromTown(
  sessionToken: string,
  town: string,
): Promise<void> {
  return invoke("unsubscribe_from_town", { sessionToken, town });
}

export function tauriListSubscribedTowns(): Promise<string[]> {
  return invoke("list_subscribed_towns");
}

// ─── Cross-Town Feed ──────────────────────────────────────

export function tauriListCombinedFeed(
  town?: string,
  currentUser?: string,
): Promise<TauriCrossTownEvent[]> {
  return invoke("list_combined_feed", {
    town: town || null,
    currentUser: currentUser || null,
  });
}

// ─── Relay List (NIP-65) ─────────────────────────────────

export function tauriPublishRelayList(sessionToken: string): Promise<string> {
  return invoke("publish_relay_list", { sessionToken });
}

export function tauriFetchUserRelayList(
  sessionToken: string,
  pubkey: string,
): Promise<string[]> {
  return invoke("fetch_user_relay_list", { sessionToken, pubkey });
}

// ─── Blob Announcement (NIP-94) ───────────────────────────

export function tauriAnnounceBlob(
  sessionToken: string,
  hash: string,
  filename: string,
): Promise<string> {
  return invoke("announce_blob", { sessionToken, hash, filename });
}

// ─── Trending Gossip (Cross-Town Sync) ───────────────────

export function tauriPublishTrendingSummary(
  sessionToken: string,
): Promise<string> {
  return invoke("publish_trending_summary", { sessionToken });
}

export function tauriFetchTrendingSummaries(
  sessionToken: string,
  town: string,
): Promise<string[]> {
  return invoke("fetch_trending_summaries", { sessionToken, town });
}

// ─── Pinning & Content Persistence ─────────────────────

export function tauriPinContent(
  sessionToken: string,
  hash: string,
): Promise<boolean> {
  return invoke("pin_content", { sessionToken, hash });
}

export function tauriShouldPinContent(hash: string): Promise<boolean> {
  return invoke("should_pin_content", { hash });
}

export function tauriListPinnedContent(
  sessionToken: string,
): Promise<string[]> {
  return invoke("list_pinned_content", { sessionToken });
}

// ─── Node Rewards ─────────────────────────────────────

export function tauriReportPinServe(
  sessionToken: string,
  hash: string,
): Promise<boolean> {
  return invoke("report_pin_serve", { sessionToken, hash });
}

export function tauriClaimNodeRewards(sessionToken: string): Promise<number> {
  return invoke("claim_node_rewards", { sessionToken });
}

// ─── Cross-Device Sync ────────────────────────────────

export function tauriSyncAccountContent(
  sessionToken: string,
): Promise<string[]> {
  return invoke("sync_account_content", { sessionToken });
}

// ─── Offline Cache ───────────────────────────────────

export function tauriAddToOfflineCache(
  sessionToken: string,
  hash: string,
  contentType: string,
  source: string,
): Promise<boolean> {
  return invoke("add_to_offline_cache", {
    sessionToken,
    hash,
    contentType,
    source,
  });
}

export function tauriRemoveFromOfflineCache(
  sessionToken: string,
  hash: string,
): Promise<boolean> {
  return invoke("remove_from_offline_cache", { sessionToken, hash });
}

export function tauriListOfflineCache(sessionToken: string): Promise<string[]> {
  return invoke("list_offline_cache", { sessionToken });
}

export function tauriPrefetchContent(
  sessionToken: string,
  hashes: string[],
): Promise<string[]> {
  return invoke("prefetch_content", { sessionToken, hashes });
}

// ─── Offline Queue ─────────────────────────────────────

export function tauriQueueOfflineAction(
  sessionToken: string,
  actionType: string,
  payload: string,
): Promise<number> {
  return invoke("queue_offline_action", { sessionToken, actionType, payload });
}

export function tauriGetPendingOfflineActions(
  sessionToken: string,
): Promise<[number, string, string][]> {
  return invoke("get_pending_offline_actions", { sessionToken });
}

export function tauriMarkOfflineActionSynced(
  sessionToken: string,
  id: number,
): Promise<void> {
  return invoke("mark_offline_action_synced", { sessionToken, id });
}

export function tauriClearSyncedOfflineActions(
  sessionToken: string,
): Promise<number> {
  return invoke("clear_synced_offline_actions", { sessionToken });
}

export function tauriCountPendingOfflineActions(
  sessionToken: string,
): Promise<number> {
  return invoke("count_pending_offline_actions", { sessionToken });
}

export interface TauriFlushOfflineResult {
  synced: number;
  failed: number;
  remaining: number;
}

export function tauriFlushOfflineQueue(
  sessionToken: string,
): Promise<TauriFlushOfflineResult> {
  return invoke("flush_offline_queue", { sessionToken });
}

// ─── Cross-Device Sync ────────────────────────────────

export function tauriGetUserAccountData(
  sessionToken: string,
): Promise<Record<string, any>> {
  return invoke("get_user_account_data", { sessionToken });
}

export function tauriLogDeviceSync(
  deviceId: string,
  syncType: string,
  itemsCount: number,
  durationMs: number,
  success: boolean,
): Promise<void> {
  return invoke("log_device_sync", {
    deviceId,
    syncType,
    itemsCount,
    durationMs,
    success,
  });
}

export function tauriGetDeviceSyncHistory(
  deviceId: string,
): Promise<[string, number, number, boolean][]> {
  return invoke("get_device_sync_history", { deviceId });
}

export interface Tier0BenchmarkMetric {
  name: string;
  durationMs: number;
  targetMs: number;
  pass: boolean;
}

export interface Tier0BenchmarkReport {
  metrics: Tier0BenchmarkMetric[];
  allPass: boolean;
  deviceNote: string;
}

export function tauriRunTier0Benchmark(): Promise<Tier0BenchmarkReport> {
  return invoke("run_tier0_benchmark");
}

export interface NostrVisibilityTestResult {
  eventId: string;
  nevent: string;
  npub: string;
  content: string;
  relayUrl: string;
  fetchedBack: boolean;
}

export function tauriPublishNostrVisibilityTest(
  sessionToken: string,
): Promise<NostrVisibilityTestResult> {
  return invoke("publish_nostr_visibility_test", { sessionToken });
}

// ─── Relay Consensus (Cache Poisoning Prevention) ─────

export interface RelayConsensusEntry {
  relayUrl: string;
  contentHash: string;
}

export interface RelayConsensusStats {
  totalSightings: number;
  uniqueHashes: number;
  agreementPercent: number;
}

export function tauriRecordRelayConsensus(
  eventId: string,
  relayUrl: string,
  contentHash: string,
): Promise<boolean> {
  return invoke("record_relay_consensus", { eventId, relayUrl, contentHash });
}

export function tauriGetRelayConsensus(
  eventId: string,
): Promise<[string, string][]> {
  return invoke("get_relay_consensus", { eventId });
}

export function tauriValidateRelayConsensus(
  eventId: string,
  minRelays: number,
): Promise<boolean> {
  return invoke("validate_relay_consensus", { eventId, minRelays });
}

export function tauriGetRelayConsensusStats(
  eventId: string,
): Promise<RelayConsensusStats> {
  return invoke("get_relay_consensus_stats", { eventId });
}

// ─── MIDF Graph Analysis (Malicious Intent Detection) ──

export interface MaliciousIntentVector {
  handle: string;
  overallScore: number;
  dimensions: {
    starPattern: number;
    networkCentrality: number;
    followerVelocity: number;
    selfInteraction: number;
    contentSimilarity: number;
    temporalPattern: number;
  };
  riskLevel: "low" | "medium" | "high" | "unknown";
  updatedAt: string;
}

export function tauriGetFollowerGraph(
  handle: string,
  depth: number,
): Promise<[string, string][]> {
  return invoke("get_follower_graph", { handle, depth });
}

export function tauriGetStarPatternScore(handle: string): Promise<number> {
  return invoke("get_star_pattern_score", { handle });
}

export function tauriGetNetworkCentrality(handle: string): Promise<number> {
  return invoke("get_network_centrality", { handle });
}

export function tauriGetFollowerVelocity(handle: string): Promise<number> {
  return invoke("get_follower_velocity", { handle });
}

export function tauriGetSelfInteractionScore(handle: string): Promise<number> {
  return invoke("get_self_interaction_score", { handle });
}

export function tauriGetContentSimilarityScore(
  handle: string,
): Promise<number> {
  return invoke("get_content_similarity_score", { handle });
}

export function tauriGetTemporalPatternScore(handle: string): Promise<number> {
  return invoke("get_temporal_pattern_score", { handle });
}

export function tauriCalculateMaliciousIntentVector(
  handle: string,
): Promise<MaliciousIntentVector> {
  return invoke("calculate_malicious_intent_vector", { handle });
}

export function tauriGetMaliciousIntentScores(
  handle: string,
): Promise<MaliciousIntentVector> {
  return invoke("get_malicious_intent_scores", { handle });
}

export function tauriRecalculateAllMaliciousIntentScores(): Promise<number> {
  return invoke("recalculate_all_malicious_intent_scores", {});
}

export function tauriJoinYard(
  sessionToken: string,
  communityId: string,
): Promise<TauriJoinYardResult> {
  return invoke("join_yard", { sessionToken, communityId });
}

export function tauriLeaveYard(
  sessionToken: string,
  communityId: string,
): Promise<void> {
  return invoke("leave_yard", { sessionToken, communityId });
}

export function tauriIsYardMember(
  sessionToken: string,
  communityId: string,
): Promise<boolean> {
  return invoke("is_yard_member", { sessionToken, communityId });
}

export function tauriListYardMembers(
  communityId: string,
): Promise<string[]> {
  return invoke("list_yard_members", { communityId });
}

export function tauriListCommunityRoles(
  communityId: string,
): Promise<TauriCommunityRoleEntry[]> {
  return invoke("list_community_roles", { communityId });
}

export function tauriListYardEvents(
  communityId: string,
  currentUser?: string,
): Promise<TauriYardEvent[]> {
  return invoke("list_yard_events", { communityId, currentUser });
}

export function tauriCreateYardEvent(
  sessionToken: string,
  communityId: string,
  title: string,
  description: string,
  location: string,
  startsAt: string,
  endsAt?: string,
): Promise<TauriYardEvent> {
  return invoke("create_yard_event", {
    sessionToken,
    communityId,
    title,
    description,
    location,
    startsAt,
    endsAt,
  });
}

export function tauriRsvpYardEvent(
  sessionToken: string,
  eventId: number,
  status: "going" | "interested",
): Promise<TauriRsvpYardEventResult> {
  return invoke("rsvp_yard_event", { sessionToken, eventId, status });
}

export function tauriCancelYardEventRsvp(
  sessionToken: string,
  eventId: number,
): Promise<boolean> {
  return invoke("cancel_yard_event_rsvp", { sessionToken, eventId });
}

export function tauriCreateWallPost(
  sessionToken: string,
  wallOwner: string,
  content: string,
): Promise<TauriWallPostResult> {
  return invoke("create_wall_post", { sessionToken, wallOwner, content });
}

export function tauriListWallPosts(
  sessionToken: string,
  wallOwner: string,
): Promise<TauriWallPost[]> {
  return invoke("list_wall_posts", { sessionToken, wallOwner });
}

export function tauriApproveWallPost(
  sessionToken: string,
  postId: number,
): Promise<TauriApproveWallPostResult> {
  return invoke("approve_wall_post", { sessionToken, postId });
}

export function tauriUpdateProProfile(
  sessionToken: string,
  json: string,
): Promise<void> {
  return invoke("update_pro_profile", { sessionToken, json });
}

export function tauriUpdateProfileLayout(
  sessionToken: string,
  json: string,
): Promise<void> {
  return invoke("update_profile_layout", { sessionToken, json });
}

export function tauriUpdateTopFriends(
  sessionToken: string,
  json: string,
): Promise<void> {
  return invoke("update_top_friends", { sessionToken, json });
}

export function tauriGetKarmaLeaderboard(
  yard?: string,
  limit?: number,
): Promise<TauriKarmaEntry[]> {
  return invoke("get_karma_leaderboard", { yard, limit });
}

export function tauriGetEarnSummary(
  sessionToken: string,
): Promise<TauriEarnSummary> {
  return invoke("get_earn_summary", { sessionToken });
}

export function tauriRepostPost(
  sessionToken: string,
  postId: number,
): Promise<TauriRepostResult> {
  return invoke("repost_post", { sessionToken, postId });
}

export function tauriListFollowingReposts(
  sessionToken: string,
): Promise<TauriRepostFeedItem[]> {
  return invoke("list_following_reposts", { sessionToken });
}
