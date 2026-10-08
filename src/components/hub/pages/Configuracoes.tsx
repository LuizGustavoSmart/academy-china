import { EmailAutomationSettings } from "@/components/hub/configuracoes/EmailAutomationSettings";
import { ResponsaveisSettings } from "@/components/hub/configuracoes/ResponsaveisSettings";
import { UsuariosSettings } from "@/components/hub/configuracoes/UsuariosSettings";

/** As abas vêm das SUBTABS do shell (admin/index.tsx). Qualquer valor desconhecido
 * cai em Responsáveis — inclusive o "dash" padrão de switchTab. */
export function ConfiguracoesPage({ sub }: { sub?: string }) {
  if (sub === "emails") return <EmailAutomationSettings />;
  if (sub === "usuarios") return <UsuariosSettings />;
  return <ResponsaveisSettings />;
}
