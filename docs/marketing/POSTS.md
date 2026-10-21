# 10 posts — "Um amigo, uma música"

Artes prontas em [`img/`](img) (1080×1350, feed do Instagram/Facebook/LinkedIn) e GIFs em [`gif/`](gif)
(540×675, para Stories, WhatsApp e X). Para mudar um texto: edite [`gerador/posts.json`](gerador/posts.json)
e rode `node docs/marketing/gerador/render.mjs <id>`.

Tom de voz: próximo, carinhoso, brasileiro, frases curtas. Sempre terminar com o convite
("um amigo, uma música") e deixar o Pix como alternativa, nunca como foco.

Hashtags base (usar 5–8 por post): `#1Musica #UmAmigoUmaMusica #MusicaPersonalizada #PresenteCriativo #PresenteDiferente #Homenagem #IA #MusicaComIA`

---

## 01 · Lançamento — "Um amigo, uma música"
**Arte:** `img/post-01-lancamento.png` · **GIF:** `gif/post-01-lancamento.gif` · **Formato:** feed + Stories (GIF)

> Agora é assim: **um amigo, uma música.** 🎶
>
> Você convida 1 amigo pro 1Música. Ele cria a conta e **vocês dois ganham uma música personalizada grátis** — com nome, história e o estilo que a pessoa ama.
>
> Quer mais rápido? Também dá pra liberar por R$ 1,00 no Pix. Mas convenhamos: com amigo é mais gostoso. 💛
>
> 👉 Link na bio. Pega seu link de convite em "amigos" no menu.

**Alt text:** Arte coral com o texto "Um amigo, uma música. Convide 1 amigo. Vocês dois ganham 1 música personalizada grátis."

---

## 02 · Como funciona — 3 passos
**Arte:** `img/post-02-como-funciona.png` · **GIF:** `gif/post-02-como-funciona.gif` · **Formato:** carrossel (arte + 3 prints do app) ou Reels

> Fazer uma música pra alguém nunca foi tão simples:
>
> 1️⃣ Conta a história no chat (dá até pra mandar áudio)
> 2️⃣ A IA compõe letra e melodia
> 3️⃣ Você ouve, baixa e manda o link pra pessoa
>
> Sem senha, sem app pra instalar. E a primeira é por conta de um amigo. 😉

**Alt text:** Lista de 3 passos: conte a história no chat; a IA compõe letra e melodia; ouça, baixe e mande pra quem você ama.

---

## 03 · Da sua história pra letra
**Arte:** `img/post-03-historia-vira-letra.png` · **Formato:** carrossel (arte + vídeo com o áudio do exemplo "Bodas de Diamante")

> Você conta: _"Meus avós fazem 60 anos de casados. Ele ainda leva café na cama pra ela."_
> A música canta: _"Sessenta anos de café na cama, de mão dada no portão..."_ ☕💍
>
> É isso que o 1Música faz: pega um detalhe que só a sua família conhece e transforma em canção.
>
> 🎧 Ouça o exemplo completo no site.

**Alt text:** Um cartão com a história contada pelo usuário e, abaixo, o trecho da letra gerada.
**Atenção:** o trecho da letra é ilustrativo — antes de publicar, troque pelo trecho real da faixa `bodas_de_diamante.mp3`.

---

## 04 · Bastidores do chat
**Arte:** `img/post-04-bastidores-chat.png` · **Vídeo:** use `assets/demo-umamusica.gif` (já existe no repo) como Reels de 15s com música em alta · **Formato:** Reels

> Não precisa saber compor. Nem cantar. Nem rimar. 🙃
> É só conversar: pra quem é, o que vocês viveram, qual o estilo. O 1Música faz o resto.
>
> Testa agora — grátis com 1 amigo.

**Alt text:** Celular mostrando o chat do 1Música perguntando para quem é a música e qual o estilo.

---

## 05 · Desafio #MinhaMúsica1 — mostra a reação
**Arte:** `img/post-05-mostre-a-reacao.png` · **Formato:** feed + Stories fixado nos destaques

> O melhor momento é quando a pessoa aperta o play. 🥹
>
> **Desafio #MinhaMúsica1:** grave a reação de quem recebeu a música e marque a gente. Toda sexta a gente reposta os mais bonitos — e os escolhidos ganham **+3 músicas grátis**.

**Operação:** os +3 créditos são dados manualmente no Supabase (`users.free_songs_balance`) ou pela RPC `increment_free_songs` (3×). Peça autorização por DM antes de repostar.

**Alt text:** Fundo escuro com o texto "Mostra a reação" e barras de equalizador.

---

## 06 · Feedback — "Ouviu? Agora fala."
**Arte:** `img/post-06-feedback.png` · **Formato:** feed + Stories com **enquete** ("Sua música ficou: 🔥 Perfeita / 🛠️ Dá pra melhorar")

> Estamos na fase de ouvir vocês. 👂
>
> Depois de ouvir sua música, toca em **Gostei** ou **Não gostei** no app e conta o que faltou. Letra? Voz? Estilo? Cada comentário vira ajuste na próxima versão.
>
> Quem ajuda a gente a melhorar ganha música melhor. Justo, né?

**Onde ver as respostas:** tabela `feedback`, `category = 'song_rating'` (`reason_category` = `like`/`dislike`, `reason_details` = comentário).

---

## 07 · 22/11 — Dia do Músico
**Arte:** `img/post-07-dia-do-musico.png` · **Formato:** feed

> Hoje é Dia do Músico (e de Santa Cecília, padroeira da música). 🎼
>
> Parabéns a quem vive de música — e um convite pra quem nunca imaginou ganhar uma: **todo mundo merece uma música.**
>
> Um amigo, uma música. Link na bio.

---

## 08 · Black Friday — desconto de 100%
**Arte:** `img/post-08-black-friday.png` · **GIF:** `gif/post-08-black-friday.gif` · **Formato:** feed + Stories (GIF) + WhatsApp

> Black Friday no 1Música: **desconto de 100%.** 🖤
>
> Não tem cupom, não tem contagem regressiva, não tem letra miúda. Tem amigo: convida 1 e a música sai de graça pros dois.
>
> (Spoiler: vale o ano todo. Mas hoje é mais divertido.)

---

## 09 · Amigo secreto & Natal
**Arte:** `img/post-09-amigo-secreto-natal.png` · **Formato:** carrossel (arte + "ideias de música por tipo de amigo secreto") e Reels

> Tirou alguém no amigo secreto e não faz ideia do que dar? 🎁
>
> Dá uma música com o nome, as manias e as histórias da pessoa. Ninguém vai repetir esse presente.
>
> Grátis com 1 amigo — ou R$ 1,00 no Pix. Faz até 24/12 que ainda dá tempo.

**Carrossel sugerido:** "pro chefe" (sertanejo engraçado) · "pra tia do pavê" (forró) · "pro colega que só fala de café" (bossa nova) · "pro crush do RH" (pop romântico).

---

## 10 · Retrospectiva — 2026 em uma música
**Arte:** `img/post-10-retrospectiva-2026.png` · **Formato:** feed + Reels

> Retrospectiva 2026, versão 1Música: conta o que esse ano teve de melhor — viagem, conquista, gente nova, gente que ficou — e fecha o ano com uma trilha só sua. ✨
>
> Depois manda pra quem esteve com você nessa. (E se essa pessoa ainda não conhece o 1Música... vocês dois ganham mais uma.)
>
> Feliz 2027! 🥂
