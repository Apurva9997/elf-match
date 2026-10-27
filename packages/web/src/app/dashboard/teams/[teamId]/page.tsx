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
import { cn, dateInputValue, formatDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Gift,
  Heart,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Truck,
  User,
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
    "overview" | "wishlist" | "address" | "assignment" | "exclusions"
  >("overview");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [wishItems, setWishItems] = useState<WishItemForm[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Exclusion management state
  const [isAddExclusionOpen, setIsAddExclusionOpen] = useState(false);
  const [selectedMember1, setSelectedMember1] = useState<string>("");
  const [selectedMember2, setSelectedMember2] = useState<string>("");
  const [exclusionReason, setExclusionReason] = useState("");

  // Assignment preview state
  const [assignmentStep, setAssignmentStep] = useState<
    "intro" | "preview" | "confirm"
  >("intro");
  const [previewData, setPreviewData] = useState<{
    preview: Array<{
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
    }>;
    totalAssignments: number;
    exclusionsApplied: number;
  } | null>(null);

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
  const wishlistSaveChain = useRef(Promise.resolve());
  const pincodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const {
    data: team,
    isLoading: teamLoading,
    isError: teamError,
    error: teamErrorDetail,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => api.getTeam(teamId),
    enabled: !!user,
    retry: 1,
    staleTime: 30_000,
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

  // Exclusions query (for admins)
  const { data: exclusions, isLoading: exclusionsLoading } = useQuery({
    queryKey: ["exclusions", teamId],
    queryFn: () => api.listExclusions(teamId),
    enabled: !!user && team?.role === "admin",
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
    mutationFn: (items: WishItemForm[]) => {
      const save = wishlistSaveChain.current.then(() =>
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
        )
      );
      // A later edit must not be overwritten by an earlier save that
      // finishes second. Keep the chain moving even when one save fails.
      wishlistSaveChain.current = save.then(
        () => undefined,
        () => undefined
      );
      return save;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success("Wishlist updated!");
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          "Couldn't save your wishlist. Your changes are safe—try saving again."
      );
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: (data: AddressForm) => api.updateAddress(teamId, data),
    onSuccess: () => {
      // Invalidate all address queries since address is shared across all teams
      queryClient.invalidateQueries({ queryKey: ["address"] });
      // Also invalidate profile since it shows the same address
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success("Address saved! Your Secret Santa can now ship your gift.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't save address. Please try again.");
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
      toast.success("Exchange updated successfully");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't update exchange. Please try again."
      );
    },
  });

  const triggerAssignmentMutation = useMutation({
    mutationFn: (
      assignments?: Array<{ giverId: string; receiverId: string }>
    ) => api.triggerAssignment(teamId, assignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      setIsAssignModalOpen(false);
      setAssignmentStep("intro");
      setPreviewData(null);
      toast.success(
        "Assignments sent! Everyone will receive an email with their Secret Santa."
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't assign Secret Santas. Please try again."
      );
    },
  });

  const updateGiftStatusMutation = useMutation({
    mutationFn: (giftStatus: string) =>
      api.updateAssignment(teamId, giftStatus),
    onSuccess: (_, giftStatus) => {
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      const statusMessages: Record<string, string> = {
        pending: "Status reset to not started",
        purchased: "Gift marked as bought!",
        shipped: "Gift marked as on the way!",
        delivered: "Gift marked as delivered!",
      };
      toast.success(statusMessages[giftStatus] || "Status updated!");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't update gift status. Please try again."
      );
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (memberId: string) => api.resendInvitation(teamId, memberId),
    onSuccess: () => {
      toast.success("Invitation email sent!");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't resend invitation. Please try again."
      );
    },
  });

  // Exclusion mutations
  const addExclusionMutation = useMutation({
    mutationFn: (data: {
      member1Id: string;
      member2Id: string;
      reason?: string;
      bidirectional?: boolean;
    }) => api.addExclusion(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exclusions", teamId] });
      setIsAddExclusionOpen(false);
      setSelectedMember1("");
      setSelectedMember2("");
      setExclusionReason("");
      toast.success("Exclusion added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't add exclusion. Please try again.");
    },
  });

  const removeExclusionMutation = useMutation({
    mutationFn: (exclusionId: string) =>
      api.removeExclusion(teamId, exclusionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exclusions", teamId] });
      toast.success("Exclusion removed");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't remove exclusion. Please try again."
      );
    },
  });

  // Preview assignment mutation
  const previewAssignmentMutation = useMutation({
    mutationFn: () => api.previewAssignment(teamId),
    onSuccess: (data) => {
      setPreviewData(data);
      setAssignmentStep("preview");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't generate preview. Please try again."
      );
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
        exchangeDate: dateInputValue(team.exchangeDate),
        wishlistDeadline: dateInputValue(team.wishlistDeadline),
      });
    }
    setIsEditTeamModalOpen(true);
  };

  const handleUpdateTeam = async (data: UpdateTeamForm) => {
    await updateTeamMutation.mutateAsync(data);
  };

  const handleAddExclusion = () => {
    if (!selectedMember1 || !selectedMember2) {
      toast.error("Please select both members to exclude");
      return;
    }
    if (selectedMember1 === selectedMember2) {
      toast.error("Please select two different people");
      return;
    }
    addExclusionMutation.mutate({
      member1Id: selectedMember1,
      member2Id: selectedMember2,
      reason: exclusionReason || undefined,
      bidirectional: true,
    });
  };

  const handleOpenAssignModal = () => {
    setAssignmentStep("intro");
    setPreviewData(null);
    setIsAssignModalOpen(true);
  };

  const handleGeneratePreview = () => {
    previewAssignmentMutation.mutate();
  };

  const handleConfirmAssignment = async () => {
    if (!previewData) {
      toast.error("Preview not available. Please try generating again.");
      return;
    }

    // Convert preview data to the format expected by the API
    const assignments = previewData.preview.map((pair) => ({
      giverId: pair.giver.id,
      receiverId: pair.receiver.id,
    }));

    await triggerAssignmentMutation.mutateAsync(assignments);
  };

  const isAdmin = team?.role === "admin";

  // Get accepted members for exclusion dropdown
  const acceptedMembers =
    team?.members.filter((m) => m.invitationStatus === "accepted") || [];

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

  if (teamError || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="text-center p-8 max-w-md">
          <h2 className="text-xl font-display font-semibold text-cream mb-2">
            {teamError ? "Couldn't load this exchange" : "Team not found"}
          </h2>
          {teamError && (
            <p className="text-cream/60 mb-6">
              {teamErrorDetail instanceof Error
                ? teamErrorDetail.message
                : "The server didn't respond. Please try again."}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
            {teamError && (
              <Button onClick={() => refetchTeam()}>Try again</Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
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
              <Link href="/dashboard/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Your profile"
                  className="text-cream/70 hover:text-cream"
                >
                  <Avatar
                    name={user?.name || user?.email || "U"}
                    src={user?.avatarUrl}
                    size="sm"
                  />
                </Button>
              </Link>
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
                    <Button size="sm" onClick={handleOpenAssignModal}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Assign Santas
                    </Button>
                  ) : (
                    status &&
                    !status.hasAssignments && (
                      <span className="text-cream/50 text-xs hidden sm:inline">
                        Need {Math.max(0, 3 - status.totalMembers)} more joined
                        people to start matching
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
                    aria-label="Edit exchange"
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
                    ? "Building Wishlists"
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
              <div className="text-cream/60 text-sm">Joined</div>
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
        <div className="flex flex-wrap gap-1 mb-6 p-1 bg-midnight-50 rounded-lg w-fit">
          {(isAdmin
            ? ([
                "overview",
                "wishlist",
                "address",
                "exclusions",
                "assignment",
              ] as const)
            : (["overview", "wishlist", "address", "assignment"] as const)
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === tab
                  ? "bg-gradient-gold text-midnight"
                  : "text-cream/60 hover:text-cream"
              )}
            >
              {tab === "overview" && <Users className="w-4 h-4 inline mr-2" />}
              {tab === "wishlist" && <Gift className="w-4 h-4 inline mr-2" />}
              {tab === "address" && <MapPin className="w-4 h-4 inline mr-2" />}
              {tab === "exclusions" && (
                <Shield className="w-4 h-4 inline mr-2" />
              )}
              {tab === "assignment" && (
                <Sparkles className="w-4 h-4 inline mr-2" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
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
                  {
                    team.members.filter(
                      (member) => member.invitationStatus === "accepted"
                    ).length
                  }{" "}
                  joined
                  {team.members.some(
                    (member) => member.invitationStatus === "pending"
                  )
                    ? `, ${
                        team.members.filter(
                          (member) => member.invitationStatus === "pending"
                        ).length
                      } invited`
                    : ""}
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
                          {member.invitationStatus === "pending" &&
                            member.user?.name &&
                            member.invitedEmail && (
                              <div className="text-cream/50 text-sm">
                                {member.invitedEmail}
                              </div>
                            )}
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
                                type="button"
                                onClick={() =>
                                  resendInvitationMutation.mutate(member.id)
                                }
                                disabled={resendInvitationMutation.isPending}
                                aria-label={`Resend invitation to ${member.invitedEmail || "this person"}`}
                                className="p-1.5 text-ink-faint hover:text-cranberry disabled:opacity-50"
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
                      Share what you&apos;d love to receive this holiday season
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
                  {/* Add item input */}
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
                      placeholder="Add item: Gift card, book, headphones..."
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
                            className="p-4 rounded-lg bg-midnight-50"
                          >
                            {!isExpanded ? (
                              // Collapsed view - click anywhere to expand
                              <div
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => toggleItemExpand(index)}
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium text-cream">
                                    {item.title || "Untitled item"}
                                  </h4>
                                  {hasDetails && (
                                    <div className="flex items-center gap-3 mt-1 text-sm">
                                      {item.priceEstimate && (
                                        <span className="text-gold font-medium">
                                          ~₹{item.priceEstimate}
                                        </span>
                                      )}
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-gold hover:text-gold-light flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Link
                                        </a>
                                      )}
                                      {item.description && (
                                        <span className="text-cream/50 truncate max-w-[200px]">
                                          {item.description}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Edit className="w-4 h-4 text-cream/40 group-hover:text-cream/70 transition-colors" />
                              </div>
                            ) : (
                              // Expanded view - edit mode
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <Input
                                    value={item.title}
                                    onChange={(e) =>
                                      handleWishItemChange(
                                        index,
                                        "title",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Item name"
                                    className="flex-1"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWishItem(index)}
                                    aria-label={`Remove ${item.title || "wishlist item"}`}
                                    className="p-2 text-error/60 hover:text-error transition-colors"
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
                                  placeholder="Notes (size, color, brand preference...)"
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
                                    placeholder="Link (optional)"
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
                                    placeholder="Price (₹)"
                                    type="number"
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => toggleItemExpand(index)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-cream/60">
                      <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No wishlist items yet.</p>
                      <p className="text-sm mt-2">
                        Type above and press Enter to add items.
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
                    <CardTitle>Delivery Address</CardTitle>
                    <CardDescription>
                      Where should your gift be delivered? This address is
                      shared across all your exchanges.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Link href="/dashboard/profile">
                      <Button variant="ghost" size="sm">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                  </div>
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
                          label="Postal Code"
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
                            Looking up postal code...
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

          {/* Exclusions Tab (Admin Only) */}
          {activeTab === "exclusions" && isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gold" />
                      Exclusion Rules
                    </CardTitle>
                    <CardDescription>
                      Prevent certain pairs from being matched (e.g., couples,
                      family members)
                    </CardDescription>
                  </div>
                  {!status?.hasAssignments && (
                    <Button
                      size="sm"
                      onClick={() => setIsAddExclusionOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Exclusion
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {status?.hasAssignments && (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 mb-4">
                    <p className="text-warning text-sm">
                      ⚠️ Exclusions cannot be modified after assignments have
                      been made.
                    </p>
                  </div>
                )}

                {exclusionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gold" />
                  </div>
                ) : exclusions && exclusions.length > 0 ? (
                  <div className="space-y-3">
                    {exclusions.map((exclusion) => (
                      <div
                        key={exclusion.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-midnight-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={
                                exclusion.member1.user?.name ||
                                exclusion.member1.invitedEmail ||
                                "?"
                              }
                              src={exclusion.member1.user?.avatarUrl}
                              size="sm"
                            />
                            <span className="text-cream font-medium">
                              {exclusion.member1.user?.name ||
                                exclusion.member1.invitedEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-cream/50">
                            <Heart className="w-4 h-4 text-rose-400" />
                            <ArrowRight className="w-4 h-4" />
                            <ArrowLeft className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={
                                exclusion.member2.user?.name ||
                                exclusion.member2.invitedEmail ||
                                "?"
                              }
                              src={exclusion.member2.user?.avatarUrl}
                              size="sm"
                            />
                            <span className="text-cream font-medium">
                              {exclusion.member2.user?.name ||
                                exclusion.member2.invitedEmail}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {exclusion.reason && (
                            <span className="text-cream/50 text-sm">
                              {exclusion.reason}
                            </span>
                          )}
                          {!status?.hasAssignments && (
                            <button
                              type="button"
                              onClick={() =>
                                removeExclusionMutation.mutate(exclusion.id)
                              }
                              disabled={removeExclusionMutation.isPending}
                              aria-label={`Remove exclusion between ${
                                exclusion.member1.user?.name ||
                                exclusion.member1.invitedEmail ||
                                "the first person"
                              } and ${
                                exclusion.member2.user?.name ||
                                exclusion.member2.invitedEmail ||
                                "the second person"
                              }`}
                              className="p-2 text-error/70 hover:text-error transition-colors disabled:opacity-50"
                            >
                              {removeExclusionMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-cream/60">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-2">No exclusions set</p>
                    <p className="text-sm">
                      Add exclusions to prevent certain people from being
                      matched together (e.g., couples who don&apos;t want to
                      gift each other).
                    </p>
                  </div>
                )}

                {/* Add Exclusion Form */}
                {isAddExclusionOpen && !status?.hasAssignments && (
                  <div className="mt-6 p-4 rounded-lg border border-cream/20 bg-midnight-50">
                    <h4 className="text-cream font-medium mb-4">
                      Add New Exclusion
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-cream/70 text-sm mb-2">
                            Person 1
                          </label>
                          <select
                            value={selectedMember1}
                            onChange={(e) => setSelectedMember1(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-midnight border border-cream/20 text-cream focus:border-gold focus:outline-none"
                          >
                            <option value="">Select a member...</option>
                            {acceptedMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.user?.name || member.invitedEmail}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-cream/70 text-sm mb-2">
                            Person 2
                          </label>
                          <select
                            value={selectedMember2}
                            onChange={(e) => setSelectedMember2(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-midnight border border-cream/20 text-cream focus:border-gold focus:outline-none"
                          >
                            <option value="">Select a member...</option>
                            {acceptedMembers
                              .filter((m) => m.id !== selectedMember1)
                              .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.user?.name || member.invitedEmail}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-cream/70 text-sm mb-2">
                          Reason (optional)
                        </label>
                        <Input
                          value={exclusionReason}
                          onChange={(e) => setExclusionReason(e.target.value)}
                          placeholder="e.g., Couple, Family members"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setIsAddExclusionOpen(false);
                            setSelectedMember1("");
                            setSelectedMember2("");
                            setExclusionReason("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddExclusion}
                          isLoading={addExclusionMutation.isPending}
                          disabled={!selectedMember1 || !selectedMember2}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Exclusion
                        </Button>
                      </div>
                    </div>
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
                  <CardTitle>
                    {assignment?.assigned
                      ? "You are buying for"
                      : "Your assignment"}
                  </CardTitle>
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
                      <h3 className="text-2xl font-display font-bold text-cream mb-6">
                        {assignment.giftee?.name || "Name not shared"}
                      </h3>

                      {/* Gift Status */}
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
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
                              <>
                                <Clock className="w-4 h-4 inline mr-1" />
                                Not Started
                              </>
                            )}
                            {status === "purchased" && (
                              <>
                                <Package className="w-4 h-4 inline mr-1" />
                                Bought
                              </>
                            )}
                            {status === "shipped" && (
                              <>
                                <Truck className="w-4 h-4 inline mr-1" />
                                On the Way
                              </>
                            )}
                            {status === "delivered" && (
                              <>
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Delivered
                              </>
                            )}
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
                        Assignments Coming Soon
                      </h3>
                      <p className="text-cream/60 mb-4">
                        {isAdmin
                          ? status?.canAssign
                            ? "You can now assign Secret Santas! Click the button above."
                            : `You need at least 3 joined people to start matching. ${status?.totalMembers ?? 0} have joined so far.`
                          : "The exchange admin will assign Secret Santas once everyone is ready."}
                      </p>
                      {isAdmin && status?.canAssign && (
                        <Button onClick={handleOpenAssignModal}>
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
                    <CardTitle>Delivery Address</CardTitle>
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
          title="Edit Exchange Details"
          size="lg"
        >
          <form
            onSubmit={teamEditForm.handleSubmit(handleUpdateTeam)}
            className="space-y-4"
          >
            <Input
              {...teamEditForm.register("name")}
              label="Exchange Name"
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

      {/* Assign Modal - Multi-step flow */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignmentStep("intro");
          setPreviewData(null);
        }}
        title={
          assignmentStep === "intro"
            ? "Assign Secret Santas"
            : assignmentStep === "preview"
              ? "Review Assignments"
              : "Confirm & Send"
        }
        size={assignmentStep === "preview" ? "lg" : "md"}
      >
        {/* Step 1: Intro */}
        {assignmentStep === "intro" && (
          <div className="space-y-4">
            <p className="text-cream/70">
              Ready to assign Secret Santas? Here&apos;s what will happen:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-cream/70 text-sm">
              <li>
                We&apos;ll randomly match each member with someone to gift
              </li>
              <li>You&apos;ll see a preview of all assignments</li>
              <li>You can regenerate if you&apos;re not happy</li>
              <li>
                Once confirmed, everyone gets an email with their assignment
              </li>
            </ol>

            {exclusions && exclusions.length > 0 && (
              <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
                <p className="text-gold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {exclusions.length} exclusion
                  {exclusions.length !== 1 ? "s" : ""} will be respected
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-warning text-sm">
                ⚠️ Make sure all members have joined before proceeding.
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
                onClick={handleGeneratePreview}
                isLoading={previewAssignmentMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {assignmentStep === "preview" && previewData && (
          <div className="space-y-4">
            <p className="text-cream/70 text-sm">
              Here&apos;s how everyone will be matched. Review the assignments
              below.
            </p>

            {previewData.exclusionsApplied > 0 && (
              <div className="p-2 rounded-lg bg-gold/10 border border-gold/20">
                <p className="text-gold text-xs flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  {previewData.exclusionsApplied} exclusion
                  {previewData.exclusionsApplied !== 1 ? "s" : ""} applied
                </p>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {previewData.preview.map((pair, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-midnight-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={pair.giver.name}
                      src={pair.giver.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <p className="text-cream font-medium text-sm">
                        {pair.giver.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gold">
                    <Gift className="w-4 h-4" />
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-cream font-medium text-sm">
                        {pair.receiver.name}
                      </p>
                    </div>
                    <Avatar
                      name={pair.receiver.name}
                      src={pair.receiver.avatarUrl}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAssignmentStep("intro");
                    setPreviewData(null);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    onClick={handleGeneratePreview}
                    isLoading={previewAssignmentMutation.isPending}
                    variant="secondary"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-assign
                  </Button>
                  <Button onClick={() => setAssignmentStep("confirm")}>
                    Looks Good
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              <p className="text-cream/50 text-xs text-center">
                Not happy with these assignments? Click &quot;Re-assign&quot; to
                generate a new set.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {assignmentStep === "confirm" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-xl font-display font-semibold text-cream mb-2">
                Ready to Send!
              </h3>
              <p className="text-cream/70">
                {previewData?.totalAssignments} members will receive an email
                with their Secret Santa.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-error/10 border border-error/20">
              <p className="text-error text-sm text-center">
                ⚠️ This action cannot be undone. Assignments are final once
                sent.
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => setAssignmentStep("preview")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Preview
              </Button>
              <Button
                onClick={handleConfirmAssignment}
                isLoading={triggerAssignmentMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Confirm & Send Emails
              </Button>
            </div>
          </div>
        )}
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
