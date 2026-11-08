"use client";

import { Toaster } from "sonner";
import { CartProvider } from "@/lib/cart";
import { ConfiguratorProvider } from "@/lib/configurator";
import { CustomPrefillProvider } from "@/lib/prefill";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductDialog } from "@/components/product/product-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ConfiguratorProvider>
        <CustomPrefillProvider>
          {children}
          <CartDrawer />
          <ProductDialog />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#3d2f22",
                color: "#fcf8f1",
                border: "1px solid rgba(252,248,241,0.14)",
                borderRadius: "14px",
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              },
            }}
          />
        </CustomPrefillProvider>
      </ConfiguratorProvider>
    </CartProvider>
  );
}
