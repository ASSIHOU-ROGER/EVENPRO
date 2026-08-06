"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackLink({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:-translate-x-0.5 hover:border-gold/40 hover:bg-gold/5 hover:text-gold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
