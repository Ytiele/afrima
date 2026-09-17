import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ConsultationStatus, PractitionerStatus } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent-500 text-white hover:bg-accent-600",
  secondary:
    "bg-transparent text-text border border-neutral-300 hover:bg-neutral-50",
  ghost: "bg-transparent text-accent-700 hover:text-accent-600",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

const practitionerStatusStyle: Record<PractitionerStatus, string> = {
  AVAILABLE: "bg-sage-100 text-sage-800",
  OFFLINE: "bg-neutral-200 text-neutral-700",
  IN_CALL: "bg-accent-100 text-accent-800",
  SUSPENDED: "bg-danger-bg text-danger",
};

export function PractitionerStatusPill({ status }: { status: PractitionerStatus }) {
  return <span className={`pill ${practitionerStatusStyle[status]}`}>{status.replace("_", " ")}</span>;
}

const consultationStatusStyle: Record<ConsultationStatus, string> = {
  WAITING: "bg-accent-100 text-accent-800",
  CLAIMED: "bg-sage-100 text-sage-800",
  IN_CALL: "bg-accent-100 text-accent-800",
  COMPLETED: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-danger-bg text-danger",
  ABANDONED: "bg-danger-bg text-danger",
};

export function ConsultationStatusPill({ status }: { status: ConsultationStatus }) {
  return (
    <span className={`pill ${consultationStatusStyle[status]}`}>{status.replace("_", " ")}</span>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className="font-heading text-3xl">{value}</span>
    </Card>
  );
}

export function PageHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        {eyebrow && (
          <h6 className="text-xs font-bold uppercase tracking-wide text-accent-700 mb-1">
            {eyebrow}
          </h6>
        )}
        <h2 className="text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-600 py-6 text-center">{children}</p>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white";

export const textareaClass =
  "w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white";
