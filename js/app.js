if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,""));
(function(){
var C=window.IB_CONFIG,$=function(i){return document.getElementById(i)};
var MON=["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"];
var CAT={konser:"🎤 Konser",naikgunung:"⛰️ Naik Gunung"};
var state={cat:"semua",city:C.DEFAULT_CITY,q:"",events:[]};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");setTimeout(function(){t.classList.remove("on")},2200)}
function prov(c){for(var p in IB_REGIONS)if(IB_REGIONS[p].indexOf(c)>-1)return p;return""}
function dparts(s){var d=new Date(s+"T00:00:00");return{d:("0"+d.getDate()).slice(-2),m:MON[d.getMonth()],full:d.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}}
function grad(e){var g=e.g||["#14532d","#ff6b35"];return"linear-gradient(160deg,"+g[0]+","+g[1]+")"}
function posterStyle(e){return e.poster_url?"background-image:url('"+esc(e.poster_url)+"')":"background:"+grad(e)}
var ridge='<svg viewBox="0 0 200 80" preserveAspectRatio="none"><path d="M0 80V50l40-30 30 25 40-35 45 40 25-20 20 15v35z" fill="rgba(0,0,0,.32)"/></svg>';
function load(){
  if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){state.events=IB_SAMPLE;return Promise.resolve()}
  var u=C.SUPABASE_URL+"/rest/v1/events?select=*,cities(name)&status=eq.published&order=event_date.asc";
  return fetch(u,{headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:"Bearer "+C.SUPABASE_ANON_KEY}})
   .then(function(r){if(!r.ok)throw 0;return r.json()})
   .then(function(rows){state.events=rows.map(function(r){r.city=r.cities&&r.cities.name;return r})})
   .catch(function(){state.events=IB_SAMPLE;toast("Gagal memuat Supabase, memakai data contoh")});
}
function list(){var q=state.q.toLowerCase();return state.events.filter(function(e){return e.city===state.city&&(state.cat==="semua"||e.category===state.cat)&&(e.title+" "+(e.venue||"")).toLowerCase().indexOf(q)>-1})}
function render(){
  var l=list();
  $("chip").textContent="📍 "+state.city+", "+prov(state.city);
  $("evTitle").textContent="Event di "+state.city;
  $("sEv").textContent=state.events.filter(function(e){return e.city===state.city}).length;
  $("grid").innerHTML=l.length?l.map(function(e){var p=dparts(e.event_date);
    return '<button class="ev" data-id="'+esc(e.id)+'"><div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+CAT[e.category]+'</span><div class="dt">'+p.d+'<small>'+p.m+'</small></div>'+ridge+'</div><div class="eb"><h3>'+esc(e.title)+'</h3><div class="meta">📍 '+esc(e.venue||e.city)+'</div><div class="price">'+esc(e.price_label||"Info menyusul")+'</div></div></button>'}).join("")
   :'<div class="empty">Belum ada event untuk filter ini.<br>Coba kategori lain, ganti kota, atau kosongkan kolom cari.</div>';
}
function openEv(id){
  var e=state.events.filter(function(x){return String(x.id)===String(id)})[0];if(!e)return;var p=dparts(e.event_date);
  $("dBody").innerHTML='<div class="poster" style="'+posterStyle(e)+'"><span class="tag">'+CAT[e.category]+'</span>'+ridge+'</div><div class="db"><h2>'+esc(e.title)+'</h2><div class="meta">🗓 '+p.full+'<br>📍 '+esc(e.venue||e.city)+', '+esc(e.city)+'<br>💰 '+esc(e.price_label||"Info menyusul")+'</div><p>'+esc(e.description||"")+'</p><div class="row">'
   +(e.ticket_url?'<a class="btn" target="_blank" rel="noopener" href="'+esc(e.ticket_url)+'">Tiket / Daftar</a>':'')
   +(e.source_ig?'<a class="btn ghost" target="_blank" rel="noopener" href="https://instagram.com/'+esc(e.source_ig)+'">Sumber: @'+esc(e.source_ig)+'</a>':'')
   +'<button class="btn ghost" id="barengan">🤝 Cari teman barengan</button><button class="btn ghost" id="close">Tutup</button></div></div>';
  $("dlg").showModal();
  $("close").onclick=function(){$("dlg").close()};
  $("barengan").onclick=function(){toast("Fitur teman barengan segera hadir (butuh login)")};
}
var sel=$("city");
Object.keys(IB_REGIONS).forEach(function(p){var g=document.createElement("optgroup");g.label=p;IB_REGIONS[p].forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;g.appendChild(o)});sel.appendChild(g)});
sel.value=state.city;
sel.onchange=function(){state.city=sel.value;render()};
$("q").oninput=function(){state.q=this.value;render()};
$("tabs").onclick=function(ev){var b=ev.target.closest(".tab");if(!b)return;state.cat=b.dataset.c;[].forEach.call(document.querySelectorAll(".tab"),function(t){t.classList.toggle("on",t===b)});render()};
$("grid").onclick=function(ev){var b=ev.target.closest(".ev");if(b)openEv(b.dataset.id)};
$("login").onclick=function(){location.href="login"};
$("year").textContent=new Date().getFullYear();
load().then(function(){$("sCity").textContent=Object.keys(IB_REGIONS).reduce(function(n,p){return n+IB_REGIONS[p].length},0);render()});
})();
