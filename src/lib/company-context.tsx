"use client";
import { createContext, useContext, ReactNode } from "react";

export interface CompanyInfo {
  name: string;
}

const CompanyContext = createContext<CompanyInfo>({ name: "TimeOff" });

export function CompanyProvider({
  company, children,
}: { company: CompanyInfo; children: ReactNode }) {
  return <CompanyContext.Provider value={company}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyInfo {
  return useContext(CompanyContext);
}
