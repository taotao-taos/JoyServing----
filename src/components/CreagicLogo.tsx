import * as React from "react";
import { cn } from "@/lib/utils";

export const CREAGIC_LOGO_SRC =
  "https://raw.githubusercontent.com/taotao-taos/-/main/Frame21.png";

type CreagicLogoProps = {
  className?: string;
  alt?: string;
};

export function CreagicLogo({
  className,
  alt = "Creagic AI",
}: CreagicLogoProps) {
  return (
    <img
      src={CREAGIC_LOGO_SRC}
      alt={alt}
      className={cn("h-full w-full object-contain", className)}
      decoding="async"
    />
  );
}
