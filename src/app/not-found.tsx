import { GuardedLink } from "@/components/providers";

export default function NotFound() {
  return (
    <div className="empty">
      <img src="/brand/emblem.png" alt="" width="72" height="72" />
      <h1>Página não encontrada</h1>
      <p>Esse caminho não existe na gestão da sede.</p>
      <GuardedLink className="btn btn-primary" href="/">Voltar ao início</GuardedLink>
    </div>
  );
}
