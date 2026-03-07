"use client";

import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

type AuthMode = "sign_in" | "sign_up" | "reset_request" | "reset_new_password";

const modeTitle: Record<AuthMode, string> = {
  sign_in: "Sign In",
  sign_up: "Create Account",
  reset_request: "Reset Password",
  reset_new_password: "New Password",
};

export function AuthDialog({ open, onClose, initialMode }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
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

  // Sync mode when dialog opens with a specific initialMode (e.g. PASSWORD_RECOVERY)
  useEffect(() => {
    if (open && initialMode) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
    }
  }, [open, initialMode]);

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

  function goToResetRequest() {
    setMode("reset_request");
    setError(null);
    setSuccessMessage(null);
  }

  function backToSignIn() {
    setMode("sign_in");
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      if (mode === "sign_in") {
        const email = (formData.get("email") as string).trim();
        const password = formData.get("password") as string;
        const { error: authError } = await signIn(email, password);
        if (authError) { setError(authError.message); return; }
        onClose();
        return;
      }

      if (mode === "sign_up") {
        const email = (formData.get("email") as string).trim();
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        const { error: authError } = await signUp(email, password);
        if (authError) { setError(authError.message); return; }
        setSuccessMessage("Account created! Check your email to confirm, then sign in.");
        setMode("sign_in");
        return;
      }

      if (mode === "reset_request") {
        const email = (formData.get("email") as string).trim();
        const { error: authError } = await resetPassword(email);
        if (authError) { setError(authError.message); return; }
        setSuccessMessage("Check your email for a password reset link.");
        return;
      }

      if (mode === "reset_new_password") {
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        const { error: authError } = await updatePassword(password);
        if (authError) { setError(authError.message); return; }
        setSuccessMessage("Password updated successfully!");
        setTimeout(() => onClose(), 1500);
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isResetFlow = mode === "reset_request" || mode === "reset_new_password";

  const inputClass = "mt-1 block w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2.5 text-sm placeholder:text-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none";
  const linkClass = "font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none";

  function renderSubmitLabel() {
    if (submitting) return "Loading…";
    switch (mode) {
      case "sign_in": return "Sign In";
      case "sign_up": return "Create Account";
      case "reset_request": return "Send Reset Link";
      case "reset_new_password": return "Update Password";
    }
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
            {modeTitle[mode]}
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

            {/* Sign In / Sign Up / Reset Request: Email */}
            {(mode === "sign_in" || mode === "sign_up" || mode === "reset_request") && (
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
                  className={inputClass}
                />
              </div>
            )}

            {/* Sign In / Sign Up: Password */}
            {(mode === "sign_in" || mode === "sign_up") && (
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
                  className={inputClass}
                />
                {mode === "sign_in" && (
                  <button
                    type="button"
                    onClick={goToResetRequest}
                    className="mt-1.5 text-xs text-foreground/50 hover:text-foreground/80 underline underline-offset-2"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {/* Sign Up: Confirm Password */}
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
                  className={inputClass}
                />
              </div>
            )}

            {/* Reset New Password */}
            {mode === "reset_new_password" && (
              <>
                <div>
                  <label htmlFor="auth-new-password" className="block text-sm font-medium">
                    New Password
                  </label>
                  <input
                    id="auth-new-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="auth-confirm-new-password" className="block text-sm font-medium">
                    Confirm New Password
                  </label>
                  <input
                    id="auth-confirm-new-password"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password…"
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-foreground/10 px-4 py-3 sm:px-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50"
            >
              {renderSubmitLabel()}
            </button>

            <p className="text-center text-sm text-foreground/50">
              {isResetFlow ? (
                <button type="button" onClick={backToSignIn} className={linkClass}>
                  Back to Sign In
                </button>
              ) : mode === "sign_in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={switchMode} className={linkClass}>
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={switchMode} className={linkClass}>
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
