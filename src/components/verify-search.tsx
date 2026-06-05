"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifySearch() {
  const [lcn, setLcn] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = lcn.trim();
        if (value) router.push(`/verify/${encodeURIComponent(value)}`);
      }}
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <Input
        value={lcn}
        onChange={(e) => setLcn(e.target.value)}
        placeholder="Enter License Number  (e.g. A09-240801)"
        aria-label="License Number"
        className="h-12 flex-1 font-mono"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <Button type="submit" size="lg">
        <Search aria-hidden /> Verify License
      </Button>
    </form>
  );
}
