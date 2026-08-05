import type { ReactNode } from "react";
import { mensagemDeErro } from "@/lib/erros";

export function CfgSkeleton({ rows = 3 }: { rows?: number }) {
  return <>{Array.from({ length: rows }, (_, i) => <div key={i} className="cfg-skel" />)}</>;
}

export function CfgEmpty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="cfg-empty">
      <i className={`ti ${icon}`} />
      <strong>{title}</strong>
      {children}
    </div>
  );
}

/** Uma lista vazia e uma lista que não carregou parecem iguais na tela, e a
 * diferença importa: sem isto o usuário é convidado a criar um registro que
 * também vai falhar. */
export function CfgError({ titulo, erro, onRetry, tentando }: {
  titulo: string;
  erro: unknown;
  onRetry: () => void;
  tentando?: boolean;
}) {
  const mensagem = mensagemDeErro(erro);
  const tabelaFaltando = /schema cache|does not exist|relation .* does not exist/i.test(mensagem);

  return (
    <div className="cfg-empty error">
      <i className="ti ti-plug-connected-x" />
      <strong>{titulo}</strong>
      <p>
        {tabelaFaltando
          ? "As tabelas da automação de e-mails ainda não existem no banco. Aplique a migration pendente no Supabase e recarregue."
          : "Não foi possível falar com o banco agora."}
      </p>
      {mensagem && <code className="cfg-error-detail">{mensagem}</code>}
      <button className="btn-secondary" onClick={onRetry} disabled={tentando} style={{ marginTop: 4 }}>
        <i className={`ti ti-refresh${tentando ? " modal-spinner" : ""}`} /> Tentar de novo
      </button>
    </div>
  );
}
