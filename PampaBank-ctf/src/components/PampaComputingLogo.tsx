import Image from "next/image";

// Logo da organização que mantém o CTF (PampaComputing).
// Usada no rodapé com o aviso de copyright. O PNG fica em
// /public/brand/pampa-computing.png e é otimizado pelo next/image.
export function PampaComputingLogo({
  className = "h-10 w-auto",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/brand/pampa-computing.png"
      alt="PampaComputing"
      width={1254}
      height={1254}
      className={className}
    />
  );
}
