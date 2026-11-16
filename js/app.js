if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search);
(function(){
var C=window.IB_CONFIG,DUM=document.createElement("div"),MODE=window.IB_MODE||"all",$=function(i){return document.getElementById(i)||DUM};
var tr=window.IB_T||function(k){return k},LOC=tr("locale"),MON=tr("mon").split(",");
var CAT={konser:tr("cat_konser"),naikgunung:tr("cat_naikgunung"),pameran:tr("cat_pameran")};
var DIF={pemula:tr("dif_pemula"),menengah:tr("dif_menengah"),sulit:tr("dif_sulit")};
var state={cat:"semua",city:"semua",when:"semua",price:"semua",sort:"date",q:"",events:[]};
var saved=read("ib_saved",[]);var kp=new URLSearchParams(location.search).get("kat");if(MODE==="all"&&(kp==="konser"||kp==="naikgunung"||kp==="pameran"))state.cat=kp;if(MODE==="home")state.when="live";if(MODE==="gunung")state.cat="naikgunung";
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
  if(en<0)return{k:"past",l:tr("past"),n:s};
  if(s<=0)return{k:"live",l:en===0&&s===0?tr("today"):en===0?tr("lastday"):tr("ongoing"),n:0};
  return{k:s<=7?"soon":"next",l:s===1?tr("tomorrow"):tr("indays",{n:s}),n:s}}
function gratis(e){return/gratis|free/i.test(e.price_label||"")}
function dparts(s){var d=new Date(s+"T00:00:00");return{d:("0"+d.getDate()).slice(-2),m:MON[d.getMonth()],full:d.toLocaleDateString(LOC,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}}
function posterStyle(e){var g=e.g||(e.category==="konser"?["#3b1a78","#ff3d81"]:e.category==="pameran"?["#b45309","#e11d48"]:["#14532d","#ff5a1f"]),bg="linear-gradient(160deg,"+g[0]+","+g[1]+")";return"background:"+(e.poster_url?"url('"+esc(e.poster_url).replace(/'/g,"%27")+"') center/cover,":"")+bg}
var RIDGE='<svg viewBox="0 0 200 80" preserveAspectRatio="none"><path d="M0 80V50l40-30 30 25 40-35 45 40 25-20 20 15v35z" fill="rgba(0,0,0,.32)"/></svg>',BARS='<svg viewBox="0 0 200 80" preserveAspectRatio="none"><path d="M10 80V40h14v40zM34 80V20h14v60zM58 80V50h14v30zM82 80V10h14v70zM106 80V35h14v45zM130 80V25h14v55zM154 80V48h14v32zM178 80V30h14v50z" fill="rgba(0,0,0,.28)"/></svg>';
function deco(e){return e.category==="naikgunung"?RIDGE:BARS}
function extra(e){var t=e.category==="konser"?(e.genre?"🎵 "+esc(e.genre):""):e.category!=="naikgunung"?"":[e.mountain?"⛰️ "+esc(e.mountain):"",e.altitude_mdpl?e.altitude_mdpl+" "+tr("mdpl"):"",DIF[e.difficulty]||"",esc(e.duration||"")].filter(Boolean).join(" · ");return t?'<div class="meta">'+t+'</div>':""}
function ttl(e){return window.IB_LANG==="en"&&e.title_en?e.title_en:e.title}
function dsc(e){return window.IB_LANG==="en"&&e.description_en?e.description_en:e.description}
/* ---- Data ---- */
function load(){
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){state.events=IB_SAMPLE;return Promise.resolve()}
  var u=C.SUPABASE_URL+"/rest/v1/events?select=*,cities(name)&status=eq.published&order=event_date.asc";
  return fetch(u,{headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY}})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){state.events=rows.map(function(r){r.city=r.cities&&r.cities.name;return r})})
   .catch(function(){state.events=IB_SAMPLE;toast(tr("loadfail"))});
}
/* ---- Klasifikasi & filter ---- */
function base(e){var q=state.q.toLowerCase();
  return(state.city==="semua"||e.city===state.city)
   &&(state.when==="semua"||(state.when==="live"?status(e).k==="live":status(e).n<=(state.when==="week"?7:30)))
   &&(state.price==="semua"||(state.price==="gratis")===gratis(e))
   &&(e.title+" "+(e.title_en||"")+" "+(e.venue||"")+" "+(e.mountain||"")+" "+(e.genre||"")+" "+(e.city||"")).toLowerCase().indexOf(q)>-1}
function list(){var past=state.cat==="selesai";
  return state.events.filter(function(e){if(!base(e))return false;
    if(past)return!isActive(e);if(!isActive(e))return false;
    if(state.cat==="tersimpan")return saved.indexOf(String(e.id))>-1;
    return state.cat==="semua"||e.category===state.cat})
   .sort(function(a,b){if(past)return a.event_date<b.event_date?1:-1;
     if(state.sort==="new")return(b.created_at||"")<(a.created_at||"")?-1:1;
     return a.event_date<b.event_date?-1:1})}
function card(e){var p=dparts(e.event_date),s=status(e),on=saved.indexOf(String(e.id))>-1;
  return'<div class="ev'+(s.k==="past"?' past':'')+'" data-id="'+esc(e.id)+'" tabindex="0" role="button" aria-label="'+esc(ttl(e))+'"><div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+(CAT[e.category]||esc(e.category))+'</span><div class="dt">'+p.d+'<small>'+p.m+'</small></div>'+deco(e)+'<span class="st-b '+s.k+'">'+(s.k==="live"?'● ':'')+s.l+'</span><button class="sv'+(on?' on':'')+'" data-sv="'+esc(e.id)+'" aria-label="'+tr("sv_label")+'" aria-pressed="'+on+'">'+(on?'♥':'♡')+'</button></div><div class="eb"><h3>'+esc(ttl(e))+'</h3><div class="meta">📍 '+esc(e.venue||e.city)+(state.city==="semua"&&e.city?', '+esc(e.city):'')+'</div>'+extra(e)+'<div class="price">'+esc(e.price_label||tr("price_tbd"))+'</div></div></div>'}
function group(l){var G=[["live",tr("g_live")],["soon",tr("g_soon")],["next",tr("g_next")]];
  if(state.cat==="selesai"||state.sort!=="date")return'<div class="grid">'+l.map(card).join("")+'</div>';
  return G.map(function(g){var x=l.filter(function(e){return status(e).k===g[0]});
    return x.length?'<div class="gh">'+g[1]+' <span>'+x.length+'</span></div><div class="grid">'+x.map(card).join("")+'</div>':""}).join("")}
function tabs(){var act=state.events.filter(function(e){return isActive(e)&&base(e)});
  var n=function(c){return act.filter(function(e){return e.category===c}).length};
  var T=[["semua",tr("tab_all"),act.length],["konser",tr("cat_konser"),n("konser")],["naikgunung",tr("cat_naikgunung"),n("naikgunung")],["pameran",tr("cat_pameran"),n("pameran")],["tersimpan",tr("tab_saved"),act.filter(function(e){return saved.indexOf(String(e.id))>-1}).length],["selesai",tr("tab_done"),state.events.filter(function(e){return!isActive(e)&&base(e)}).length]];
  if(MODE==="home")T=T.slice(0,4);
  $("tabs").innerHTML=T.map(function(t){return'<button class="tab'+(state.cat===t[0]?' on':'')+'" data-c="'+t[0]+'">'+t[1]+'<small>'+t[2]+'</small></button>'}).join("")}
function render(){
  var l=list(),act=state.events.filter(isActive),pv=prov(state.city);
  $("chip").textContent="📍 "+(state.city==="semua"?tr("allcities"):state.city+(pv?", "+IB_PROV(pv):""));
  if(MODE==="all")$("evTitle").textContent=state.cat==="selesai"?tr("h_archive"):(state.city==="semua"?tr("h_active"):tr("h_active_city",{c:state.city}));
  $("sEv").textContent=act.length;$("sLive").textContent=act.filter(function(e){return status(e).k==="live"}).length;
  $("sWeek").textContent=act.filter(function(e){var s=status(e);return s.k!=="live"&&s.n<=7}).length;
  tabs();$("cnt").textContent=tr("found",{n:l.length});
  $("list").innerHTML=l.length?group(l):'<div class="grid"><div class="empty">'+(state.cat==="tersimpan"?tr("empty_saved"):(MODE==="home"?tr("empty_home")+'<br><a class="btn sm" style="margin-top:10px" href="event">'+tr("see_all")+'</a>':tr("empty")+'<br><button class="btn sm" id="reset2">'+tr("reset_f")+'</button>'))+'</div></div>';
  var r=$("reset2");if(r)r.onclick=reset}
function reset(){state.cat=MODE==="gunung"?"naikgunung":"semua";state.city="semua";state.when="semua";state.price="semua";state.sort="date";state.q="";
  ["city","when","price","sort"].forEach(function(i){$(i).value=state[i]});$("q").value="";render()}
/* ---- Aksi: simpan, bagikan, kalender, peta ---- */
function toggleSave(id){id=String(id);var i=saved.indexOf(id);if(i>-1)saved.splice(i,1);else saved.push(id);write("ib_saved",saved);toast(i>-1?tr("sv_rm"):tr("sv_add"));render()}
function ics(e){var f=function(s){return s.replace(/-/g,"")},n=new Date(endOf(e)+"T00:00:00Z");n.setUTCDate(n.getUTCDate()+1);
  var t=function(s){return String(s||"").replace(/[\\;,]/g,"\\$&").replace(/\n/g,"\\n")};
  var b=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//InfoBarengan//ID","BEGIN:VEVENT","UID:"+e.id+"@infobarengan.com","DTSTAMP:"+new Date().toISOString().replace(/[-:]|\.\d+/g,""),"DTSTART;VALUE=DATE:"+f(e.event_date),"DTEND;VALUE=DATE:"+n.toISOString().slice(0,10).replace(/-/g,""),"SUMMARY:"+t(e.title),"LOCATION:"+t((e.venue||"")+", "+(e.city||"")),"DESCRIPTION:"+t(e.description),"END:VEVENT","END:VCALENDAR"].join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([b],{type:"text/calendar"}));a.download=(e.title||"event").replace(/\W+/g,"-")+".ics";a.click();toast(tr("ics_ok"))}
function share(e){var d={title:e.title,text:tr("share_text",{t:e.title,c:e.city||""}),url:location.origin+location.pathname};
  if(navigator.share)navigator.share(d).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(d.text+" "+d.url).then(function(){toast(tr("copied"))});else toast(tr("copy_manual"))}
function openEv(id){
  var e=state.events.filter(function(x){return String(x.id)===String(id)})[0];if(!e)return;var p=dparts(e.event_date),s=status(e);
  $("dBody").innerHTML='<div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+(CAT[e.category]||esc(e.category))+'</span>'+deco(e)+'<span class="st-b '+s.k+'">'+s.l+'</span></div><div class="db"><h2>'+esc(ttl(e))+'</h2><div class="meta">🗓 '+p.full+(e.end_date&&e.end_date!==e.event_date?tr("to")+dparts(e.end_date).full:'')+'<br>📍 '+esc(e.venue||e.city)+', '+esc(e.city)+'<br>💰 '+esc(e.price_label||tr("price_tbd"))+'</div>'+extra(e)+(e.lineup?'<p><b>'+tr("lineup")+'</b> '+esc(e.lineup)+'</p>':'')+'<p>'+esc(dsc(e)||tr("nodesc"))+'</p><div class="row">'
   +(e.ticket_url?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(e.ticket_url)+'">'+tr("ticket")+'</a>':'<span class="btn ghost" style="opacity:.6">'+tr("noticket")+'</span>')
   +(e.source_ig?'<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://instagram.com/'+esc(String(e.source_ig).replace(/^@/,""))+'">'+tr("source")+esc(String(e.source_ig).replace(/^@/,""))+'</a>':'')
   +'<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((e.venue||"")+" "+(e.city||""))+'">'+tr("map")+'</a>'
   +'<button class="btn ghost" id="dIcs">'+tr("cal")+'</button><button class="btn ghost" id="dShare">'+tr("share")+'</button>'
   +'<button class="btn ghost" id="close">'+tr("close")+'</button></div><div id="ajk" class="ajk"></div></div>';
  $("dlg").showModal();
  $("close").onclick=function(){$("dlg").close()};
  $("dIcs").onclick=function(){ics(e)};$("dShare").onclick=function(){share(e)};
  if(window.IB_Ajakan)IB_Ajakan.mount(e,$("ajk"));else $("ajk").innerHTML='<p class="meta">'+tr("aj_off")+'</p>';
}
/* ---- Pasang elemen & event ---- */
var sel=$("city");
function buildCities(){var cur=state.city,cnt={},act=state.events.filter(isActive),known={};
  act.forEach(function(e){if(e.city)cnt[e.city]=(cnt[e.city]||0)+1});
  sel.innerHTML='<option value="semua">'+tr("allcities")+'</option>';
  function grp(label,list){var g=document.createElement("optgroup");g.label=label;list.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c+(cnt[c]?" ("+cnt[c]+")":"");g.appendChild(o)});sel.appendChild(g)}
  Object.keys(IB_REGIONS).forEach(function(p){IB_REGIONS[p].forEach(function(c){known[c]=1});grp(IB_PROV(p),IB_REGIONS[p])});
  var extra=Object.keys(cnt).filter(function(c){return!known[c]});if(extra.length)grp(tr("othercities"),extra);
  sel.value=cur}
buildCities();
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
load().then(function(){buildCities();if(MODE==="home"&&!state.events.some(function(e){return isActive(e)&&status(e).k==="live"})){state.when="week";$("note").hidden=false}render()});
})();
if(location.hash)history.replaceState(null,"",location.pathname+location.search);
document.addEventListener("click",function(e){
  var a=e.target.closest('a[href^="#"]');if(!a)return;
  e.preventDefault();
  var t=document.getElementById(a.getAttribute("href").slice(1));
  if(t)t.scrollIntoView({behavior:"smooth"});else scrollTo({top:0,behavior:"smooth"});
});
