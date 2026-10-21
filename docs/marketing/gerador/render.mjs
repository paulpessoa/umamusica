// Gera as artes dos posts (PNG 1080x1350) e os GIFs animados a partir de posts.json.
//
// Uso (na raiz do repo, depois de `npm ci`):
//   node docs/marketing/gerador/render.mjs            # todas as artes + GIFs
//   node docs/marketing/gerador/render.mjs 08         # só o post 08
//
// Requisitos: Chromium do Playwright (já vem com `npm ci`; fora do container
// rode `npx playwright install chromium`) e ffmpeg no PATH para os GIFs.

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const here = path.dirname(fileURLToPath(import.meta.url))
const outImg = path.join(here, "..", "img")
const outGif = path.join(here, "..", "gif")
fs.mkdirSync(outImg, { recursive: true })
fs.mkdirSync(outGif, { recursive: true })

const posts = JSON.parse(fs.readFileSync(path.join(here, "posts.json"), "utf8"))
const only = process.argv[2]

const W = 1080
const H = 1350
const GIF_SECONDS = 3.2
const GIF_FPS = 12

const THEMES = {
  coral: { bg: "#FF5A5F", fg: "#FFFFFF", muted: "rgba(255,255,255,.82)", accent: "#FFFFFF", card: "rgba(255,255,255,.14)", pillBg: "#FFFFFF", pillFg: "#FF5A5F" },
  light: { bg: "#FFF7F5", fg: "#1F1A24", muted: "#5B5563", accent: "#FF5A5F", card: "#FFFFFF", pillBg: "#FF5A5F", pillFg: "#FFFFFF" },
  dark: { bg: "#1F1A24", fg: "#FFFFFF", muted: "rgba(255,255,255,.72)", accent: "#FF8A8D", card: "rgba(255,255,255,.08)", pillBg: "#FF5A5F", pillFg: "#FFFFFF" }
}
const themeFor = { "01": "coral", "05": "dark", "07": "dark", "08": "coral", "10": "dark" }

const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")

// Equalizer bars used as the brand's visual signature
const bars = (n = 18) =>
  `<div class="bars">${Array.from({ length: n }, (_, i) =>
    `<span style="animation-delay:${(i * 0.09).toFixed(2)}s;height:${30 + ((i * 37) % 70)}%"></span>`
  ).join("")}</div>`

function layoutBody(p) {
  switch (p.layout) {
    case "steps":
      return `
        <h1 class="anim up">${esc(p.title)}</h1>
        <div class="steps">${p.steps
          .map((s, i) => `<div class="step anim up" style="animation-delay:${0.5 + i * 0.45}s"><b>${i + 1}</b><span>${esc(s)}</span></div>`)
          .join("")}</div>`
    case "quote":
      return `
        <div class="card quote anim up"><small>Você conta</small><p>${esc(p.quote)}</p></div>
        <div class="arrow anim pop" style="animation-delay:.5s">&#8595;</div>
        <div class="card lyric anim up" style="animation-delay:.8s"><small>A música canta</small><p>${esc(p.answer)}</p><em>${esc(p.caption)}</em></div>`
    case "phone":
      return `
        <div class="split">
          <div><h1 class="anim up">${esc(p.title)}</h1><p class="body anim up">${esc(p.body)}</p></div>
          <div class="phone anim up">
            <div class="bubble bot">Pra quem é a música?</div>
            <div class="bubble me">Pra minha mãe, 70 anos</div>
            <div class="bubble bot">Que estilo ela curte?</div>
            <div class="bubble me">Samba! Ela dança na cozinha</div>
            <div class="bubble bot">Compondo... &#9835;</div>
          </div>
        </div>`
    case "poll":
      return `
        <h1 class="anim up">${esc(p.title)}</h1>
        <p class="body anim up">${esc(p.body)}</p>
        <div class="poll anim up"><div class="opt yes">&#128077; Gostei</div><div class="opt">&#128078; Não gostei</div></div>`
    case "price":
      return `
        <h1 class="anim up">${esc(p.title)}</h1>
        <div class="price">
          <span class="old anim fade">${esc(p.old)}<i class="strike"></i></span>
          <span class="new anim pop" style="animation-delay:1.3s">${esc(p.new)}</span>
        </div>
        <p class="body anim up" style="animation-delay:1.8s">${esc(p.body)}</p>`
    case "gift":
      return `
        <div class="gift anim pop">
          <svg viewBox="0 0 120 120" width="230" height="230" aria-hidden="true">
            <rect x="14" y="48" width="92" height="62" rx="10" fill="#FF5A5F"/>
            <rect x="8" y="34" width="104" height="22" rx="8" fill="#FF7A7E"/>
            <rect x="53" y="34" width="14" height="76" fill="#FFD166"/>
            <path d="M60 34 C40 10 22 22 34 34 Z M60 34 C80 10 98 22 86 34 Z" fill="#FFD166"/>
            <text x="60" y="92" font-size="30" text-anchor="middle" fill="#fff">&#9835;</text>
          </svg>
        </div>
        <h1 class="anim up">${esc(p.title)}</h1>
        <p class="body anim up">${esc(p.body)}</p>`
    default: // hero
      return `
        <h1 class="anim up">${esc(p.title)}</h1>
        <p class="body anim up" style="animation-delay:.6s">${esc(p.body)}</p>
        ${bars()}`
  }
}

function html(p) {
  const t = THEMES[themeFor[p.id] || "light"]
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{font-family:Inter,"Noto Color Emoji",sans-serif;background:${t.bg};color:${t.fg};
    padding:96px 88px;display:flex;flex-direction:column;position:relative}
  .blob{position:absolute;border-radius:50%;filter:blur(2px);opacity:.18;background:${t.accent}}
  .kicker{align-self:flex-start;font-weight:800;font-size:30px;letter-spacing:.02em;padding:14px 28px;border-radius:999px;
    background:${t.card};color:${t.accent};border:2px solid ${t.accent}33}
  main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}
  h1{font-family:"Inter Display",Inter,sans-serif;font-weight:900;font-size:124px;line-height:.98;letter-spacing:-.035em}
  .body{font-size:42px;line-height:1.32;color:${t.muted};max-width:860px;font-weight:500}
  footer{display:flex;align-items:center;justify-content:space-between;gap:24px}
  .logo{font-weight:900;font-size:44px;letter-spacing:-.02em}
  .logo span{color:${t.accent}}
  .cta{background:${t.pillBg};color:${t.pillFg};font-weight:800;font-size:30px;padding:22px 34px;border-radius:999px;max-width:640px;text-align:center}
  .bars{display:flex;align-items:flex-end;gap:12px;height:150px}
  .bars span{flex:1;border-radius:8px;background:${t.accent};opacity:.85;animation:eq 1.1s ease-in-out infinite alternate}
  .steps{display:flex;flex-direction:column;gap:26px}
  .step{display:flex;align-items:center;gap:30px;background:${t.card};border-radius:32px;padding:34px 38px;font-size:40px;font-weight:700;box-shadow:0 10px 30px #0000000d}
  .step b{flex:none;width:84px;height:84px;border-radius:50%;background:#FF5A5F;color:#fff;display:grid;place-items:center;font-size:44px}
  .card{background:${t.card};border-radius:36px;padding:40px 44px;box-shadow:0 12px 34px #0000000f}
  .card small{display:block;font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${t.accent};margin-bottom:14px}
  .card p{font-size:40px;line-height:1.3;font-weight:600}
  .lyric{background:#FF5A5F;color:#fff}.lyric small{color:#fff;opacity:.85}
  .lyric p{font-style:italic;font-size:46px}
  .lyric em{display:block;margin-top:18px;font-size:28px;opacity:.85;font-style:normal;font-weight:600}
  .arrow{align-self:center;font-size:70px;color:${t.accent};font-weight:900;line-height:1}
  .split{display:grid;grid-template-columns:1fr 420px;gap:48px;align-items:center}
  .split h1{font-size:104px}
  .phone{background:#fff;border:14px solid #1F1A24;border-radius:56px;padding:40px 22px;display:flex;flex-direction:column;gap:16px;min-height:720px;justify-content:center}
  .bubble{font-size:26px;font-weight:600;padding:18px 22px;border-radius:24px;max-width:86%;color:#1F1A24}
  .bubble.bot{background:#F2EFF4;align-self:flex-start;border-bottom-left-radius:6px}
  .bubble.me{background:#FF5A5F;color:#fff;align-self:flex-end;border-bottom-right-radius:6px}
  .poll{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .opt{background:${t.card};border:3px solid #FF5A5F33;border-radius:32px;padding:44px 20px;text-align:center;font-size:42px;font-weight:800}
  .opt.yes{background:#FF5A5F;color:#fff;border-color:#FF5A5F}
  .price{display:flex;align-items:baseline;gap:48px}
  .old{position:relative;font-size:96px;font-weight:800;opacity:.7}
  .strike{position:absolute;left:-6%;top:52%;height:12px;width:112%;background:#1F1A24;border-radius:6px;transform-origin:left;animation:strike .5s .7s both}
  .new{font-size:230px;font-weight:900;letter-spacing:-.05em;line-height:1}
  .gift{align-self:flex-start}
  .anim.up{animation:up .7s cubic-bezier(.2,.8,.2,1) both}
  .anim.pop{animation:pop .6s cubic-bezier(.2,1.4,.4,1) both}
  .anim.fade{animation:fade .6s both}
  @keyframes up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
  @keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  @keyframes strike{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
  .bars span{transform-origin:bottom}
  </style></head><body>
  <div class="blob" style="width:520px;height:520px;right:-180px;top:-160px"></div>
  <div class="blob" style="width:300px;height:300px;left:-120px;bottom:180px"></div>
  <div class="kicker anim fade">${esc(p.kicker)}</div>
  <main>${layoutBody(p)}</main>
  <footer><div class="logo">1<span>Música</span></div><div class="cta">${esc(p.cta)}</div></footer>
  </body></html>`
}

// Freeze every CSS animation at time `ms` so a frame is deterministic.
async function seek(page, ms) {
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause()
      a.currentTime = t
    }
  }, ms)
}

const browser = await chromium.launch(
  fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}
)
const page = await browser.newPage({ viewport: { width: W, height: H } })

for (const p of posts) {
  if (only && p.id !== only) continue
  const name = `post-${p.id}-${p.slug}`
  await page.setContent(html(p), { waitUntil: "load" })
  await page.evaluate(() => document.fonts.ready)

  // Static art: everything already animated in (bars mid-swing look natural).
  await seek(page, 4000)
  await page.screenshot({ path: path.join(outImg, `${name}.png`) })
  console.log("img", name)

  if (!p.gif) continue
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gif-"))
  const total = Math.round(GIF_SECONDS * GIF_FPS)
  for (let i = 0; i < total; i++) {
    await seek(page, (i * 1000) / GIF_FPS)
    await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(3, "0")}.png`) })
  }
  // Hold the final frame for ~1.5s so the message can be read before looping.
  for (let i = 0; i < GIF_FPS * 1.5; i++) {
    fs.copyFileSync(
      path.join(tmp, `f${String(total - 1).padStart(3, "0")}.png`),
      path.join(tmp, `f${String(total + i).padStart(3, "0")}.png`)
    )
  }
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(GIF_FPS), "-i", path.join(tmp, "f%03d.png"),
    "-vf", "scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    path.join(outGif, `${name}.gif`)
  ])
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log("gif", name)
}

await browser.close()
