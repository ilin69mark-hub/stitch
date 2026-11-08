import { boxById } from "@/config/boxes";
import { designById } from "@/config/catalog";
import { kitById, optionById } from "@/config/kits";
import { formatCm } from "@/lib/utils";
import type { CartItem } from "@/types";

export function cartItemMeta(item: CartItem) {
  if (item.kind === "design") {
    const design = designById.get(item.designId);
    return {
      title: design?.title ?? "Готовый дизайн",
      subtitle: `${formatCm(item.widthCm)} × ${formatCm(item.heightCm)} см · ${kitById.get(item.kitId)?.title ?? "набор"}`,
      image: design?.image,
      alt: design?.alt ?? "Готовый дизайн",
      options: item.optionIds
        .map((id) => optionById.get(id)?.title)
        .filter(Boolean)
        .join(", "),
    };
  }
  if (item.kind === "box") {
    const box = boxById.get(item.boxId);
    return {
      title: box?.title ?? "Бокс",
      subtitle: box?.sizeLabel ?? "Готовый набор",
      image: box?.image,
      alt: box?.alt ?? "Подарочный бокс",
      options: "",
    };
  }
  return {
    title: "Картина по вашему фото",
    subtitle: `${formatCm(item.widthCm)} × ${formatCm(item.heightCm)} см · ${kitById.get(item.kitId)?.title ?? "набор"}`,
    image: item.previewDataUrl,
    alt: `Фотография для вышивки: ${item.fileName}`,
    options: item.optionIds
      .map((id) => optionById.get(id)?.title)
      .filter(Boolean)
      .join(", "),
  };
}
