"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { registerGraduate } from "@/app/portal/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerGraduate, {});
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      (async () => {
        toast.success("Account created. Signing you in…");
        await authClient.signIn.email({ email, password });
        router.push("/portal");
        router.refresh();
      })();
    }
    if (state.error) toast.error(state.error);
  }, [state, email, password, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lcn">License Number</Label>
        <Input
          id="lcn"
          name="lcn"
          placeholder="A09-240801"
          className="font-mono"
          aria-invalid={fe.lcn ? true : undefined}
        />
        {fe.lcn && <p className="text-xs text-error">{fe.lcn}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Last name (as on your license)</Label>
        <Input
          id="lastName"
          name="lastName"
          aria-invalid={fe.lastName ? true : undefined}
        />
        {fe.lastName && <p className="text-xs text-error">{fe.lastName}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {fe.email && <p className="text-xs text-error">{fe.email}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {fe.password && <p className="text-xs text-error">{fe.password}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Verifying…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/portal/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
