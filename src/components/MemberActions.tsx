"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconPencil, IconPrinter, IconTrash } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";

export function MemberActions({ memberId, name }: { memberId: number; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.members.remove(memberId);
      toast("success", "Cadastro excluído", `${name} foi removido do sistema.`);
      setConfirmOpen(false);
      router.push("/membros");
      router.refresh();
    } catch (error) {
      toast("error", "Não foi possível excluir", errorMessage(error));
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <IconPrinter size={16} />
          Imprimir ficha
        </Button>
        <Link href={`/membros/${memberId}/editar`} className="btn btn-primary btn-sm">
          <IconPencil size={16} />
          Editar cadastro
        </Link>
        <Button type="button" variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
          <IconTrash size={16} />
          Excluir
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir cadastro"
        loading={deleting}
        confirmLabel="Excluir definitivamente"
        message={
          <>
            Tem certeza que deseja excluir <strong>{name}</strong>?
            <br />
            Cargos e o histórico completo de alterações também serão removidos. Esta ação não pode ser
            desfeita — considere exportar um backup em <strong>Configurações</strong> antes.
          </>
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
