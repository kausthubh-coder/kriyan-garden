"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { UserProfile } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { reportError } from "@/lib/report-error";

class AccountBoundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { reportError(error); }
  render() {
    return this.state.failed ? <div role="alert"><p>Account settings could not be loaded. Try loading them again.</p><button onClick={this.props.retry}>Load account settings</button></div> : this.props.children;
  }
}

function LoadingAccount({ retry }: { retry: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSlow(true), 15_000); return () => clearTimeout(timer); }, []);
  return <div role="status"><p>{slow ? "Account settings are taking longer to load. Check your connection and try again." : "Loading account settings."}</p>{slow && <button onClick={retry}>Load account settings</button>}</div>;
}

export function AccountSettings() {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  return <AccountBoundary key={attempt} retry={retry}><UserProfile appearance={clerkAppearance} routing="hash" fallback={<LoadingAccount retry={retry} />} /></AccountBoundary>;
}
