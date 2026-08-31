"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { KriyanApp } from "@/components/kriyan/KriyanApp";

export default function GardenPage() {
  return (
    <>
      <AuthLoading><main className="route-state">opening your garden</main></AuthLoading>
      <Authenticated><KriyanApp /></Authenticated>
      <Unauthenticated><main className="route-state"><p>Sign in to open your garden.</p><SignInButton mode="modal"><button type="button">sign in</button></SignInButton></main></Unauthenticated>
    </>
  );
}
