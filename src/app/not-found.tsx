import Link from "next/link";
import { IconArrowLeft, IconChurch } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <IconChurch size={26} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">Página não encontrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          O registro pode ter sido removido ou o endereço está incorreto.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            <IconArrowLeft size={16} />
            Voltar ao painel
          </Link>
          <Link href="/membros" className="btn btn-outline">
            Ver membros
          </Link>
        </div>
      </div>
    </div>
  );
}
