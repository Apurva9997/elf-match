// Keep API traffic in its own namespace so it cannot collide with Next.js
// pages such as /auth/login or /dashboard.
const API_URL = "/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

class ApiClient {
  private _tokenGetter: (() => Promise<string | null>) | null = null;

  setTokenGetter(getter: (() => Promise<string | null>) | null) {
    this._tokenGetter = getter;
  }

  private async getToken(): Promise<string | null> {
    if (this._tokenGetter) {
      return this._tokenGetter();
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = await this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        `API request failed (${response.status} ${response.statusText})`
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || "That did not work. Try again.",
        data.error?.code
      );
    }

    return data.data as T;
  }

  async getMe() {
    return this.request<User>("/auth/me");
  }

  // User Preferences
  async getUserPreferences() {
    return this.request<{ preferences: UserPreferences }>("/user/preferences");
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>) {
    return this.request<{ preferences: UserPreferences }>("/user/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    });
  }

  // Profile
  async getProfile() {
    return this.request<UserProfile>("/user/profile");
  }

  async deleteAccount(confirmation: string) {
    return this.request<{ deleted: boolean }>("/user/account", {
      method: "DELETE",
      body: JSON.stringify({ confirmation }),
    });
  }

  async updateProfile(data: UserProfileInput) {
    return this.request<UserProfile>("/user/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Teams
  async createTeam(data: CreateTeamInput) {
    return this.request<Team>("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listTeams() {
    return this.request<TeamWithRole[]>("/teams");
  }

  async getTeam(teamId: string) {
    return this.request<TeamWithMembers>(`/teams/${teamId}`);
  }

  async updateTeam(teamId: string, data: Partial<CreateTeamInput>) {
    return this.request<Team>(`/teams/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async archiveTeam(teamId: string) {
    return this.request<{ archived: boolean }>(`/teams/${teamId}/archive`, {
      method: "POST",
    });
  }

  async deleteTeam(teamId: string) {
    return this.request<{ message: string }>(`/teams/${teamId}`, {
      method: "DELETE",
    });
  }

  async getTeamStatus(teamId: string) {
    return this.request<TeamStatus>(`/teams/${teamId}/status`);
  }

  // Invitations
  async listInviteLinks(teamId: string) {
    return this.request<InviteLinkTable>(`/teams/${teamId}/invite-links`);
  }

  async createInviteLink(teamId: string) {
    return this.request<{ id: string; url: string; signingOn: boolean }>(
      `/teams/${teamId}/invite-link`,
      { method: "POST" }
    );
  }

  async setInviteLinkSigning(teamId: string, on: boolean) {
    return this.request<{ id: string; signingOn: boolean }>(
      `/teams/${teamId}/invite-link`,
      { method: "PATCH", body: JSON.stringify({ on }) }
    );
  }

  async expireInviteLink(teamId: string, linkId: string) {
    return this.request<{ id: string; expiredAt: string }>(
      `/teams/${teamId}/invite-links/${linkId}/expire`,
      { method: "POST" }
    );
  }

  async inviteMembers(teamId: string, emails: string[]) {
    return this.request<{
      results: Array<{
        email: string;
        status: string;
        error?: string;
        inviteUrl?: string;
      }>;
    }>(`/teams/${teamId}/invite`, {
      method: "POST",
      body: JSON.stringify({ emails }),
    });
  }

  async previewInvitation(token: string) {
    return this.request<{
      kind?: "link" | "email";
      status: string;
      exchangeName: string;
      hostName: string;
      exchangeDate: string | null;
      wishlistDeadline: string | null;
      budgetMin: string | null;
      budgetMax: string | null;
      currency: string | null;
    }>(`/invitations/${token}`);
  }

  async acceptInvitation(token: string) {
    return this.request<{ team: Team; message: string }>(
      `/invitations/${token}/accept`,
      { method: "POST" }
    );
  }

  async declineInvitation(token: string) {
    return this.request<{ message: string }>(`/invitations/${token}/decline`, {
      method: "POST",
    });
  }

  async listPendingInvitations() {
    return this.request<PendingInvitation[]>("/invitations/pending");
  }

  async acceptInvitationDirect(invitationId: string) {
    return this.request<{ team: Team; message: string }>(
      `/invitations/${invitationId}/accept-direct`,
      { method: "POST" }
    );
  }

  async declineInvitationDirect(invitationId: string) {
    return this.request<{ message: string }>(
      `/invitations/${invitationId}/decline-direct`,
      { method: "POST" }
    );
  }

  async removeMember(teamId: string, memberId: string) {
    return this.request<{ message: string }>(
      `/teams/${teamId}/members/${memberId}`,
      { method: "DELETE" }
    );
  }

  async cancelInvitation(teamId: string, memberId: string) {
    return this.request<{ message: string }>(
      `/teams/${teamId}/members/${memberId}/cancel`,
      { method: "POST" }
    );
  }

  async resendInvitation(teamId: string, memberId: string) {
    return this.request<{ message: string }>(
      `/teams/${teamId}/members/${memberId}/resend`,
      { method: "POST" }
    );
  }

  // Wishlists
  async getWishlist(teamId: string) {
    return this.request<Wishlist>(`/teams/${teamId}/wishlist`);
  }

  async updateWishlist(
    teamId: string,
    items: WishItemInput[],
    skipped?: boolean
  ) {
    return this.request<Wishlist>(`/teams/${teamId}/wishlist`, {
      method: "PUT",
      body: JSON.stringify(
        skipped === undefined ? { items } : { items, skipped }
      ),
    });
  }

  async getGifteeWishlist(teamId: string) {
    return this.request<{
      giftee: { name: string; avatarUrl?: string };
      wishlist: Wishlist | null;
      giftStatus: string;
    }>(`/teams/${teamId}/giftee/wishlist`);
  }

  // Addresses
  async getAddress(teamId: string) {
    return this.request<Address | null>(`/teams/${teamId}/address`);
  }

  async updateAddress(teamId: string, address: AddressInput) {
    return this.request<Address>(`/teams/${teamId}/address`, {
      method: "PUT",
      body: JSON.stringify(address),
    });
  }

  async getGifteeAddress(teamId: string) {
    return this.request<{
      giftee: { name: string };
      address: Address | null;
      message?: string;
    }>(`/teams/${teamId}/giftee/address`);
  }

  // Assignments
  async previewAssignment(teamId: string) {
    return this.request<AssignmentPreview>(`/teams/${teamId}/assign/preview`, {
      method: "POST",
    });
  }

  async triggerAssignment(
    teamId: string,
    previewAssignments?: Array<{ giverId: string; receiverId: string }>
  ) {
    return this.request<{
      message: string;
      count: number;
      notified: number;
      failed: string[];
    }>(`/teams/${teamId}/assign`, {
      method: "POST",
      body: JSON.stringify(
        previewAssignments ? { assignments: previewAssignments } : {}
      ),
    });
  }

  async retryAssignmentEmails(teamId: string) {
    return this.request<{
      message: string;
      notified: number;
      failed: string[];
    }>(`/teams/${teamId}/assign/notify`, { method: "POST" });
  }

  async getAssignment(teamId: string) {
    return this.request<Assignment>(`/teams/${teamId}/assignment`);
  }

  async updateAssignment(teamId: string, giftStatus: string) {
    return this.request<Assignment>(`/teams/${teamId}/assignment`, {
      method: "PATCH",
      body: JSON.stringify({ giftStatus }),
    });
  }

  // Exclusions
  async listExclusions(teamId: string) {
    return this.request<Exclusion[]>(`/teams/${teamId}/exclusions`);
  }

  async addExclusion(teamId: string, data: ExclusionInput) {
    return this.request<Exclusion>(`/teams/${teamId}/exclusions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async removeExclusion(teamId: string, exclusionId: string) {
    return this.request<{ message: string }>(
      `/teams/${teamId}/exclusions/${exclusionId}`,
      { method: "DELETE" }
    );
  }

  // Admin
  async sendReminders(teamId: string) {
    return this.request<{
      message: string;
      results: Array<{ email: string; sent: boolean; missingItems: string[] }>;
    }>(`/teams/${teamId}/reminders`, { method: "POST" });
  }

}

export const api = new ApiClient();

// Types
export interface UserPreferences {
  onboarding?: {
    new_user?: boolean;
    admin?: boolean;
    member?: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  preferences?: UserPreferences;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  currency: string;
  exchangeDate: string | null;
  wishlistDeadline: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithRole extends Team {
  role: string;
  invitationStatus: string;
  membershipId: string;
  creator?: {
    id: string;
    name: string | null;
  };
}

export interface InviteLinkRow {
  id: string;
  createdAt: string;
  expiredAt: string | null;
  signingOn: boolean;
  token: string | null;
}

export interface InviteLinkTable {
  canGenerate: boolean;
  signingOn: boolean;
  links: InviteLinkRow[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string | null;
  role: string;
  invitationStatus: string;
  invitedEmail: string | null;
  invitationLinkToken: string | null;
  joinedAt: string | null;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface TeamWithMembers extends TeamWithRole {
  members: TeamMember[];
}

export interface TeamStatus {
  status: string;
  totalMembers: number;
  membersWithWishlist: number;
  membersWithAddress: number;
  pendingInvitations: number;
  hasAssignments: boolean;
  assignmentCount: number;
  drawComplete: boolean;
  canAssign: boolean;
  assignmentEmailsPending: number;
  completionPercentage: number;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  exchangeDate?: string | null;
  wishlistDeadline?: string | null;
}

export interface WishItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  priceEstimate: string | null;
  priority: number;
}

export interface WishItemInput {
  title: string;
  description?: string;
  url?: string;
  priceEstimate?: number;
  priority?: number;
}

export interface Wishlist {
  id: string;
  teamMemberId: string;
  items: WishItem[];
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  streetLine1: string;
  streetLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export interface AddressInput {
  streetLine1: string;
  streetLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  avatarUrl: string | null;
  address: Address | null;
}

export interface UserProfileInput {
  name?: string;
  mobile?: string | null;
  address?: AddressInput;
}

export interface Assignment {
  assigned: boolean;
  giftee?: {
    name: string;
    avatarUrl?: string;
  };
  giftStatus?: string;
  revealedAt?: string;
  firstView?: boolean;
  message?: string;
}

export interface AssignmentPreviewItem {
  giver: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  receiver: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface AssignmentPreview {
  preview: AssignmentPreviewItem[];
  totalAssignments: number;
  exclusionsApplied: number;
}

export interface Exclusion {
  id: string;
  teamId: string;
  member1Id: string;
  member2Id: string;
  reason: string | null;
  bidirectional: boolean;
  warning?: string | null;
  member1: TeamMember;
  member2: TeamMember;
}

export interface ExclusionInput {
  member1Id: string;
  member2Id: string;
  reason?: string;
  bidirectional?: boolean;
}

export interface PendingInvitation {
  id: string;
  teamId: string;
  teamName: string;
  teamDescription: string | null;
  invitedAt: string;
  invitedBy: {
    id: string;
    name: string | null;
  } | null;
}
