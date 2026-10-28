"use client";

import { Onboarding } from "@/components/onboarding";
import {
  AssignmentReveal,
  Celebration,
  LetterDesk,
  ProgressTrail,
  StampCollection,
  WishlistSendScene,
  type PostalStamp,
  type TrailStep,
} from "@/components/postal/scenes";
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
import { track } from "@/lib/analytics";
import { ApiError, api } from "@/lib/api";
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
  Link2,
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

const updateTeamSchema = z
  .object({
    name: z.string().min(1, "Exchange name is required").max(255),
    description: z.string().optional(),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
    exchangeDate: z.string().optional(),
    wishlistDeadline: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const min = data.budgetMin ? Number(data.budgetMin) : null;
    const max = data.budgetMax ? Number(data.budgetMax) : null;
    if (min != null && max != null && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum cannot be higher than maximum.",
        path: ["budgetMin"],
      });
    }
    if (
      data.exchangeDate &&
      data.wishlistDeadline &&
      data.wishlistDeadline > data.exchangeDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wishlists are due after the exchange date.",
        path: ["wishlistDeadline"],
      });
    }
  });

type WishItemForm = z.infer<typeof wishItemSchema>;
type AddressForm = z.infer<typeof addressSchema>;
type UpdateTeamForm = z.infer<typeof updateTeamSchema>;

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "wishlist" | "address" | "assignment" | "exclusions"
  >("overview");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [confirmRemind, setConfirmRemind] = useState(false);
  const [sentDraw, setSentDraw] = useState(false);
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
  const [drawBlocked, setDrawBlocked] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
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
  const [letterPhase, setLetterPhase] = useState<"writing" | "sending" | "sent">(
    "writing"
  );
  const [letterError, setLetterError] = useState<string | null>(null);
  const [revealMode, setRevealMode] = useState<"checking" | "full" | "quiet">(
    "checking"
  );
  const [replaying, setReplaying] = useState(false);
  const [giftScene, setGiftScene] = useState<"shop" | "sleigh" | null>(null);
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

  // The assignment request marks the draw as viewed, and a refetch
  // then reports firstView false. Remember the reveal in this browser
  // instead, so that refetch cannot skip the envelope.
  const revealKey = `elfmatch-reveal-${teamId}`;

  const {
    data: assignment,
    isLoading: assignmentLoading,
    isError: assignmentError,
    refetch: refetchAssignment,
  } = useQuery({
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      const invited = result.results.filter((item) => item.status === "invited");
      const invalid = result.results.filter((item) => item.status === "invalid");
      const skipped = result.results.filter(
        (item) => item.status !== "invited" && item.status !== "invalid"
      );
      if (invited.length === 0) {
        if (invalid.length > 0) {
          inviteForm.setError("emails", {
            message: "None of those look like email addresses.",
          });
        } else {
          inviteForm.setError("emails", {
            message: "Those addresses are already on this exchange.",
          });
        }
        return;
      }
      setIsInviteModalOpen(false);
      const notes = [
        skipped.length > 0
          ? `${skipped.length} already on this exchange`
          : "",
        invalid.length > 0
          ? `${invalid.length} not an email address`
          : "",
      ].filter(Boolean);
      toast.success(
        notes.length > 0
          ? `Sent ${invited.length}. ${notes.join(". ")}.`
          : `Invitation${invited.length > 1 ? "s" : ""} sent. Copy the link if they miss the email.`
      );
    },
    onError: (error: Error) => {
      inviteForm.setError("emails", {
        message: error.message || "Couldn't send those invitations.",
      });
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
      if (
        items.some((item) => item.title.trim()) &&
        sessionStorage.getItem(`elfmatch-wishlist-${teamId}`) !== "1"
      ) {
        sessionStorage.setItem(`elfmatch-wishlist-${teamId}`, "1");
        track("wishlist_completed", {
          role: team?.role === "admin" ? "admin" : "member",
        });
      }
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
        budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : null,
        budgetMax: data.budgetMax ? parseFloat(data.budgetMax) : null,
        exchangeDate: data.exchangeDate || null,
        wishlistDeadline: data.wishlistDeadline || null,
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      setAssignmentStep("intro");
      setPreviewData(null);
      setSentDraw(true);
      track("draw_confirmed", { role: "admin" });
      if (result.failed.length > 0) {
        toast.error(
          "Assignments are saved and cannot be changed. Some emails did not send — use Send the missing emails."
        );
      } else {
        toast.success("Assignments emailed. They cannot be changed.");
      }
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
        pending: "Set back to not started. Nothing was sent.",
        delivered: "Marked delivered. Only you can see this.",
      };
      if (statusMessages[giftStatus]) toast.success(statusMessages[giftStatus]);
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Couldn't update gift status. Please try again."
      );
    },
  });

  const remindMutation = useMutation({
    mutationFn: () => api.sendReminders(teamId),
    onSuccess: (result) => {
      setConfirmRemind(false);
      toast.success(
        result.results.filter((item) => item.sent).length > 0
          ? "Reminders sent to people missing a list or address."
          : "Everyone who has joined already has a list and an address."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't send reminders.");
    },
  });

  const retryEmailsMutation = useMutation({
    mutationFn: () => api.retryAssignmentEmails(teamId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't resend the assignment emails.");
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (memberId: string) => api.cancelInvitation(teamId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      toast.success("Invitation cancelled. That link no longer works.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't cancel that invitation.");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(teamId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["exclusions", teamId] });
      toast.success("Removed from the exchange. They were not in the draw.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't remove that person.");
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["exclusions", teamId] });
      setIsAddExclusionOpen(false);
      setSelectedMember1("");
      setSelectedMember2("");
      setExclusionReason("");
      toast.success(
        result.warning
          ? `Saved. A draw is not possible yet: ${result.warning}`
          : "Exclusion added. Those two will not be assigned to each other."
      );
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
      if (error instanceof ApiError && error.code === "DRAW_IMPOSSIBLE") {
        setDrawBlocked(error.message);
        setPreviewData(null);
        setAssignmentStep("intro");
        return;
      }
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
    const result = await inviteMutation.mutateAsync(emailList);
    if (result.results.some((item) => item.status === "invited")) {
      inviteForm.reset();
    }
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

  const flushWishlist = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const validItems = wishItems.filter((item) => item.title.trim());
    if (validItems.length === 0) {
      setLetterError("Add at least one wish before you stamp the letter.");
      return false;
    }
    const invalidUrl = validItems.find(
      (item) => item.url && !z.string().url().safeParse(item.url).success
    );
    if (invalidUrl) {
      setLetterError(`“${invalidUrl.title}” needs a full link, starting with https://, or a blank link.`);
      return false;
    }
    setLetterError(null);
    setSaveStatus("saving");
    try {
      await updateWishlistMutation.mutateAsync(validItems);
      setSaveStatus("saved");
      return true;
    } catch (error) {
      setSaveStatus("idle");
      setLetterError(
        error instanceof Error
          ? error.message
          : "Couldn't send your letter. Your wishes are still here — try again."
      );
      return false;
    }
  }, [updateWishlistMutation, wishItems]);

  const stampAndSend = async () => {
    if (letterPhase === "sending") return;
    const saved = await flushWishlist();
    if (!saved) return;
    setLetterPhase("sending");
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
    const name = data.name.trim();
    if (!name) {
      teamEditForm.setError("name", { message: "Exchange name is required" });
      return;
    }
    await updateTeamMutation.mutateAsync({ ...data, name });
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
    setDrawBlocked(null);
    setConfirmName("");
    setIsAssignModalOpen(true);
  };

  const createInviteLinkMutation = useMutation({
    mutationFn: () => api.createInviteLink(teamId),
    onSuccess: async (result) => {
      setInviteLinkUrl(result.url);
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      try {
        await navigator.clipboard.writeText(result.url);
        toast.success("Invite link copied. Anyone with it can join until you turn it off.");
      } catch {
        toast.success("Invite link ready. Copy it from the box.");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not create the invite link.");
    },
  });

  const disableInviteLinkMutation = useMutation({
    mutationFn: () => api.disableInviteLink(teamId),
    onSuccess: () => {
      setInviteLinkUrl(null);
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast.success("Invite link turned off. A new one will be a different address.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not turn off the invite link.");
    },
  });

  const copySharedInviteLink = async () => {
    if (!inviteLinkUrl) {
      createInviteLinkMutation.mutate();
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const copyInviteLink = async (token: string | null) => {
    if (!token) {
      toast.error("This invitation has no link yet. Resend it to create one.");
      return;
    }
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invitation link copied. They still sign in with the invited email.");
    } catch {
      toast.error("Could not copy the link.");
    }
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

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (
      requested === "overview" ||
      requested === "wishlist" ||
      requested === "address" ||
      requested === "assignment" ||
      requested === "exclusions"
    ) {
      setActiveTab(requested);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!assignment?.assigned) return;
    if (revealMode === "full") return;
    const seen = window.localStorage.getItem(revealKey) === "1";
    setRevealMode(seen ? "quiet" : "full");
  }, [assignment?.assigned, revealKey, revealMode]);

  const finishReveal = useCallback(() => {
    window.localStorage.setItem(revealKey, "1");
    setRevealMode("quiet");
    setReplaying(false);
  }, [revealKey]);

  const assignmentViewed = useRef(false);
  useEffect(() => {
    if (
      activeTab === "assignment" &&
      assignment?.assigned &&
      !assignmentViewed.current
    ) {
      assignmentViewed.current = true;
      track("assignment_viewed", {
        role: team?.role === "admin" ? "admin" : "member",
      });
    }
  }, [activeTab, assignment?.assigned, team?.role]);

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
          <h2 className="text-xl font-display font-semibold text-ink mb-2">
            {teamError ? "Couldn't load this exchange" : "Team not found"}
          </h2>
          {teamError && (
            <p className="text-ink-soft mb-6">
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
    <div className="min-h-screen scroll-clear">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 border-b border-rule bg-ivory/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center text-ink-soft hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOnboardingOpen(true)}
                className="text-ink-soft hover:text-ink"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How to
              </Button>
              <Link href="/dashboard/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Your profile"
                  className="text-ink-soft hover:text-ink"
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
                  {status?.canAssign && !status.hasAssignments && (
                    <Button size="sm" variant="secondary" onClick={handleOpenAssignModal}>
                      Preview the draw
                    </Button>
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
              <h1 className="font-display text-3xl font-bold text-ink">
                {team.name}
              </h1>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditTeam}
                  aria-label="Edit exchange"
                  className="mt-1 min-h-11 px-3"
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              )}
              {team.description && (
                <p className="mt-3 text-ink-soft">{team.description}</p>
              )}
              <p className="text-ink">
                {status?.drawComplete
                  ? status.assignmentEmailsPending > 0
                    ? `Names are drawn. ${status.assignmentEmailsPending} ${status.assignmentEmailsPending === 1 ? "email has" : "emails have"} not been sent.`
                    : assignment?.assigned && assignment.giftee?.name
                      ? `You are buying for ${assignment.giftee.name}.`
                      : "Names are drawn."
                  : status?.hasAssignments
                    ? `The draw is incomplete. ${status.assignmentCount} of ${status.totalMembers} have a recipient.`
                  : status
                    ? status.totalMembers >= 3
                      ? status.pendingInvitations > 0
                        ? `${status.pendingInvitations} still invited. They will not be in the draw.`
                        : "Ready to preview the draw."
                      : `${status.totalMembers} joined. A draw needs three.`
                    : "Collecting the list."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {team.exchangeDate && (
                  <span className="text-sm text-ink-soft">
                    Exchange: {formatDate(team.exchangeDate)}
                  </span>
                )}
                {team.wishlistDeadline && (
                  <span className="text-sm text-ink-soft">
                    Wishlists due: {formatDate(team.wishlistDeadline)}
                  </span>
                )}
                {team.budgetMin && team.budgetMax && (
                  <span className="text-sm text-ink-soft">
                    Budget: ₹{team.budgetMin} – ₹{team.budgetMax}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {status && isAdmin && status.drawComplete && status.assignmentEmailsPending > 0 && (
          <div className="mb-8 border border-cranberry/40 bg-ivory-card px-4 py-4">
            <p className="font-medium text-ink">
              The draw is saved. {status.assignmentEmailsPending}{" "}
              {status.assignmentEmailsPending === 1 ? "person has" : "people have"} not
              been emailed their recipient.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Assignments cannot be redrawn. Sending again only delivers the emails that failed.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => retryEmailsMutation.mutate()}
              isLoading={retryEmailsMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send the missing emails
            </Button>
          </div>
        )}

        {status && isAdmin && status.hasAssignments && !status.drawComplete && (
          <div className="mb-8 border border-cranberry/40 bg-ivory-card px-4 py-4">
            <p className="font-medium text-ink">
              The draw is incomplete. {status.assignmentCount} of {status.totalMembers} people have a recipient.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              A new draw cannot be sent while any pair is saved. People without a recipient see that, not a name.
            </p>
          </div>
        )}

        {status && isAdmin && !status.hasAssignments && (
          <div className="mb-8 border border-rule bg-ivory-card px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Before you draw
            </p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {[
                {
                  done: Boolean(team.exchangeDate),
                  label: team.exchangeDate
                    ? formatDate(team.exchangeDate)
                    : "Date missing",
                  detail: team.exchangeDate
                    ? "Exchange day"
                    : "Add one so the invitation agrees with this page.",
                },
                {
                  done: status.totalMembers >= 3,
                  label:
                    status.totalMembers === 1
                      ? "1 joined"
                      : `${status.totalMembers} joined`,
                  detail:
                    status.totalMembers >= 3
                      ? "Enough to draw"
                      : `${Math.max(0, 3 - status.totalMembers)} more needed. Pending invitations are left out.`,
                },
                {
                  done: status.pendingInvitations === 0,
                  label:
                    status.pendingInvitations === 0
                      ? "No one waiting"
                      : status.pendingInvitations === 1
                        ? "1 still invited"
                        : `${status.pendingInvitations} still invited`,
                  detail:
                    status.pendingInvitations > 0
                      ? "They will not be in the draw."
                      : "Everyone invited has joined.",
                },
                {
                  done: false,
                  label: "Preview, then send",
                  detail:
                    "You see every pairing. Sending emails the names, and they cannot be redrawn.",
                },
              ].map((step) => (
                <li
                  key={step.label}
                  className="border border-rule bg-ivory px-3 py-2"
                >
                  <span
                    className={
                      step.done ? "font-medium text-ink" : "font-medium text-cranberry"
                    }
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-ink-soft">{step.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">
              {status.membersWithWishlist} of {status.totalMembers} have a wishlist.
              {team.wishlistDeadline
                ? ` Due ${formatDate(team.wishlistDeadline)}.`
                : " No wishlist deadline set."}
            </p>
            <div className="mt-4">
              {confirmRemind ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-ink">
                    Email people who joined and are missing a wishlist or address?
                  </p>
                  <Button size="sm" onClick={() => remindMutation.mutate()} isLoading={remindMutation.isPending}>
                    Send reminders
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemind(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setConfirmRemind(true)}>
                  Remind people missing a list or address
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Exchange" className="mb-6 flex gap-1 overflow-x-auto border border-rule bg-ivory-card p-1 [scrollbar-width:thin]">
          {(isAdmin
            ? ([
                ["overview", "People", team.members.filter((member) => member.invitationStatus === "accepted").length],
                ["wishlist", "Letter", wishItems.filter((item) => item.title.trim()).length],
                ["address", "Address", address ? 1 : 0],
                ["exclusions", "Pairs", exclusions?.length ?? 0],
                ["assignment", "Delivery", assignment?.assigned ? 1 : 0],
              ] as const)
            : ([
                ["overview", "People", team.members.filter((member) => member.invitationStatus === "accepted").length],
                ["wishlist", "Letter", wishItems.filter((item) => item.title.trim()).length],
                ["address", "Address", address ? 1 : 0],
                ["assignment", "Delivery", assignment?.assigned ? 1 : 0],
              ] as const)
          ).map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors duration-180 sm:px-3",
                activeTab === tab
                  ? "bg-evergreen text-ivory"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {label}
              <span className={activeTab === tab ? "text-ivory/80" : "text-ink-faint"}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <section className="mb-6 border border-rule bg-ivory-card p-4" aria-label="Journey">
          <ProgressTrail
            steps={((): TrailStep[] => {
              const wishesSent = wishItems.some((item) => item.title.trim());
              const drawn = Boolean(assignment?.assigned);
              const status = assignment?.giftStatus || "pending";
              const preparing = status === "purchased" || status === "shipped" || status === "delivered";
              const shipped = status === "shipped" || status === "delivered";
              const steps: TrailStep[] = [
                { id: "write", label: "Write wishes", done: wishesSent },
                { id: "send", label: "Send letter", done: wishesSent },
                { id: "discover", label: "Discover", done: drawn },
                { id: "prepare", label: "Prepare gift", done: preparing },
                { id: "ship", label: "Send gift", done: shipped },
              ];
              const current = steps.find((step) => !step.done);
              if (current) current.current = true;
              return steps;
            })()}
          />
          {team.wishlistDeadline && !wishItems.some((item) => item.title.trim()) && (
            <p className="mt-3 text-sm text-ink-soft">
              Your letter is still blank. Wishlists are due {formatDate(team.wishlistDeadline)}.
            </p>
          )}
          {assignment?.assigned &&
            team.exchangeDate &&
            (assignment.giftStatus === "pending" || !assignment.giftStatus) && (
              <p className="mt-3 text-sm text-ink-soft">
                Gifts change hands {formatDate(team.exchangeDate)}. Nothing here buys a gift or tells {assignment.giftee?.name || "your recipient"}.
              </p>
            )}
          <div className="mt-4">
            <StampCollection
              stamps={((): PostalStamp[] => {
                const wishesSent = wishItems.some((item) => item.title.trim());
                const status = assignment?.giftStatus || "pending";
                return [
                  { id: "letter", name: "Letter", earned: wishesSent, caption: "Wishes sent" },
                  { id: "seal", name: "Seal", earned: Boolean(assignment?.assigned), caption: "Name opened" },
                  {
                    id: "shop",
                    name: "Sack",
                    earned: status === "purchased" || status === "shipped" || status === "delivered",
                    caption: "Preparing",
                  },
                  {
                    id: "sleigh",
                    name: "Sleigh",
                    earned: status === "shipped" || status === "delivered",
                    caption: "On the way",
                  },
                  { id: "hearth", name: "Hearth", earned: status === "delivered", caption: "Marked delivered" },
                ];
              })()}
            />
          </div>
        </section>

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
                <CardTitle>People</CardTitle>
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
                {isAdmin && (
                  <div className="mb-5 border border-rule bg-ivory p-4">
                    <p className="font-medium text-ink">Invite link</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      Share this in a group. Anyone who opens it and signs in joins as themselves. Email invitations still work the same way.
                    </p>
                    {team.inviteLinkEnabled || inviteLinkUrl ? (
                      <div className="mt-3 space-y-3">
                        {inviteLinkUrl ? (
                          <input
                            readOnly
                            value={inviteLinkUrl}
                            aria-label="Invite link"
                            onFocus={(event) => event.currentTarget.select()}
                            className="w-full border border-rule bg-ivory-card px-3 py-2 text-sm text-ink"
                          />
                        ) : (
                          <p className="text-sm text-ink-soft">
                            A link is already on. Copying it again replaces that address, and the previous one stops working.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={copySharedInviteLink}
                            isLoading={createInviteLinkMutation.isPending}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {inviteLinkUrl ? "Copy link" : "Copy a new link"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => disableInviteLinkMutation.mutate()}
                            disabled={disableInviteLinkMutation.isPending}
                            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-cranberry hover:underline disabled:opacity-50"
                          >
                            Turn off
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => createInviteLinkMutation.mutate()}
                        isLoading={createInviteLinkMutation.isPending}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy invite link
                      </Button>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="tag-press flex flex-col gap-3 border border-rule bg-ivory-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={member.user?.name || member.invitedEmail || "U"}
                          src={member.user?.avatarUrl}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">
                            {member.user?.name || member.invitedEmail}
                          </div>
                          {member.invitationStatus === "pending" &&
                            member.user?.name &&
                            member.invitedEmail && (
                              <div className="truncate text-sm text-ink-soft">
                                {member.invitedEmail}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:shrink-0 sm:justify-end">
                        {member.role === "admin" && (
                          <Badge variant="gold">Admin</Badge>
                        )}
                        {member.invitationStatus === "pending" && (
                          <>
                            <span className="text-sm text-cranberry">
                              Invited, not joined
                            </span>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyInviteLink(member.invitationLinkToken)
                                  }
                                  aria-label={`Copy invitation link for ${member.invitedEmail || "this person"}`}
                                  className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-evergreen hover:underline"
                                >
                                  <Link2 className="h-4 w-4" />
                                  Copy link
                                </button>
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Cancel the invitation to ${member.invitedEmail || "this person"}? Their link will stop working.`
                                      )
                                    ) {
                                      cancelInvitationMutation.mutate(member.id);
                                    }
                                  }}
                                  disabled={cancelInvitationMutation.isPending}
                                  aria-label={`Cancel invitation to ${member.invitedEmail || "this person"}`}
                                  className="p-1.5 text-ink-faint hover:text-cranberry disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {member.invitationStatus === "accepted" &&
                          isAdmin &&
                          member.id !== team.membershipId &&
                          !status?.hasAssignments && (
                            <button
                              type="button"
                              onClick={() => {
                                const name =
                                  member.user?.name || member.invitedEmail || "this person";
                                if (
                                  window.confirm(
                                    `Remove ${name} before the draw? They can be invited again. After names are drawn, a seat cannot be removed.`
                                  )
                                ) {
                                  removeMemberMutation.mutate(member.id);
                                }
                              }}
                              disabled={removeMemberMutation.isPending}
                              aria-label={`Remove ${member.user?.name || member.invitedEmail || "this person"}`}
                              className="p-1.5 text-ink-faint hover:text-cranberry disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Your letter</CardTitle>
                    <CardDescription>
                      After names are drawn, only the person assigned to give you a gift can read this. Other participants cannot.
                    </CardDescription>
                  </div>
                  <div aria-live="polite" className="shrink-0 text-sm">
                    {saveStatus === "saving" && (
                      <span className="flex items-center gap-2 text-ink-soft">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving
                      </span>
                    )}
                    {saveStatus === "saved" && letterPhase === "writing" && (
                      <span className="flex items-center gap-2 text-evergreen">
                        <CheckCircle className="w-4 h-4" />
                        Kept
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {letterPhase === "sending" && (
                  <WishlistSendScene onDone={() => setLetterPhase("sent")} />
                )}
                {letterPhase === "sent" && (
                  <div className="mb-6 border border-evergreen/30 bg-evergreen-soft px-4 py-4" role="status">
                    <p className="font-display text-2xl text-evergreen">
                      Your wishes are on their way.
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Only your assigned giver can read them, and only after the draw. You can keep editing the letter.
                    </p>
                    <Button
                      className="mt-3"
                      variant="secondary"
                      size="sm"
                      onClick={() => setLetterPhase("writing")}
                    >
                      View or edit your letter
                    </Button>
                  </div>
                )}
                {letterPhase === "writing" && (
                <LetterDesk stamp={wishItems.some((item) => item.title.trim())}>
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
                            className="p-4 rounded-lg bg-ivory"
                          >
                            {!isExpanded ? (
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-ink">
                                    {item.title || "Untitled item"}
                                  </h4>
                                  {hasDetails && (
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                      {item.priceEstimate && (
                                        <span className="font-medium text-ink">
                                          ₹{item.priceEstimate}
                                        </span>
                                      )}
                                      {item.description && (
                                        <span className="text-ink-soft">
                                          {item.description}
                                        </span>
                                      )}
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex min-h-11 items-center gap-1 text-evergreen hover:underline"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          Shop link
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleItemExpand(index)}
                                  aria-label={`Edit ${item.title || "wishlist item"}`}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-ink-soft hover:text-ink"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
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
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-cranberry"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
                                    placeholder="Price in rupees"
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
                    <div className="py-8 text-center text-ink-soft">
                      <Gift className="mx-auto mb-3 h-12 w-12 opacity-50" />
                      <p>The page is blank.</p>
                      <p className="mt-2 text-sm">
                        Write a wish above, then stamp the letter when it is ready.
                      </p>
                    </div>
                  )}
                  {letterError && letterPhase === "writing" && (
                    <p className="text-sm text-cranberry" role="alert">
                      {letterError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                    <p className="text-sm text-ink-soft">
                      {team.wishlistDeadline
                        ? `Wishlists are due ${formatDate(team.wishlistDeadline)}.`
                        : "No wishlist deadline is set."}
                    </p>
                    <Button
                      onClick={stampAndSend}
                      disabled={letterPhase !== "writing" || updateWishlistMutation.isPending}
                      aria-describedby="stamp-send-help"
                    >
                      Stamp & send
                    </Button>
                  </div>
                  <p id="stamp-send-help" className="sr-only">
                    Checks your wishes, saves them, then shows the letter leaving. If saving fails, the letter stays open.
                  </p>
                </div>
                </LetterDesk>
                )}
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
                          <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
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
                  <div className="p-4 rounded-lg bg-ivory">
                    <div className="space-y-1 text-ink">
                      <p className="font-medium">{address.streetLine1}</p>
                      {address.streetLine2 && (
                        <p className="text-ink-soft">{address.streetLine2}</p>
                      )}
                      <p className="text-ink-soft">
                        {address.city}
                        {address.state && `, ${address.state}`}{" "}
                        {address.postalCode}
                      </p>
                      <p className="text-ink-soft">{address.country}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-ink-soft">
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
                      A pair kept apart will not be assigned to each other, in either direction. Add one only if the group can still draw.
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
                        className="flex items-center justify-between p-4 rounded-lg bg-ivory"
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
                            <span className="text-ink font-medium">
                              {exclusion.member1.user?.name ||
                                exclusion.member1.invitedEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-ink-soft">
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
                            <span className="text-ink font-medium">
                              {exclusion.member2.user?.name ||
                                exclusion.member2.invitedEmail}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {exclusion.reason && (
                            <span className="text-ink-soft text-sm">
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
                  <div className="text-center py-8 text-ink-soft">
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
                  <div className="mt-6 p-4 rounded-lg border border-cream/20 bg-ivory">
                    <h4 className="text-ink font-medium mb-4">
                      Add New Exclusion
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-ink-soft text-sm mb-2">
                            Person 1
                          </label>
                          <select
                            value={selectedMember1}
                            onChange={(e) => setSelectedMember1(e.target.value)}
                            className="input-field"
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
                          <label className="block text-ink-soft text-sm mb-2">
                            Person 2
                          </label>
                          <select
                            value={selectedMember2}
                            onChange={(e) => setSelectedMember2(e.target.value)}
                            className="input-field"
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
                        <label className="block text-ink-soft text-sm mb-2">
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
                  {assignmentLoading ? (
                    <p className="py-8 text-center text-ink-soft">Opening your assignment.</p>
                  ) : assignmentError ? (
                    <div className="py-8 text-center">
                      <h3 className="font-display text-xl text-ink">
                        Your assignment did not open
                      </h3>
                      <p className="mt-2 text-ink-soft">
                        The draw may already be saved. Try again before assuming there is none.
                      </p>
                      <Button className="mt-4" variant="secondary" onClick={() => refetchAssignment()}>
                        Try again
                      </Button>
                    </div>
                  ) : status?.drawComplete && !assignment?.assigned ? (
                    <div className="py-8 text-center">
                      <h3 className="font-display text-xl text-ink">
                        The draw is saved. Your name did not load.
                      </h3>
                      <p className="mt-2 text-ink-soft">
                        Assignments cannot be redrawn. Try again.
                      </p>
                      <Button className="mt-4" variant="secondary" onClick={() => refetchAssignment()}>
                        Try again
                      </Button>
                    </div>
                  ) : assignment?.assigned ? (
                    <div className="py-4">
                      {revealMode === "checking" && (
                        <p className="py-8 text-center text-ink-soft">Opening your assignment.</p>
                      )}
                      {(revealMode === "full" || replaying) && assignment.giftee?.name && (
                        <AssignmentReveal
                          name={assignment.giftee.name}
                          budget={
                            team.budgetMin && team.budgetMax
                              ? `Stay inside ₹${Number(team.budgetMin)} – ₹${Number(team.budgetMax)}.`
                              : null
                          }
                          replay={replaying}
                          onDone={finishReveal}
                        />
                      )}
                      {revealMode === "quiet" && !replaying && (
                        <div className="text-center">
                          <div className="mx-auto mb-5 max-w-md border border-rule bg-ivory px-6 py-8 shadow-paper">
                            <p className="font-mono text-xs uppercase tracking-[0.14em] text-cranberry">
                              You are gifting to
                            </p>
                            <h3 className="mt-3 font-display text-4xl text-evergreen">
                              {assignment.giftee?.name || "Name not shared"}
                            </h3>
                            {team.budgetMin && team.budgetMax && (
                              <p className="mt-3 text-ink-soft">
                                Stay inside ₹{Number(team.budgetMin)} – ₹{Number(team.budgetMax)}.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplaying(true)}
                            className="min-h-11 px-3 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                          >
                            Replay reveal
                          </button>
                        </div>
                      )}

                      {giftScene && (
                        <Celebration
                          kind={giftScene}
                          title={giftScene === "shop" ? "Santa is checking the list." : "Your gift is on its way!"}
                          detail={
                            giftScene === "shop"
                              ? "This only marks your own progress. Nobody is told, and nothing is purchased."
                              : "Shipped means you sent it. It does not confirm arrival."
                          }
                          onDone={() => setGiftScene(null)}
                        />
                      )}

                      <div className="mx-auto mt-6 max-w-lg text-left">
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                          Your notes only
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {assignment.giftStatus === "purchased"
                            ? "Preparing your gift."
                            : assignment.giftStatus === "shipped"
                              ? "Marked on the way. Not confirmed delivered."
                              : assignment.giftStatus === "delivered"
                                ? "You marked this delivered."
                                : "Not started. Updating this does not buy anything or notify anyone."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Gift progress">
                          {(
                            [
                              ["pending", "Not started"],
                              ["purchased", "Start preparing gift"],
                              ["shipped", "Mark shipped"],
                              ["delivered", "Mark delivered"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={updateGiftStatusMutation.isPending}
                              onClick={() => {
                                if (assignment.giftStatus === value || updateGiftStatusMutation.isPending) return;
                                const previous = assignment.giftStatus;
                                updateGiftStatusMutation.mutate(value, {
                                  onSuccess: () => {
                                    if (value === "purchased" && previous !== "purchased") {
                                      setGiftScene("shop");
                                      toast.success("Preparing your gift. Only you can see this.");
                                    }
                                    if (value === "shipped" && previous !== "shipped") {
                                      setGiftScene("sleigh");
                                      toast.success("Marked on the way. Arrival is not confirmed.");
                                    }
                                  },
                                });
                              }}
                              className={cn(
                                "min-h-11 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen disabled:opacity-50",
                                assignment.giftStatus === value ||
                                  (!assignment.giftStatus && value === "pending")
                                  ? "bg-evergreen text-ivory"
                                  : "border border-rule bg-ivory-card text-ink-soft hover:text-ink"
                              )}
                            >
                              {assignment.giftStatus === value ? `${label} · current` : label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-sm text-ink-soft">
                          Chose the wrong one? Pick another status. Your recipient never sees these notes.
                        </p>
                      </div>
                    </div>
                  ) : status?.hasAssignments && !status.drawComplete ? (
                    <div className="py-8 text-center">
                      <h3 className="font-display text-xl text-ink">
                        The draw is incomplete
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-ink-soft">
                        {status.assignmentCount} of {status.totalMembers} people have a recipient. You do not have one yet. A new draw cannot be sent while any pair is saved.
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <h3 className="mb-2 font-display text-xl text-ink">
                        No assignment yet
                      </h3>
                      <p className="mb-4 text-ink-soft">
                        {isAdmin
                          ? status?.canAssign
                            ? status.pendingInvitations > 0
                              ? `${status.pendingInvitations} ${status.pendingInvitations === 1 ? "person is" : "people are"} still invited and will be left out. Draw only the people who have joined, when you mean to email them.`
                              : "Everyone invited has joined. Draw when you mean to email the assignments."
                            : `${status?.totalMembers ?? 0} joined. A draw needs three people who have accepted.`
                          : "The organizer sends assignments when the group is ready. You will see only your own recipient."}
                      </p>
                      {isAdmin && status?.canAssign && (
                        <Button variant="secondary" onClick={handleOpenAssignModal}>
                          Preview the draw
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {assignment?.assigned &&
                team?.exchangeDate &&
                team.exchangeDate < new Date().toISOString().slice(0, 10) &&
                team.role !== "admin" && (
                  <p className="text-center text-sm text-ink-soft">
                    Organizing one yourself next year?{" "}
                    <Link
                      href="/dashboard?new=1"
                      className="font-semibold text-evergreen underline-offset-2 hover:underline"
                    >
                      Start an exchange
                    </Link>
                    . Last year&apos;s addresses and wishlists are not copied.
                  </p>
                )}

              {assignment?.assigned && gifteeWishlist && (
                <Card id="recipient-wishes">
                  <CardHeader>
                    <CardTitle>
                      {assignment.giftee?.name}&apos;s wishes
                    </CardTitle>
                    <CardDescription>
                      What they asked for. Your progress notes stay with you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gifteeWishlist.wishlist?.items &&
                    gifteeWishlist.wishlist.items.length > 0 ? (
                      <div className="space-y-3">
                        {gifteeWishlist.wishlist.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-lg bg-ivory"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-ink">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-ink-soft text-sm mt-1">
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
                      <div className="py-6 text-center">
                        <p className="font-display text-xl text-ink">
                          Their letter has not arrived.
                        </p>
                        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                          {assignment.giftee?.name || "They"} have not added wishes yet.
                          The budget
                          {team.budgetMin && team.budgetMax
                            ? ` is ₹${team.budgetMin}–₹${team.budgetMax}`
                            : " has not been set"}
                          . You can still choose something in that range.
                        </p>
                        {isAdmin && (
                          <p className="mt-3 text-sm text-ink-soft">
                            From People, you can email everyone who joined and is missing a list or an address.
                          </p>
                        )}
                      </div>
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
                      <div className="p-4 rounded-lg bg-ivory">
                        <p className="text-ink">
                          {gifteeAddress.giftee.name}
                        </p>
                        <p className="text-ink-soft">
                          {gifteeAddress.address.streetLine1}
                        </p>
                        {gifteeAddress.address.streetLine2 && (
                          <p className="text-ink-soft">
                            {gifteeAddress.address.streetLine2}
                          </p>
                        )}
                        <p className="text-ink-soft">
                          {gifteeAddress.address.city},{" "}
                          {gifteeAddress.address.state}{" "}
                          {gifteeAddress.address.postalCode}
                        </p>
                        <p className="text-ink-soft">
                          {gifteeAddress.address.country}
                        </p>
                      </div>
                    ) : (
                      <p className="text-ink-soft text-center py-4">
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
        title="Invite people"
      >
        <form
          onSubmit={inviteForm.handleSubmit(handleInvite)}
          className="space-y-4"
        >
          <Textarea
            {...inviteForm.register("emails")}
            label="Email addresses"
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
              Send invitations
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      {isAdmin && (
        <Modal
          isOpen={isEditTeamModalOpen}
          onClose={() => setIsEditTeamModalOpen(false)}
          title="Edit the exchange"
          size="lg"
        >
          <form
            onSubmit={teamEditForm.handleSubmit(handleUpdateTeam)}
            className="space-y-4"
          >
            <Input
              {...teamEditForm.register("name")}
              label="Exchange name"
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
                label="Min budget, rupees"
                placeholder="500"
                error={teamEditForm.formState.errors.budgetMin?.message}
              />
              <Input
                {...teamEditForm.register("budgetMax")}
                type="number"
                label="Max budget, rupees"
                placeholder="2000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...teamEditForm.register("wishlistDeadline")}
                type="date"
                label="Wishlist deadline"
                error={teamEditForm.formState.errors.wishlistDeadline?.message}
              />
              <Input
                {...teamEditForm.register("exchangeDate")}
                type="date"
                label="Exchange date"
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
                Save changes
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
          setSentDraw(false);
        }}
        title={
          sentDraw
            ? "Sent"
            : assignmentStep === "intro"
            ? "Preview the draw"
            : assignmentStep === "preview"
              ? "Review the pairings"
              : "Send the names"
        }
        size={assignmentStep === "preview" ? "lg" : "md"}
      >
        {sentDraw && (
          <div className="relative overflow-hidden py-8 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={index}
                  className="paper-fall absolute top-0 h-3 w-2"
                  style={{
                    left: `${8 + index * 11}%`,
                    background: index % 2 ? "#8E3A42" : "#1E3A32",
                    animationDelay: `${index * 40}ms`,
                  }}
                />
              ))}
            </div>
            <h3 className="font-display text-2xl text-evergreen">Sent.</h3>
            <p className="mt-2 text-ink-soft">
              The names are saved and cannot be changed. Each person should have received only their own recipient. If someone says they did not, use Send the missing emails — that does not redraw.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSentDraw(false);
              }}
            >
              Close
            </Button>
          </div>
        )}

        {/* Step 1: Intro */}
        {assignmentStep === "intro" && !sentDraw && (
          <div className="space-y-4">
            <p className="text-ink-soft">
              A preview shows you every pairing. Nothing is emailed until you
              send it, and sending cannot be redrawn.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-ink-soft">
              <li>Each joined person gives one gift and receives one gift.</li>
              <li>You see every pairing. Generate another set if one feels wrong.</li>
              <li>Sending emails each person only their own recipient.</li>
            </ol>

            {drawBlocked && (
              <div className="border border-cranberry/40 bg-cranberry-soft p-3">
                <p className="text-sm text-ink">{drawBlocked}</p>
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold text-evergreen underline-offset-2 hover:underline"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setActiveTab("exclusions");
                  }}
                >
                  Edit exclusions
                </button>
              </div>
            )}

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
                {status?.pendingInvitations
                  ? `${status.pendingInvitations} ${status.pendingInvitations === 1 ? "person has" : "people have"} not joined. They will not be in this draw, and they cannot be added after you send it.`
                  : "Everyone who was invited has joined. After you send this, the names cannot be redrawn."}
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
        {assignmentStep === "preview" && previewData && !sentDraw && (
          <div className="space-y-4">
            <p className="text-ink-soft text-sm">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-ivory"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={pair.giver.name}
                      src={pair.giver.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <p className="text-ink font-medium text-sm">
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
                      <p className="text-ink font-medium text-sm">
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
                    Review before sending
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              <p className="text-ink-soft text-xs text-center">
                Not happy with these assignments? Click &quot;Re-assign&quot; to
                generate a new set.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {assignmentStep === "confirm" && !sentDraw && (
          <div className="space-y-4">
            <div className="relative text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-display text-2xl text-evergreen mb-2">
                Email these names. This cannot be redrawn.
              </h3>
              <p className="text-ink-soft">
                {previewData?.totalAssignments} people will each be emailed only their own recipient.
                {status?.pendingInvitations
                  ? ` ${status.pendingInvitations} ${status.pendingInvitations === 1 ? "person is" : "people are"} still invited and will not be included.`
                  : " Everyone invited has joined."}{" "}
                If an email fails, the names stay as you confirmed them.
              </p>
            </div>

            {(previewData?.totalAssignments ?? 0) > 10 && (
              <Input
                label={`Type “${team?.name ?? "the exchange name"}” to send`}
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
              />
            )}

            <div className="flex justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => setAssignmentStep("preview")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to preview
              </Button>
              <Button
                className="bg-cranberry text-ivory hover:bg-cranberry-deep"
                onClick={handleConfirmAssignment}
                isLoading={triggerAssignmentMutation.isPending}
                disabled={
                  (previewData?.totalAssignments ?? 0) > 10 &&
                  confirmName.trim() !== (team?.name ?? "")
                }
              >
                <Mail className="w-4 h-4 mr-2" />
                Email these names. This cannot be redrawn.
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
        drawn={Boolean(status?.drawComplete)}
        firstTeamId={teamId}
        firstTeamName={team?.name}
      />
    </div>
  );
}
