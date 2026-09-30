"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  next: string;
  hasError: boolean;
  demo: { email: string; password: string } | null;
}

export function LoginForm({ next, hasError, demo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-foreground focus:outline-none";

  return (
    <>
      {demo && (
        <div className="mt-6 rounded-md border border-dashed border-border p-3 font-mono text-xs">
          <p className="tracking-widest text-subtle-foreground">DEMO ACCESS</p>
          <p className="mt-2 text-foreground">{demo.email}</p>
          <p className="text-foreground">{demo.password}</p>
          <button
            type="button"
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
            }}
            className="mt-2 text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Fill demo credentials
          </button>
        </div>
      )}

      <form action="/api/access" method="POST" className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {hasError && (
          <p role="alert" className="flex items-center gap-1.5 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Incorrect email or password.
          </p>
        )}

        <button
          type="submit"
          className="rounded-md bg-foreground px-3.5 py-2.5 text-sm font-medium text-background hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </>
  );
}
