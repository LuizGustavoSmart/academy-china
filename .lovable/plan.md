Trabalho todo em `public/academy.html`. Sem mudanças de texto, cor, fonte ou layout interno das seções.

## 1) Reordenação das seções

Ordem atual do arquivo:
Hero → Proposta → Manifesto → Calendário/logos → Rota (Pequim/Xangai/Hangzhou) → Hospedagem+Experiências → Curadoria → Pacote+Benefícios (Jornada) → Resumo → Contato.

Única movimentação necessária para atingir a sequência pedida (1–12):

- Recortar o bloco `<!-- CURADORIA --> <section id="curadoria">…</section>` (linhas ~939–998) e colar logo após o fechamento da seção `#manifesto` (antes do `<!-- CALENDÁRIO -->` em ~438).

Depois desse único movimento, a ordem resultante já é:
Hero · Proposta · Manifesto · Curadoria · Calendário/logos · Rota (Pequim/Xangai/Hangzhou) · Hospedagem · Experiências · Pacote · Benefícios ("O participante sai com") · Resumo · Contato — exatamente 1→12.

Observações:
- Hospedagem e Experiências vivem hoje na mesma `<section id="hoteis">`, na ordem correta (hospedagem primeiro, experiências depois). Fica como está — não vou quebrar em duas seções para não alterar layout/animações.
- Pacote e Benefícios idem dentro de `<section id="jornada">`, também já na ordem certa.
- Não mexo em nenhum estilo/animação; só recorto/colo o bloco de Curadoria.

## 2) Densidade do roteiro por cidade (Pequim, Xangai, Hangzhou)

Cada cidade tem, dentro de `#rota-cities`, um "bloco 2 · roteiro" — a timeline horizontal com os dias (data + título + descrição longa por dia).

Mudança, aplicada igualmente às 3 cidades:

- Envolver o parágrafo de descrição longa de cada dia em um contêiner recolhido por padrão (`max-height:0; overflow:hidden; opacity:0`) com uma classe utilitária tipo `.dia-detalhe`.
- Manter visível por padrão: data + título curto do dia (a "timeline resumida" pedida).
- Adicionar, no cabeçalho do "bloco 2 · roteiro" de cada cidade, um único controle "Ver dia a dia detalhado ▾" / "Recolher ▴" (botão, mesmas cores/tipografia já usadas na página — vermelho + Barlow uppercase, como os labels existentes) que abre/fecha todos os detalhes daquela cidade de uma vez.
- Comportamento via um pequeno script vanilla acrescentado ao bloco `<script>` já existente no fim do arquivo: toggla uma classe `.detalhes-abertos` no wrapper do roteiro da cidade; CSS correspondente expande `.dia-detalhe` (`max-height`, `opacity`, com `transition`).
- Nenhum texto é apagado; só fica recolhido.

## Critérios de pronto

- Curadoria aparece imediatamente após o Manifesto e antes do Calendário/logos.
- Sequência final das seções segue exatamente 1–12.
- Em cada cidade, por padrão só aparecem os dias resumidos (data + título) na timeline horizontal; o parágrafo detalhado só aparece ao clicar em "Ver dia a dia detalhado".
- Nenhum conteúdo, cor, fonte, imagem ou texto alterado.
