if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,""));
(function(){
var C=window.IB_CONFIG,DUM=document.createElement("div"),MODE=window.IB_MODE||"all",$=function(i){return document.getElementById(i)||DUM};
var MON=["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"];
var CAT={konser:"🎤 Konser",naikgunung:"⛰️ Naik Gunung"};
var DIF={pemula:"Pemula",menengah:"Menengah",sulit:"Sulit"};
var state={cat:"semua",city:"semua",when:"semua",price:"semua",sort:"date",q:"",events:[]};
var saved=read("ib_saved",[]);if(MODE==="home")state.when="live";if(MODE==="gunung")state.cat="naikgunung";
function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2400)}
function prov(c){for(var p in IB_REGIONS)if(IB_REGIONS[p].indexOf(c)>-1)return p;return""}
/* ---- Logika tanggal (zona WIB, bukan jam perangkat) ---- */
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function days(a,b){return Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5)}
function endOf(e){return e.end_date||e.event_date}
function isActive(e){return endOf(e)>=today()}
/* Status: live = sedang berjalan (multi-hari / hari-H), soon = <=7 hari, next = lebih jauh, past = selesai */
function status(e){var t=today(),s=days(t,e.event_date),en=days(t,endOf(e));
  if(en<0)return{k:"past",l:"Selesai",n:s};
  if(s<=0)return{k:"live",l:en===0&&s===0?"Hari ini":en===0?"Hari terakhir":"Berlangsung",n:0};
  return{k:s<=7?"soon":"next",l:s===1?"Besok":"H-"+s,n:s}}
function gratis(e){return/gratis|free/i.test(e.price_label||"")}
function dparts(s){var d=new Date(s+"T00:00:00");return{d:("0"+d.getDate()).slice(-2),m:MON[d.getMonth()],full:d.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}}
function posterStyle(e){var g=e.g||["#14532d","#ff5a1f"],bg="linear-gradient(160deg,"+g[0]+","+g[1]+")";return"background:"+(e.poster_url?"url('"+esc(e.poster_url).replace(/'/g,"%27")+"') center/cover,":"")+bg}
var ridge='<svg viewBox="0 0 200 80" preserveAspectRatio="none"><path d="M0 80V50l40-30 30 25 40-35 45 40 25-20 20 15v35z" fill="rgba(0,0,0,.32)"/></svg>';
function extra(e){var t=e.category==="konser"?(e.genre?"🎵 "+esc(e.genre):""):[e.mountain?"⛰️ "+esc(e.mountain):"",e.altitude_mdpl?e.altitude_mdpl+" mdpl":"",DIF[e.difficulty]||"",esc(e.duration||"")].filter(Boolean).join(" · ");return t?'<div class="meta">'+t+'</div>':""}
/* ---- Data ---- */
function load(){
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){state.events=IB_SAMPLE;return Promise.resolve()}
  var u=C.SUPABASE_URL+"/rest/v1/events?select=*,cities(name)&status=eq.published&order=event_date.asc";
  return fetch(u,{headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY}})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){state.events=rows.map(function(r){r.city=r.cities&&r.cities.name;return r})})
   .catch(function(){state.events=IB_SAMPLE;toast("Gagal memuat data server, memakai data contoh")});
}
/* ---- Klasifikasi & filter ---- */
function base(e){var q=state.q.toLowerCase();
  return(state.city==="semua"||e.city===state.city)
   &&(state.when==="semua"||(state.when==="live"?status(e).k==="live":status(e).n<=(state.when==="week"?7:30)))
   &&(state.price==="semua"||(state.price==="gratis")===gratis(e))
   &&(e.title+" "+(e.venue||"")+" "+(e.mountain||"")+" "+(e.genre||"")+" "+(e.city||"")).toLowerCase().indexOf(q)>-1}
function list(){var past=state.cat==="selesai";
  return state.events.filter(function(e){if(!base(e))return false;
    if(past)return!isActive(e);if(!isActive(e))return false;
    if(state.cat==="tersimpan")return saved.indexOf(String(e.id))>-1;
    return state.cat==="semua"||e.category===state.cat})
   .sort(function(a,b){if(past)return a.event_date<b.event_date?1:-1;
     if(state.sort==="new")return(b.created_at||"")<(a.created_at||"")?-1:1;
     return a.event_date<b.event_date?-1:1})}
function card(e){var p=dparts(e.event_date),s=status(e),on=saved.indexOf(String(e.id))>-1;
  return'<div class="ev'+(s.k==="past"?' past':'')+'" data-id="'+esc(e.id)+'" tabindex="0" role="button" aria-label="'+esc(e.title)+'"><div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+CAT[e.category]+'</span><div class="dt">'+p.d+'<small>'+p.m+'</small></div>'+ridge+'<span class="st-b '+s.k+'">'+(s.k==="live"?'● ':'')+s.l+'</span><button class="sv'+(on?' on':'')+'" data-sv="'+esc(e.id)+'" aria-label="Simpan event" aria-pressed="'+on+'">'+(on?'♥':'♡')+'</button></div><div class="eb"><h3>'+esc(e.title)+'</h3><div class="meta">📍 '+esc(e.venue||e.city)+(state.city==="semua"&&e.city?', '+esc(e.city):'')+'</div>'+extra(e)+'<div class="price">'+esc(e.price_label||"Info menyusul")+'</div></div></div>'}
function group(l){var G=[["live","Sedang berlangsung"],["soon","7 hari ke depan"],["next","Akan datang"]];
  if(state.cat==="selesai"||state.sort!=="date")return'<div class="grid">'+l.map(card).join("")+'</div>';
  return G.map(function(g){var x=l.filter(function(e){return status(e).k===g[0]});
    return x.length?'<div class="gh">'+g[1]+' <span>'+x.length+'</span></div><div class="grid">'+x.map(card).join("")+'</div>':""}).join("")}
function tabs(){var act=state.events.filter(function(e){return isActive(e)&&base(e)});
  var T=[["semua","Semua",act.length],["konser","🎤 Konser",act.filter(function(e){return e.category==="konser"}).length],["naikgunung","⛰️ Naik Gunung",act.filter(function(e){return e.category==="naikgunung"}).length],["tersimpan","♥ Tersimpan",act.filter(function(e){return saved.indexOf(String(e.id))>-1}).length],["selesai","⏱ Selesai",state.events.filter(function(e){return!isActive(e)&&base(e)}).length]];if(MODE==="home")T=T.slice(0,3);
  $("tabs").innerHTML=T.map(function(t){return'<button class="tab'+(state.cat===t[0]?' on':'')+'" data-c="'+t[0]+'">'+t[1]+'<small>'+t[2]+'</small></button>'}).join("")}
function render(){
  var l=list(),act=state.events.filter(isActive);
  $("chip").textContent="📍 "+(state.city==="semua"?"Semua kota":state.city+(prov(state.city)?", "+prov(state.city):""));
  if(MODE==="all")$("evTitle").textContent=state.cat==="selesai"?"Arsip event selesai":"Event aktif"+(state.city==="semua"?"":" di "+state.city);
  $("sEv").textContent=act.length;$("sLive").textContent=act.filter(function(e){return status(e).k==="live"}).length;
  $("sWeek").textContent=act.filter(function(e){var s=status(e);return s.k!=="live"&&s.n<=7}).length;
  tabs();$("cnt").textContent=l.length+" event ditemukan";
  $("list").innerHTML=l.length?group(l):'<div class="grid"><div class="empty">'+(state.cat==="tersimpan"?'Belum ada event tersimpan. Tekan ♡ di kartu event untuk menyimpannya.':(MODE==="home"?'Belum ada event dalam 7 hari ke depan.<br><a class="btn sm" style="margin-top:10px" href="event">Lihat semua event</a>':'Tidak ada event yang cocok dengan filter ini.<br><button class="btn sm" id="reset2">Reset filter</button>'))+'</div></div>';
  var r=$("reset2");if(r)r.onclick=reset}
function reset(){state.cat=MODE==="gunung"?"naikgunung":"semua";state.city="semua";state.when="semua";state.price="semua";state.sort="date";state.q="";
  ["city","when","price","sort"].forEach(function(i){$(i).value=state[i]});$("q").value="";render()}
/* ---- Aksi: simpan, bagikan, kalender, peta ---- */
function toggleSave(id){id=String(id);var i=saved.indexOf(id);if(i>-1)saved.splice(i,1);else saved.push(id);write("ib_saved",saved);toast(i>-1?"Dihapus dari tersimpan":"Disimpan di perangkat ini");render()}
function ics(e){var f=function(s){return s.replace(/-/g,"")},n=new Date(endOf(e)+"T00:00:00Z");n.setUTCDate(n.getUTCDate()+1);
  var t=function(s){return String(s||"").replace(/[\\;,]/g,"\\$&").replace(/\n/g,"\\n")};
  var b=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//InfoBarengan//ID","BEGIN:VEVENT","UID:"+e.id+"@infobarengan.com","DTSTAMP:"+new Date().toISOString().replace(/[-:]|\.\d+/g,""),"DTSTART;VALUE=DATE:"+f(e.event_date),"DTEND;VALUE=DATE:"+n.toISOString().slice(0,10).replace(/-/g,""),"SUMMARY:"+t(e.title),"LOCATION:"+t((e.venue||"")+", "+(e.city||"")),"DESCRIPTION:"+t(e.description),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([b],{type:"text/calendar"}));a.download=(e.title||"event").replace(/\W+/g,"-")+".ics";a.click();toast("Berkas kalender diunduh")}
function share(e){var d={title:e.title,text:e.title+" di "+(e.city||"")+" — info di InfoBarengan",url:location.origin+location.pathname};
  if(navigator.share)navigator.share(d).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(d.text+" "+d.url).then(function(){toast("Tautan disalin")});else toast("Salin alamat situs dari browser")}
function openEv(id){
  var e=state.events.filter(function(x){return String(x.id)===String(id)})[0];if(!e)return;var p=dparts(e.event_date),s=status(e);
  $("dBody").innerHTML='<div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+CAT[e.category]+'</span>'+ridge+'<span class="st-b '+s.k+'">'+s.l+'</span></div><div class="db"><h2>'+esc(e.title)+'</h2><div class="meta">🗓 '+p.full+(e.end_date&&e.end_date!==e.event_date?' s/d '+dparts(e.end_date).full:'')+'<br>📍 '+esc(e.venue||e.city)+', '+esc(e.city)+'<br>💰 '+esc(e.price_label||"Info menyusul")+'</div>'+extra(e)+(e.lineup?'<p><b>Line-up:</b> '+esc(e.lineup)+'</p>':'')+'<p>'+esc(e.description||"Deskripsi belum tersedia.")+'</p><div class="row">'
   +(e.ticket_url?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(e.ticket_url)+'">Tiket / Daftar</a>':'<span class="btn ghost" style="opacity:.6">Link tiket belum tersedia</span>')
   +(e.source_ig?'<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://instagram.com/'+esc(String(e.source_ig).replace(/^@/,""))+'">Sumber: @'+esc(String(e.source_ig).replace(/^@/,""))+'</a>':'')
   +'<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.venue||"")+" "+(e.city||""))+'">🗺 Peta</a>'
   +'<button class="btn ghost" id="dIcs">📅 Kalender</button><button class="btn ghost" id="dShare">↗ Bagikan</button>'
   +'<button class="btn ghost" id="close">Tutup</button></div><div id="ajk" class="ajk"></div></div>';
  $("dlg").showModal();
  $("close").onclick=function(){$("dlg").close()};
  $("dIcs").onclick=function(){ics(e)};$("dShare").onclick=function(){share(e)};
  if(window.IB_Ajakan)IB_Ajakan.mount(e,$("ajk"));else $("ajk").innerHTML='<p class="meta">Fitur ajakan belum aktif di situs ini.</p>';
}
/* ---- Pasang elemen & event ---- */
var sel=$("city");sel.innerHTML='<option value="semua">Semua kota</option>';
Object.keys(IB_REGIONS).forEach(function(p){var g=document.createElement("optgroup");g.label=p;IB_REGIONS[p].forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;g.appendChild(o)});sel.appendChild(g)});
["city","when","price","sort"].forEach(function(i){$(i).onchange=function(){state[i]=this.value;render()}});
$("reset").onclick=reset;
$("q").oninput=function(){state.q=this.value;render()};
$("tabs").onclick=function(ev){var b=ev.target.closest(".tab");if(!b)return;state.cat=b.dataset.c;render()};
$("list").onclick=function(ev){var s=ev.target.closest(".sv");if(s){ev.stopPropagation();return toggleSave(s.dataset.sv)}var b=ev.target.closest(".ev");if(b)openEv(b.dataset.id)};
$("list").onkeydown=function(ev){if((ev.key==="Enter"||ev.key===" ")&&ev.target.classList.contains("ev")){ev.preventDefault();openEv(ev.target.dataset.id)}};
$("dlg").onclick=function(ev){if(ev.target===this)this.close()};
$("login").onclick=function(){location.href="login"};
$("year").textContent=new Date().getFullYear();
[].forEach.call(document.querySelectorAll("[data-mail]"),function(a){if(C.CONTACT_EMAIL)a.href="mailto:"+C.CONTACT_EMAIL});
load().then(function(){if(MODE==="home"&&!state.events.some(function(e){return isActive(e)&&status(e).k==="live"})){state.when="week";$("note").hidden=false}render()});
})();
if(location.hash)history.replaceState(null,"",location.pathname+location.search);
document.addEventListener("click",function(e){
  var a=e.target.closest('a[href^="#"]');if(!a)return;
  e.preventDefault();
  var t=document.getElementById(a.getAttribute("href").slice(1));
  if(t)t.scrollIntoView({behavior:"smooth"});else scrollTo({top:0,behavior:"smooth"});
});
