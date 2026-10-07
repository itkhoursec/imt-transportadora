/* IMT Transportadora - Nacional Player
   Dados ficam no localStorage do navegador (prefixo "imt_"). */
const CFG = { adminUser: 'admin' };
const DEF_HASH = '489117aa2021e4fabfdab2724e821c0a796f4f502f0c1512793f2f72aabae996'; // hash (SHA-256) da senha padrão "admin123"

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem('imt_' + k)) ?? d; } catch { return d; } };
const sv = (k, v) => { try { localStorage.setItem('imt_' + k, JSON.stringify(v)); } catch { toast('Não foi possível salvar neste navegador', 'err'); } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const okUrl = u => /^https?:\/\//i.test(u);
const hms = s => [s / 3600 | 0, s / 60 % 60 | 0, s % 60].map(x => String(x).padStart(2, '0')).join(':');
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sha = async s => { try { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('imt::' + s)))].map(b => b.toString(16).padStart(2, '0')).join(''); } catch { return 'p:' + btoa(unescape(encodeURIComponent(s))); } };

const S = {
  slides: ld('slides', [
    { type: 'image', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=80' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=1200&auto=format&fit=crop&q=80' }]),
  contratos: ld('contratos', [{ n: 'Logística Federal Distribuidora', d: 'Transporte exclusivo de insumos e cargas pesadas interestaduais.', st: 'Ativo' }]),
  rotas: ld('rotas', [
    { o: 'Porto de Los Santos', d: 'Depósito de San Fierro', km: 640, carga: 'Contêineres' },
    { o: 'Las Venturas', d: 'Los Santos', km: 520, carga: 'Combustível' },
    { o: 'San Fierro', d: 'Las Venturas', km: 480, carga: 'Insumos industriais' }]),
  frota: ld('frota', [
    { placa: 'IMT-001', modelo: 'Scania R450', st: 'Disponível' },
    { placa: 'IMT-002', modelo: 'Volvo FH 540', st: 'Em viagem' },
    { placa: 'IMT-003', modelo: 'Mercedes Actros', st: 'Manutenção' }]),
  ouv: ld('ouv', []), solic: ld('solic', []), users: ld('users', []), turnos: ld('turnos', []),
  ann: ld('ann', 'Bem-vindo ao portal oficial da IMT Transportadora, no servidor Nacional Player. Aqui você acompanha rotas, frota e contratos e bate o ponto como motorista profissional.'),
  discord: ld('discord', ''),
  radio: ld('radio', { name: 'Rádio IMT', url: 'https://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3' }),
  admHash: ld('admHash', DEF_HASH)
};
let SESS = null; try { SESS = JSON.parse(sessionStorage.getItem('imt_sess')); } catch {}
const isAdm = () => SESS?.role === 'admin';
const nameOf = u => (S.users.find(x => x.u === u) || { nome: u }).nome;

/* ---------- UI helpers ---------- */
let tt;
function toast(m, k) {
  const e = $('#toast'); e.textContent = m;
  e.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg text-sm font-semibold shadow-xl ' + (k === 'err' ? 'bg-red-600' : 'bg-green-600');
  clearTimeout(tt); tt = setTimeout(() => e.classList.add('hidden'), 3500);
}
function go(id) {
  if (id === 'area' || (id === 'acesso' && SESS)) id = SESS ? 'painel' : 'acesso';
  if (id === 'painel' && !SESS) id = 'acesso';
  if (!$('#' + id)?.classList.contains('tab')) id = 'inicio';
  $$('.tab').forEach(t => t.classList.toggle('on', t.id === id));
  $$('.nv[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === id || (b.dataset.go === 'area' && (id === 'acesso' || id === 'painel'))));
  $('#nav').classList.add('hidden'); $('#nav').classList.remove('flex');
  history.replaceState(null, '', '#' + id); scrollTo(0, 0);
}

/* ---------- Renderização ---------- */
const badge = s => { const c = { Ativo: 'green', Disponível: 'green', 'Em viagem': 'yellow', 'Em negociação': 'yellow', Manutenção: 'red', Encerrado: 'red' }[s] || 'slate'; return `<span class="text-xs px-2 py-1 rounded bg-${c}-900 text-${c}-300 whitespace-nowrap">${esc(s)}</span>`; };
const del = (k, i) => isAdm() ? `<button data-act="del" data-k="${k}" data-i="${i}" aria-label="Excluir" class="text-red-400 hover:text-red-300 px-2"><i class="fa-solid fa-trash"></i></button>` : '';
const T = {
  rotas: (r, i) => `<div class="card flex justify-between items-center gap-3"><div><b class="text-blue-300">${esc(r.o)} → ${esc(r.d)}</b><p class="text-xs text-slate-400">${esc(r.carga)} · ${+r.km} km</p></div><div class="flex items-center"><button data-act="usar" data-km="${+r.km}" class="btn-y">Calcular</button>${del('rotas', i)}</div></div>`,
  frota: (f, i) => `<div class="card flex justify-between items-center"><div><b class="text-blue-300"><i class="fa-solid fa-truck mr-2"></i>${esc(f.placa)}</b><p class="text-xs text-slate-400">${esc(f.modelo)}</p></div><div class="flex items-center">${badge(f.st)}${del('frota', i)}</div></div>`,
  contratos: (c, i) => `<div class="card space-y-2"><div class="flex justify-between items-center"><b class="text-lg text-blue-400">${esc(c.n)}</b><div class="flex items-center">${badge(c.st)}${del('contratos', i)}</div></div><p class="text-sm text-slate-400">${esc(c.d)}</p></div>`
};
function render() {
  Object.keys(T).forEach(k => $('#l-' + k).innerHTML = S[k].map(T[k]).join('') || '<p class="text-slate-500 text-sm">Nada cadastrado ainda.</p>');
  $('#ann').textContent = S.ann;
  const dc = $('#discord'); dc.href = okUrl(S.discord) ? S.discord : '#'; dc.classList.toggle('hidden', !okUrl(S.discord));
  const h = S.turnos.reduce((a, t) => a + t.s, 0) / 3600;
  $('#stats').innerHTML = [['fa-truck', S.frota.length, 'Veículos'], ['fa-route', S.rotas.length, 'Rotas'], ['fa-file-contract', S.contratos.filter(c => c.st === 'Ativo').length, 'Contratos ativos'], ['fa-clock', h.toFixed(1) + ' h', 'Horas trabalhadas']]
    .map(([i, v, l]) => `<div class="card text-center"><i class="fa-solid ${i} text-yellow-400"></i><div class="text-3xl font-black mt-1">${v}</div><div class="text-xs text-slate-400">${l}</div></div>`).join('');
  const m = {}; S.turnos.forEach(t => m[t.u] = (m[t.u] || 0) + t.s);
  $('#rank').innerHTML = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, s], i) => `<li class="flex justify-between"><span>${i + 1}. ${esc(nameOf(u))}</span><span class="font-mono text-yellow-400">${hms(s)}</span></li>`).join('') || '<li class="text-slate-500">Ninguém bateu ponto ainda.</li>';
  slide();
  if (SESS) $('#hist').innerHTML = S.turnos.filter(t => t.u === SESS.u).slice(-5).reverse().map(t => `<li class="flex justify-between bg-slate-900 rounded px-3 py-1"><span>${esc(t.date)}</span><span class="font-mono">${hms(t.s)}</span></li>`).join('') || '<li class="text-slate-500">Nenhum expediente registrado.</li>';
  if (isAdm()) admin();
}
function admin() {
  $('#a-solic').innerHTML = S.solic.map((s, i) => `<div class="bg-slate-900 border-l-4 border-blue-500 p-3 flex justify-between items-center gap-2"><span>${s.t === 'reset' ? 'Nova senha: ' + esc(s.user) : 'Cadastro: ' + esc(s.nome) + ' (' + esc(s.cargo) + ')'}<small class="block text-slate-500">${esc(s.date)}</small></span><span class="whitespace-nowrap"><button data-act="ok" data-i="${i}" aria-label="Aprovar" class="text-green-400 px-2"><i class="fa-solid fa-check"></i></button><button data-act="no" data-i="${i}" aria-label="Recusar" class="text-red-400 px-2"><i class="fa-solid fa-xmark"></i></button></span></div>`).join('') || '<p class="text-slate-500">Nada pendente.</p>';
  $('#a-ouv').innerHTML = S.ouv.map((o, i) => `<div class="bg-slate-900 border-l-4 border-red-500 p-3"><div class="flex justify-between"><b>Alvo: ${esc(o.alvo)}</b>${del('ouv', i)}</div><p class="text-xs text-slate-400">${esc(o.autor || 'Anônimo')} · ${esc(o.date)}</p><p class="mt-1 text-slate-200">${esc(o.texto)}</p></div>`).join('') || '<p class="text-slate-500">Nenhum relato.</p>';
  $('#a-slides').innerHTML = S.slides.map((s, i) => `<div class="flex justify-between bg-slate-900 rounded p-2"><span class="truncate font-mono text-slate-400">(${esc(s.type)}) ${esc(s.url)}</span>${del('slides', i)}</div>`).join('');
  const f = $('[data-set]'); f.ann.value = S.ann; f.discord.value = S.discord; f.radioName.value = S.radio.name; f.radioUrl.value = S.radio.url;
  $('#pwwarn').classList.toggle('hidden', S.admHash !== DEF_HASH);
}

/* ---------- Carrossel ---------- */
let cur = 0;
const ytId = u => (u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1];
function slide() {
  const c = $('#car'), n = S.slides.length;
  if (!n) { c.innerHTML = '<div class="h-full grid place-items-center text-slate-500">Nenhum slide cadastrado.</div>'; $('#dots').innerHTML = ''; return; }
  cur %= n; const s = S.slides[cur], y = ytId(s.url);
  c.innerHTML = s.type === 'image' ? `<img src="${esc(s.url)}" alt="Destaque ${cur + 1}" class="w-full h-full object-cover">`
    : y ? `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${y}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
    : `<video src="${esc(s.url)}" autoplay loop muted playsinline class="w-full h-full object-cover"></video>`;
  $('#dots').innerHTML = S.slides.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === cur ? 'bg-yellow-400' : 'bg-white/50'}"></span>`).join('');
}
setInterval(() => { if (S.slides[cur]?.type === 'image' && $('#inicio.on') && !matchMedia('(prefers-reduced-motion: reduce)').matches) { cur++; slide(); } }, 6000);

/* ---------- Rádio ---------- */
const au = $('#audio');
function radio() { au.pause(); au.src = S.radio.url; $('#radio-name').textContent = S.radio.name; }
au.volume = ld('vol', 0.5); $('#vol').value = au.volume;
$('#vol').oninput = e => { au.volume = e.target.value; sv('vol', +e.target.value); };
au.onplay = () => { $('#play i').className = 'fa-solid fa-pause'; $('#live').classList.remove('hidden'); };
au.onpause = () => { $('#play i').className = 'fa-solid fa-play'; $('#live').classList.add('hidden'); };
au.onerror = () => { if (au.src && au.getAttribute('src')) toast('Rádio indisponível. Confira o link do stream.', 'err'); };

/* ---------- Ponto ---------- */
const PK = () => 'ponto_' + SESS.u, P = () => ld(PK(), { st: 'stopped', acc: 0, since: 0 });
const secs = p => p.acc + (p.st === 'running' ? Math.floor((Date.now() - p.since) / 1000) : 0);
function tick() {
  if (!SESS) return; const p = P();
  $('#clock').textContent = hms(secs(p));
  const L = { stopped: ['Fora de serviço', 'text-slate-400'], running: ['Em serviço', 'text-green-400'], paused: ['Em pausa', 'text-orange-400'] }[p.st];
  $('#status').textContent = 'Status: ' + L[0]; $('#status').className = 'text-xs mt-2 font-bold ' + L[1];
  [['start', p.st !== 'running'], ['pause', p.st === 'running'], ['stop', p.st !== 'stopped']].forEach(([b, on]) => { const e = $('#b-' + b); e.disabled = !on; e.classList.toggle('opacity-40', !on); e.classList.toggle('cursor-not-allowed', !on); });
}
setInterval(tick, 1000);

/* ---------- Sessão ---------- */
function applyRole() {
  $$('.adm').forEach(e => e.classList.toggle('hidden', !isAdm()));
  $('#out').classList.toggle('hidden', !SESS); $('#area-label').textContent = SESS ? 'Meu painel' : 'Área Restrita';
  if (SESS) { $('#who').textContent = SESS.nome; $('#cargo').textContent = SESS.cargo; }
  render(); tick();
}
function login(s) { SESS = s; sessionStorage.setItem('imt_sess', JSON.stringify(s)); applyRole(); toast('Bem-vindo, ' + s.nome + '!'); go('painel'); }
const slug = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
const genPw = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

/* ---------- Ações (data-act) ---------- */
const A = {
  menu: () => { $('#nav').classList.toggle('hidden'); $('#nav').classList.toggle('flex'); },
  play: () => au.paused ? (S.radio.url ? au.play().catch(() => toast('Rádio indisponível', 'err')) : toast('Nenhuma rádio configurada', 'err')) : au.pause(),
  prev: () => { cur = (cur - 1 + S.slides.length) % S.slides.length; slide(); },
  next: () => { cur++; slide(); },
  sub: t => ['f-login', 'f-solic', 'f-reset'].forEach(id => $('#' + id).classList.toggle('hidden', id !== t.dataset.v)),
  usar: t => { $('#km').value = t.dataset.km; $('#km').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  del: t => { const k = t.dataset.k; if (!isAdm() || !Array.isArray(S[k]) || !confirm('Excluir este item?')) return; S[k].splice(+t.dataset.i, 1); sv(k, S[k]); render(); },
  no: t => { if (!isAdm()) return; S.solic.splice(+t.dataset.i, 1); sv('solic', S.solic); render(); },
  ok: async t => {
    if (!isAdm()) return; const s = S.solic[+t.dataset.i]; if (!s) return; const pw = genPw(), h = await sha(pw); let u;
    if (s.t === 'reset') { const x = S.users.find(x => x.u === s.user.toLowerCase()); if (!x) return toast('Usuário não encontrado', 'err'); x.h = h; u = x.u; }
    else { u = slug(s.nome) || 'func'; let n = 1, b = u; while (S.users.some(x => x.u === u) || u === CFG.adminUser) u = b + (++n); S.users.push({ u, h, nome: s.nome, cargo: s.cargo }); }
    S.solic.splice(+t.dataset.i, 1); sv('users', S.users); sv('solic', S.solic); render();
    prompt('Copie e envie ao funcionário (a senha não será exibida de novo):', `Usuário: ${u} | Senha: ${pw}`);
  },
  start: () => { if (!SESS) return; const p = P(); if (p.st === 'running') return; p.st = 'running'; p.since = Date.now(); sv(PK(), p); tick(); },
  pause: () => { if (!SESS) return; const p = P(); if (p.st !== 'running') return; p.acc = secs(p); p.st = 'paused'; sv(PK(), p); tick(); },
  stop: () => {
    if (!SESS) return; const p = P(); if (p.st === 'stopped' || !confirm('Finalizar o expediente?')) return;
    const s = secs(p); if (s > 0) { S.turnos.push({ u: SESS.u, s, date: new Date().toLocaleString('pt-BR') }); sv('turnos', S.turnos); }
    sv(PK(), { st: 'stopped', acc: 0, since: 0 }); toast('Expediente encerrado: ' + hms(s)); render(); tick();
  },
  logout: () => { if (P().st === 'running') return toast('Pause ou finalize o expediente antes de sair', 'err'); SESS = null; sessionStorage.removeItem('imt_sess'); applyRole(); go('inicio'); },
  export: () => {
    const o = {}; Object.keys(localStorage).filter(k => k.startsWith('imt_')).forEach(k => o[k] = localStorage[k]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' })); a.download = 'imt-backup.json'; a.click();
  }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-act]'); if (!t) return;
  if (t.dataset.act) return A[t.dataset.act]?.(t);
  go(t.dataset.go); if (t.dataset.sol && !SESS) A.sub({ dataset: { v: 'f-solic' } });
});

/* ---------- Formulários ---------- */
document.addEventListener('submit', async e => {
  const f = e.target; e.preventDefault(); const d = f.dataset;
  if ('login' in d) {
    const u = f.u.value.trim().toLowerCase(), h = await sha(f.p.value);
    if (u === CFG.adminUser && h === S.admHash) login({ u, role: 'admin', nome: 'Administrador', cargo: 'Administração IMT' });
    else { const x = S.users.find(x => x.u === u && x.h === h); x ? login({ u, role: 'func', nome: x.nome, cargo: x.cargo }) : toast('Usuário ou senha incorretos', 'err'); }
    f.reset();
  } else if ('add' in d) {
    const k = d.add; if (!['ouv', 'solic'].includes(k) && !isAdm()) return;
    const o = Object.fromEntries(new FormData(f)); for (const x in o) o[x] = String(o[x]).trim();
    if (k === 'slides' && !okUrl(o.url)) return toast('O link precisa começar com http:// ou https://', 'err');
    o.date = new Date().toLocaleString('pt-BR'); S[k].push(o); sv(k, S[k]); f.reset(); render();
    toast(k === 'ouv' ? 'Relato enviado. Obrigado!' : k === 'solic' ? 'Pedido enviado à administração.' : 'Salvo!');
    if (k === 'solic') A.sub({ dataset: { v: 'f-login' } });
  } else if ('set' in d && isAdm()) {
    const dc = f.discord.value.trim(), ru = f.radioUrl.value.trim();
    if ((dc && !okUrl(dc)) || (ru && !okUrl(ru))) return toast('Links precisam começar com http:// ou https://', 'err');
    if (f.newpass.value && f.newpass.value.length < 6) return toast('A nova senha precisa ter 6+ caracteres', 'err');
    S.ann = f.ann.value.trim(); S.discord = dc; S.radio = { name: f.radioName.value.trim() || 'Rádio', url: ru };
    ['ann', 'discord', 'radio'].forEach(k => sv(k, S[k]));
    if (f.newpass.value) { S.admHash = await sha(f.newpass.value); sv('admHash', S.admHash); f.newpass.value = ''; }
    radio(); render(); toast('Configurações salvas');
  } else if ('calc' in d) {
    const km = +f.km.value, t = +f.ton.value || 1, m = +f.tipo.value, v = km * 3.5 * m + t * km * 0.4;
    $('#calc-out').innerHTML = `Frete estimado: <b class="text-green-400">${brl(v)}</b><br>Tempo estimado: ${(km / 80).toFixed(1)} h a 80 km/h`;
  }
});
$('#imp').onchange = async e => {
  if (!isAdm()) return;
  try { const o = JSON.parse(await e.target.files[0].text()); Object.entries(o).forEach(([k, v]) => k.startsWith('imt_') && localStorage.setItem(k, v)); location.reload(); }
  catch { toast('Arquivo de backup inválido', 'err'); }
};

/* ---------- Início ---------- */
radio(); applyRole(); go(location.hash.slice(1) || 'inicio');
addEventListener('hashchange', () => go(location.hash.slice(1)));
