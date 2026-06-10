"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { viewItem } from "@/app/portal/(app)/courses/actions";

/**
 * Records a view for the current item on mount. When the item's requirement is
 * "must view", this is what completes it — so we refresh once afterwards to
 * reflect the new progress in the outline and nav. Renders nothing.
 */
export function ViewTracker({
  itemId,
  refreshOnComplete = false,
}: {
  itemId: string;
  refreshOnComplete?: boolean;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    viewItem(itemId).then(() => {
      if (refreshOnComplete) router.refresh();
    });
  }, [itemId, refreshOnComplete, router]);

  return null;
}
