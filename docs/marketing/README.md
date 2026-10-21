# Campanha "Um amigo, uma música" — nov/dez 2026

Objetivo: crescer por indicação até o fim do ano. Cada post leva a pessoa a **convidar 1 amigo**
(vocês dois ganham 1 música grátis); o Pix de R$ 1,00 aparece só como alternativa.
O modelo de produto está em [`../MODELO-UM-AMIGO-UMA-MUSICA.md`](../MODELO-UM-AMIGO-UMA-MUSICA.md)
(chega com o PR de backend).

## O que tem aqui

| Arquivo | O que é |
|---|---|
| [`POSTS.md`](POSTS.md) | Os 10 posts: legenda pronta, alt text, formato e observações |
| [`img/`](img) | 10 artes 1080×1350 (feed Instagram/Facebook/LinkedIn) |
| [`gif/`](gif) | 3 GIFs animados 540×675 (posts 01, 02 e 08) para Stories e WhatsApp |
| [`cronograma.html`](cronograma.html) | Calendário visual com filtros por formato (abra no navegador) |
| [`gerador/posts.json`](gerador/posts.json) | Textos das artes — edite aqui |
| [`gerador/render.mjs`](gerador/render.mjs) | Regera artes e GIFs a partir do JSON |

O vídeo do post 04 usa o GIF que já existe em `assets/demo-umamusica.gif`.

## Como regerar as artes (em qualquer máquina)

```bash
npm ci                                   # instala o Playwright do projeto
npx playwright install chromium          # só fora do container do Claude
node docs/marketing/gerador/render.mjs   # todas (precisa de ffmpeg no PATH para os GIFs)
node docs/marketing/gerador/render.mjs 08  # só o post 08
```

Exemplo: para trocar o CTA do post 01, edite `"cta"` do item `"id": "01"` em `posts.json` e rode o comando com `01`.

## Cronograma (3/nov → 31/dez · ter/qui/sáb · ⭐ = data-chave)

| Semana | Data | Post | Formato | Ação |
|---|---|---|---|---|
| 1 · Lançamento | 03/11 ter ⭐ | 01 · Lançamento | feed | Post de lançamento + GIF nos Stories. Fixar no topo do perfil. |
| 1 · Lançamento | 05/11 qui | 02 · Como funciona | carrossel | Arte + 3 prints do app (chat, letra, player). |
| 1 · Lançamento | 07/11 sáb | 04 · Bastidores do chat | reels | Reels de 15s com o GIF do app (assets/demo-umamusica.gif). |
| 2 · Prova social | 10/11 ter | 03 · Da história pra letra | carrossel | Arte + vídeo com o áudio de Bodas de Diamante. |
| 2 · Prova social | 12/11 qui | 06 · Feedback | feed | Feed + enquete nos Stories: "Sua música ficou perfeita ou dá pra melhorar?" |
| 2 · Prova social | 14/11 sáb | 05 · Desafio #MinhaMúsica1 | feed | Lança o desafio #MinhaMúsica1. Criar destaque "Reações". |
| 3 · Dia do Músico | 17/11 ter | 01 · Lançamento | reels | Você narrando como pegar o link de convite (gravar a tela de /amigos). |
| 3 · Dia do Músico | 19/11 qui | 03 · Da história pra letra | carrossel | Novo exemplo: O Sertanejo do Paizão. |
| 3 · Dia do Músico | 22/11 dom ⭐ | 07 · Dia do Músico | feed | Dia do Músico e de Santa Cecília. |
| 4 · Black Friday | 24/11 ter | 08 · Black Friday | stories | Teaser: "sexta tem desconto de 100%". |
| 4 · Black Friday | 27/11 sex ⭐ | 08 · Black Friday | feed | Black Friday: feed + GIF nos Stories + status do WhatsApp. |
| 4 · Black Friday | 28/11 sáb | 05 · Desafio #MinhaMúsica1 | stories | Repost das reações e anúncio dos ganhadores do desafio. |
| 5 · Amigo secreto | 01/12 ter | 09 · Amigo secreto e Natal | carrossel | Ideias de música por tipo de amigo secreto (chefe, tia do pavê, colega do café). |
| 5 · Amigo secreto | 03/12 qui | 02 · Como funciona | reels | Como funciona, versão animada (gif/post-02). |
| 5 · Amigo secreto | 05/12 sáb | 06 · Feedback | feed | "Vocês pediram, a gente mudou": 2 ou 3 ajustes feitos a partir do feedback. |
| 6 · Família | 08/12 ter ⭐ | 03 · Da história pra letra | feed | Dia Nacional da Família: uma música pra família toda. |
| 6 · Família | 10/12 qui | 09 · Amigo secreto e Natal | reels | Reels: a reação de quem recebeu a música no amigo secreto. |
| 6 · Família | 12/12 sáb | 05 · Desafio #MinhaMúsica1 | stories | Repost das reações da semana. |
| 7 · Reta final do Natal | 15/12 ter | 09 · Amigo secreto e Natal | stories | Contagem: faltam 10 dias pro Natal. |
| 7 · Reta final do Natal | 17/12 qui | 04 · Bastidores do chat | reels | Bastidores, versão Natal: o chat contando a história da ceia da família. |
| 7 · Reta final do Natal | 19/12 sáb | 08 · Black Friday | feed | Reaproveita a arte de Black Friday: "R$ 0 no Natal também". |
| 8 · Natal | 21/12 seg | 09 · Amigo secreto e Natal | stories | Última semana: "fica pronta em minutos". |
| 8 · Natal | 23/12 qua | 09 · Amigo secreto e Natal | stories | Ainda dá tempo. Mandar também nos grupos de WhatsApp. |
| 8 · Natal | 24/12 qui ⭐ | 09 · Amigo secreto e Natal | feed | Feliz Natal. |
| 9 · Ano novo | 28/12 seg | 10 · Retrospectiva 2026 | feed | Retrospectiva: 2026 em uma música. |
| 9 · Ano novo | 30/12 qua | 10 · Retrospectiva 2026 | reels | Reels da retrospectiva com trechos de músicas reais (pedir autorização). |
| 9 · Ano novo | 31/12 qui ⭐ | 10 · Retrospectiva 2026 | stories | Feliz 2027. Agradecer a quem usou e deu feedback. |

Rotina diária: 1 Story por dia, responder comentários/DMs com o link de convite, e às sextas
creditar +3 músicas aos vídeos escolhidos do desafio #MinhaMúsica1.

## Antes de publicar (checklist)

- [ ] Confirmar o @ do perfil e o domínio usado nas artes (`umamusica.com.br`).
- [ ] Post 03: trocar o trecho de letra ilustrativo pelo trecho real de `bodas_de_diamante.mp3`.
- [ ] Post 05: decidir quem aprova os +3 créditos e como (SQL/RPC `increment_free_songs`).
- [ ] Merge e deploy dos PRs de backend e frontend **antes de 03/11** — sem eles, a música
      ganha por indicação ainda sai como demo.

## Métricas (toda segunda)

- Cadastros por convite: `select count(*) from users where referred_by is not null and created_at > now() - interval '7 days'`
- Músicas grátis entregues: `orders` com `payment_id like 'bonus_balance_%'` e `status = 'completed'`
- Satisfação: `feedback` com `category = 'song_rating'` → proporção de `reason_category = 'like'`
- Custo: `/admin/custos`, etapa `music_generation`
- Pagantes: `orders` com `payment_id` numérico
