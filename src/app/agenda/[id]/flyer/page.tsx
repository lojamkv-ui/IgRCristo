"use client";

import { useParams } from "next/navigation";
import { usePageTitle } from "@/lib/client";
import { FlyerStudio } from "@/components/FlyerStudio";
import { ErrorState } from "@/components/ui";

export default function FlyerPage() {
  usePageTitle("Flyer");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState message="Culto inválido." />;
  return <FlyerStudio serviceId={id} />;
}
