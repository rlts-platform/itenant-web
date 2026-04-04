import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
};

export function Button({ variant = "solid", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    solid: "bg-black text-white hover:bg-neutral-800",
    outline: "border border-neutral-200 bg-white text-black hover:bg-neutral-50",
    ghost: "bg-transparent text-black hover:bg-neutral-100",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
