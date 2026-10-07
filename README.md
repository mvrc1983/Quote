# Quote

Cotação de embalagens, rótulos, sleeves e cartonados para convertedores pequenos e médios. O app roda no navegador: monta a estrutura, escolhe o processo de impressão, estima consumo, setup, ferramental, perdas, conversão, acessórios, markup, comissão e impostos brasileiros, e gera a proposta em PDF.

Os preços desta entrega são **fictícios**. Eles estão no catálogo de exemplo e não representam nenhuma empresa.

## Como rodar

```bash
npm install
npm test
npm run dev
```

Build de produção: `npm run build`.

## Catálogo da empresa

Todo preço e toda condição comercial padrão vêm de um único objeto de configuração, hoje o arquivo [`src/config/empresa.exemplo.json`](src/config/empresa.exemplo.json). O app carrega esse arquivo em `src/config/catalogo.ts`. Para apontar outra empresa, substitua o JSON pela mesma forma (ou troque o import). O validador recusa catálogo incompleto: falta de formato, tinta, estrutura ou alíquota inválida.

| Bloco | O que configura |
|---|---|
| `empresa` | Nome, cidade, UF e linha que aparecem no cabeçalho e no PDF |
| `estruturas` | Id, nome, gramatura (g/m²) e R$/kg de cada laminado ou cartão |
| `processos` | Máquina: família, aplicações, hora, velocidade, tinta, clique, ferramental e, na folha, formato mínimo e máximo |
| `vernizes` | R$/m². "Sem" fica em zero |
| `formatos` | Conversão, setup, costura, corte e folga de costura (mm) de cada formato |
| `fatorDesperdicio` | Multiplicador de perda sobre material, tinta e verniz (1,12 = 12%) |
| `acessorios` | Zipper, válvula e bico em R$/unidade |
| `lotesPadrao` | Quebras sugeridas em unidades e em kg |
| `comercial` | Markup, comissão, pagamento, PIS/COFINS, ICMS, IPI, frete, lead time, validade e textos padrão |
| `produtoPadrao` | Produto que abre no formulário |
| `exemplo` / `aviso` | Marca o arquivo como demonstração. Com `exemplo: true`, a tela e o PDF avisam que os preços são fictícios |

Markup, comissão e alíquotas são frações: `0,45` = 45%.

Formatos, zipper e verniz continuam fixos no código porque a área depende deles. Estruturas e processos são só dados: uma empresa nova entra com outros ids, sem mudar o cálculo.

## Importar template

1. Baixe o JSON em branco em **Baixar template em branco** (`public/template-cotacao.json`). Há também um CSV em `public/template-cotacao.csv`.
2. Preencha cliente, produto e volume. Campo vazio ou `null` usa o catálogo da empresa.
3. Clique **Importar template** e escolha o `.json` (preferido) ou o `.csv`.
4. Com cliente, especificação e lotes preenchidos, clique **Gerar proposta**.

Um valor de enum que o catálogo não conhece vira erro com o nome do campo. Chaves que começam com `_` são ignoradas. O exemplo preenchido está em `public/exemplo-template-preenchido.json`.

| Template | App |
|---|---|
| `cliente.*` | proposta |
| `produto.*` | produto e volume comercial (markup e comissão) |
| `volume.volumeMode`, volumes e `lotes` | modo de volume e lotes (`{ unidades }` ou `{ kg }`) |
| `comercial.*` | pagamento e impostos |

## Processos

Cada processo declara as aplicações que aceita. O formulário e a importação só oferecem combinações válidas.

| Processo de exemplo | Alimentação | Aplicações | Sugerido para |
|---|---|---|---|
| Flexo banda larga (CI) | bobina | flexível | flexível |
| Flexo banda estreita | bobina | rótulo, sleeve | rótulo, sleeve |
| Rotogravura | bobina | flexível, sleeve | — |
| Digital eletrofotográfica · embalagens | bobina | flexível, cartonado | — |
| Digital eletrofotográfica · rótulos | bobina | rótulo, sleeve | — |
| Inkjet | bobina | só rótulo autoadesivo | — |
| Offset a folha · meia folha (máx. 520×740 mm) | folha | cartonado | cartonado |
| Offset a folha · formato inteiro (máx. 720×1020 mm) | folha | cartonado | cartonado |
| Offset a folha · large format (máx. 1210×1620 mm) | folha | cartonado | cartonado |
| Offset rotativo | bobina | flexível, rótulo, sleeve | — |
| Offset intermitente | bobina | rótulo, sleeve | — |

Os nomes comerciais de folha (cerca de 50×70 cm, 70×100 cm e 120×160 cm) correspondem, no exemplo, aos formatos máximos usuais de prensa: 52×74 cm, 72×102 cm e 121×162 cm. Cada máquina também tem folha mínima. A pinça, as margens e o vão entre poses são configuráveis.

No cartonado, a sugestão é a máquina a folha de menor custo em que o cartucho planificado cabe. No flexível, a sugestão é a flexo de banda larga: offset rotativo continua permitido e não é o padrão.

Um pedido pode ter vários grupos de cor. Em linha, a banda passa uma vez na menor velocidade, a hora das máquinas é somada, e cada grupo entra com o próprio ferramental, setup e tinta. O caso de offset nas cores e rotogravura no branco está coberto por teste. Passagens separadas somam as corridas.

## Motor de custo

O cálculo é determinístico e não depende de tela:

- área do formato, mais uma faixa de filme se houver zipper;
- na bobina, máquina em R$/h e m/min, acerto em metros e tinta por cobertura ou clique por m²;
- na folha, imposição do cartucho na folha máxima (pinça e margens), folhas do lote arredondadas para cima, folhas de acerto e custo de papel e máquina por folha;
- ferramental (clichê, chapa ou cilindro) diluído no lote ou cobrado à parte;
- peso por unidade = área de substrato × gramatura;
- NET = custo × (1 + markup) / (1 − comissão) × fator de pagamento (prazo faturado ou taxa do cartão);
- com impostos = NET / (1 − PIS/COFINS − ICMS) × (1 + IPI).

O mesmo peso gera o mesmo total em **unidades** ou em **kg**. Os testes em `src/lib/costing.test.ts` e `src/lib/processos.test.ts` travam área, imposição, compatibilidade, híbrido e o ponto em que o digital deixa de ser o mais barato.

Rascunhos ficam no `localStorage` do navegador (até 20). Salvar de novo atualiza o rascunho aberto.

O PDF usa Liberation Sans (licença SIL Open Font License, `public/fonts/OFL.txt`) para acentuação.

## Próximo passo

Ainda não há login nem banco. O passo seguinte é Supabase: autenticação e tabelas por empresa (`empresas`, catálogo na mesma forma deste JSON, e `cotacoes` com histórico e status). A tela passa a ler o catálogo da empresa logada em vez do arquivo de exemplo, e os rascunhos saem do navegador.
