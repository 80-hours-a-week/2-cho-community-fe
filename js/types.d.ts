// ===== API 응답 래퍼 =====

/** 백엔드 표준 API 응답 형식 (모든 엔드포인트 공통) */
interface ApiSuccessResponse<T = unknown> {
  code: string;
  message: string;
  data: T;
  errors: unknown[];
  timestamp: string;
}

/** ApiService가 반환하는 정규화된 응답 */
interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/** ETag를 포함하는 응답 (알림 unread count 폴링용) */
interface ApiResponseWithETag<T = unknown> extends ApiResponse<T> {
  etag: string | null;
}

// ===== 페이지네이션 =====

interface Pagination {
  offset: number;
  limit: number;
  total_count: number;
  has_more: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ===== 사용자 =====

/** 게시글/댓글/알림에 포함되는 작성자 정보 (삭제된 사용자는 user_id=null) */
interface Author {
  user_id: number | null;
  nickname: string;
  profileImageUrl: string;
}

/** GET /v1/auth/me 응답 — 인증된 사용자 전체 정보 */
interface CurrentUser {
  user_id: number;
  email: string;
  email_verified: boolean;
  nickname: string;
  profileImageUrl: string;
  role: "user" | "admin";
  suspended_until?: string | null;
  suspended_reason?: string | null;
}

/** 공개 프로필 페이지 응답 */
interface UserProfile {
  user_id: number;
  nickname: string;
  profileImageUrl: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
  is_blocked?: boolean;
}

/** 사용자 검색 결과 항목 */
interface UserSearchResult {
  user_id: number;
  nickname: string;
  profileImageUrl: string;
}

/** 관리자 사용자 목록 항목 */
interface AdminUserItem {
  user_id: number;
  email: string;
  nickname: string;
  profile_img: string;
  role: "user" | "admin";
  suspended_until: string | null;
  suspended_reason: string | null;
  created_at: string;
}

/** 팔로워/팔로잉 항목 */
interface FollowUser {
  user_id: number;
  nickname: string;
  profileImageUrl: string;
}

// ===== 카테고리 =====

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

// ===== 태그 =====

/** 게시글에 포함되는 태그 */
interface Tag {
  id: number;
  name: string;
}

/** 태그 검색 결과 (post_count 포함) */
interface TagSearchResult extends Tag {
  post_count: number;
}

// ===== 투표 =====

interface PollOption {
  option_id: number;
  option_text: string;
  sort_order: number;
  vote_count: number;
}

interface Poll {
  poll_id: number;
  question: string;
  expires_at: string | null;
  is_expired: boolean;
  options: PollOption[];
  total_votes: number;
  my_vote: number | null;
}

// ===== 댓글 =====

interface Comment {
  comment_id: number;
  content: string;
  author: Author;
  created_at: string;
  updated_at: string | null;
  parent_id: number | null;
  likes_count: number;
  is_liked: boolean;
  replies: Comment[];
}

interface CreateCommentResponse {
  comment_id: number;
  content: string;
  parent_id: number | null;
  created_at: string;
}

interface UpdateCommentResponse {
  comment_id: number;
  content: string;
  updated_at: string;
}

// ===== 게시글 =====

/** 게시글 목록 항목 (content는 200자 truncate) */
interface PostSummary {
  post_id: number;
  title: string;
  content: string;
  author: Author;
  category_id: number | null;
  category_name: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  is_pinned: boolean;
  is_liked: boolean;
  is_bookmarked: boolean;
  is_read: boolean;
  tags: Tag[];
}

/** 게시글 상세 응답 */
interface PostDetail extends PostSummary {
  image_urls: string[];
  is_blocked: boolean;
  poll: Poll | null;
  comments: Comment[];
}

interface CreatePostResponse {
  post_id: number;
}

interface UpdatePostResponse {
  post_id: number;
  title: string;
  content: string;
  category_id: number | null;
  image_url: string | null;
  image_urls: string[];
  tags: Tag[];
  updated_at: string;
}

/** 연관 게시글 항목 */
interface RelatedPost {
  post_id: number;
  title: string;
  author: Author;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  created_at: string;
  tags: Tag[];
}

/** 이미지 업로드 응답 */
interface ImageUploadResponse {
  image_url: string;
}

// ===== 알림 =====

interface Notification {
  notification_id: number;
  type: "comment" | "like" | "mention" | "follow";
  post_id: number;
  comment_id: number | null;
  is_read: boolean;
  created_at: string;
  actor: Author;
  post_title: string;
}

interface UnreadCountResponse {
  unread_count: number;
}

interface UnreadCountWithLatest {
  unread_count: number;
  latest_notification: Notification | null;
}

// ===== DM =====

interface DMConversation {
  conversation_id: number;
  other_user: Author;
  last_message: string | null;
  last_message_sender_id: number | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

interface DMMessage {
  message_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DMConversationDetail {
  conversation_id: number;
  other_user: Author;
  messages: DMMessage[];
}

interface CreateConversationResponse {
  conversation_id: number;
}

// ===== 신고 =====

interface Report {
  report_id: number;
  reporter_id: number;
  target_type: "post" | "comment";
  target_id: number;
  reason: "spam" | "abuse" | "inappropriate" | "other";
  description: string | null;
  status: "pending" | "resolved" | "dismissed";
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  reporter_nickname: string | null;
}

// ===== 관리자 대시보드 =====

interface DashboardSummary {
  total_users: number;
  total_posts: number;
  total_comments: number;
  today_signups: number;
}

interface DailyStats {
  date: string;
  signups: number;
  posts: number;
  comments: number;
}

// ===== 내 활동 =====

/** 내 댓글 항목 (post_id, post_title 포함) */
interface MyComment {
  comment_id: number;
  content: string;
  created_at: string;
  post_id: number;
  post_title: string;
}

/** 내 좋아요 항목 */
interface MyLike {
  post_id: number;
  title: string;
  created_at: string;
}

// ===== 콜백 타입 =====

/** CommentController에 주입되는 콜백 */
interface CommentCallbacks {
  onCommentChange: () => void;
  onReport: (targetType: "post" | "comment", targetId: number) => void;
}

// ===== 서비스 타입 =====

/** DraftService 저장 데이터 */
interface DraftData {
  title: string;
  content: string;
  categoryId: number | null;
  savedAt: string;
}

/** 유효성 검사 결과 */
interface ValidationResult {
  valid: boolean;
  message: string | null;
}

// ===== WebSocket 이벤트 =====

interface WSNotificationEvent {
  type: "notification";
  data: {
    notification_id: number;
    notification_type: "comment" | "like" | "mention" | "follow";
    post_id: number;
    comment_id: number | null;
    actor_id: number;
    actor_nickname: string;
  };
}

interface WSDMEvent {
  type: "dm";
  data: {
    conversation_id: number;
    sender_id: number;
    sender_nickname: string;
    content: string;
  };
}

type WSEvent = WSNotificationEvent | WSDMEvent;

// ===== 차단 =====

interface BlockedUser {
  user_id: number;
  nickname: string;
  profileImageUrl: string;
  blocked_at: string;
}
