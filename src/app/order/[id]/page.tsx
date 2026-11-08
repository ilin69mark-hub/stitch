import type { Metadata } from "next";
import { OrderView } from "@/components/checkout/order-view";

export const instant = false;

export const metadata: Metadata = {
  title: "Заказ",
  description: "Статус заказа и оплата.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token = "" } = await searchParams;

  return <OrderView id={id} token={token} />;
}
