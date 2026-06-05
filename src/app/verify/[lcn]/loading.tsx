import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 md:px-8">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
