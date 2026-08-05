import { EmailAutomationSettings } from "@/components/hub/configuracoes/EmailAutomationSettings";
import { ResponsaveisSettings } from "@/components/hub/configuracoes/ResponsaveisSettings";

/** As abas vêm das SUBTABS do shell (admin/index.tsx). Qualquer valor que não
 * seja "emails" cai em Responsáveis — inclusive o "dash" padrão de switchTab. */
export function ConfiguracoesPage({ sub }: { sub?: string }) {
  return sub === "emails" ? <EmailAutomationSettings /> : <ResponsaveisSettings />;
}
