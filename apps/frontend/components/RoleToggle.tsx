"use client";

import { useState, useEffect } from "react";
import { setUserContext, getUserContext } from "@/lib/api";
import type { UserRole } from "@/lib/types";
import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleToggle() {
  const [role, setRole] = useState<UserRole>("user");

  useEffect(() => {
    const { role: currentRole } = getUserContext();
    setRole(currentRole);
  }, []);

  const toggleRole = () => {
    const newRole: UserRole = role === "admin" ? "user" : "admin";
    const userId = newRole === "admin" ? "admin-001" : "user-001";
    setRole(newRole);
    setUserContext(newRole, userId);
  };

  return (
    <button
      onClick={toggleRole}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        role === "admin"
          ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      )}
    >
      {role === "admin" ? (
        <Shield className="h-4 w-4" />
      ) : (
        <User className="h-4 w-4" />
      )}
      <span className="capitalize">{role}</span>
    </button>
  );
}
