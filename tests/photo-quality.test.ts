import { describe, expect, it } from "vitest";
import { evaluatePhotoQuality } from "@/lib/photo-quality";

describe("evaluatePhotoQuality", () => {
  it("marks a high-resolution photo as good", () => {
    const result = evaluatePhotoQuality({
      widthPx: 800,
      heightPx: 800,
      widthCm: 20,
      heightCm: 20,
    });

    expect(result?.level).toBe("good");
    expect(result?.pxPerCm).toBe(40);
    expect(result?.suggestedSize).toBeNull();
    expect(result?.tips).toEqual([]);
  });

  it("warns about medium resolution and suggests a smaller size", () => {
    const result = evaluatePhotoQuality({
      widthPx: 600,
      heightPx: 600,
      widthCm: 20,
      heightCm: 20,
    });

    expect(result?.level).toBe("warn");
    expect(result?.pxPerCm).toBe(30);
    expect(result?.suggestedSize).toEqual({ widthCm: 15, heightCm: 15 });
    expect(result?.tips[0]).toContain("800 × 800 px");
  });

  it("returns a standard preset when the suggestion matches one", () => {
    const result = evaluatePhotoQuality({
      widthPx: 400,
      heightPx: 400,
      widthCm: 20,
      heightCm: 20,
    });

    expect(result?.level).toBe("warn");
    expect(result?.suggestedSize).toEqual({
      widthCm: 10,
      heightCm: 10,
      presetId: "10x10",
    });
  });

  it("marks a low-resolution photo as poor", () => {
    const result = evaluatePhotoQuality({
      widthPx: 300,
      heightPx: 300,
      widthCm: 30,
      heightCm: 30,
    });

    expect(result?.level).toBe("poor");
    expect(result?.pxPerCm).toBe(10);
    expect(result?.suggestedSize).toEqual({ widthCm: 7.5, heightCm: 7.5 });
    expect(result?.tips.join(" ")).toContain("Оформить заказ можно");
  });

  it("accounts for cropping when the photo is wider than the target", () => {
    const result = evaluatePhotoQuality({
      widthPx: 4000,
      heightPx: 3000,
      widthCm: 30,
      heightCm: 30,
    });

    expect(result?.cropped).toBe(true);
    expect(result?.level).toBe("warn");
    expect(result?.usedWidthPx).toBe(3000);
    expect(result?.pxPerCm).toBe(100);
    expect(result?.suggestedSize).toEqual({ widthCm: 30, heightCm: 22.5 });
    expect(result?.message).toContain("не совпадают");
  });

  it("suggests a portrait size without crop", () => {
    const result = evaluatePhotoQuality({
      widthPx: 3000,
      heightPx: 4000,
      widthCm: 30,
      heightCm: 30,
    });

    expect(result?.level).toBe("warn");
    expect(result?.suggestedSize).toEqual({ widthCm: 22.5, heightCm: 30 });
  });

  it("snaps suggested sizes down to the pricing step", () => {
    const result = evaluatePhotoQuality({
      widthPx: 780,
      heightPx: 780,
      widthCm: 20,
      heightCm: 20,
    });

    expect(result?.pxPerCm).toBe(39);
    expect(result?.suggestedSize).toEqual({ widthCm: 19.5, heightCm: 19.5 });
  });

  it("returns null for invalid dimensions", () => {
    expect(
      evaluatePhotoQuality({
        widthPx: 800,
        heightPx: 800,
        widthCm: 0,
        heightCm: 20,
      }),
    ).toBeNull();
  });
});
