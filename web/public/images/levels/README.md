# Donor level icons

Coloque aqui os 30 PNGs dos ícones de nível do doador.

## Convenções

- Nome do arquivo: `{level}.png` (sem zero à esquerda)
  - `1.png`, `2.png`, ..., `30.png`
- Formato: PNG com fundo transparente
- Resolução recomendada: **512 × 512** px
- Peso ideal: **≤ 80 KB** por arquivo (use `pngquant` ou similar)

O componente que consome esses arquivos é `DonorLevelIcon`
(`web/components/dashboard/donor/donor-level-icon.tsx`).
A URL final, servida estaticamente pelo Next, é `/images/levels/{level}.png`.

Se um arquivo não existir ou falhar ao carregar, o componente cai em um
fallback visual com o número do nível (sem quebrar o layout).
