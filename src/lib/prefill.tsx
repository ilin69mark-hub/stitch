"use client";

import * as React from "react";

export interface CustomPrefill {
  widthCm: number;
  heightCm: number;
  kitId: string;
  optionIds: string[];
  quantity: number;
}

interface PrefillContextValue {
  prefill: CustomPrefill | null;
  setPrefill: (value: CustomPrefill | null) => void;
}

const PrefillContext = React.createContext<PrefillContextValue | null>(null);

export function CustomPrefillProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefill, setPrefill] = React.useState<CustomPrefill | null>(null);
  return (
    <PrefillContext.Provider value={{ prefill, setPrefill }}>
      {children}
    </PrefillContext.Provider>
  );
}

export function useCustomPrefill(): PrefillContextValue {
  const context = React.useContext(PrefillContext);
  if (!context) {
    throw new Error("useCustomPrefill must be used within CustomPrefillProvider");
  }
  return context;
}
