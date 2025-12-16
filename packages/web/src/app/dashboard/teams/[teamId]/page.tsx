"use client";

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
  ExternalLink,
  Gift,
  Loader2,
  Mail,
  MapPin,
  Package,
  Sparkles,
  Trash2,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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

type WishItemForm = z.infer<typeof wishItemSchema>;
type AddressForm = z.infer<typeof addressSchema>;

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
  const [wishItems, setWishItems] = useState<WishItemForm[]>([]);

  if (!authLoading && !user) {
    router.push("/auth/login");
    return null;
  }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      setIsInviteModalOpen(false);
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
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: (data: AddressForm) => api.updateAddress(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["address", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
    },
  });

  const triggerAssignmentMutation = useMutation({
    mutationFn: () => api.triggerAssignment(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
      setIsAssignModalOpen(false);
    },
  });

  const updateGiftStatusMutation = useMutation({
    mutationFn: (giftStatus: string) =>
      api.updateAssignment(teamId, giftStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment", teamId] });
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
  useState(() => {
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
  });

  const handleInvite = async (data: { emails: string }) => {
    const emailList = data.emails
      .split(/[,\n]/)
      .map((e: string) => e.trim())
      .filter((e: string) => e);
    await inviteMutation.mutateAsync(emailList);
    inviteForm.reset();
  };

  const handleAddWishItem = () => {
    setWishItems([
      ...wishItems,
      { title: "", description: "", url: "", priceEstimate: "" },
    ]);
  };

  const handleRemoveWishItem = (index: number) => {
    setWishItems(wishItems.filter((_, i) => i !== index));
  };

  const handleWishItemChange = (
    index: number,
    field: keyof WishItemForm,
    value: string
  ) => {
    const updated = [...wishItems];
    updated[index] = { ...updated[index], [field]: value };
    setWishItems(updated);
  };

  const handleSaveWishlist = () => {
    const validItems = wishItems.filter((item) => item.title.trim());
    updateWishlistMutation.mutate(validItems);
  };

  const handleSaveAddress = (data: AddressForm) => {
    updateAddressMutation.mutate(data);
  };

  const isAdmin = team?.role === "admin";

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
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
                {status?.canAssign && (
                  <Button size="sm" onClick={() => setIsAssignModalOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Assign Santas
                  </Button>
                )}
              </div>
            )}
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
            <div>
              <h1 className="text-3xl font-display font-bold text-cream mb-2">
                {team.name}
              </h1>
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
                    Budget: ${team.budgetMin} - ${team.budgetMax}
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
                          <Badge variant="warning">Pending</Badge>
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
                <CardTitle>My Wishlist</CardTitle>
                <CardDescription>
                  Add items you'd love to receive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wishItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-midnight-50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <Input
                          value={item.title}
                          onChange={(e) =>
                            handleWishItemChange(index, "title", e.target.value)
                          }
                          placeholder="Item name"
                          className="flex-1"
                        />
                        <button
                          onClick={() => handleRemoveWishItem(index)}
                          className="ml-2 p-2 text-error/70 hover:text-error transition-colors"
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
                        placeholder="Description (optional)"
                        className="min-h-[60px]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={item.url}
                          onChange={(e) =>
                            handleWishItemChange(index, "url", e.target.value)
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
                          placeholder="Price estimate"
                          type="number"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="secondary"
                    onClick={handleAddWishItem}
                    className="w-full"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>

                  {wishItems.length > 0 && (
                    <Button
                      onClick={handleSaveWishlist}
                      isLoading={updateWishlistMutation.isPending}
                      className="w-full"
                    >
                      Save Wishlist
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
                <CardDescription>
                  Where should your Secret Santa send your gift?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={addressForm.handleSubmit(handleSaveAddress)}
                  className="space-y-4"
                >
                  <Input
                    {...addressForm.register("streetLine1")}
                    label="Street Address"
                    placeholder="123 Main St"
                    error={addressForm.formState.errors.streetLine1?.message}
                    defaultValue={address?.streetLine1}
                  />
                  <Input
                    {...addressForm.register("streetLine2")}
                    label="Apt, Suite, etc. (optional)"
                    placeholder="Apt 4B"
                    defaultValue={address?.streetLine2 || ""}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      {...addressForm.register("city")}
                      label="City"
                      placeholder="New York"
                      error={addressForm.formState.errors.city?.message}
                      defaultValue={address?.city}
                    />
                    <Input
                      {...addressForm.register("state")}
                      label="State/Province"
                      placeholder="NY"
                      defaultValue={address?.state || ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      {...addressForm.register("postalCode")}
                      label="Postal Code"
                      placeholder="10001"
                      error={addressForm.formState.errors.postalCode?.message}
                      defaultValue={address?.postalCode}
                    />
                    <Input
                      {...addressForm.register("country")}
                      label="Country"
                      placeholder="United States"
                      error={addressForm.formState.errors.country?.message}
                      defaultValue={address?.country}
                    />
                  </div>
                  <Button
                    type="submit"
                    isLoading={updateAddressMutation.isPending}
                    className="w-full"
                  >
                    Save Address
                  </Button>
                </form>
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
                        You're getting a gift for this person!
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
                      <p className="text-cream/60">
                        The team admin will assign Secret Santas once everyone
                        is ready.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Giftee's Wishlist */}
              {assignment?.assigned && gifteeWishlist && (
                <Card>
                  <CardHeader>
                    <CardTitle>{assignment.giftee?.name}'s Wishlist</CardTitle>
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
                                    ~${item.priceEstimate}
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
    </div>
  );
}
