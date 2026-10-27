"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  MapPin,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

type OnboardingPersona = "new_user" | "admin" | "member";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: () => void;
  onGoToTeam: (teamId: string) => void;
  persona: OnboardingPersona;
  firstTeamId?: string;
  firstTeamName?: string;
}

export function Onboarding({
  isOpen,
  onClose,
  onCreateTeam,
  onGoToTeam,
  persona,
  firstTeamId,
  firstTeamName,
}: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const getStepsForPersona = (): OnboardingStep[] => {
    const goToTeamAction = firstTeamId
      ? {
          label: `Go to ${firstTeamName || "Exchange"}`,
          onClick: () => {
            onGoToTeam(firstTeamId);
            onClose();
          },
        }
      : undefined;

    switch (persona) {
      case "new_user":
        return [
          {
            id: "welcome",
            title: "Welcome to Elf Match",
            description:
              "We'll help you set up your first gift exchange in 3 simple steps.",
            icon: <Gift className="w-8 h-8 text-cranberry" />,
          },
          {
            id: "create-team",
            title: "Create Your First Exchange",
            description:
              "Start by creating an exchange for your Secret Santa. You can invite friends, family, or coworkers to join.",
            icon: <Users className="w-8 h-8 text-cranberry" />,
            action: {
              label: "Create Exchange",
              onClick: () => {
                onCreateTeam();
                onClose();
              },
            },
          },
          {
            id: "add-address",
            title: "Add Your Delivery Address",
            description:
              "Once you've created an exchange, add your delivery address so your Secret Santa knows where to send your gift. You can do this in the exchange page.",
            icon: <MapPin className="w-8 h-8 text-cranberry" />,
          },
          {
            id: "add-wishlist",
            title: "Build Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. You can add multiple items with links and price estimates.",
            icon: <Gift className="w-8 h-8 text-cranberry" />,
          },
        ];

      case "admin":
        return [
          {
            id: "welcome",
            title: `Welcome to ${firstTeamName || "your exchange"}`,
            description:
              "As the exchange admin, here's what you need to do to get your gift exchange started.",
            icon: <Users className="w-8 h-8 text-cranberry" />,
          },
          {
            id: "invite-members",
            title: "Invite Members",
            description:
              "Invite friends, family, or coworkers to join your Secret Santa exchange. You'll need at least 3 members to start the gift exchange.",
            icon: <UserPlus className="w-8 h-8 text-cranberry" />,
            action: goToTeamAction,
          },
          {
            id: "add-address",
            title: "Add Your Delivery Address",
            description:
              "Add your delivery address so your Secret Santa knows where to send your gift. All members should add their addresses too.",
            icon: <MapPin className="w-8 h-8 text-cranberry" />,
            action: goToTeamAction,
          },
          {
            id: "add-wishlist",
            title: "Build Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. Encourage other members to add their wishlists too!",
            icon: <Gift className="w-8 h-8 text-cranberry" />,
            action: goToTeamAction,
          },
        ];

      case "member":
        return [
          {
            id: "welcome",
            title: `Welcome to ${firstTeamName || "the exchange"}`,
            description:
              "You've been invited to join a gift exchange. Let's get you set up so you can receive your gift!",
            icon: <Gift className="w-8 h-8 text-cranberry" />,
          },
          {
            id: "add-address",
            title: "Add Your Delivery Address",
            description:
              "First, add your delivery address so your Secret Santa knows where to send your gift. This is required to participate.",
            icon: <MapPin className="w-8 h-8 text-cranberry" />,
            action: goToTeamAction,
          },
          {
            id: "add-wishlist",
            title: "Build Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. You can add multiple items with links and price estimates in ₹.",
            icon: <Gift className="w-8 h-8 text-cranberry" />,
            action: goToTeamAction,
          },
        ];

      default:
        return [];
    }
  };

  const steps = getStepsForPersona();

  const handleNext = () => {
    const currentStepData = steps[currentStep];

    // If current step has an action, trigger it
    if (currentStepData.action) {
      currentStepData.action.onClick();
      return;
    }

    // Otherwise, go to next step or close
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-evergreen-deep/50"
            onClick={handleSkip}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative">
                <CardContent className="pt-8 pb-6">
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleSkip}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-ink-soft hover:text-ink"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          index <= currentStep
                            ? "bg-cranberry w-8"
                            : "bg-rule w-2"
                        )}
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cranberry-soft">
                      {step.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-8">
                    <h2 className="font-display text-2xl text-ink mb-3">
                      {step.title}
                    </h2>
                    <p className="text-lg leading-relaxed text-ink-soft">
                      {step.description}
                    </p>
                  </div>

                  {/* Navigation arrows */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={isFirstStep}
                      aria-label="Previous step"
                      className={cn(
                        "rounded-full p-2",
                        isFirstStep
                          ? "cursor-not-allowed text-rule"
                          : "text-ink-soft hover:bg-ivory-deep hover:text-ink"
                      )}
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>

                    <button
                      type="button"
                      onClick={isLastStep ? handleSkip : handleNext}
                      aria-label={isLastStep ? "Close" : "Next step"}
                      className="rounded-full p-2 text-ink-soft hover:bg-ivory-deep hover:text-ink"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
