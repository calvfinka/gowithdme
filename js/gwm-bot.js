/* GWM Guide Bot — contextual help for Bantuan & Pesan (client-side, bilingual) */
(function(global){
"use strict";
var tr=function(k,a){return(global.IB_T&&IB_T(k,a))||k};
var LANG=function(){return global.IB_LANG==="en"?"en":"id"};
var C=function(){return global.IB_CONFIG||{}};
function KB(){
  var L=LANG(),mail=C().CONTACT_EMAIL||"gowithdme@jurkon.my.id",wa=C().CONTACT_WA_LABEL||"0822 4356 2960";
  return [
    {k:["daftar","sign up","register","akun baru","buat akun","signup"],a:{id:"Tekan Masuk → Daftar. Isi nama panggilan, email, dan password (min. 8 karakter), atau lanjut dengan Google.",en:"Tap Log in → Sign up. Enter nickname, email, and password (min. 8 characters), or continue with Google."},links:[{h:"login",t:L==="en"?"Log in":"Masuk"}]},
    {k:["lupa password","forgot","reset password","ganti password"],a:{id:"Di halaman Masuk, isi email lalu tekan “Lupa password?”. Cek juga folder spam.",en:"On Log in, enter email and press “Forgot password?”. Check spam too."},links:[{h:"login",t:L==="en"?"Log in":"Masuk"}]},
    {k:["profil","nickname","bio","edit profil","kota"],a:{id:"Buka Profil → Edit profil. Ubah nama, kota, bio, minat, lalu Simpan.",en:"Open Profile → Edit profile. Change nickname, city, bio, interests, then Save."},links:[{h:"profil",t:L==="en"?"Profile":"Profil"}]},
    {k:["event","konser","festival","tiket","jadwal"],a:{id:"Info dikurasi dari sumber resmi. GWM tidak menjual tiket — selalu cek tautan resmi sebelum membeli.",en:"Info is curated from official sources. GWM does not sell tickets — always check the official link before buying."},links:[{h:"event",t:L==="en"?"Events":"Event"}]},
    {k:["naik gunung","pendakian","hiking","open trip","gunung","packing","checklist","patungan"],a:{id:"Buka Gunung untuk open trip & checklist packing + kalkulator patungan. Bukan pengganti panduan basecamp resmi.",en:"Open Hiking for open trips, packing checklist & cost-split calculator. Not a substitute for official basecamp guidance."},links:[{h:"gunung",t:L==="en"?"Hiking":"Naik gunung"}]},
    {k:["ajakan","teman","barengan","meet up","invite","cari teman"],a:{id:"Buka event → Ajakan, atau Cari Teman. Host menyetujui. Bertemu di tempat umum.",en:"Open an event → Invites, or Find Company. Host approves. Meet in public places."},links:[{h:"teman",t:L==="en"?"Find company":"Cari teman"}]},
    {k:["komunitas","forum","grup"],a:{id:"Komunitas menampilkan papan per kota dan tautan grup. Laporkan konten bermasalah.",en:"Community shows per-city boards and group links. Report problematic content."},links:[{h:"komunitas",t:L==="en"?"Community":"Komunitas"}]},
    {k:["pesan","chat","dm","message","inbox"],a:{id:"Pesan adalah chat 1:1 setelah terhubung lewat ajakan. Jangan bagikan OTP; bisa blokir/laporkan.",en:"Messages are 1:1 chat after connecting via invites. Never share OTPs; you can block/report."},links:[{h:"pesan",t:L==="en"?"Messages":"Pesan"}]},
    {k:["ajukan","submit","tambah event","usulkan"],a:{id:"Masuk → Ajukan event. Status menunggu sampai admin menyetujui.",en:"Log in → Submit event. Stays pending until an admin approves."},links:[{h:"ajukan",t:L==="en"?"Submit":"Ajukan"}]},
    {k:["tersimpan","saved","favorit","bookmark"],a:{id:"Tekan ikon hati di kartu event. Lihat di Event → Tersimpan (tersimpan di perangkatmu).",en:"Tap the heart on an event card. See Events → Saved (stored on your device)."},links:[{h:"event?kat=tersimpan",t:L==="en"?"Saved":"Tersimpan"}]},
    {k:["privasi","privacy","data pribadi","pdp"],a:{id:"Kami minimalkan data; tanpa cookie iklan pihak ketiga. Detail di Kebijakan Privasi.",en:"We minimise data; no third-party ad cookies. Details in the Privacy Policy."},links:[{h:"privacy",t:L==="en"?"Privacy":"Privasi"}]},
    {k:["sponsor","featured","disorot","promosi","kerja sama","iklan"],a:{id:"Penyelenggara bisa minta slot Featured/Disorot atau paket sponsor lewat email kontak.",en:"Organizers can request Featured slots or sponsorship packages via the contact email."},links:[{h:"about",t:L==="en"?"About":"Tentang"},{h:"bantuan#kontak",t:L==="en"?"Contact":"Kontak"}]},
    {k:["kontak","hubungi","email","whatsapp","wa","support"],a:{id:"Email: "+mail+" · WhatsApp: "+wa+". Untuk laporan/sponsor, email lebih baik.",en:"Email: "+mail+" · WhatsApp: "+wa+". For reports/sponsorship, email is better."},links:[{h:"bantuan#kontak",t:L==="en"?"Contact":"Kontak"}]},
    {k:["aman","scam","tipu","blokir","lapor"],a:{id:"Jangan transfer uang ke orang baru. Bertemu di tempat umum. Pakai Blokir/Laporkan di chat.",en:"Do not transfer money to new contacts. Meet in public. Use Block/Report in chat."},links:[{h:"pesan",t:L==="en"?"Messages":"Pesan"}]},
    {k:["halo","hai","hello","hi","help","tolong","bantuan"],a:{id:"Halo! Aku panduan GWM. Tanya soal daftar, event, gunung, ajakan, komunitas, atau pesan.",en:"Hi! I’m the GWM guide. Ask about signup, events, hiking, invites, community, or messages."},links:[]}
  ];
}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim()}
function score(e,q){var n=norm(q);if(!n)return 0;var words=n.split(" ").filter(Boolean),sc=0;
  e.k.forEach(function(key){var nk=norm(key);if(n.indexOf(nk)>-1)sc+=3+nk.length/10;
    words.forEach(function(w){if(w.length<2)return;if(nk.indexOf(w)>-1||w.indexOf(nk)>-1)sc+=1.2})});return sc}
function answer(q){var L=LANG(),list=KB(),best=null,bestSc=0;
  list.forEach(function(e){var s=score(e,q);if(s>bestSc){bestSc=s;best=e}});
  if(!best||bestSc<1.5)return{text:L==="en"?"Try keywords like “sign up”, “invite”, “hiking”, or “contact”. Or browse the FAQ.":"Coba kata kunci seperti “daftar”, “ajakan”, “gunung”, atau “kontak”. Atau gulir FAQ.",links:[{h:"bantuan#faq",t:"FAQ"},{h:"bantuan#kontak",t:L==="en"?"Contact":"Kontak"}],low:true};
  return{text:best.a[L]||best.a.id,links:best.links||[],low:false}}
function chips(){return LANG()==="en"?[{q:"How do I sign up?",label:"Sign up"},{q:"Find company / invites",label:"Invites"},{q:"Hiking & packing",label:"Hiking"},{q:"Community",label:"Community"},{q:"Contact",label:"Contact"}]:[{q:"Cara daftar akun",label:"Daftar"},{q:"Ajakan teman",label:"Ajakan"},{q:"Naik gunung & packing",label:"Gunung"},{q:"Komunitas",label:"Komunitas"},{q:"Hubungi GWM",label:"Kontak"}]}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function renderLinks(links){if(!links||!links.length)return"";return'<div class="gwm-bot-links">'+links.map(function(l){return'<a class="btn ghost sm" href="'+esc(l.h)+'">'+esc(l.t)+"</a>"}).join("")+"</div>"}
function mount(root,opts){opts=opts||{};if(!root)return null;var L=LANG();
  var title=opts.title||(L==="en"?"GWM Guide":"Panduan GWM");
  var placeholder=opts.placeholder||(L==="en"?"Ask about events, invites, hiking…":"Tanya soal event, ajakan, gunung…");
  var welcome=opts.welcome||(L==="en"?"Hi! Ask me about accounts, events, hiking, invites, community, or messages.":"Halo! Tanya soal akun, event, naik gunung, ajakan, komunitas, atau pesan.");
  root.innerHTML='<div class="gwm-bot" role="region" aria-label="'+esc(title)+'"><div class="gwm-bot-hd"><span class="gwm-bot-av" aria-hidden="true">✦</span><div><b>'+esc(title)+"</b><small>"+esc(L==="en"?"Answers from site content":"Jawaban dari konten situs")+'</small></div></div><div class="gwm-bot-log" id="gwmBotLog" aria-live="polite"></div><div class="gwm-bot-chips" id="gwmBotChips"></div><form class="gwm-bot-form" id="gwmBotForm" autocomplete="off"><input id="gwmBotIn" type="text" maxlength="200" placeholder="'+esc(placeholder)+'" aria-label="'+esc(placeholder)+'"><button class="btn sm" type="submit">'+esc(L==="en"?"Ask":"Tanya")+"</button></form></div>";
  var log=root.querySelector("#gwmBotLog"),form=root.querySelector("#gwmBotForm"),input=root.querySelector("#gwmBotIn"),chipBox=root.querySelector("#gwmBotChips");
  function add(role,html){var d=document.createElement("div");d.className="gwm-bot-msg "+role;d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight}
  function respond(q){if(!q||!String(q).trim())return;add("user","<p>"+esc(q)+"</p>");var r=answer(q);add("bot","<p>"+esc(r.text)+"</p>"+renderLinks(r.links));
    try{var hist=JSON.parse(localStorage.getItem("gwm_bot_hist")||"[]");hist.push({q:String(q).slice(0,120),t:Date.now()});localStorage.setItem("gwm_bot_hist",JSON.stringify(hist.slice(-12)))}catch(e){}}
  add("bot","<p>"+esc(welcome)+"</p>");
  chips().forEach(function(c){var b=document.createElement("button");b.type="button";b.className="gwm-chip";b.textContent=c.label;b.onclick=function(){respond(c.q)};chipBox.appendChild(b)});
  form.onsubmit=function(e){e.preventDefault();var q=input.value.trim();input.value="";respond(q)};
  return{respond:respond,answer:answer}}
function tipHtml(context){var L=LANG();var tips={inbox:L==="en"?"Tip: Message people you connected with via invites. You can block or report anytime.":"Tips: Pesan orang yang terhubung lewat ajakan. Kamu bisa blokir atau laporkan kapan saja.",empty:L==="en"?"No conversations yet. Join an invite first.":"Belum ada percakapan. Ikut ajakan dulu.",thread:L==="en"?"Meet in public. Never share OTPs or transfer money to people you just met.":"Bertemu di tempat umum. Jangan bagikan OTP atau transfer uang ke orang baru."};return'<p class="gwm-bot-tip">'+esc(tips[context]||tips.inbox)+"</p>"}
function retentionHint(){var L=LANG(),out=[];
  try{var saved=JSON.parse(localStorage.getItem("ib_saved")||"[]");if(saved&&saved.length)out.push({h:"event?kat=tersimpan",t:L==="en"?saved.length+" saved events":saved.length+" event tersimpan"})}catch(e){}
  try{var viewed=JSON.parse(localStorage.getItem("gwm_viewed")||"[]");if(viewed&&viewed.length)out.push({h:"event",t:L==="en"?"Continue browsing":"Lanjut lihat event"})}catch(e){}
  try{var last=+localStorage.getItem("gwm_last_visit")||0;localStorage.setItem("gwm_last_visit",String(Date.now()));
    if(last&&Date.now()-last>36e5)return{welcome:L==="en"?"Welcome back! Pick up where you left off.":"Selamat datang kembali! Lanjutkan dari terakhir kali.",links:out.slice(0,3)}}catch(e){}
  return{welcome:null,links:out.slice(0,3)}}
global.GWMBot={answer:answer,mount:mount,tipHtml:tipHtml,retentionHint:retentionHint,chips:chips};
})(window);
