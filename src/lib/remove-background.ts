/**
 * White-background removal for formal ID photos (client-side, canvas-based).
 *
 * Uploaded portraits are formal photos on a plain white/near-white backdrop.
 * This flood-fills from the image borders across near-white pixels and turns
 * that connected region transparent — interior whites (shirts, collars,
 * highlights) survive because they are only reached if they touch the
 * backdrop region. The cut edge gets a 1px alpha feather so hair lines don't
 * end in hard stair-steps.
 *
 * Best-effort by design: if anything looks off (no white border detected,
 * decode failure, huge image), the ORIGINAL image is returned unchanged.
 */

const MAX_SIDE = 2048;
/** A pixel is "backdrop-like" when all channels clear this floor… */
const CHANNEL_FLOOR = 215;
/** …and the channels stay close to each other (true neutral, not skin/cloth). */
const CHANNEL_SPREAD = 24;

function isBackdrop(d: Uint8ClampedArray, i: number): boolean {
  const r = d[i];
  const g = d[i + 1];
  const b = d[i + 2];
  if (r < CHANNEL_FLOOR || g < CHANNEL_FLOOR || b < CHANNEL_FLOOR) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= CHANNEL_SPREAD;
}

export async function removeWhiteBackground(input: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(input);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return input;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    // BFS flood fill from every border pixel that looks like backdrop.
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];
    const push = (x: number, y: number) => {
      const p = y * w + x;
      if (visited[p]) return;
      if (!isBackdrop(d, p * 4)) return;
      visited[p] = 1;
      queue.push(p);
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }

    // No backdrop touching the borders → probably not a white-bg photo;
    // leave the image alone.
    if (queue.length === 0) return input;

    let head = 0;
    while (head < queue.length) {
      const p = queue[head++];
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }

    // Sanity: a formal photo's backdrop is a meaningful share of the frame.
    // Under 5% flooded means the heuristic mis-fired — keep the original.
    if (queue.length < w * h * 0.05) return input;

    // Clear the backdrop region.
    for (let p = 0; p < visited.length; p++) {
      if (visited[p]) d[p * 4 + 3] = 0;
    }

    // 1px feather: any opaque pixel touching a cleared one gets soft alpha.
    const cleared = visited; // alias for readability
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (cleared[p]) continue;
        const nearCleared =
          (x > 0 && cleared[p - 1]) ||
          (x < w - 1 && cleared[p + 1]) ||
          (y > 0 && cleared[p - w]) ||
          (y < h - 1 && cleared[p + w]);
        if (nearCleared) {
          d[p * 4 + 3] = Math.min(d[p * 4 + 3], 140);
        }
      }
    }

    ctx.putImageData(img, 0, 0);
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return out ?? input;
  } catch {
    return input;
  }
}
