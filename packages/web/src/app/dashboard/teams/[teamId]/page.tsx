"use client";

import { Onboarding } from "@/components/onboarding";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Gift,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const inviteSchema = z.object({
  emails: z.string().min(1, "Enter at least one email"),
});

const wishItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  priceEstimate: z.string().optional(),
});

const addressSchema = z.object({
  streetLine1: z.string().min(1, "Street address is required"),
  streetLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  description: z.string().optional(),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  exchangeDate: z.string().optional(),
  wishlistDeadline: z.string().optional(),
});

type WishItemForm = z.infer<typeof wishItemSchema>;
type AddressForm = z.infer<typeof addressSchema>;
type UpdateTeamForm = z.infer<typeof updateTeamSchema>;

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "wishlist" | "address" | "assignment"
  >("overview");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [wishItems, setWishItems] = useState<WishItemForm[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Team edit form
  const teamEditForm = useForm<UpdateTeamForm>({
    resolver: zodResolver(updateTeamSchema),
  });
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const pincodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => api.getTeam(teamId),
    enabled: !!user,
  });

  const { data: status } = useQuery({
    queryKey: ["team-status", teamId],
    queryFn: () => api.getTeamStatus(teamId),
    enabled: !!user,
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", teamId],
    queryFn: () => api.getWishlist(teamId),
    enabled: !!user,
  });

  const { data: address } = useQuery({
    queryKey: ["address", teamId],
    queryFn: () => api.getAddress(teamId),
    enabled: !!user,
  });

  const { data: assignment } = useQuery({
    queryKey: ["assignment", teamId],
    queryFn: () => api.getAssignment(teamId),
    enabled: !!user,
  });

  const { data: gifteeWishlist } = useQuery({
    queryKey: ["giftee-wishlist", teamId],
    queryFn: () => api.getGifteeWishlist(teamId),
    enabled: !!user && !!assignment?.assigned,
  });

  const { data: gifteeAddress } = useQuery({
    queryKey: ["giftee-address", teamId],
    queryFn: () => api.getGifteeAddress(teamId),
    enabled: !!user && !!assignment?.assigned,
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: (emails: string[]) => api.inviteMembers(teamId, emails),
    onSuccess: (_, emails) => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      setIsInviteModalOpen(false);
      toast.success(
        `Invitation${emails.length > 1 ? "s" : ""} sent successfully!`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send invitations");
    },
  });

  const updateWishlistMutation = useMutation({
    mutationFn: (items: WishItemForm[]) =>
      api.updateWishlist(
        teamId,
        items.map((item) => ({
          title: item.title,
          description: item.description,
          url: item.url || undefined,
          priceEstimate: item.priceEstimate
            ? parseFloat(item.priceEstimate)
            : undefined,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success("Wishlist saved!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save wishlist");
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: (data: AddressForm) => api.updateAddress(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["address", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success("Address saved!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save address");
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: (data: UpdateTeamForm) =>
      api.updateTeam(teamId, {
        name: data.name,
        description: data.description || undefined,
        budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? parseFloat(data.budgetMax) : undefined,
        exchangeDate: data.exchangeDate || undefined,
        wishlistDeadline: data.wishlistDeadline || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setIsEditTeamModalOpen(false);
      toast.success("Team updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update team");
    },
  });

  const triggerAssignmentMutation = useMutation({
    mutationFn: () => api.triggerAssignment(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      setIsAssignModalOpen(false);
      toast.success("Secret Santas assigned! Everyone will receive an email.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign Secret Santas");
    },
  });

  const updateGiftStatusMutation = useMutation({
    mutationFn: (giftStatus: string) =>
      api.updateAssignment(teamId, giftStatus),
    onSuccess: (_, giftStatus) => {
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      const statusMessages: Record<string, string> = {
        pending: "Status reset to pending",
        purchased: "Gift marked as purchased!",
        shipped: "Gift marked as shipped!",
        delivered: "Gift marked as delivered!",
      };
      toast.success(statusMessages[giftStatus] || "Status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update gift status");
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (memberId: string) => api.resendInvitation(teamId, memberId),
    onSuccess: () => {
      toast.success("Invitation email resent successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  // Forms
  const inviteForm = useForm<{ emails: string }>({
    resolver: zodResolver(inviteSchema),
  });

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  });

  // Initialize wish items from query
  useEffect(() => {
    if (wishlist?.items) {
      setWishItems(
        wishlist.items.map((item) => ({
          title: item.title,
          description: item.description || "",
          url: item.url || "",
          priceEstimate: item.priceEstimate || "",
        }))
      );
    }
  }, [wishlist]);

  // Show form by default when no address exists
  useEffect(() => {
    if (!address) {
      setIsEditingAddress(true);
    }
    // Don't set to false when address exists - let user control via Edit button
  }, [address]);

  // Initialize address form when address data loads
  useEffect(() => {
    if (address && !isEditingAddress) {
      addressForm.reset({
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || "",
        city: address.city,
        state: address.state || "",
        postalCode: address.postalCode,
        country: address.country,
      });
    }
  }, [address, isEditingAddress, addressForm]);

  const handleInvite = async (data: { emails: string }) => {
    const emailList = data.emails
      .split(/[,\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e);
    await inviteMutation.mutateAsync(emailList);
    inviteForm.reset();
  };

  // Debounced auto-save function
  const debouncedSave = useCallback(
    (items: WishItemForm[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setSaveStatus("saving");
      saveTimeoutRef.current = setTimeout(async () => {
        const validItems = items.filter((item) => item.title.trim());
        try {
          await updateWishlistMutation.mutateAsync(validItems);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error) {
          setSaveStatus("idle");
        }
      }, 1000);
    },
    [updateWishlistMutation]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pincodeTimeoutRef.current) {
        clearTimeout(pincodeTimeoutRef.current);
      }
    };
  }, []);

  // Function to fetch pincode details from Indian pincode API
  const fetchPincodeDetails = async (pincode: string) => {
    // Indian pincodes are 6 digits
    if (!/^\d{6}$/.test(pincode)) {
      return null;
    }

    try {
      setIsFetchingPincode(true);
      // Using PostalPinCode API - free, no API key required
      // Response format: { "Status": "Success", "PostOffice": [{ "Name": "...", "District": "...", "State": "..." }] }
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pincode details");
      }

      const data = await response.json();

      // Check if API returned valid data
      if (
        data &&
        data[0] &&
        data[0].Status === "Success" &&
        data[0].PostOffice &&
        data[0].PostOffice.length > 0
      ) {
        const firstResult = data[0].PostOffice[0];
        return {
          city: firstResult.District || firstResult.Name || "",
          state: firstResult.State || "",
          country: "India",
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching pincode details:", error);
      return null;
    } finally {
      setIsFetchingPincode(false);
    }
  };

  // Handle postal code change with debounce
  const handlePostalCodeChange = (value: string) => {
    // Clear existing timeout
    if (pincodeTimeoutRef.current) {
      clearTimeout(pincodeTimeoutRef.current);
    }

    // Only fetch if it's a 6-digit number (Indian pincode format)
    if (/^\d{6}$/.test(value)) {
      // Debounce the API call
      pincodeTimeoutRef.current = setTimeout(async () => {
        const details = await fetchPincodeDetails(value);
        if (details) {
          // Auto-populate city, state, and country
          if (details.city) {
            addressForm.setValue("city", details.city, {
              shouldValidate: true,
            });
          }
          if (details.state) {
            addressForm.setValue("state", details.state, {
              shouldValidate: true,
            });
          }
          if (details.country) {
            addressForm.setValue("country", details.country, {
              shouldValidate: true,
            });
          }
        }
      }, 500); // Wait 500ms after user stops typing
    }
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle.trim()) return;
    const newItem: WishItemForm = {
      title: quickAddTitle.trim(),
      description: "",
      url: "",
      priceEstimate: "",
    };
    const updated = [...wishItems, newItem];
    setWishItems(updated);
    setQuickAddTitle("");
    debouncedSave(updated);
  };

  const handleAddWishItem = () => {
    const newItem: WishItemForm = {
      title: "",
      description: "",
      url: "",
      priceEstimate: "",
    };
    const updated = [...wishItems, newItem];
    setWishItems(updated);
    // Expand the new item for editing
    setExpandedItems(new Set([...expandedItems, updated.length - 1]));
  };

  const handleRemoveWishItem = async (index: number) => {
    const updatedItems = wishItems.filter((_, i) => i !== index);
    setWishItems(updatedItems);
    // Remove from expanded set
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    // Adjust indices for items after the deleted one
    const adjustedExpanded = new Set<number>();
    newExpanded.forEach((idx) => {
      if (idx > index) {
        adjustedExpanded.add(idx - 1);
      } else {
        adjustedExpanded.add(idx);
      }
    });
    setExpandedItems(adjustedExpanded);
    // Save immediately to persist the deletion
    const validItems = updatedItems.filter((item) => item.title.trim());
    await updateWishlistMutation.mutateAsync(validItems);
  };

  const handleWishItemChange = (
    index: number,
    field: keyof WishItemForm,
    value: string
  ) => {
    const updated = [...wishItems];
    updated[index] = { ...updated[index], [field]: value };
    setWishItems(updated);
    debouncedSave(updated);
  };

  const toggleItemExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleSaveAddress = async (data: AddressForm) => {
    await updateAddressMutation.mutateAsync(data);
    setIsEditingAddress(false);
  };

  const handleCancelEditAddress = () => {
    // Reset form to saved values
    if (address) {
      addressForm.reset({
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || "",
        city: address.city,
        state: address.state || "",
        postalCode: address.postalCode,
        country: address.country,
      });
    } else {
      addressForm.reset();
    }
    setIsEditingAddress(false);
  };

  const handleStartEditAddress = () => {
    // Initialize form with current address when entering edit mode
    if (address) {
      addressForm.reset({
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || "",
        city: address.city,
        state: address.state || "",
        postalCode: address.postalCode,
        country: address.country,
      });
    }
    setIsEditingAddress(true);
  };

  const handleStartEditTeam = () => {
    // Initialize form with current team data
    if (team) {
      teamEditForm.reset({
        name: team.name,
        description: team.description || "",
        budgetMin: team.budgetMin || "",
        budgetMax: team.budgetMax || "",
        exchangeDate: team.exchangeDate
          ? new Date(team.exchangeDate).toISOString().split("T")[0]
          : "",
        wishlistDeadline: team.wishlistDeadline
          ? new Date(team.wishlistDeadline).toISOString().split("T")[0]
          : "",
      });
    }
    setIsEditTeamModalOpen(true);
  };

  const handleUpdateTeam = async (data: UpdateTeamForm) => {
    await updateTeamMutation.mutateAsync(data);
  };

  const isAdmin = team?.role === "admin";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <h2 className="text-xl font-display font-semibold text-cream mb-2">
            Team not found
          </h2>
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center text-cream/60 hover:text-cream transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOnboardingOpen(true)}
                className="text-cream/70 hover:text-cream"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How to
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                  {status?.canAssign ? (
                    <Button
                      size="sm"
                      onClick={() => setIsAssignModalOpen(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Assign Santas
                    </Button>
                  ) : (
                    status &&
                    !status.hasAssignments && (
                      <span className="text-cream/50 text-xs hidden sm:inline">
                        Need{" "}
                        {Math.max(
                          0,
                          3 -
                            (status.totalMembers -
                              (status.pendingInvitations || 0))
                        )}{" "}
                        more members to assign
                      </span>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-2">
                <h1 className="text-3xl font-display font-bold text-cream">
                  {team.name}
                </h1>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditTeam}
                    className="mt-1"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {team.description && (
                <p className="text-cream/60 mb-4">{team.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={
                    team.status === "assigned"
                      ? "success"
                      : team.status === "completed"
                        ? "gold"
                        : "warning"
                  }
                >
                  {team.status === "collecting_wishes"
                    ? "Collecting Wishes"
                    : team.status === "assigned"
                      ? "Assigned"
                      : "Completed"}
                </Badge>
                {team.exchangeDate && (
                  <span className="text-cream/50 text-sm">
                    Exchange: {formatDate(team.exchangeDate)}
                  </span>
                )}
                {team.budgetMin && team.budgetMax && (
                  <span className="text-cream/50 text-sm">
                    Budget: ₹{team.budgetMin} - ₹{team.budgetMax}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Cards */}
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="text-center py-4">
              <div className="text-2xl font-bold text-gold">
                {status.totalMembers}
              </div>
              <div className="text-cream/60 text-sm">Members</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-2xl font-bold text-gold">
                {status.membersWithWishlist}
              </div>
              <div className="text-cream/60 text-sm">Wishlists</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-2xl font-bold text-gold">
                {status.membersWithAddress}
              </div>
              <div className="text-cream/60 text-sm">Addresses</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-2xl font-bold text-gold">
                {status.completionPercentage}%
              </div>
              <div className="text-cream/60 text-sm">Complete</div>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 p-1 bg-midnight-50 rounded-lg w-fit">
          {(["overview", "wishlist", "address", "assignment"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === tab
                    ? "bg-gradient-gold text-midnight"
                    : "text-cream/60 hover:text-cream"
                )}
              >
                {tab === "overview" && (
                  <Users className="w-4 h-4 inline mr-2" />
                )}
                {tab === "wishlist" && <Gift className="w-4 h-4 inline mr-2" />}
                {tab === "address" && (
                  <MapPin className="w-4 h-4 inline mr-2" />
                )}
                {tab === "assignment" && (
                  <Sparkles className="w-4 h-4 inline mr-2" />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {team.members.length} member
                  {team.members.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-midnight-50"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          name={member.user?.name || member.invitedEmail || "U"}
                          src={member.user?.avatarUrl}
                        />
                        <div>
                          <div className="text-cream font-medium">
                            {member.user?.name || member.invitedEmail}
                          </div>
                          <div className="text-cream/50 text-sm">
                            {member.user?.email || member.invitedEmail}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {member.role === "admin" && (
                          <Badge variant="gold">Admin</Badge>
                        )}
                        {member.invitationStatus === "pending" && (
                          <>
                            <Badge variant="warning">Pending</Badge>
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  resendInvitationMutation.mutate(member.id)
                                }
                                disabled={resendInvitationMutation.isPending}
                                className="p-1.5 text-cream/50 hover:text-gold transition-colors disabled:opacity-50"
                                title="Resend invitation email"
                              >
                                {resendInvitationMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wishlist Tab */}
          {activeTab === "wishlist" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Wishlist</CardTitle>
                    <CardDescription>
                      Add items you&apos;d love to receive
                    </CardDescription>
                  </div>
                  {saveStatus === "saving" && (
                    <div className="flex items-center gap-2 text-cream/60 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                  {saveStatus === "saved" && (
                    <div className="flex items-center gap-2 text-gold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Saved</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick-add input - always visible */}
                  <div className="flex gap-2">
                    <Input
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAdd();
                        }
                      }}
                      placeholder="Quick add: e.g., Amazon Gift Card, Book, Headphones..."
                      className="flex-1"
                    />
                    <Button
                      onClick={handleQuickAdd}
                      disabled={!quickAddTitle.trim()}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Add Another Item button - always visible at top */}
                  <Button
                    variant="secondary"
                    onClick={handleAddWishItem}
                    className="w-full border-dashed border-2 border-cream/20 hover:border-cream/40"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Item
                  </Button>

                  {/* Wishlist items */}
                  {wishItems.length > 0 ? (
                    <div className="space-y-3">
                      {wishItems.map((item, index) => {
                        const isExpanded = expandedItems.has(index);
                        const hasDetails =
                          item.description || item.url || item.priceEstimate;

                        return (
                          <div
                            key={index}
                            className="p-4 rounded-lg bg-midnight-50 space-y-3"
                          >
                            {/* Collapsed/Header view */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex items-center gap-3">
                                <button
                                  onClick={() => toggleItemExpand(index)}
                                  className="text-cream/60 hover:text-cream transition-colors"
                                >
                                  {isExpanded ? (
                                    <X className="w-4 h-4" />
                                  ) : (
                                    <Edit className="w-4 h-4" />
                                  )}
                                </button>
                                {!isExpanded ? (
                                  <div className="flex-1">
                                    <h4 className="font-medium text-cream text-lg">
                                      {item.title || "Untitled item"}
                                    </h4>
                                    {hasDetails && (
                                      <div className="flex items-center gap-4 mt-1">
                                        {item.priceEstimate && (
                                          <span className="text-gold text-sm font-medium">
                                            ~₹{item.priceEstimate}
                                          </span>
                                        )}
                                        {item.url && (
                                          <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gold hover:text-gold-light transition-colors text-sm flex items-center gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            Link
                                          </a>
                                        )}
                                        {item.description && (
                                          <span className="text-cream/50 text-sm">
                                            {item.description.length > 50
                                              ? `${item.description.substring(0, 50)}...`
                                              : item.description}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <Input
                                        value={item.title}
                                        onChange={(e) =>
                                          handleWishItemChange(
                                            index,
                                            "title",
                                            e.target.value
                                          )
                                        }
                                        placeholder="e.g., Amazon Gift Card, Book - 'The Palace of Illusions'"
                                        className="flex-1"
                                      />
                                      <button
                                        onClick={() =>
                                          handleRemoveWishItem(index)
                                        }
                                        className="p-2 text-error/70 hover:text-error transition-colors"
                                        title="Delete item"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <Textarea
                                      value={item.description}
                                      onChange={(e) =>
                                        handleWishItemChange(
                                          index,
                                          "description",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Description (optional) - e.g., Size, color, preferred brand..."
                                      className="min-h-[60px]"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                      <Input
                                        value={item.url}
                                        onChange={(e) =>
                                          handleWishItemChange(
                                            index,
                                            "url",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Link (optional) - Amazon, Flipkart, etc."
                                      />
                                      <Input
                                        value={item.priceEstimate}
                                        onChange={(e) =>
                                          handleWishItemChange(
                                            index,
                                            "priceEstimate",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Price estimate (₹)"
                                        type="number"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-cream/60">
                      <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No wishlist items yet.</p>
                      <p className="text-sm mt-2">
                        Use the quick-add above or click &quot;Add Another
                        Item&quot; to get started.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Shipping Address</CardTitle>
                    <CardDescription>
                      Where should your Secret Santa send your gift?
                    </CardDescription>
                  </div>
                  {!isEditingAddress && address && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleStartEditAddress}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingAddress ? (
                  <form
                    onSubmit={addressForm.handleSubmit(handleSaveAddress)}
                    className="space-y-4"
                  >
                    <Input
                      {...addressForm.register("streetLine1")}
                      label="Street Address"
                      placeholder="123, MG Road, Near Metro Station"
                      error={addressForm.formState.errors.streetLine1?.message}
                      defaultValue={address?.streetLine1}
                    />
                    <Input
                      {...addressForm.register("streetLine2")}
                      label="Apartment, Floor, etc. (optional)"
                      placeholder="Flat 4B, 2nd Floor"
                      defaultValue={address?.streetLine2 || ""}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        {...addressForm.register("city")}
                        label="City"
                        placeholder="Mumbai"
                        error={addressForm.formState.errors.city?.message}
                        defaultValue={address?.city}
                      />
                      <Input
                        {...addressForm.register("state")}
                        label="State"
                        placeholder="Maharashtra"
                        defaultValue={address?.state || ""}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          {...addressForm.register("postalCode", {
                            onChange: (e) =>
                              handlePostalCodeChange(e.target.value),
                          })}
                          label="Pincode"
                          placeholder="400001"
                          error={
                            addressForm.formState.errors.postalCode?.message
                          }
                          defaultValue={address?.postalCode}
                          disabled={isFetchingPincode}
                        />
                        {isFetchingPincode && (
                          <p className="text-xs text-cream/50 mt-1 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Looking up pincode...
                          </p>
                        )}
                      </div>
                      <Input
                        {...addressForm.register("country")}
                        label="Country"
                        placeholder="India"
                        error={addressForm.formState.errors.country?.message}
                        defaultValue={address?.country}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        isLoading={updateAddressMutation.isPending}
                        className={address ? "flex-1" : "w-full"}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Address
                      </Button>
                      {address && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCancelEditAddress}
                          disabled={updateAddressMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                ) : address ? (
                  <div className="p-4 rounded-lg bg-midnight-50">
                    <div className="space-y-1 text-cream">
                      <p className="font-medium">{address.streetLine1}</p>
                      {address.streetLine2 && (
                        <p className="text-cream/70">{address.streetLine2}</p>
                      )}
                      <p className="text-cream/70">
                        {address.city}
                        {address.state && `, ${address.state}`}{" "}
                        {address.postalCode}
                      </p>
                      <p className="text-cream/70">{address.country}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-cream/60">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-4">No address saved yet.</p>
                    <Button
                      variant="secondary"
                      onClick={handleStartEditAddress}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignment Tab */}
          {activeTab === "assignment" && (
            <div className="space-y-6">
              {/* My Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Secret Santa Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignment?.assigned ? (
                    <div className="text-center py-6">
                      <Avatar
                        name={assignment.giftee?.name || "Unknown"}
                        src={assignment.giftee?.avatarUrl}
                        size="xl"
                        className="mx-auto mb-4"
                      />
                      <h3 className="text-2xl font-display font-bold text-cream mb-2">
                        {assignment.giftee?.name}
                      </h3>
                      <p className="text-cream/60 mb-6">
                        You&apos;re getting a gift for this person!
                      </p>

                      {/* Gift Status */}
                      <div className="flex justify-center gap-2 mb-6">
                        {(
                          [
                            "pending",
                            "purchased",
                            "shipped",
                            "delivered",
                          ] as const
                        ).map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              updateGiftStatusMutation.mutate(status)
                            }
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                              assignment.giftStatus === status
                                ? "bg-gradient-gold text-midnight"
                                : "bg-midnight-50 text-cream/60 hover:text-cream"
                            )}
                          >
                            {status === "pending" && (
                              <Clock className="w-4 h-4 inline mr-1" />
                            )}
                            {status === "purchased" && (
                              <Package className="w-4 h-4 inline mr-1" />
                            )}
                            {status === "shipped" && (
                              <Truck className="w-4 h-4 inline mr-1" />
                            )}
                            {status === "delivered" && (
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                            )}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-gold" />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-cream mb-2">
                        Assignments Not Ready Yet
                      </h3>
                      <p className="text-cream/60 mb-4">
                        {isAdmin
                          ? status?.canAssign
                            ? "You can now assign Secret Santas! Click the button above."
                            : `You need at least 3 accepted members to assign Secret Santas. Currently have ${status?.totalMembers ? status.totalMembers - (status.pendingInvitations || 0) : 0} accepted members.`
                          : "The team admin will assign Secret Santas once everyone is ready."}
                      </p>
                      {isAdmin && status?.canAssign && (
                        <Button onClick={() => setIsAssignModalOpen(true)}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Assign Secret Santas
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Giftee's Wishlist */}
              {assignment?.assigned && gifteeWishlist && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {assignment.giftee?.name}&apos;s Wishlist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gifteeWishlist.wishlist?.items &&
                    gifteeWishlist.wishlist.items.length > 0 ? (
                      <div className="space-y-3">
                        {gifteeWishlist.wishlist.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-lg bg-midnight-50"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-cream">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-cream/60 text-sm mt-1">
                                    {item.description}
                                  </p>
                                )}
                                {item.priceEstimate && (
                                  <p className="text-gold text-sm mt-2">
                                    ~₹{item.priceEstimate}
                                  </p>
                                )}
                              </div>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gold hover:text-gold-light transition-colors"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-cream/60 text-center py-4">
                        No wishlist items yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Giftee's Address */}
              {assignment?.assigned && gifteeAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gifteeAddress.address ? (
                      <div className="p-4 rounded-lg bg-midnight-50">
                        <p className="text-cream">
                          {gifteeAddress.giftee.name}
                        </p>
                        <p className="text-cream/70">
                          {gifteeAddress.address.streetLine1}
                        </p>
                        {gifteeAddress.address.streetLine2 && (
                          <p className="text-cream/70">
                            {gifteeAddress.address.streetLine2}
                          </p>
                        )}
                        <p className="text-cream/70">
                          {gifteeAddress.address.city},{" "}
                          {gifteeAddress.address.state}{" "}
                          {gifteeAddress.address.postalCode}
                        </p>
                        <p className="text-cream/70">
                          {gifteeAddress.address.country}
                        </p>
                      </div>
                    ) : (
                      <p className="text-cream/60 text-center py-4">
                        {gifteeAddress.message || "Address not provided yet."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Members"
      >
        <form
          onSubmit={inviteForm.handleSubmit(handleInvite)}
          className="space-y-4"
        >
          <Textarea
            {...inviteForm.register("emails")}
            label="Email Addresses"
            placeholder="Enter emails separated by commas or new lines"
            className="min-h-[120px]"
            error={
              inviteForm.formState.errors.emails?.message as string | undefined
            }
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitations
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      {isAdmin && (
        <Modal
          isOpen={isEditTeamModalOpen}
          onClose={() => setIsEditTeamModalOpen(false)}
          title="Edit Team Details"
          size="lg"
        >
          <form
            onSubmit={teamEditForm.handleSubmit(handleUpdateTeam)}
            className="space-y-4"
          >
            <Input
              {...teamEditForm.register("name")}
              label="Team Name"
              placeholder="e.g., Office Secret Santa 2024"
              error={teamEditForm.formState.errors.name?.message}
              autoFocus
            />

            <Textarea
              {...teamEditForm.register("description")}
              label="Description (optional)"
              placeholder="Our annual office gift exchange..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...teamEditForm.register("budgetMin")}
                type="number"
                label="Min Budget (₹)"
                placeholder="500"
              />
              <Input
                {...teamEditForm.register("budgetMax")}
                type="number"
                label="Max Budget (₹)"
                placeholder="2000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...teamEditForm.register("wishlistDeadline")}
                type="date"
                label="Wishlist Deadline"
              />
              <Input
                {...teamEditForm.register("exchangeDate")}
                type="date"
                label="Exchange Date"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditTeamModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={updateTeamMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Secret Santas"
      >
        <div className="space-y-4">
          <p className="text-cream/70">
            Are you ready to assign Secret Santas? This will randomly match each
            member with someone to buy a gift for.
          </p>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-warning text-sm">
              ⚠️ This action cannot be undone. Make sure all members have joined
              before proceeding.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => triggerAssignmentMutation.mutate()}
              isLoading={triggerAssignmentMutation.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Assign Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Onboarding Modal */}
      <Onboarding
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCreateTeam={() => {
          setIsOnboardingOpen(false);
          router.push("/dashboard");
        }}
        onGoToTeam={(id) => {
          setIsOnboardingOpen(false);
          router.push(`/dashboard/teams/${id}`);
        }}
        persona={isAdmin ? "admin" : "member"}
        firstTeamId={teamId}
        firstTeamName={team?.name}
      />
    </div>
  );
}
