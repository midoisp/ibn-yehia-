/* ============================================================
   منطق الصفحة — مش محتاج تعدّل هنا. الإعدادات في config.js والمنيو في menu-data.js
   ============================================================ */
const A = window.A = {};
(() => {
const C = CONFIG, IM = C.images, CATS = window.CATEGORIES;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arNorm = s => String(s).toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const money = n => `${n} ${C.currency}`;
const src = f => /^(data:|https?:)/.test(f) ? f : 'images/' + f;
const cleanItem = x => ({ id: x.id, name: x.name, cat: x.cat, section: x.section, price: x.price, badge: x.badge || '', desc: x.desc || '', img: x.img || '', hasBread: !!x.hasBread });
const catOf = id => CATS.find(c => c.id === id);

/* ---------- البيانات ---------- */
const BASE_H = hash(JSON.stringify(window.MENU_ITEMS.map(cleanItem)));
let ITEMS = (() => {
  const s = store.get('by_menu', null);   // تعديلات الإدارة على الجهاز، بتتجاهل لو ملف المنيو اتغيّر
  return (s && s.h === BASE_H ? s.items : window.MENU_ITEMS).map(cleanItem);
})();
const byId = id => ITEMS.find(i => i.id === id);
const S = { cat: 'all', q: '', mode: 'dinein', table: '', admin: false, locked: false,
  cart: store.get('by_cart', []), f: { name: '', phone: '', address: '', note: '' } };

/* ---------- عناصر مشتركة ---------- */
A.ico = e => { const s = document.createElement('span'); s.textContent = e; return s; };
const thumb = (it, qty = 0) => {
  const ic = catOf(it.cat)?.icon || '🍽️';
  return `<div class="thumb">${it.img ? `<img src="${esc(src(it.img))}" alt="" loading="lazy" onerror="this.replaceWith(A.ico('${ic}'))">` : ic}${qty ? `<span class="q">${qty}</span>` : ''}</div>`;
};
let toastT;
const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); };
const modal = (title, body, foot = '', opts = {}) => {
  S.locked = !!opts.locked; S.kind = opts.kind || '';
  $('sheet').innerHTML = `<div class="sh-h"><span>${title}</span>${opts.locked ? '' : '<button class="sh-x" onclick="A.close()" aria-label="إغلاق">✕</button>'}</div>
    <div class="sh-b ${opts.cls || ''}">${body}</div>${foot ? `<div class="sh-f">${foot}</div>` : ''}`;
  $('modal').classList.add('open');
};
A.close = () => { if (S.locked) return; $('modal').classList.remove('open'); S.kind = ''; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') A.close(); });

/* ---------- الصفحة الرئيسية ---------- */
function fillStatic() {
  document.documentElement.style.setProperty('--p', C.theme.primary);
  document.documentElement.style.setProperty('--pl', C.theme.primaryLight);
  document.title = `${C.name} | المنيو التفاعلي`;
  $('logo').src = src(IM.logo);
  $('hero').style.backgroundImage = `url("${src(IM.hero)}")`;
  $('h-name').textContent = C.name;
  $('h-slogan').textContent = C.slogan;
  $('h-hours').textContent = C.hoursText;
  $('f-name').textContent = C.name;
  $('f-phones').textContent = C.phones.join(' - ');
  $('f-credit').textContent = C.credit;
  $('f-year').textContent = new Date().getFullYear();
  $('quick').innerHTML = `<a class="main" href="tel:${esc(C.phones[0])}">📞 اتصل للتوصيل</a>
    <a href="https://wa.me/${esc(C.whatsapp)}" target="_blank" rel="noopener">💬 واتساب</a>
    <button onclick="A.paper()">📖 المنيو الورقي</button>
    <button onclick="A.about()">ℹ️ عن المطعم</button>`;
  const opts = ['<option value="">اتركه للكابتن</option>'];
  for (let i = 1; i <= C.tables; i++) opts.push(`<option value="طاولة ${i}">طاولة ${i}</option>`);
  if (C.familyHall) opts.push('<option value="صالة العائلات">صالة العائلات</option>');
  $('table-sel').innerHTML = opts.join('');
}
A.theme = () => {
  const d = document.documentElement, dark = d.dataset.theme !== 'dark';
  d.dataset.theme = dark ? 'dark' : 'light'; store.set('by_theme', d.dataset.theme);
  $('theme-btn').textContent = dark ? '🌙' : '☀️';
  document.querySelector('meta[name=theme-color]').content = dark ? '#18110C' : '#FAF5EC';
};
A.mode = m => {
  S.mode = m;
  const names = { dinein: '🍽️ داخل الصالة', takeaway: '🛍️ تيك أواي', delivery: '🛵 دليفري' };
  $('modes').innerHTML = Object.keys(names).map(k => `<button class="${k === m ? 'on' : ''}" onclick="A.mode('${k}')">${names[k]}</button>`).join('');
  $('table-row').style.display = m === 'dinein' ? 'flex' : 'none';
  cartUI(); if (S.kind === 'cart') A.cart();
};
A.table = v => { S.table = v; $('table-sel').value = v; };

/* ---------- القائمة ---------- */
const popular = i => !!i.badge;
function renderChips() {
  const chip = (id, label) => `<button class="chip ${S.cat === id ? 'on' : ''}" onclick="A.cat('${id}')">${label}</button>`;
  const take = CATS.filter(c => c.section === 'takeaway'), dine = CATS.filter(c => c.section !== 'takeaway');
  $('chips').innerHTML = chip('all', 'الكل') + chip('pop', '⭐ الأكثر طلباً') +
    take.map(c => chip(c.id, `${c.icon} ${esc(c.name)}`)).join('') + '<span class="chip sep"></span>' +
    dine.map(c => chip(c.id, `${c.icon} ${esc(c.name)}`)).join('');
}
A.cat = id => { S.cat = id; renderChips(); renderMenu(); if (scrollY > $('bar').offsetTop) $('bar').scrollIntoView(); };
A.search = v => { S.q = v.trim(); renderMenu(); };
A.reset = () => { S.cat = 'all'; S.q = ''; $('q').value = ''; renderChips(); renderMenu(); };

function card(it) {
  const qty = S.cart.filter(c => c.id === it.id).reduce((s, c) => s + c.qty, 0);
  return `<div class="item ${qty ? 'in' : ''}" role="button" tabindex="0" onclick="A.open(${it.id})" onkeydown="if(event.key==='Enter')A.open(${it.id})">
    ${thumb(it, qty)}
    <div class="info">
      ${it.badge ? `<span class="badge">${esc(it.badge)}</span>` : ''}
      <h3>${esc(it.name)}</h3>
      ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}
      <div class="row"><span class="price">${money(it.price)}</span>
        ${S.admin ? '<span class="mut">✏️ تعديل</span>' : `<button class="add" aria-label="أضف ${esc(it.name)}" onclick="event.stopPropagation();A.quick(${it.id})">+</button>`}</div>
    </div></div>`;
}
function renderMenu() {
  const q = arNorm(S.q);
  const list = ITEMS.filter(i => (S.cat === 'all' || (S.cat === 'pop' ? popular(i) : i.cat === S.cat)) && (!q || arNorm(i.name + ' ' + i.desc).includes(q)));
  if (!list.length) { $('menu').innerHTML = `<div class="empty">لا توجد أصناف مطابقة<br><button onclick="A.reset()">عرض كل المنيو</button></div>`; return; }
  const grouped = S.cat === 'all' && !q;
  let html = '', lastSec = '';
  CATS.forEach(c => {
    const its = list.filter(i => i.cat === c.id); if (!its.length) return;
    if (grouped && c.section !== lastSec) { lastSec = c.section; html += `<div class="sec-t">${c.section === 'takeaway' ? 'ساندوتشات وعلب (تيك أواي)' : 'منيو الصالة'}</div>`; }
    html += `<h2 class="cat-t">${c.icon} ${esc(c.name)} <small>${its.length}</small></h2><div class="grid">${its.map(card).join('')}</div>`;
  });
  $('menu').innerHTML = html;
}

/* ---------- تخصيص الصنف ---------- */
let CU = null;
A.open = id => {
  if (S.admin) return A.edit(id);
  const it = byId(id); if (!it) return;
  CU = { it, q: 1 };
  const radios = (name, arr) => `<div class="opts">${arr.map((v, x) => `<label><input type="radio" name="${name}" value="${v}" ${x === (arr.def ?? 0) ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>`;
  const spice = ['بدون شطة', 'مظبوط', 'سبايسي نار 🔥']; spice.def = 1;
  const adds = C.addons.filter(a => a.cats.includes(it.cat));
  modal(esc(it.name), `
    <div class="item" style="cursor:default">${thumb(it)}<div class="info"><h3>${esc(it.name)}</h3>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}<div class="price">${money(it.price)}</div></div></div>
    ${it.hasBread ? `<div class="lbl">نوع العيش</div>${radios('bread', ['عيش بلدي', 'عيش شامي', 'فينو / فرنساوي'])}` : ''}
    ${C.noSpiceCats.includes(it.cat) ? '' : `<div class="lbl">الشطة</div>${radios('spice', spice)}`}
    ${adds.length ? `<div class="lbl">إضافات (اختياري)</div><div class="opts">${adds.map((a, x) => `<label><input type="checkbox" class="ad" data-i="${x}" onchange="A.cuPrice()"><span>${esc(a.name)} +${a.price}</span></label>`).join('')}</div>` : ''}
    <div class="lbl">ملاحظة</div><input class="field" id="cu-note" maxlength="120" placeholder="مثال: كتر طحينة، بدون بصل...">`,
    `<div class="step"><button onclick="A.cuQty(-1)" aria-label="أقل">−</button><span id="cu-q">1</span><button onclick="A.cuQty(1)" aria-label="أكثر">+</button></div>
     <button class="btn p f" onclick="A.cuAdd()">أضف للطلب · <span id="cu-t"></span></button>`, { kind: 'item' });
  const adds2 = adds; CU.adds = adds2; A.cuPrice();
};
A.cuQty = d => { CU.q = Math.max(1, CU.q + d); $('cu-q').textContent = CU.q; A.cuPrice(); };
const cuExtra = () => [...document.querySelectorAll('.ad:checked')].map(c => CU.adds[+c.dataset.i]);
A.cuPrice = () => { $('cu-t').textContent = money((CU.it.price + cuExtra().reduce((s, a) => s + a.price, 0)) * CU.q); };
A.cuAdd = () => {
  const it = CU.it, ex = cuExtra();
  const v = n => document.querySelector(`input[name=${n}]:checked`)?.value;
  const det = [it.hasBread ? v('bread') : '', v('spice'), ...ex.map(a => a.name), $('cu-note').value.trim()].filter(Boolean).join(' • ');
  addToCart(it.id, CU.q, det, ex.reduce((s, a) => s + a.price, 0));
  A.close(); toast(`تمت إضافة "${it.name}"`);
};
A.quick = id => { const it = byId(id); addToCart(id, 1, it.hasBread ? 'عيش بلدي • مظبوط' : '', 0); toast(`تمت إضافة "${it.name}"`); };

/* ---------- السلة ---------- */
const unit = c => (byId(c.id)?.price || 0) + c.add;
const subtotal = () => S.cart.reduce((s, c) => s + unit(c) * c.qty, 0);
const fee = () => S.mode === 'delivery' && typeof C.deliveryFee === 'number' ? C.deliveryFee : 0;
function addToCart(id, qty, det, add) {
  const ex = S.cart.find(c => c.id === id && c.det === det && c.add === add);
  ex ? ex.qty += qty : S.cart.push({ id, qty, det, add });
  saveCart();
}
function saveCart() {
  S.cart = S.cart.filter(c => byId(c.id) && c.qty > 0);
  store.set('by_cart', S.cart); cartUI(); renderMenu();
  if (S.kind === 'cart') A.cart();
}
function cartUI() {
  const n = S.cart.reduce((s, c) => s + c.qty, 0);
  $('cartbar').hidden = n === 0;
  $('cb-n').textContent = n;
  $('cb-t').textContent = { dinein: 'طلبي (داخل الصالة)', takeaway: 'طلبي (تيك أواي)', delivery: 'طلبي (دليفري)' }[S.mode];
  $('cb-p').textContent = money(subtotal() + fee());
}
A.step = (i, d) => { S.cart[i].qty += d; saveCart(); };
A.clear = () => { if (confirm('إفراغ الطلب؟')) { S.cart = []; saveCart(); A.close(); } };
A.fld = (k, v) => { S.f[k] = v; };
A.cart = () => {
  const m = S.mode, f = S.f;
  const inp = (k, ph, type = 'text') => `<input class="field" type="${type}" placeholder="${ph}" value="${esc(f[k])}" oninput="A.fld('${k}',this.value)">`;
  const rows = S.cart.length ? S.cart.map((c, i) => { const it = byId(c.id); return `<div class="ci"><div class="n">${esc(it.name)}<small>${esc(c.det)}</small><span class="price">${money(unit(c) * c.qty)}</span></div>
    <div class="step"><button onclick="A.step(${i},-1)" aria-label="أقل">−</button><span>${c.qty}</span><button onclick="A.step(${i},1)" aria-label="أكثر">+</button></div></div>`; }).join('') : '<div class="empty">الطلب فاضي</div>';
  modal('طلبي', `${rows}
    <div class="seg" style="margin:14px 0 8px">${['dinein', 'takeaway', 'delivery'].map(k => `<button class="${k === m ? 'on' : ''}" onclick="A.mode('${k}')">${{ dinein: 'الصالة', takeaway: 'تيك أواي', delivery: 'دليفري' }[k]}</button>`).join('')}</div>
    ${m === 'dinein' ? `<select class="field" onchange="A.table(this.value)">${$('table-sel').innerHTML.replace(`value="${esc(S.table)}"`, `value="${esc(S.table)}" selected`)}</select>` : ''}
    ${m !== 'dinein' ? inp('name', 'الاسم') + inp('phone', 'رقم الموبايل', 'tel') : ''}
    ${m === 'delivery' ? inp('address', 'العنوان بالتفصيل (الشارع، العمارة، الدور، علامة مميزة)') : ''}
    ${inp('note', 'ملاحظات على الطلب (اختياري)')}
    <div class="sum"><span>الأصناف</span><span>${money(subtotal())}</span></div>
    ${m === 'delivery' ? `<div class="sum"><span>التوصيل</span><span>${typeof C.deliveryFee === 'number' ? money(C.deliveryFee) : 'حسب المنطقة'}</span></div>` : ''}
    <div class="sum t"><span>الإجمالي</span><span>${money(subtotal() + fee())}</span></div>`,
    `<button class="btn g f" onclick="A.send()">💬 إرسال الطلب واتساب</button>
     ${m === 'dinein' ? '<button class="btn" onclick="A.waiter()">شاشة الكابتن</button>' : ''}
     <button class="btn d" onclick="A.clear()" aria-label="إفراغ">🗑</button>`, { kind: 'cart' });
};
A.waiter = () => {
  if (!S.cart.length) return toast('الطلب فاضي');
  modal(`شاشة الكابتن · ${esc(S.table || 'داخل الصالة')}`, S.cart.map(c => `<div class="ci"><div class="n">${c.qty} × ${esc(byId(c.id).name)}<small>${esc(c.det)}</small></div><span class="price">${money(unit(c) * c.qty)}</span></div>`).join('') +
    `<div class="sum t"><span>الحساب</span><span>${money(subtotal())}</span></div>`, '<button class="btn f" onclick="A.cart()">رجوع للطلب</button>', { cls: 'big', kind: 'waiter' });
};
A.send = () => {
  if (!S.cart.length) return toast('اختر أصنافك أولاً');
  const f = S.f, m = S.mode, digits = f.phone.replace(/\D/g, '');
  if (m !== 'dinein') {
    if (!f.name.trim()) return toast('اكتب اسمك');
    if (!/^(\+?20|0)?1[0125]\d{8}$/.test(digits)) return toast('اكتب رقم موبايل صحيح');
    if (m === 'delivery' && f.address.trim().length < 6) return toast('اكتب العنوان بالتفصيل');
  }
  const head = m === 'dinein' ? `🍽️ *داخل الصالة* — ${S.table || 'بدون تحديد طاولة'}`
    : m === 'takeaway' ? `🛍️ *تيك أواي*\n👤 ${f.name}\n📱 ${f.phone}`
    : `🛵 *دليفري*\n👤 ${f.name}\n📱 ${f.phone}\n📍 ${f.address}`;
  const lines = S.cart.map((c, i) => `${i + 1}. ${c.qty} × ${byId(c.id).name} (${unit(c) * c.qty} ${C.currency})${c.det ? `\n   ↳ ${c.det}` : ''}`).join('\n');
  const msg = `*${C.name}* 🥙\n${head}\n━━━━━━━━\n${lines}\n━━━━━━━━\n${f.note.trim() ? `📝 ${f.note.trim()}\n` : ''}💰 *الإجمالي:* ${subtotal() + fee()} ${C.currency}${m === 'delivery' && typeof C.deliveryFee !== 'number' ? ' (+ التوصيل حسب المنطقة)' : ''}`;
  window.open(`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
};

/* ---------- نوافذ المعلومات ---------- */
const pm = i => `<div class="seg" style="margin-bottom:10px">${IM.paperMenus.map((p, x) => `<button class="${x === i ? 'on' : ''}" onclick="A.paper(${x})">${esc(p.title)}</button>`).join('')}</div><img class="pm-img" src="${esc(src(IM.paperMenus[i].img))}" alt="${esc(IM.paperMenus[i].title)}">`;
A.paper = (i = 0) => modal('المنيو الورقي', pm(i), '', { kind: 'paper' });
A.img = (f, cap) => modal(esc(cap || ''), `<img class="pm-img" src="${esc(src(f))}" alt="">`, '<button class="btn f" onclick="A.about()">رجوع</button>');
A.about = () => modal(`عن ${esc(C.name)}`, `
  <img class="hero-pic" src="${esc(src(IM.hero))}" alt="">
  <p>${esc(C.about)}</p>
  <div class="lbl">🕒 المواعيد</div><p>${esc(C.hoursText)}</p>
  <div class="lbl">📞 التواصل</div>
  <div class="opts">${C.phones.map(p => `<a class="btn p" style="text-decoration:none;text-align:center;flex:1" href="tel:${esc(p)}" dir="ltr">${esc(p)}</a>`).join('')}</div>
  ${C.facebook ? `<p style="margin-top:8px"><a href="${esc(C.facebook)}" target="_blank" rel="noopener" style="color:var(--p);font-weight:700">صفحتنا على فيسبوك</a></p>` : ''}
  <div class="lbl">📷 صور المكان</div>
  <div class="gal">${IM.gallery.map(g => `<img src="${esc(src(g.img))}" alt="${esc(g.cap)}" loading="lazy" onclick="A.img('${esc(g.img)}','${esc(g.cap)}')">`).join('')}</div>`,
  '<button class="btn f" onclick="A.qr()">🔳 كارت QR للطاولات</button>', { kind: 'about' });

/* ---------- QR ---------- */
A.qr = () => {
  modal('كارت QR للطاولات', `<select class="field" id="qr-sel" onchange="A.drawQr()" style="margin:0 0 12px">${$('table-sel').innerHTML.replace('اتركه للكابتن', 'كل الطاولات (رابط عام)')}</select>
    <div class="qrcard" id="qrcard"><img class="l" src="${esc(src(IM.logo))}" alt=""><h3>${esc(C.name)}</h3><p>امسح الكود لتصفح المنيو واطلب</p>
    <div class="qrbox" id="qrbox"></div><b id="qr-t"></b><p dir="ltr" style="font-size:.7rem;word-break:break-all;margin-top:6px" id="qr-u"></p></div>
    <p class="mut" id="qr-w" style="margin-top:8px"></p>`,
    '<button class="btn p f" onclick="print()">🖨 طباعة الكارت</button>', { kind: 'qr' });
  A.drawQr();
};
A.drawQr = () => {
  const t = $('qr-sel').value, base = C.siteUrl || location.href.split(/[?#]/)[0];
  const url = t ? `${base}?table=${encodeURIComponent(t)}` : base;
  $('qrbox').innerHTML = ''; $('qr-t').textContent = t; $('qr-u').textContent = url;
  $('qr-w').textContent = !C.siteUrl && location.protocol === 'file:' ? '⚠️ ضع رابط الموقع الحقيقي في config.js (siteUrl) قبل الطباعة، وإلا الكود هيشاور على ملف على جهازك.' : '';
  if (window.QRCode) new QRCode($('qrbox'), { text: url, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  else $('qrbox').textContent = 'تعذّر تحميل مكتبة QR — تأكد من الإنترنت وجرّب تاني';
};

/* ---------- المعاينة التجريبية ---------- */
A.paywall = locked => {
  const T = C.trial;
  modal(locked ? '🔒 انتهت فترة المعاينة' : 'تفعيل المنيو الدائم', `<div class="lock">
    <img class="logo" style="margin:0 auto 8px;cursor:default" src="${esc(src(IM.logo))}" alt="">
    <h3>${esc(C.name)} (${esc(C.nameEn)})</h3>
    <div class="pr">${esc(T.price)} <small class="mut">${esc(T.priceNote)}</small></div>
    <ul>${T.features.map(f => `<li>✅ ${esc(f)}</li>`).join('')}</ul></div>`,
    `<a class="btn g f" style="text-decoration:none;text-align:center" target="_blank" rel="noopener" href="https://wa.me/${esc(T.contactWhatsapp)}?text=${encodeURIComponent(T.contactMessage)}">💬 تفعيل عبر واتساب</a>`, { locked, kind: 'pay' });
};
function initTrial() {
  const T = C.trial; if (!T.enabled) return;
  const end = new Date(T.endDate).getTime(); $('trial').hidden = false;
  document.documentElement.style.setProperty('--th', $('trial').offsetHeight + 'px');
  const tick = () => {
    const d = end - Date.now();
    if (d <= 0) { $('cd').textContent = '00:00:00'; if (S.kind !== 'pay' || !S.locked) A.paywall(true); return; }
    const p = n => String(Math.floor(n)).padStart(2, '0'), days = Math.floor(d / 864e5);
    $('cd').textContent = `${days ? days + 'ي ' : ''}${p(d % 864e5 / 36e5)}:${p(d % 36e5 / 6e4)}:${p(d % 6e4 / 1e3)}`;
  };
  tick(); setInterval(tick, 1000);
}

/* ---------- الإدارة ---------- */
let sc = 0, scT;
A.secret = () => {
  clearTimeout(scT); scT = setTimeout(() => sc = 0, 1200);
  if (++sc < 3) return; sc = 0;
  const p = prompt('🔐 كود الإدارة:');
  if (p === C.adminCode) { S.admin = true; $('adminbar').hidden = false; renderMenu(); toast('وضع الإدارة مفعّل — اضغط على أي صنف لتعديله'); }
  else if (p !== null) toast('كود غير صحيح');
};
A.exitAdmin = () => { S.admin = false; $('adminbar').hidden = true; renderMenu(); };
function saveMenu() {
  if (!store.set('by_menu', { h: BASE_H, items: ITEMS })) toast('⚠️ مساحة المتصفح امتلأت — اضغط "حفظ وتصدير" الآن حتى لا تضيع التعديلات');
}
let ED = null;
A.edit = id => {
  const it = id === null ? { id: null, name: '', cat: CATS[0].id, price: 15, badge: '', desc: '', img: '', hasBread: true } : byId(id); if (!it) return;
  ED = { ...it };
  modal(id === null ? '➕ إضافة صنف' : `✏️ ${esc(it.name)}`, `
    <div class="lbl">الاسم</div><input class="field" id="ed-name" value="${esc(it.name)}">
    <div class="opts" style="margin-top:8px"><div style="flex:1"><div class="lbl">السعر</div><input class="field" id="ed-price" type="number" min="0" step="0.5" value="${it.price}"></div>
    <div style="flex:2"><div class="lbl">القسم</div><select class="field" id="ed-cat">${CATS.map(c => `<option value="${c.id}" ${c.id === it.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div></div>
    <div class="lbl">شارة (اختياري — الأصناف ذات الشارة تظهر في "الأكثر طلباً")</div><input class="field" id="ed-badge" value="${esc(it.badge)}">
    <div class="lbl">الوصف</div><input class="field" id="ed-desc" value="${esc(it.desc)}">
    <label class="opts" style="margin-top:10px"><input type="checkbox" id="ed-bread" ${it.hasBread ? 'checked' : ''}><span>ساندوتش (يسأل عن نوع العيش)</span></label>
    <div class="lbl">الصورة</div>
    <div class="opts" style="align-items:center"><div id="ed-prev" style="width:70px">${thumb(ED)}</div>
      <label class="btn" style="flex:1;text-align:center;cursor:pointer">📤 رفع صورة<input type="file" accept="image/*" hidden onchange="A.upload(event)"></label>
      <button class="btn" onclick="A.setImg('')">بدون صورة</button></div>
    <div class="presets" style="margin-top:8px">${IM.presets.map(p => `<img src="${esc(src(p))}" alt="" onclick="A.setImg('${esc(p)}')">`).join('')}</div>`,
    `<button class="btn p f" onclick="A.saveItem()">حفظ</button>${id === null ? '' : '<button class="btn d" onclick="A.delItem()">حذف</button>'}`, { kind: 'edit' });
};
A.setImg = f => { ED.img = f; $('ed-prev').innerHTML = thumb(ED); };
A.upload = e => {
  const file = e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const M = 600, r = Math.min(1, M / Math.max(img.width, img.height)), cv = document.createElement('canvas');
    cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    A.setImg(cv.toDataURL('image/jpeg', .8)); URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
};
A.saveItem = () => {
  const name = $('ed-name').value.trim(); if (!name) return toast('اكتب اسم الصنف');
  const price = parseFloat($('ed-price').value); if (!(price >= 0)) return toast('اكتب سعر صحيح');
  const cat = $('ed-cat').value, o = { ...ED, name, price, cat, section: catOf(cat).section, badge: $('ed-badge').value.trim(), desc: $('ed-desc').value.trim(), hasBread: $('ed-bread').checked };
  if (o.id === null) { o.id = Math.max(0, ...ITEMS.map(i => i.id)) + 1; ITEMS.unshift(cleanItem(o)); }
  else ITEMS[ITEMS.findIndex(i => i.id === o.id)] = cleanItem(o);
  saveMenu(); A.close(); renderMenu();
};
A.delItem = () => {
  if (!confirm('حذف هذا الصنف؟')) return;
  ITEMS = ITEMS.filter(i => i.id !== ED.id); saveMenu(); saveCart(); A.close(); renderMenu();
};
const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
A.export = async () => {
  let n = 0;
  for (const it of ITEMS) if (it.img.startsWith('data:')) {   // الصور المرفوعة تتنزّل كملفات منفصلة لفولدر images
    const name = `item-${it.id}.jpg`, blob = await (await fetch(it.img)).blob();
    download(blob, name); it.img = name; n++;
  }
  const items = ITEMS.map(cleanItem);
  const text = '/* بيانات المنيو — تم التصدير من وضع الإدارة */\n' +
    `window.MENU_VERSION = "${new Date().toISOString()}";\n` +
    'window.CATEGORIES = [\n' + CATS.map(c => '  ' + JSON.stringify(c)).join(',\n') + '\n];\n' +
    'window.MENU_ITEMS = [\n' + items.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n];\n';
  download(new Blob([text], { type: 'text/javascript;charset=utf-8' }), 'menu-data.js');
  store.set('by_menu', { h: hash(JSON.stringify(items)), items });
  toast(`تم تنزيل menu-data.js${n ? ` و${n} صورة — حطها في فولدر images` : ''}. بدّل الملف القديم وارفع.`);
  renderMenu();
};

/* ---------- تشغيل ---------- */
window.addEventListener('DOMContentLoaded', () => {
  if (store.get('by_theme', 'dark') === 'light') A.theme();
  fillStatic(); renderChips(); renderMenu(); A.mode('dinein'); cartUI();
  const t = new URLSearchParams(location.search).get('table');   // QR الطاولة
  if (t && [...$('table-sel').options].some(o => o.value === t)) A.table(t);
  initTrial();
});
})();
