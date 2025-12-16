"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Gift, MapPin, UserPlus, Users, X } from "lucide-react";
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
          label: `Go to ${firstTeamName || "Team"}`,
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
            title: "Welcome to Secret Santa! 🎄",
            description:
              "Let's get you started. We'll walk you through creating your first gift exchange in just a few steps.",
            icon: <Gift className="w-8 h-8 text-gold" />,
          },
          {
            id: "create-team",
            title: "Create Your First Team",
            description:
              "Start by creating a team for your Secret Santa exchange. You can invite friends, family, or coworkers to join.",
            icon: <Users className="w-8 h-8 text-gold" />,
            action: {
              label: "Create Team",
              onClick: () => {
                onCreateTeam();
                onClose();
              },
            },
          },
          {
            id: "add-address",
            title: "Add Your Shipping Address",
            description:
              "Once you've created a team, add your shipping address so your Secret Santa knows where to send your gift. You can do this in the team page.",
            icon: <MapPin className="w-8 h-8 text-gold" />,
          },
          {
            id: "add-wishlist",
            title: "Create Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. You can add multiple items with links and price estimates.",
            icon: <Gift className="w-8 h-8 text-gold" />,
          },
        ];

      case "admin":
        return [
          {
            id: "welcome",
            title: `Welcome to ${firstTeamName || "your team"}! 🎄`,
            description:
              "As the team admin, here's what you need to do to get your Secret Santa exchange started.",
            icon: <Users className="w-8 h-8 text-gold" />,
          },
          {
            id: "invite-members",
            title: "Invite Members",
            description:
              "Invite friends, family, or coworkers to join your Secret Santa exchange. You'll need at least 3 members to start the gift exchange.",
            icon: <UserPlus className="w-8 h-8 text-gold" />,
            action: goToTeamAction,
          },
          {
            id: "add-address",
            title: "Add Your Shipping Address",
            description:
              "Add your shipping address so your Secret Santa knows where to send your gift. All members should add their addresses too.",
            icon: <MapPin className="w-8 h-8 text-gold" />,
            action: goToTeamAction,
          },
          {
            id: "add-wishlist",
            title: "Create Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. Encourage other members to add their wishlists too!",
            icon: <Gift className="w-8 h-8 text-gold" />,
            action: goToTeamAction,
          },
        ];

      case "member":
        return [
          {
            id: "welcome",
            title: `Welcome to ${firstTeamName || "the team"}! 🎄`,
            description:
              "You've been invited to join a Secret Santa exchange. Let's get you set up so you can receive your gift!",
            icon: <Gift className="w-8 h-8 text-gold" />,
          },
          {
            id: "add-address",
            title: "Add Your Shipping Address",
            description:
              "First, add your shipping address so your Secret Santa knows where to send your gift. This is required to participate.",
            icon: <MapPin className="w-8 h-8 text-gold" />,
            action: goToTeamAction,
          },
          {
            id: "add-wishlist",
            title: "Create Your Wishlist",
            description:
              "Add items to your wishlist so your Secret Santa knows what you'd like. You can add multiple items with links and price estimates in ₹.",
            icon: <Gift className="w-8 h-8 text-gold" />,
            action: goToTeamAction,
          },
        ];

      default:
        return [];
    }
  };

  const steps = getStepsForPersona();

  const handleNext = () => {
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-cream/60 hover:text-cream transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          index <= currentStep
                            ? "bg-gold w-8"
                            : "bg-cream/20 w-2"
                        )}
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-display font-bold text-cream mb-3">
                      {step.title}
                    </h2>
                    <p className="text-cream/70 text-lg leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    {step.action && (
                      <Button onClick={step.action.onClick} className="w-full">
                        {step.action.label}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    <div className="flex gap-3">
                      {!isFirstStep && (
                        <Button
                          variant="secondary"
                          onClick={handlePrevious}
                          className="flex-1"
                        >
                          Previous
                        </Button>
                      )}
                      <Button
                        onClick={isLastStep ? handleSkip : handleNext}
                        className={isFirstStep ? "w-full" : "flex-1"}
                      >
                        {isLastStep ? "Get Started" : "Next"}
                        {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                    </div>

                    {!isLastStep && (
                      <Button
                        variant="ghost"
                        onClick={handleSkip}
                        className="w-full text-cream/60 hover:text-cream"
                      >
                        Skip onboarding
                      </Button>
                    )}
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
