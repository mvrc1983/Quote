# Quote

Cotação de embalagens flexíveis para convertedores pequenos e médios. O app roda no navegador: monta a estrutura, estima o consumo de filme, aplica setup, perdas, impressão, conversão, acessórios, markup, comissão e impostos brasileiros, e gera a proposta em PDF.

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
| `estruturas` | Id, nome, gramatura (g/m²) e R$/kg de cada laminado |
| `tintas` | Id, nome e R$/m² |
| `vernizes` | R$/m². "Sem" fica em zero |
| `formatos` | R$/unidade de conversão e setup (R$) de cada formato |
| `setupImpressao` | Setup de impressão (R$ por pedido), diluído no lote |
| `fatorDesperdicio` | Multiplicador de perda sobre material, tinta e verniz (1,12 = 12%) |
| `acessorios` | Zipper, válvula e bico em R$/unidade |
| `lotesPadrao` | Quebras sugeridas em unidades e em kg |
| `comercial` | Markup, comissão, pagamento, PIS/COFINS, ICMS, IPI, frete, lead time, validade e textos padrão |
| `produtoPadrao` | Produto que abre no formulário |
| `exemplo` / `aviso` | Marca o arquivo como demonstração. Com `exemplo: true`, a tela e o PDF avisam que os preços são fictícios |

Markup, comissão e alíquotas são frações: `0,45` = 45%.

Formatos, zipper e verniz continuam fixos no código porque a área do filme depende deles. Estruturas e tintas são só dados: uma empresa nova entra com outros ids, sem mudar o cálculo.

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

## Motor de custo

O cálculo é determinístico e não depende de tela:

- área do formato, mais uma faixa de filme se houver zipper;
- peso por unidade = área × gramatura;
- custo variável = (material + impressão + verniz) × fator de perda + conversão + acessórios;
- setup de impressão e de conversão entra uma vez no lote;
- NET = custo × (1 + markup) / (1 − comissão) × fator de pagamento (prazo faturado ou taxa do cartão);
- com impostos = NET / (1 − PIS/COFINS − ICMS) × (1 + IPI).

O mesmo peso gera o mesmo total em **unidades** ou em **kg**. Os testes em `src/lib/costing.test.ts` travam esses resultados com o catálogo de exemplo.

Rascunhos ficam no `localStorage` do navegador (até 20). Salvar de novo atualiza o rascunho aberto.

O PDF usa Liberation Sans (licença SIL Open Font License, `public/fonts/OFL.txt`) para acentuação.

## Próximo passo

Ainda não há login nem banco. O passo seguinte é Supabase: autenticação e tabelas por empresa (`empresas`, catálogo na mesma forma deste JSON, e `cotacoes` com histórico e status). A tela passa a ler o catálogo da empresa logada em vez do arquivo de exemplo, e os rascunhos saem do navegador.
