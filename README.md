# Igreja Renascendo em Cristo · Gestão da Sede

Sistema de cadastro de membros, agenda de cultos e geração de flyers da **Igreja Renascendo em Cristo**, sede em Trindade/GO.

## O que o sistema faz

- Cadastro de membros com foto, cargos eclesiásticos (data de consagração), cargos locais (início e fim), parentesco e histórico de cada alteração.
- Filtros combinados por nome, cargo eclesiástico, cargo local e parentesco.
- Agenda de cultos: data, hora, dirigente, pregador, cantores e intercessores.
- **Estúdio de flyer no Canvas** (1080×1350 ou 1080×1920):
  - Biblioteca de 6 modelos (layouts).
  - 7 temas visuais e 5 tons de redação.
  - **Prompts para o Canvas**: Prompt 1 gera os textos; Prompt 2 pinta um fundo cinematográfico (azul escuro, dourado, feixes de luz, fumaça, centro livre para a foto do pregador).
  - Importação de fundo próprio.
  - Dados oficiais no rodapé: e-mail, CNPJ, endereço, pastor presidente e contato.

## Dados oficiais da sede

- E-mail: sede.renascendoemcristo@gmail.com
- CNPJ: 58.563.268/0001-11
- Endereço: R NICANOR ALBERNAZ QD. 02 LT. 01 - SETOR CRISTINA - TRINDADE - GO. CEP: 75.383-579
- Pr. Presidente Wellington Felicio Vieira
- Contato: (62) 99154-2563

## Como rodar

```bash
npm install
npx drizzle-kit push
npm run dev
```

Variáveis: `DATABASE_URL` (obrigatória). `OPENAI_API_KEY` (opcional) — sem ela, o texto do flyer é composto localmente.

## Stack

Next.js (App Router), PostgreSQL, Drizzle ORM, Canvas 2D (sem Canva externo).
