"use client";

import * as React from "react";
import type { CartItem } from "@/types";

export interface ConfiguratorInitial {
  widthCm: number;
  heightCm: number;
  kitId: string;
  optionIds: string[];
  quantity: number;
}

export type CustomCartItem = Extract<CartItem, { kind: "custom" }>;

type DialogState =
  | { open: false }
  | {
      open: true;
      mode: "design";
      designId: string;
      initial?: Partial<ConfiguratorInitial>;
      editingKey?: string;
    }
  | {
      open: true;
      mode: "custom";
      customItem: CustomCartItem;
      initial?: Partial<ConfiguratorInitial>;
      editingKey: string;
    };

interface ConfiguratorContextValue {
  state: DialogState;
  openDesign: (
    designId: string,
    initial?: Partial<ConfiguratorInitial>,
    editingKey?: string,
  ) => void;
  openCustomEdit: (item: CustomCartItem) => void;
  close: () => void;
}

const ConfiguratorContext =
  React.createContext<ConfiguratorContextValue | null>(null);

export function ConfiguratorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openDesign = React.useCallback(
    (
      designId: string,
      initial?: Partial<ConfiguratorInitial>,
      editingKey?: string,
    ) => {
      setState({ open: true, mode: "design", designId, initial, editingKey });
    },
    [],
  );

  const openCustomEdit = React.useCallback((item: CustomCartItem) => {
    setState({
      open: true,
      mode: "custom",
      customItem: item,
      editingKey: item.key,
      initial: {
        widthCm: item.widthCm,
        heightCm: item.heightCm,
        kitId: item.kitId,
        optionIds: item.optionIds,
        quantity: item.quantity,
      },
    });
  }, []);

  const close = React.useCallback(() => setState({ open: false }), []);

  const value = React.useMemo(
    () => ({ state, openDesign, openCustomEdit, close }),
    [state, openDesign, openCustomEdit, close],
  );

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

export function useConfigurator(): ConfiguratorContextValue {
  const context = React.useContext(ConfiguratorContext);
  if (!context) {
    throw new Error("useConfigurator must be used within ConfiguratorProvider");
  }
  return context;
}
