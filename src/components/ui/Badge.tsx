import React from "react";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "green" | "yellow" | "red" | "blue";
};

export function Badge({ tone = "neutral", className = "", ...props }: Props) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium " +
        tones[tone] +
        " " +
        className
      }
      {...props}
    />
  );
}
