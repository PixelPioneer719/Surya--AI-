"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/userStore";
import type { User } from "@/types/user";

export function UserHydrator({ user }: { user: User }) {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  return null;
}
