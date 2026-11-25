// Gera as imagens de perfil e capas para as redes sociais em public/redes/marca/.
// Uso: node social/marca.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const SAIDA = path.join(__dirname, '..', 'public', 'redes', 'marca');
const FONTES = `@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=IBM+Plex+Sans:wght@500;600&display=swap');`;
const BASE = `${FONTES}*{box-sizing:border-box}html,body{margin:0}body{background:#18202b;color:#f3f4f1;font-family:"IBM Plex Sans",sans-serif;overflow:hidden}`;

const pecas = [
  { nome: 'perfil.png', w: 1080, h: 1080, html: `<div style="width:1080px;height:1080px;display:grid;place-items:center">
      <div style="width:520px;height:520px;background:#f2c230;transform:skew(-12deg);display:grid;place-items:center">
        <span style="transform:skew(12deg);font:800 300px/1 'Archivo',sans-serif;color:#18202b;letter-spacing:-.04em">OR</span></div></div>` },
  { nome: 'capa-facebook.png', w: 1640, h: 624, html: `<div style="width:1640px;height:624px;padding:0 120px 0 520px;display:flex;flex-direction:column;justify-content:center;gap:26px">
      <div style="font:800 86px/1.02 'Archivo',sans-serif;letter-spacing:-.02em">Orçamentos de obra<br><span style="color:#f2c230">em 2 minutos, no telemóvel</span></div>
      <div style="font-size:36px;color:#c9ced4">IVA português calculado · Envio por WhatsApp · Grátis</div>
      <div><span style="font:600 32px 'IBM Plex Sans';background:#f2c230;color:#18202b;padding:12px 22px;border-radius:8px">orcamentorapido.pages.dev</span></div></div>` },
];
const destaques = [['Como usar', '▶'], ['IVA', '%'], ['Modelos', '≡'], ['Pro', '★'], ['Dúvidas', '?']];
for (const [t, s] of destaques) {
  pecas.push({ nome: `destaque-${t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')}.png`, w: 1080, h: 1920, html: `<div style="width:1080px;height:1920px;display:grid;place-items:center">
    <div style="width:560px;height:560px;border-radius:50%;background:#f2c230;display:grid;place-items:center;color:#18202b;text-align:center">
      <div><div style="font:800 220px/1 'Archivo',sans-serif">${s}</div><div style="font:800 64px 'Archivo',sans-serif;margin-top:10px">${t}</div></div></div></div>` });
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const b = await chromium.launch();
  for (const p of pecas) {
    const pg = await b.newPage({ viewport: { width: p.w, height: p.h } });
    await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head><body>${p.html}</body></html>`, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(SAIDA, p.nome) });
    await pg.close();
    console.log('ok', p.nome);
  }
  await b.close();
})();
