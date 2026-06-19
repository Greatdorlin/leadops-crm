import type { LeadsDeskRole } from "@/lib/crm/roles";

export interface Team {
  id: string;
  name: string;
  managerUserId: string | null;
  branchId: string | null;
  departmentId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  managerUserId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  managerUserId: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: LeadsDeskRole | null;
  teamId: string | null;
  branchId: string | null;
  departmentId: string | null;
  active: boolean;
}
