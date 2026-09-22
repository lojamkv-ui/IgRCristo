# Igreja Renascendo em Cristo — Gestão de membros e agenda

Sistema completo de cadastro de membros (com foto, cargos eclesiásticos e locais, parentesco e histórico de alterações) e agenda de cultos com geração de flyer e integração com o Canva.

**Igreja:** Igreja Renascendo em Cristo — Sede · Trindade - GO  
**Repositório:** https://github.com/lojamkv-ui/IgRCristo

## Flyers e prompts para o Canva

Em cada culto da agenda, clique em **Gerar flyer**. Há quatro abas:

1. **Flyer** — arte gerada no navegador (Canvas), com temas e formatos (Stories 1080×1920 ou Feed 1080×1350).
2. **Canva** — envia a arte ou preenche um modelo da sua biblioteca (requer Connect API).
3. **Prompts Canva** — prompts prontos, no estilo:
   - **Prompt 1 (Texto):** *“Aja como um designer especialista em mídias sociais para igrejas…”* — cole no Magic Write.
   - **Prompt 2 (Fundo):** *“Crie um fundo moderno para flyer de culto evangélico no formato retrato (1080×1350)…”* — cole no Magic Media.
   - **Textos prontos:** título, data, pregador, versículo e rodapé para colar direto nos elementos.
   - **Magic Studio:** prompt único de layout + cores + dados do culto.
   - **Como montar:** dicas de formato, fundo, foto do pregador e fontes.
4. **Legenda** — texto para WhatsApp/Instagram com hashtags.

Os prompts já saem preenchidos com data, horário, pregador, dirigente, endereço, CNPJ e contato da igreja.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- PostgreSQL via Drizzle ORM
- Integração opcional com OpenAI (textos do flyer) e Canva Connect API

## Variáveis de ambiente

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
OPENAI_API_KEY=            # opcional — textos do flyer via ChatGPT
CANVA_CLIENT_ID=           # opcional — integração Canva
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URL=        # opcional — padrão: {origem}/api/canva/callback
```

## Como rodar

```bash
npm install
npx drizzle-kit push
npm run dev
```

Acesse `http://localhost:3000`.
