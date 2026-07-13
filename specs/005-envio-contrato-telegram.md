# Spec: Envio do contrato pelo Telegram (com escolha de canal)

> **Status:** Implementado
> **Data:** 2026-07-07
> **Autor:** Victor (com Claude Code)

---

## Problema

O botão "Compartilhar Contrato" do Kanban abre **direto o WhatsApp** com o link do contrato. O Telegram — que já envia notificações de status e o PDF do orçamento — ficou de fora do fluxo do contrato. O marceneiro não tinha como escolher o canal.

## Solução

Ao clicar em **"Compartilhar Contrato"**, abre um pop-up (mesmo estilo dos modais existentes) com duas opções:

- **WhatsApp** — comportamento antigo (abre `wa.me` com a mensagem e o link)
- **Telegram** — nova rota `POST /orcamentos/:id/enviar-contrato-telegram` que manda a mensagem com o link do contrato direto no chat do cliente pelo bot

## Usuários afetados

- **Marceneiro:** escolhe por onde enviar o contrato, com um clique a mais.
- **Cliente final:** pode receber o link do contrato no Telegram, no mesmo chat das notificações.

## Fluxo principal

1. No Kanban, card "Aprovado" com contrato gerado → marceneiro clica em **Compartilhar Contrato**.
2. Pop-up pergunta o canal: **WhatsApp**, **Telegram** ou Cancelar.
3. WhatsApp → abre `wa.me` com a mensagem (fluxo antigo, sem mudança).
4. Telegram → frontend chama `POST /api/orcamentos/:id/enviar-contrato-telegram`; o backend valida o dono do orçamento (tenant), confere `contratoToken` e `telegramChatId`, e envia a mensagem com o link `FRONTEND_URL/contrato/:token`.
5. A ação fica registrada no Audit Log (`"enviou contrato por Telegram"`).

## Critérios de aceitação

- [x] Pop-up com as duas opções + Cancelar, estado "Enviando..." no Telegram
- [x] WhatsApp mantém exatamente o comportamento anterior
- [x] Mensagem do Telegram contém nome do cliente, nome da marcenaria, título do projeto e link do contrato
- [x] Orçamento sem contrato gerado → 400 com aviso claro
- [x] Cliente sem Telegram conectado → 400 com aviso claro, sem chamada ao bot
- [x] Tenant A não consegue enviar contrato do tenant B (404) — coberto por teste
- [x] Nomes/títulos com `*`, `_`, `` ` `` ou `[` não quebram a mensagem (escape de Markdown)
- [x] Envio registrado no Audit Log

## Fora do escopo

- Envio do PDF do contrato (vai só o link, como no WhatsApp)
- Pop-up de canal para o envio do orçamento (a tela do orçamento já tem os dois botões separados)
- WhatsApp via EvolutionAPI (continua no backlog)

## Design técnico

### Backend

- `services/telegram.ts`: `enviarMensagem` agora é exportada e retorna `boolean` (loga o erro do Telegram quando `!res.ok`); `notificarMudancaStatus` continua ignorando o retorno
- `OrcamentoController.enviarContratoTelegram`: filtro de tenant (`userId`) na query, valida `contratoToken` e `telegramChatId`, escapa Markdown em nome/título/marcenaria, audita com `registrar`
- Rota `POST /orcamentos/:id/enviar-contrato-telegram` atrás do `authMiddleware`

### Frontend

- `Kanban.tsx`: estado `contratoParaEnviar` abre o modal (`modal-overlay`/`modal-content` do `index.css`); `enviarContratoWhatsApp` (fluxo antigo) e `enviarContratoTelegram` (POST + toasts)

### Banco de dados

- Nenhuma mudança — usa `Orcamento.contratoToken` e `Cliente.telegramChatId` já existentes.

## Riscos e dependências

- Depende de `TELEGRAM_BOT_TOKEN` e `FRONTEND_URL` no Render (ambos já configurados)
- Cliente precisa ter conectado o bot antes (fluxo da tela de Clientes)
