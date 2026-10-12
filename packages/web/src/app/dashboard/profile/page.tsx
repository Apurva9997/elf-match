"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type UserProfileInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  mobile: z.string().max(20).optional().or(z.literal("")),
  streetLine1: z.string().min(1, "Street address is required"),
  streetLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const pincodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorDetail,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
    enabled: !!user,
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const postalCode = watch("postalCode");

  // Auto-fill city and state from postal code (India-specific)
  useEffect(() => {
    if (pincodeTimeout.current) {
      clearTimeout(pincodeTimeout.current);
      pincodeTimeout.current = null;
    }

    if (!postalCode || postalCode.length !== 6) {
      return;
    }

    pincodeTimeout.current = setTimeout(async () => {
      setIsFetchingPincode(true);
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${postalCode}`
        );
        const data = await response.json();
        if (
          data &&
          data[0] &&
          data[0].Status === "Success" &&
          data[0].PostOffice &&
          data[0].PostOffice.length > 0
        ) {
          const postOffice = data[0].PostOffice[0];
          setValue("city", postOffice.District || "");
          setValue("state", postOffice.State || "");
          setValue("country", "India");
        }
      } catch (error) {
        console.error("Failed to fetch pincode details:", error);
      } finally {
        setIsFetchingPincode(false);
      }
    }, 500);

    return () => {
      if (pincodeTimeout.current) {
        clearTimeout(pincodeTimeout.current);
        pincodeTimeout.current = null;
      }
    };
  }, [postalCode, setValue]);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        mobile: profile.mobile || "",
        streetLine1: profile.address?.streetLine1 || "",
        streetLine2: profile.address?.streetLine2 || "",
        city: profile.address?.city || "",
        state: profile.address?.state || "",
        postalCode: profile.address?.postalCode || "",
        country: profile.address?.country || "India",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const updateData: UserProfileInput = {
        name: data.name,
        mobile: data.mobile || undefined,
        address: {
          streetLine1: data.streetLine1,
          streetLine2: data.streetLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
      };

      await api.updateProfile(updateData);
      await refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Invalidate all address queries since address is shared across all teams
      queryClient.invalidateQueries({ queryKey: ["address"] });
      toast.success("Profile updated!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update profile. Please try again."
      );
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  if (!authLoading && !user) {
    return null;
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="text-center p-8 max-w-md">
          <h2 className="text-xl font-display font-semibold text-cream mb-2">
            Couldn&apos;t load your profile
          </h2>
          <p className="text-cream/60 mb-6">
            {profileErrorDetail instanceof Error
              ? profileErrorDetail.message
              : "The server didn't respond. Please try again."}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button onClick={() => refetchProfile()}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">🎁</span>
              <span className="font-display text-xl font-semibold text-cream">
                GiftWhisper
              </span>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-cream mb-2">
              Profile Settings
            </h1>
            <p className="text-cream/60">
              Manage your personal information and delivery address. Your
              address is shared across all exchanges.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gold" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <CardDescription>
                  Your name and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gold/10">
                  <Avatar
                    name={profile?.name || profile?.email || "U"}
                    size="lg"
                  />
                  <div>
                    <p className="text-cream font-medium">
                      {profile?.name || "No name set"}
                    </p>
                    <p className="text-cream/60 text-sm flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {profile?.email}
                    </p>
                    {profile?.mobile && (
                      <p className="text-cream/60 text-sm flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {profile.mobile}
                      </p>
                    )}
                  </div>
                </div>

                <Input
                  {...register("name")}
                  label="Full Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                />

                <Input
                  {...register("mobile")}
                  label="Mobile Number"
                  placeholder="+91 9876543210"
                  error={errors.mobile?.message}
                />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold" />
                  <CardTitle>Delivery Address</CardTitle>
                </div>
                <CardDescription>
                  Your address will be shared with your Secret Santa gifter
                  across all exchanges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  {...register("streetLine1")}
                  label="Street Address"
                  placeholder="123, MG Road, Near Metro Station"
                  error={errors.streetLine1?.message}
                />
                <Input
                  {...register("streetLine2")}
                  label="Apartment, Floor, etc. (optional)"
                  placeholder="Flat 4B, 2nd Floor"
                  error={errors.streetLine2?.message}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...register("city")}
                    label="City"
                    placeholder="Mumbai"
                    error={errors.city?.message}
                    disabled={isFetchingPincode}
                  />
                  <Input
                    {...register("state")}
                    label="State"
                    placeholder="Maharashtra"
                    error={errors.state?.message}
                    disabled={isFetchingPincode}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      {...register("postalCode")}
                      label="Postal Code"
                      placeholder="400001"
                      error={errors.postalCode?.message}
                      maxLength={6}
                    />
                    {isFetchingPincode && (
                      <p className="text-xs text-cream/50 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Fetching location details...
                      </p>
                    )}
                  </div>
                  <Input
                    {...register("country")}
                    label="Country"
                    placeholder="India"
                    error={errors.country?.message}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Link href="/dashboard">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
