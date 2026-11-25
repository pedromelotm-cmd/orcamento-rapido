// Orçamento Rápido: editor de orçamentos, plano Pro e histórico (tudo guardado no browser do utilizador).
const STRIPE_LINK = 'https://buy.stripe.com/fZu3cxgJtbdW2AD0gQ1ZS00';
const $ = id => document.getElementById(id);
const eur = n => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const store = {
  get(k, d) { try { const v = localStorage.getItem('or_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('or_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};

let pro = store.get('pro', null);
const isPro = () => !!(pro && pro.sub);

let items = [
  { d: 'Substituição de esquentador', t: 'mo', q: 1, u: 'serv.', p: 120 },
  { d: 'Esquentador estanque 11 L', t: 'mat', q: 1, u: 'un.', p: 289 },
  { d: 'Tubo multicamada 16 mm', t: 'mat', q: 6, u: 'm', p: 3.4 },
  { d: 'Deslocação', t: 'mo', q: 1, u: 'serv.', p: 25 },
];
const newNum = () => 'ORC-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
let qn = newNum();

// Dados do negócio ficam guardados para a próxima vez (grátis).
const BIZ = ['bizName', 'bizNif', 'bizPhone'];
const savedBiz = store.get('biz', null);
if (savedBiz) BIZ.forEach(k => { if (savedBiz[k] != null) $(k).value = savedBiz[k]; });

function toast(msg) { $('toast').textContent = msg; }

function renderItems() {
  const box = $('items'); box.innerHTML = '';
  items.forEach((it, i) => {
    const r = document.createElement('div'); r.className = 'item';
    const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    r.innerHTML = `<input class="d" id="d${i}" aria-label="Descrição" list="plist" value="${esc(it.d)}">
      <select id="t${i}" aria-label="Tipo de linha"><option value="mo"${it.t === 'mat' ? '' : ' selected'}>M. obra</option><option value="mat"${it.t === 'mat' ? ' selected' : ''}>Material</option></select>
      <input id="q${i}" aria-label="Quantidade" type="number" step="any" min="0" value="${it.q}">
      <input id="u${i}" aria-label="Unidade" value="${esc(it.u)}">
      <input id="p${i}" aria-label="Preço unitário" type="number" step="0.01" min="0" value="${it.p}">
      <button type="button" class="x" aria-label="Remover linha">×</button>`;
    r.querySelector('.d').oninput = e => {
      it.d = e.target.value;
      const known = isPro() && store.get('precos', {})[it.d.trim()];
      if (known && !it.p) {
        it.u = known.u; it.p = known.p; it.t = known.t || it.t;
        r.querySelector(`#u${i}`).value = known.u; r.querySelector(`#p${i}`).value = known.p; r.querySelector(`#t${i}`).value = it.t || 'mo';
      }
      render();
    };
    r.querySelector(`#t${i}`).onchange = e => { it.t = e.target.value; render(); };
    r.querySelector(`#q${i}`).oninput = e => { it.q = parseFloat(e.target.value) || 0; render(); };
    r.querySelector(`#u${i}`).oninput = e => { it.u = e.target.value; render(); };
    r.querySelector(`#p${i}`).oninput = e => { it.p = parseFloat(e.target.value) || 0; render(); };
    r.querySelector('.x').onclick = () => { items.splice(i, 1); renderItems(); render(); };
    box.appendChild(r);
  });
}

const r2 = n => Math.round(n * 100) / 100;
// IVA: com a taxa de 6% (verba 2.27), se os materiais passarem de 20% do total, os materiais pagam 23%.
function calc() {
  const sub = r2(items.reduce((s, i) => s + i.q * i.p, 0));
  const mat = r2(items.filter(i => i.t === 'mat').reduce((s, i) => s + i.q * i.p, 0));
  const rate = +$('vat').value;
  let lines;
  if (rate === 0) lines = [{ label: 'IVA (isento, art. 53.º do CIVA)', v: 0 }];
  else if (rate === 6 && sub > 0 && mat > 0.2 * sub) {
    lines = [
      { label: `IVA 6% sobre mão de obra (${eur(sub - mat)})`, v: r2((sub - mat) * 0.06) },
      { label: `IVA 23% sobre materiais (${eur(mat)}, acima de 20%)`, v: r2(mat * 0.23) },
    ];
  } else lines = [{ label: `IVA ${rate}%`, v: r2(sub * rate / 100) }];
  const vat = r2(lines.reduce((s, l) => s + l.v, 0));
  return { sub, mat, rate, lines, vat, tot: r2(sub + vat) };
}
const fmtDate = d => d.toLocaleDateString('pt-PT');

function render() {
  $('vatWarn').hidden = $('vat').value !== '6';
  const c = calc(); const now = new Date(); const until = new Date(now.getTime() + (+$('valid').value || 30) * 864e5);
  $('qNum').textContent = qn;
  $('pBiz').textContent = $('bizName').value;
  $('pBizMeta').textContent = 'NIF ' + $('bizNif').value + ' · ' + $('bizPhone').value;
  $('pCli').textContent = $('cliName').value; $('pAddr').textContent = $('cliAddr').value;
  $('pDates').textContent = fmtDate(now) + ' · ' + fmtDate(until);
  const tb = $('pRows'); tb.innerHTML = '';
  items.forEach(i => {
    const tr = document.createElement('tr');
    const td = (t, n) => { const e = document.createElement('td'); if (n) e.className = 'n'; e.textContent = t; tr.appendChild(e); };
    td(i.d); td(i.q + ' ' + i.u, 1); td(eur(i.p), 1); td(eur(i.q * i.p), 1); tb.appendChild(tr);
  });
  const tot = $('tot'); tot.innerHTML = '';
  const row = (l, v, cls) => { const a = document.createElement('span'), b = document.createElement('span'); a.textContent = l; b.textContent = eur(v); if (cls) { a.className = cls; b.className = cls; } tot.append(a, b); };
  row('Subtotal', c.sub); c.lines.forEach(l => row(l.label, l.v)); row('Total', c.tot, 'g');
  $('pNotes').textContent = $('notes').value;
}

function asText() {
  const c = calc(); const v = +$('valid').value || 30;
  const lines = items.map(i => `• ${i.d}: ${i.q} ${i.u} × ${eur(i.p)} = ${eur(i.q * i.p)}`);
  const out = [`*ORÇAMENTO ${qn}*`, `${$('bizName').value} · NIF ${$('bizNif').value}`, ``,
    `Cliente: ${$('cliName').value}`, `Obra: ${$('cliAddr').value}`, ``, ...lines, ``,
    `Subtotal: ${eur(c.sub)}`, ...c.lines.map(l => `${l.label}: ${eur(l.v)}`),
    `*Total: ${eur(c.tot)}*`, ``, `Válido ${v} dias. ${$('notes').value}`, `Contacto: ${$('bizPhone').value}`];
  if (!isPro()) out.push(``, `_Feito com Orçamento Rápido · orcamentorapido.pages.dev_`);
  return out.join('\n');
}

function needPro(what) {
  toast(`${what} faz parte do plano Pro.`);
  $('precos').scrollIntoView({ behavior: 'smooth' });
}

// Pro: PDF, logótipo, histórico e tabela de preços.
function applyPro() {
  const on = isPro();
  document.body.classList.toggle('is-pro', on);
  $('wm').hidden = on;
  $('historico').hidden = !on;
  const logo = on && store.get('logo', null);
  $('pLogo').hidden = !logo; if (logo) $('pLogo').src = logo;
  if (on) {
    $('buy').textContent = 'Plano Pro ativo';
    $('buy').setAttribute('aria-disabled', 'true'); $('buy').removeAttribute('href');
    $('buyNote').textContent = 'Obrigado por apoiar o Orçamento Rápido.';
  }
  $('restoreForm').hidden = on; $('myCode').hidden = !on;
  if (on) $('myCodeVal').value = pro.sub;
  renderHist(); renderPrices();
}

$('codeBtn').onclick = async () => {
  const code = $('code').value.trim();
  const msg = t => { $('restoreMsg').textContent = t; };
  if (!/^sub_[A-Za-z0-9]+$/.test(code)) return msg('O código começa por "sub_". Encontra-o no aparelho onde ativou o Pro, nesta mesma secção.');
  msg('A confirmar…');
  try {
    const r = await fetch('/api/estado?sub=' + encodeURIComponent(code), { cache: 'no-store' });
    const j = await r.json();
    if (!j.active) return msg('Este código não corresponde a uma subscrição ativa.');
    pro = { sub: code, checked: Date.now() }; store.set('pro', pro); applyPro(); msg('Plano Pro ativo neste aparelho.');
  } catch (e) { msg('Sem ligação. Tente novamente.'); }
};
$('myCodeCopy').onclick = () => {
  const v = $('myCodeVal').value;
  const ok = () => { $('restoreMsg').textContent = 'Código copiado.'; };
  try { navigator.clipboard.writeText(v).then(ok, () => $('myCodeVal').select()); } catch (e) { $('myCodeVal').select(); }
};

function renderPrices() {
  const dl = $('plist'); dl.innerHTML = '';
  if (!isPro()) return;
  Object.keys(store.get('precos', {})).forEach(d => { const o = document.createElement('option'); o.value = d; dl.appendChild(o); });
}

function renderHist() {
  const list = $('hlist'); list.innerHTML = '';
  const hist = store.get('hist', []);
  $('histEmpty').hidden = hist.length > 0;
  hist.forEach((h, idx) => {
    const li = document.createElement('li');
    const info = document.createElement('span');
    info.textContent = `${h.date} · ${h.cli || 'Sem cliente'} · ${eur(h.total)} · ${h.id}`;
    const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Abrir';
    open.onclick = () => loadQuote(h);
    const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Apagar';
    del.onclick = () => { const all = store.get('hist', []); all.splice(idx, 1); store.set('hist', all); renderHist(); };
    li.append(info, open, del); list.appendChild(li);
  });
}

function loadQuote(h) {
  qn = h.id; $('cliName').value = h.cli; $('cliAddr').value = h.addr; $('vat').value = h.vat;
  $('valid').value = h.valid; $('notes').value = h.notes; items = h.items.map(i => ({ ...i }));
  renderItems(); render(); toast(`Orçamento ${h.id} aberto.`);
  $('f').scrollIntoView({ behavior: 'smooth' });
}

$('save').onclick = () => {
  if (!isPro()) return needPro('Guardar no histórico');
  const c = calc();
  const entry = { id: qn, date: fmtDate(new Date()), cli: $('cliName').value, addr: $('cliAddr').value,
    vat: $('vat').value, valid: $('valid').value, notes: $('notes').value, items: items.map(i => ({ ...i })), total: c.tot };
  const hist = store.get('hist', []).filter(h => h.id !== qn);
  hist.unshift(entry);
  const precos = store.get('precos', {});
  items.forEach(i => { if (i.d.trim()) precos[i.d.trim()] = { u: i.u, p: i.p, t: i.t || 'mo' }; });
  const ok = store.set('hist', hist.slice(0, 200)) && store.set('precos', precos);
  toast(ok ? 'Guardado no histórico. Os preços destas linhas ficam sugeridos nos próximos orçamentos.' : 'Não foi possível guardar neste browser.');
  renderHist(); renderPrices();
};

$('pdf').onclick = () => {
  if (!isPro()) return needPro('Exportar PDF');
  toast('Escolha "Guardar como PDF" no destino da impressão.');
  window.print();
};

$('logo').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!isPro()) return needPro('O logótipo');
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, 320 / img.width, 120 / img.height);
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    store.set('logo', cv.toDataURL('image/png')); applyPro(); toast('Logótipo guardado.');
  };
  img.onerror = () => toast('Não foi possível ler essa imagem. Use PNG ou JPG.');
  img.src = url;
});

$('copy').onclick = () => {
  const t = asText();
  const done = () => toast(isPro() ? 'Copiado. Cole na conversa do WhatsApp com o cliente.'
    : 'Copiado. Cole no WhatsApp do cliente. Dica: com o Pro envia também um PDF com o seu logótipo.');
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Selecione e copie o texto manualmente.'); }
    ta.remove();
  };
  try { navigator.clipboard.writeText(t).then(done, fallback); } catch (e) { fallback(); }
};

$('add').onclick = () => { items.push({ d: '', t: 'mo', q: 1, u: 'un.', p: 0 }); renderItems(); render(); $('d' + (items.length - 1)).focus(); };
$('f').addEventListener('input', e => {
  if (BIZ.includes(e.target.id)) store.set('biz', Object.fromEntries(BIZ.map(k => [k, $(k).value])));
  render();
});
$('f').addEventListener('submit', e => e.preventDefault());
$('buy').addEventListener('click', e => { if ($('buy').getAttribute('href') !== STRIPE_LINK) e.preventDefault(); });

// O botão de compra só fica ativo quando o servidor confirma que os pagamentos estão configurados.
async function checkPayments() {
  if (isPro()) return;
  try {
    const r = await fetch('/api/estado?config=1', { cache: 'no-store' });
    const j = await r.json();
    if (j.configured) {
      $('buy').href = STRIPE_LINK;
      $('buyNote').textContent = 'Pagamento seguro com cartão através do Stripe. Cancele quando quiser.';
    }
  } catch (e) { /* fica "abre em breve" */ }
}

// Confirma uma vez por dia que a subscrição Pro continua ativa.
async function recheckPro() {
  if (!isPro() || Date.now() - (pro.checked || 0) < 864e5) return;
  try {
    const r = await fetch('/api/estado?sub=' + encodeURIComponent(pro.sub), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.active) { pro.checked = Date.now(); store.set('pro', pro); }
    else { pro = null; store.set('pro', null); location.reload(); }
  } catch (e) { /* sem rede: tenta noutro dia */ }
}

renderItems(); render(); applyPro(); checkPayments(); recheckPro();
