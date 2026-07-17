
Todas as alterações são no arquivo `public/academy.html`. Nada mais é tocado (stack, cores, fontes, textos existentes permanecem intactos).

## 1) Hero — remover o botão vermelho
Linha 339: apagar o `<button type="submit" form="hero-contact-form">Quero conversar sobre a missão →</button>`. O link "Conheça a proposta" continua. O formulário lateral segue funcionando normalmente e continua enviando os dados para o mesmo endpoint atual.

## 2) Hero — bloco de números
- Linha 323: trocar `>9<` por `>09<`.
- Linha 329: trocar o texto `cidades ·<br>uma sequência` por `cidades` (remove só o "uma sequência" e o `<br>`; o divisor vertical à direita permanece).

## 3) Rota — "9" gigante estático
- Linha 559: trocar o texto inicial de `>0<` para `>9<` no `<span id="rota-nine">`.
- No JS de animação (bloco de `rota-intro-track`), remover a atualização de `rota-nine.textContent` para que fique fixo em "9". Título e label continuam visíveis; o layout não muda.

## 4) Cidades (Pequim, Xangai, Hangzhou)

### 4a) Preencher o lado direito do bloco de destaque
Nas telas iniciais (`.city-screen` com `.cityname`, linhas 575–582, 636–643, 691–698), transformar em grid de 2 colunas e adicionar à direita um card leve com um parágrafo curto + lista dos principais pontos, usando o conteúdo já existente do roteiro/cidade:

- Pequim: "Capital política, sede das plataformas que definem escala." Lista: Cidade Proibida · Muralha (Mutianyu) · Embaixada do Brasil · Kwai · Meituan · Jantar 1949.
- Xangai: "A China onde a IA vira camada de tudo — saúde, infra, comércio, direito." Lista: United Imaging · Huawei · BSI Logistics · China-BRICS AI Center · East Concord · Bund + Nanjing Lu.
- Hangzhou: "O quintal da Alibaba e dos 'seis dragõezinhos' — o dia mais denso da missão." Lista: DeepSeek · Unitree · Alibaba · Fly Zoo Hotel · West Lake.

Estilo: mesmo tratamento visual do `.city-card` já existente (fundo escuro translúcido, borda sutil, tipografia Oswald/Barlow), para não introduzir novo padrão.

### 4b) Roteiro em timeline horizontal
- CSS `.city-days` (linha 74): trocar `flex-direction:column` por `flex-direction:row`, com `overflow-x:auto`, `scroll-snap-type:x mandatory`, e cada `.city-day` com `min-width:280px` e `scroll-snap-align:start`. Manter borda/backdrop atuais.
- `.city-day` (linha 75): grid interno passa a empilhar (data em cima, corpo embaixo) para caber lado a lado.
- Media query `max-width:820px`: reverte para coluna vertical (mantém legibilidade no mobile).
- Datas, títulos e descrições dos 4/3/3 dias permanecem inalterados.

## 5) Hospedagem
### 5a) Compactar espaçamento
Reduzir paddings verticais dos `.city-screen--hotel` e da faixa `#hoteis-intro` (títulos e blocos), diminuindo os `padding` verticais em `clamp(...)` para um valor menor (aprox. metade). Nenhum texto muda.

### 5b) Botão nos hotéis Waldorf e Mandarin
Adicionar dentro de `.cityname` de cada um (após o `<p class="hotel-desc">`, linhas 766 e 786) o mesmo bloco já usado no Fly Zoo:
```
<div class="cta-inline-wrap"><a href="#topo" class="cta-inline">Quero conversar →</a></div>
```

## 6) Curadoria — reduzir espaço em branco
- Linha 902: reduzir `margin:0 0 60px` do `#cur-desc` para `margin:0 0 20px`.
- Ajustar padding-top do bloco "As mentes por trás da imersão" (regra `.cur-*` das linhas ~132–229) para aproximar do parágrafo. Nenhum texto muda.

## 7) Resumo da missão — remover animações
- Linhas 1012–1016: trocar cada `data-count="N"` pelo número final já no HTML (`>9<`, `>03<`, `>05<`, `>02<`, `>02<`), e remover o `data-resumo=""` e os `will-change` para eliminar transformações.
- Linha 1006: reduzir `#resumo-track` de `height:260vh` para `height:auto` e transformar `#resumo-stage` em bloco normal (`position:static`, `height:auto`), com fundo vermelho fixo (`background:#E30613`) — some o pin/scrub.
- Linha 1008: remover o `#resumo-bg` (o fundo vermelho passa a ser do stage).
- Linha 1018: mudar `opacity:0` do `#resumo-cta` para removê-lo — CTA aparece estático.
- No JS, remover o bloco que anima `#resumo-*` (scaleY do bg, contagem dos números, entrada do CTA). Conteúdo idêntico, só sem animação.

## Verificação
Após as edições, abrir `/academy.html` no preview e conferir visualmente cada seção:
- Hero sem o botão vermelho, números "09" e "03 CIDADES".
- Seção "A Rota" com "9" estático.
- Cada cidade com texto+lista à direita e roteiro em linha horizontal (com scroll horizontal se não couber).
- Waldorf e Mandarin com CTA "Quero conversar →".
- Hospedagem e curadoria mais compactas.
- "Resumo da missão" com números finais visíveis instantaneamente, sem pin de scroll.
