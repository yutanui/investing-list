"use client";

import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = "sign_in" | "sign_up";

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      requestAnimationFrame(() => emailRef.current?.focus());
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleClose() {
      onClose();
    }

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function switchMode() {
    setMode((m) => (m === "sign_in" ? "sign_up" : "sign_in"));
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (mode === "sign_up") {
      const confirmPassword = formData.get("confirmPassword") as string;
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setSubmitting(false);
        return;
      }
    }

    const { error: authError } =
      mode === "sign_in"
        ? await signIn(email, password)
        : await signUp(email, password);

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "sign_up") {
      setSuccessMessage("Account created! Check your email to confirm, then sign in.");
      setMode("sign_in");
      return;
    }

    // Sign in succeeded
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-0 h-full w-full bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-sm sm:rounded-xl"
    >
      <div className="flex h-full flex-col bg-background text-foreground sm:rounded-xl sm:border sm:border-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold">
            {mode === "sign_in" ? "Sign In" : "Create Account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-foreground/50 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-4 py-4 sm:px-6" style={{ touchAction: "manipulation" }}>
            {error && (
              <div className="rounded-md bg-loss/10 px-3 py-2 text-sm text-loss" role="alert">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-md bg-gain/10 px-3 py-2 text-sm text-gain" role="status">
                {successMessage}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium">
                Email
              </label>
              <input
                ref={emailRef}
                id="auth-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com…"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                placeholder="Minimum 6 characters…"
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              />
            </div>

            {/* Confirm Password — sign up only */}
            {mode === "sign_up" && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Re-enter your password…"
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-foreground/10 px-4 py-3 sm:px-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50"
            >
              {submitting
                ? "Loading…"
                : mode === "sign_in"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            <p className="text-center text-sm text-foreground/50">
              {mode === "sign_in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </dialog>
  );
}
