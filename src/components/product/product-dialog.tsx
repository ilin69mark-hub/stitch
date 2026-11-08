"use client";

import Image from "next/image";
import { ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Configurator } from "@/components/product/configurator";
import { useCart } from "@/lib/cart";
import { useConfigurator } from "@/lib/configurator";
import { designById } from "@/config/catalog";
import { categoryById } from "@/config/catalog";
import { kitById } from "@/config/kits";

export function ProductDialog() {
  const { state, close } = useConfigurator();
  const { addItem, updateItem } = useCart();

  const design =
    state.open && state.mode === "design"
      ? designById.get(state.designId)
      : undefined;
  const custom = state.open && state.mode === "custom" ? state.customItem : null;
  const editing = state.open && Boolean(state.editingKey);

  const title = design?.title ?? "Индивидуальный заказ";
  const description = design
    ? design.description
    : "Измените размер, комплектацию и количество. Фотография и комментарий сохранятся.";
  const category = design ? categoryById.get(design.categoryId) : undefined;

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-w-5xl">
        {state.open ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="relative bg-sand lg:self-stretch">
              <div className="h-56 overflow-hidden rounded-t-[1.75rem] sm:h-64 lg:sticky lg:top-0 lg:h-[min(560px,calc(92dvh-2rem))] lg:rounded-l-[1.75rem] lg:rounded-tr-none">
                <div className="relative h-full w-full">
                  {design ? (
                    <Image
                      src={design.image}
                      alt={design.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-contain"
                    />
                  ) : custom?.previewDataUrl ? (
                    <Image
                      src={custom.previewDataUrl}
                      alt={`Фотография для вышивки: ${custom.fileName}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center text-espresso/60">
                      <span className="grid size-16 place-items-center rounded-full border border-espresso/15 bg-milk/60">
                        <ImageIcon className="size-7" />
                      </span>
                      <span className="max-w-[220px] text-sm leading-relaxed">
                        {custom?.fileName ?? "Фотография для индивидуальной схемы"}
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-6 pt-16">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-milk/75">
                      <Sparkles className="size-3.5" />
                      {design ? "Готовый дизайн" : "Индивидуальная работа"}
                    </p>
                    <p className="mt-2 text-sm text-milk/85">
                      {design
                        ? `${design.paletteSize} цветов · схема и материалы в наборе`
                        : "Схему подготовит дизайнер после согласования"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pb-6 sm:p-6 lg:p-7">
              <div className="pr-10">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {category ? (
                    <Badge variant="terracotta">{category.title}</Badge>
                  ) : (
                    <Badge variant="terracotta">По вашему фото</Badge>
                  )}
                  {design?.featured ? (
                    <Badge variant="outline">Выбор покупателей</Badge>
                  ) : null}
                </div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-2">
                  {description}
                </DialogDescription>
              </div>

              <div className="mt-6">
                <Configurator
                  key={
                    state.mode === "design"
                      ? `design-${state.designId}-${state.editingKey ?? "new"}`
                      : `custom-${state.editingKey}`
                  }
                  kind={state.mode}
                  designId={design?.id}
                  initial={state.initial}
                  compact
                  submitLabel={editing ? "Сохранить" : "В корзину"}
                  onSubmit={(selection) => {
                    if (state.mode === "design" && design) {
                      if (state.editingKey) {
                        updateItem(state.editingKey, {
                          kind: "design",
                          designId: design.id,
                          ...selection,
                        });
                        toast.success("Изменения сохранены");
                      } else {
                        addItem({
                          kind: "design",
                          designId: design.id,
                          ...selection,
                        });
                        toast.success("Добавлено в корзину");
                      }
                    } else if (state.mode === "custom" && state.customItem) {
                      updateItem(state.editingKey, {
                        ...state.customItem,
                        ...selection,
                      });
                      toast.success("Изменения сохранены");
                    }
                    close();
                  }}
                />
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Комплектация «{kitById.get("base")?.title}» уже включает схему,
                канву, нитки и иглу. Дополнительные наборы добавляют упаковку и
                инструменты.
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
