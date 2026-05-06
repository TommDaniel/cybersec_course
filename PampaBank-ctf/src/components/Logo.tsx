import Image from "next/image";

// PampaComputing — organização que mantém o CTF.
// Logo PNG fica em /public/brand/pampa-computing.png e é otimizado
// pelo next/image automaticamente (resize + WebP/AVIF).
export function Logo({
  className = "h-14 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/pampa-computing.png"
      alt="PampaComputing"
      width={1254}
      height={1254}
      priority={priority}
      className={className}
    />
  );
}
