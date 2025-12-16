const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken");
    }
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = this.getAccessToken();

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

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || "Something went wrong");
    }

    return data.data as T;
  }

  // Auth
  async sendMagicLink(email: string) {
    return this.request<{ message: string }>("/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyMagicLink(token: string, name?: string) {
    return this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token, name }),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe() {
    return this.request<User>("/auth/me");
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

  async deleteTeam(teamId: string) {
    return this.request<{ message: string }>(`/teams/${teamId}`, {
      method: "DELETE",
    });
  }

  async getTeamStatus(teamId: string) {
    return this.request<TeamStatus>(`/teams/${teamId}/status`);
  }

  // Invitations
  async inviteMembers(teamId: string, emails: string[]) {
    return this.request<{
      results: Array<{ email: string; status: string; error?: string }>;
    }>(`/teams/${teamId}/invite`, {
      method: "POST",
      body: JSON.stringify({ emails }),
    });
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

  // Wishlists
  async getWishlist(teamId: string) {
    return this.request<Wishlist>(`/teams/${teamId}/wishlist`);
  }

  async updateWishlist(teamId: string, items: WishItemInput[]) {
    return this.request<Wishlist>(`/teams/${teamId}/wishlist`, {
      method: "PUT",
      body: JSON.stringify({ items }),
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
  async triggerAssignment(teamId: string) {
    return this.request<{ message: string; count: number }>(
      `/teams/${teamId}/assign`,
      { method: "POST" }
    );
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
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
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
    email: string;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string | null;
  role: string;
  invitationStatus: string;
  invitedEmail: string | null;
  joinedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
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
  canAssign: boolean;
  completionPercentage: number;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  exchangeDate?: string;
  wishlistDeadline?: string;
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

export interface Assignment {
  assigned: boolean;
  giftee?: {
    name: string;
    avatarUrl?: string;
  };
  giftStatus?: string;
  revealedAt?: string;
  message?: string;
}

export interface Exclusion {
  id: string;
  teamId: string;
  member1Id: string;
  member2Id: string;
  reason: string | null;
  bidirectional: boolean;
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
    email: string;
  } | null;
}
