// Gera as imagens (feed 1080x1350 e story 1080x1920) e o vídeo de demonstração para cada entrada de
// social/calendario.json, e a página public/redes/ onde se guardam as imagens e se copiam as legendas.
// Uso: node social/gerar.js            (precisa de Playwright e ffmpeg)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const AQUI = __dirname;
const SAIDA = path.join(AQUI, '..', 'public', 'redes');
const calendario = JSON.parse(fs.readFileSync(path.join(AQUI, 'calendario.json'), 'utf8'));
const creditosPath = path.join(AQUI, 'fotos', 'creditos.json');
const creditos = fs.existsSync(creditosPath) ? JSON.parse(fs.readFileSync(creditosPath, 'utf8')) : {};
const SITE = 'https://orcamentorapido.pages.dev';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escolhe uma foto da pesquisa pedida, sem repetir enquanto houver alternativas.
const usadas = new Set();
function escolherFoto(pesquisa) {
  const todas = Object.entries(creditos);
  const daPesquisa = todas.filter(([, c]) => c.pesquisa === pesquisa);
  const pool = daPesquisa.length ? daPesquisa : todas;
  const livre = pool.find(([n]) => !usadas.has(n)) || pool[0];
  if (!livre) return null;
  usadas.add(livre[0]);
  return { ficheiro: path.join(AQUI, 'fotos', livre[0]), ...livre[1] };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
*{box-sizing:border-box}html,body{margin:0}
body{width:1080px;font-family:"IBM Plex Sans",sans-serif;color:#f3f4f1;background:#18202b;position:relative;overflow:hidden}
.brand{display:flex;align-items:center;gap:14px;font:800 36px "Archivo",sans-serif;color:#f3f4f1}
.brand i{width:30px;height:30px;background:#f2c230;transform:skew(-12deg);display:inline-block}
h1{font:800 92px/1.02 "Archivo",sans-serif;letter-spacing:-.02em;margin:0;text-wrap:balance}
h1 em{font-style:normal;color:#f2c230}
.sub{font-size:40px;line-height:1.3;color:#d5d9de;margin:0}
.url{font:600 34px "IBM Plex Sans",sans-serif;background:#f2c230;color:#18202b;padding:14px 24px;border-radius:8px;display:inline-block;justify-self:start;align-self:flex-start}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,32,43,.55) 0%,rgba(24,32,43,.15) 35%,rgba(24,32,43,.9) 68%,#18202b 100%)}
.layer{position:absolute;inset:0;padding:80px;display:flex;flex-direction:column;justify-content:space-between}
.stack{display:grid;gap:30px}
ol{margin:0;padding:0;list-style:none;display:grid;gap:26px;counter-reset:n}
ol li{display:grid;grid-template-columns:76px 1fr;gap:22px;font-size:42px;line-height:1.28;align-items:start}
ol li::before{counter-increment:n;content:counter(n);font:800 44px "Archivo",sans-serif;background:#f2c230;color:#18202b;width:76px;height:76px;border-radius:8px;display:grid;place-items:center}
.sheet{background:#fff;color:#18202b;border-radius:10px;padding:48px;display:grid;gap:6px;box-shadow:0 40px 80px rgba(0,0,0,.45)}
.sheet h2{font:800 46px "Archivo",sans-serif;margin:0 0 4px}
.sheet .t{font-size:30px;color:#5d6672;margin-bottom:18px;border-bottom:4px solid #18202b;padding-bottom:18px}
.r{display:flex;justify-content:space-between;gap:20px;font:500 34px "IBM Plex Mono",monospace;padding:14px 0;border-bottom:2px dashed #d9ddd6}
.tot{display:flex;justify-content:space-between;font:800 50px "Archivo",sans-serif;padding-top:20px}
.credit{position:absolute;right:24px;bottom:16px;font-size:18px;color:rgba(255,255,255,.55)}
`;

function corpo(p, formato, f) {
  const story = formato === 'story';
  const marca = `<div class="brand"><i></i>Orçamento Rápido</div>`;
  const rodape = `<div class="url">orcamentorapido.pages.dev</div>`;
  if (p.tipo === 'foto') {
    const bg = f ? `<div class="photo" style="background-image:url('data:image/jpeg;base64,${fs.readFileSync(f.ficheiro).toString('base64')}')"></div><div class="shade"></div>` : '';
    return { foto: f, html: `${bg}<div class="layer">${marca}<div class="stack"><h1>${esc(p.titulo)}</h1><p class="sub">${esc(p.texto)}</p>${rodape}</div></div>` };
  }
  if (p.tipo === 'dica') {
    const li = p.pontos.map(x => `<li>${esc(x)}</li>`).join('');
    return { html: `<div class="layer" style="justify-content:${story ? 'center' : 'space-between'};gap:70px">${marca}<div class="stack" style="gap:56px"><h1 style="font-size:${story ? 88 : 80}px"><em>${esc(p.titulo)}</em></h1><ol>${li}</ol></div>${rodape}</div>` };
  }
  if (p.tipo === 'orcamento') {
    const linhas = p.linhas.map(([a, b]) => `<div class="r"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
    return { html: `<div class="layer" style="justify-content:${story ? 'center' : 'space-between'};gap:60px">${marca}<div class="sheet"><h2>ORÇAMENTO</h2><div class="t">${esc(p.titulo)}</div>${linhas}<div class="tot"><span>Total</span><span>${esc(p.total)}</span></div></div><div class="stack" style="gap:20px"><p class="sub">Feito em 2 minutos, com o IVA certo.</p>${rodape}</div></div>` };
  }
  return null;
}

async function gravarVideo(browser, destino) {
  // Grava o site a ser usado (formato vertical) e converte para MP4.
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'reel-'));
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, recordVideo: { dir: tmp, size: { width: 540, height: 960 } } });
  const pg = await ctx.newPage();
  await pg.goto(SITE + '/'); await pg.waitForTimeout(1500);
  const devagar = async (sel, txt) => { await pg.click(sel, { clickCount: 3 }); await pg.keyboard.type(txt, { delay: 70 }); };
  await pg.locator('#f').scrollIntoViewIfNeeded(); await pg.waitForTimeout(800);
  await devagar('#cliName', 'João Pereira'); await devagar('#cliAddr', 'Av. da Liberdade 45, Braga');
  await pg.locator('#items').scrollIntoViewIfNeeded(); await pg.waitForTimeout(600);
  await devagar('#p0', '150'); await pg.waitForTimeout(500);
  await pg.locator('#vat').scrollIntoViewIfNeeded(); await pg.selectOption('#vat', '6'); await pg.waitForTimeout(1200);
  await pg.locator('.sheet').scrollIntoViewIfNeeded(); await pg.waitForTimeout(2500);
  await pg.locator('#tot').scrollIntoViewIfNeeded(); await pg.waitForTimeout(2500);
  await pg.click('#copy'); await pg.waitForTimeout(2500);
  const video = pg.video(); await ctx.close();
  const webm = await video.path();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', '30', destino]);
  fs.rmSync(tmp, { recursive: true, force: true });
}

function pagina(entradas) {
  const cards = entradas.map(e => {
    const media = e.video
      ? `<video src="${e.video}" controls playsinline preload="metadata"></video>`
      : `<div class="pair"><a href="${e.feed}" target="_blank"><img src="${e.feed}" alt="Feed: ${esc(e.titulo)}" loading="lazy"></a><a href="${e.story}" target="_blank"><img src="${e.story}" alt="Story: ${esc(e.titulo)}" loading="lazy"></a></div>`;
    const texto = e.legenda + '\n\n' + e.hashtags;
    return `<article class="card"><div class="meta"><b>${esc(e.data)}</b> · ${esc(e.titulo)}</div>${media}<textarea readonly rows="7">${esc(texto)}</textarea><button type="button" class="copy">Copiar legenda</button>${e.credito ? `<p class="cred">Foto: ${esc(e.credito)}</p>` : ''}</article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conteúdo para redes · Orçamento Rápido</title><meta name="robots" content="noindex, nofollow">
<style>
:root{--bg:#f3f4f1;--paper:#fff;--ink:#18202b;--muted:#5d6672;--line:#d9ddd6;--accent:#f2c230}
@media (prefers-color-scheme:dark){:root{--bg:#12161c;--paper:#1b2129;--ink:#e8ebee;--muted:#9aa3ad;--line:#2d3540;color-scheme:dark}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif;padding:20px max(16px,env(safe-area-inset-left,0px))}
.wrap{max-width:900px;margin:0 auto;display:grid;gap:18px}
h1{font-size:26px;margin:0}.lead{color:var(--muted);margin:0}
.card{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:14px;display:grid;gap:10px}
.pair{display:grid;grid-template-columns:1.25fr 1fr;gap:10px;align-items:start}
.pair img,video{width:100%;border-radius:6px;display:block}
video{max-width:360px}
textarea{width:100%;font:14px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:10px;resize:vertical}
button{justify-self:start;font:600 15px system-ui;background:var(--accent);color:#18202b;border:0;border-radius:6px;padding:10px 14px;cursor:pointer}
.cred{font-size:12px;color:var(--muted);margin:0}
h2{font-size:20px;margin:14px 0 0}.brandgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.brandgrid a{display:grid;gap:4px;font-size:12px;color:var(--muted);text-decoration:none}.brandgrid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
</style></head><body><div class="wrap">
<h1>Conteúdo para redes sociais</h1>
<p class="lead">Para publicar: toque na imagem e guarde-a (a da esquerda é para o feed, a da direita para stories), depois copie a legenda. Fotos CC0 do StockSnap, de uso livre.</p>
<h2>Marca</h2>
<p class="lead">Foto de perfil, capa do Facebook e capas dos destaques do Instagram. Toque para abrir e guardar.</p>
<div class="brandgrid">${['perfil.png','capa-facebook.png','destaque-comousar.png','destaque-iva.png','destaque-modelos.png','destaque-pro.png','destaque-duvidas.png'].map(n => `<a href="marca/${n}" target="_blank"><img src="marca/${n}" alt="${n}" loading="lazy"><span>${n}</span></a>`).join('')}</div>
<h2>Publicações</h2>
${cards}
</div>
<script>document.querySelectorAll('.copy').forEach(b=>b.onclick=()=>{const t=b.previousElementSibling;const ok=()=>{b.textContent='Copiado';setTimeout(()=>b.textContent='Copiar legenda',1500)};try{navigator.clipboard.writeText(t.value).then(ok,()=>{t.select();document.execCommand('copy');ok()})}catch(e){t.select();document.execCommand('copy');ok()}});</script>
</body></html>`;
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch();
  const entradas = [];
  for (const p of calendario) {
    const e = { data: p.data, titulo: p.titulo, legenda: p.legenda, hashtags: p.hashtags };
    if (p.tipo === 'video') {
      const nome = p.id + '.mp4';
      if (!fs.existsSync(path.join(SAIDA, nome))) await gravarVideo(browser, path.join(SAIDA, nome));
      e.video = nome;
    } else {
      const foto = p.tipo === 'foto' ? escolherFoto(p.foto) : null;
      for (const [formato, h] of [['feed', 1350], ['story', 1920]]) {
        const c = corpo(p, formato, foto);
        const page = await browser.newPage({ viewport: { width: 1080, height: h } });
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS} body{height:${h}px}</style></head><body>${c.html}</body></html>`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const nome = `${p.id}-${formato}.jpg`;
        await page.screenshot({ path: path.join(SAIDA, nome), type: 'jpeg', quality: 86 });
        await page.close();
        e[formato] = nome;
      }
      if (foto) e.credito = `${foto.titulo || 'sem título'} (${foto.licenca}, ${foto.pagina})`;
    }
    entradas.push(e);
    console.log('ok', p.id);
  }
  await browser.close();
  fs.writeFileSync(path.join(SAIDA, 'index.html'), pagina(entradas));
  console.log('página: public/redes/index.html');
})();
