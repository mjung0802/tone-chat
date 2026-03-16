import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { LoadingSpinner } from "../src/components/common/LoadingSpinner";

export default function NotFound() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) {
      router.replace("/(main)/servers");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  return <LoadingSpinner message="Loading..." />;
}
