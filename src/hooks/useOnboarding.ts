import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import { supabase } from "@/integrations/supabase/client";
import "driver.js/dist/driver.css";

interface UseOnboardingProps {
  userId?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export const useOnboarding = ({ userId, onComplete, onSkip }: UseOnboardingProps) => {
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // Initialize Driver.js
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(3, 3, 8, 0.85)",
      nextBtnText: "Next",
      prevBtnText: "Prev",
      doneBtnText: "Finish",
      steps: [
        {
          element: undefined, // Centered welcome modal
          popover: {
            title: "Welcome to Blukaze",
            description: "We'll show you around in less than a minute so you can get the most out of the platform.",
            nextBtnText: "Start Tour",
            prevBtnText: "Skip",
          },
        },
        {
          element: "#tour-projects",
          popover: {
            title: "Projects Navigation",
            description: "All your automation projects live here. Track progress, milestones, deliverables, and communication in one place.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-overview-cards",
          popover: {
            title: "Dashboard Overview Cards",
            description: "Get an instant overview of all your projects, including active, in-progress, ready-for-review, and completed work.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-project-card",
          popover: {
            title: "Project Card",
            description: "Monitor project progress in real time and quickly access project details.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tour-recent-updates",
          popover: {
            title: "Recent Updates Panel",
            description: "Stay informed with feedback, project updates, and important notifications.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-profile",
          popover: {
            title: "Profile Menu",
            description: "Manage your account settings, notifications, and preferences.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: undefined, // Centered final step
          popover: {
            title: "You're Ready",
            description: "You're all set. Explore your projects and track progress with Blukaze.",
            doneBtnText: "Finish",
          },
        },
      ],
      onDestroyStarted: () => {
        const hasFinished = driverObj.isLastStep();
        
        // Save state in localStorage
        const key = userId ? `blukaze_onboarding_completed_${userId}` : 'blukaze_onboarding_completed';
        localStorage.setItem(key, 'true');

        // Save state in Supabase user metadata
        if (userId) {
          supabase.auth.updateUser({
            data: { hasCompletedOnboarding: true }
          }).catch(err => {
            console.error("Failed to save onboarding state in database:", err);
          });
        }

        if (hasFinished) {
          onComplete();
        } else {
          if (onSkip) {
            onSkip();
          } else {
            onComplete();
          }
        }
      },
    });

    driverInstanceRef.current = driverObj;

    return () => {
      if (driverInstanceRef.current) {
        driverInstanceRef.current.destroy();
      }
    };
  }, [userId, onComplete, onSkip]);

  const startTour = () => {
    if (driverInstanceRef.current) {
      driverInstanceRef.current.drive();
    }
  };

  return { startTour };
};
