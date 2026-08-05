/** O PostgREST rejeita com um objeto simples ({ message, code, hint }), não com
 * um Error — daí não bastar `String(erro)`, que viraria "[object Object]" na tela. */
export function mensagemDeErro(erro: unknown): string {
  if (!erro) return "";
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "string") return erro;
  if (typeof erro === "object" && typeof (erro as { message?: unknown }).message === "string") {
    return (erro as { message: string }).message;
  }
  try {
    return JSON.stringify(erro);
  } catch {
    return String(erro);
  }
}
