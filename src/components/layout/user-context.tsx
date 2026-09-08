"use client";

import { createContext, useContext } from "react";
import type { Papel } from "@/types/database";

export interface UserContextValue {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  value,
  children,
}: {
  value: UserContextValue;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useCurrentUser deve ser usado dentro de um UserProvider.");
  }
  return context;
}
