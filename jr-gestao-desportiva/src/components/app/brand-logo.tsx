import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/brand/logo-jr-sp.png"
      alt="Logo da Associação Paradesportiva JR-SP"
      width={180}
      height={88}
      priority={priority}
      className={cn("h-auto w-36 object-contain", className)}
    />
  );
}
