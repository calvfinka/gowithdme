/* Komunitas per kota: papan kiriman, tautan grup, daftar tunggu. Tulis lewat RPC di supabase/schema_forum.sql */
(function(){
var tr0=window.IB_T||function(k){return k};
/* cadangan teks baru: bila i18n.js lama masih tersimpan di cache peramban, halaman tetap menampilkan teks yang benar, bukan nama kuncinya */
var KX={id:{kx_stat_c:"{n} kota buka",kx_stat_p:"{n} kiriman",kx_stat_g:"{n} grup",kx_stat_p_1:"{n} kiriman",kx_stat_g_1:"{n} grup",kx_yours:"Kotamu",kx_resume:"Lanjut ke {c}",kx_events:"Lihat event di {c}",kx_events_d:"Konser, festival, dan pendakian yang bisa kamu datangi.",kx_none_f:"Tidak ada kiriman yang cocok.",kx_empty_cta:"Tulis kiriman pertama",kx_nofind:"Kota itu belum buka. Pilih dari daftar di bawah untuk dikabari."},
 en:{kx_stat_c:"{n} cities open",kx_stat_p:"{n} posts",kx_stat_g:"{n} groups",kx_stat_p_1:"{n} post",kx_stat_g_1:"{n} group",kx_yours:"Your city",kx_resume:"Continue to {c}",kx_events:"See events in {c}",kx_events_d:"Concerts, festivals, and hikes you can go to.",kx_none_f:"No matching posts.",kx_empty_cta:"Write the first post",kx_nofind:"That city isn't open yet. Pick it in the list below to get notified."}};
function tr(k,o){var r=tr0(k,o);if(r!==k)return r;var d=KX[(document.documentElement.lang||"id").slice(0,2)==="en"?"en":"id"][k];
  if(d==null)return r;return d.replace(/\{(\w+)\}/g,function(m,x){return o&&o[x]!=null?o[x]:""})}
if(!window.sb){msg(tr("k_off"),"err");return}
var KINDS=["teman","tanya","tips"],st={city:null,kind:"semua",me:null,posts:[],cities:[],q:""};
var QS=new URLSearchParams(location.search),CITY=QS.get("kota"),POST=QS.get("p"),EVT=QS.get("event");
if(["teman","tanya","tips"].indexOf(QS.get("t"))>=0)st.kind=QS.get("t");
function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},Math.max(2800,m.length*70))}
function needLogin(){toast(tr("aj_needlogin"));setTimeout(function(){location.href="login"},900)}
function run(p,okMsg,after){return p.then(function(r){if(r.error){toast(r.error.message||tr("k_err"));return false}if(okMsg)toast(okMsg);if(after)after();return true},function(){toast(tr("k_err"));return false})}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function ago(ts){var s=(new Date(ts).getTime()-Date.now())/1000,a=Math.abs(s),r;
  try{r=new Intl.RelativeTimeFormat(tr("locale"),{numeric:"auto"})}catch(e){return""}
  if(a<60)return r.format(0,"second");if(a<3600)return r.format(Math.round(s/60),"minute");
  if(a<86400)return r.format(Math.round(s/3600),"hour");if(a<2592000)return r.format(Math.round(s/86400),"day");
  return r.format(Math.round(s/2592000),"month")}
function who(n,ref,v){var t=esc(n||tr("k_user"))+(v?" ✓":"");return ref?'<a class="lnk" href="profil?u='+encodeURIComponent(ref)+'">'+t+'</a>':t}
function plat(u){return/whatsapp/i.test(u)?"WhatsApp":/t\.me/i.test(u)?"Telegram":/discord/i.test(u)?"Discord":""}
/* dialog kecil pengganti prompt/confirm */
function ask(o){return new Promise(function(res){
  var d=document.createElement("dialog");d.className="aqd";
  d.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(o.title||"")+'</h3>'+(o.text?'<p>'+esc(o.text)+'</p>':'')+
   (o.input?'<textarea name="v" rows="3" maxlength="200" required minlength="'+(o.input.min||1)+'" placeholder="'+esc(o.input.ph||"")+'"></textarea>':'')+
   '<div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(tr("k_cancel"))+'</button><button class="btn sm" value="ok">'+esc(o.ok||tr("k_yes"))+'</button></div></form>';
  document.body.appendChild(d);
  d.addEventListener("close",function(){var v=d.querySelector("textarea"),ok=d.returnValue==="ok";res(ok?(v?v.value.trim():true):null);d.remove()});
  d.showModal()})}

/* ---------- util tampilan ---------- */
var PIN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>';
var PIN_BIG='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 58S10 40 10 25a22 22 0 0 1 44 0c0 15-22 33-22 33Z" fill="var(--sel)"/><circle cx="25" cy="24" r="6.5" fill="#E4501A"/><circle cx="39" cy="24" r="6.5" fill="#F5B416"/><path d="M16.2 39a8.8 8.8 0 0 1 17.6 0Z" fill="#E4501A"/><path d="M30.2 39a8.8 8.8 0 0 1 17.6 0Z" fill="#F5B416"/></svg>';
function pl(k,n){var o=tr(k+"_1",{n:nf(n)});return n===1&&o!==k+"_1"?o:tr(k,{n:nf(n)})}
function nf(n){try{return new Intl.NumberFormat(tr("locale")).format(n)}catch(e){return String(n)}}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function myCity(){var l=null;try{l=JSON.parse(lsGet("gwm_loc")||"null")}catch(e){}return(l&&l.city&&l.city!=="semua"?l.city:null)||lsGet("gwm_kota")}
function setQS(o){try{var u=new URL(location.href);Object.keys(o).forEach(function(k){if(o[k])u.searchParams.set(k,o[k]);else u.searchParams.delete(k)});history.replaceState(null,"",u.pathname+u.search+u.hash)}catch(e){}}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}

/* ---------- Beranda: daftar kota ---------- */
function cityCard(c,mine){
  return'<a class="kcard'+(mine?' mine':'')+'" href="komunitas?kota='+encodeURIComponent(c.city)+'">'+(mine?'<em class="kc-tag">'+esc(tr("kx_yours"))+'</em>':'')+
    '<span class="kc-pin">'+PIN+'</span><span class="kc-w"><b>'+esc(c.city)+'</b><span class="kc-s"><i>'+esc(pl("kx_stat_p",c.posts))+'</i><i>'+esc(pl("kx_stat_g",c.groups))+'</i></span></span></a>'}
function drawCities(){
  var q=norm($("kFind").value.trim()),mine=myCity(),L=st.cities.filter(function(c){return!q||norm(c.city).indexOf(q)>=0});
  /* kota milik pengguna selalu di depan */
  L=L.slice().sort(function(a,b){return(b.city===mine)-(a.city===mine)});
  $("kCities").setAttribute("aria-busy","false");
  $("kCities").innerHTML=L.map(function(c){return cityCard(c,c.city===mine)}).join("");
  var nf0=$("kNoFind");nf0.hidden=!(q&&!L.length);nf0.textContent=nf0.hidden?"":tr("kx_nofind")}
function home(){
  $("kHome").hidden=false;$("kCity").hidden=true;$("kFab").hidden=true;
  sb.from("forum_city_stats").select("*").order("sort").then(function(r){
    if(r.error||!r.data){$("kCities").setAttribute("aria-busy","false");$("kCities").innerHTML='<p class="meta">'+esc(tr("k_off"))+'</p>';return}
    var A=r.data.filter(function(c){return c.active});st.cities=A;
    var P=0,G=0;A.forEach(function(c){P+=c.posts||0;G+=c.groups||0});
    $("kStats").innerHTML='<span><b>'+nf(A.length)+'</b> '+esc(tr("kx_stat_c",{n:""}).replace(/^\s+/,"").trim())+'</span><span><b>'+nf(P)+'</b> '+esc(tr("kx_stat_p",{n:""}).trim())+'</span><span><b>'+nf(G)+'</b> '+esc(tr("kx_stat_g",{n:""}).trim())+'</span>';
    var m=myCity(),hit=A.filter(function(c){return c.city===m})[0],rs=$("kResume");
    if(hit){rs.hidden=false;rs.href="komunitas?kota="+encodeURIComponent(hit.city);rs.innerHTML='<svg class="i" aria-hidden="true"><use href="#i-pin"/></svg>'+esc(tr("kx_resume",{c:hit.city}))+' →'}
    drawCities();
    var names=A.map(function(c){return c.city}),all=[];
    Object.keys(window.IB_REGIONS||{}).forEach(function(p){IB_REGIONS[p].forEach(function(c){if(names.indexOf(c)<0)all.push(c)})});all.sort();
    var k=$("kSoon");k.hidden=!all.length;
    k.innerHTML='<h3>'+esc(tr("k_soon_h"))+'</h3><p class="meta">'+esc(tr("k_soon_p"))+'</p><div class="krow"><select id="kPick" aria-label="'+esc(tr("k_pick"))+'"><option value="">'+esc(tr("k_pick"))+'</option>'+
      all.map(function(c){return'<option>'+esc(c)+'</option>'}).join("")+'</select><button class="btn sm" id="kNotify" type="button">'+esc(tr("k_notify"))+'</button></div>';
    $("kNotify").onclick=function(){var v=$("kPick").value;if(!v)return;if(!st.me)return needLogin();run(sb.rpc("forum_waitlist_join",{p_city:v,p_on:true}),tr("k_notified"))}})}

/* ---------- Halaman kota ---------- */
function city(name){
  sb.from("forum_city_stats").select("*").order("sort").then(function(r){
    var A=(r.data||[]).filter(function(c){return c.active}),c0=A.filter(function(c){return c.city===name})[0];
    if(!c0)return home();
    st.city=name;st.cities=A;st.q="";$("kQ").value="";lsSet("gwm_kota",name);
    $("kHome").hidden=true;$("kCity").hidden=false;$("kFab").hidden=false;
    document.title=tr("k_city_h",{c:name})+" — GWM";
    $("kTitle").textContent=tr("k_city_h",{c:name});$("kSub").textContent=tr("k_city_p",{c:name});$("kSafe").textContent=tr("k_safety");
    $("kSwitch").innerHTML=A.map(function(c){return'<option value="'+esc(c.city)+'"'+(c.city===name?' selected':'')+'>'+esc(c.city)+'</option>'}).join("");
    $("kEvents").href="event?kota="+encodeURIComponent(name);$("kEvT").textContent=tr("kx_events",{c:name});$("kEvD").textContent=tr("kx_events_d");
    var w=st.me?tr("k_new"):tr("k_login_write");$("kNew").textContent=w;$("kFab").textContent=w;
    tabs();loadGroups(name);
    loadPosts(name).then(function(){
      /* tautan dari halaman event: ?p=<id kiriman> membuka kiriman, ?event=<id event> membuka formulir dengan event terpilih */
      if(POST){var id=POST;POST=null;openPost(id)}else if(EVT&&st.me){var ev=EVT;EVT=null;openForm(ev)}})})}
function loadGroups(name){
  sb.from("forum_groups").select("*").eq("city",name).order("created_at").then(function(r){
    var G=(r.data||[]).filter(function(g){return/^https:\/\//.test(g.url)});
    var ico=function(u){return/whatsapp/i.test(u)?'<i class="kg-i kg-wa">WA</i>':/t\.me/i.test(u)?'<i class="kg-i kg-tg">TG</i>':/discord/i.test(u)?'<i class="kg-i kg-dc">DC</i>':'<i class="kg-i">'+PIN.replace('aria-hidden="true"','aria-hidden="true" width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:1.8"')+'</i>'};
    $("kGroups").innerHTML='<h2 class="kh">'+esc(tr("k_groups_h"))+'</h2>'+(G.length?'<div class="kgl">'+G.map(function(g){
      return'<a class="kgroup" href="'+esc(g.url)+'" target="_blank" rel="noopener noreferrer nofollow">'+ico(g.url)+'<span><b>'+esc(g.name)+'</b><small>'+esc([plat(g.url),tr("k_g_"+g.kind),g.note].filter(Boolean).join(" · "))+'</small></span><em>'+esc(tr("k_group_open"))+'</em></a>'}).join("")+'</div><p class="meta">'+esc(tr("k_groups_note"))+'</p>':'<p class="meta">'+esc(tr("k_no_groups"))+'</p>')})}
function tabs(){
  var cnt={semua:st.posts.length};KINDS.forEach(function(k){cnt[k]=st.posts.filter(function(p){return p.kind===k}).length});
  $("kTabs").innerHTML=["semua"].concat(KINDS).map(function(k){return'<button type="button" data-k="'+k+'"'+(st.kind===k?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+(k==="semua"?'':'<span class="kd kd-'+k+'"></span>')+esc(tr("k_tab_"+k))+(st.posts.length?'<em>'+cnt[k]+'</em>':'')+'</button>'}).join("")}
function loadPosts(name){
  return sb.from("forum_posts_public").select("*").eq("city",name).order("last_activity",{ascending:false}).limit(60).then(function(r){st.posts=r.data||[];tabs();drawPosts()})}
function drawPosts(){
  var q=norm(st.q||""),L=st.posts.filter(function(p){return(st.kind==="semua"||p.kind===st.kind)&&(!q||norm(p.title+" "+p.body+" "+(p.author_name||"")+" "+(p.event_title||"")).indexOf(q)>=0)});
  if(!L.length){
    var none=!st.posts.length;
    $("kList").innerHTML='<div class="kx-empty">'+PIN_BIG+'<p>'+esc(tr(none?"k_none":"kx_none_f"))+'</p>'+(none?'<button type="button" class="btn" data-new="1">'+esc(tr("kx_empty_cta"))+'</button>':'')+'</div>';return}
  $("kList").innerHTML=L.map(function(p){
    var b=p.body.length>180?p.body.slice(0,180)+"…":p.body;
    return'<div class="kpost k-'+esc(p.kind)+'" role="button" tabindex="0" data-id="'+esc(p.id)+'"><span class="kk kk-'+esc(p.kind)+'">'+esc(tr("k_tab_"+p.kind))+'</span><b>'+esc(p.title)+'</b><p>'+esc(b)+'</p><small><span>'+esc(tr("k_by"))+' '+esc(p.author_name||tr("k_user"))+(p.author_verified?" ✓":"")+'</span><span>· '+esc(ago(p.last_activity))+'</span><span class="kp-r"><svg class="i" aria-hidden="true"><use href="#i-chat"/></svg>'+esc(tr("k_replies",{n:p.reply_count}))+'</span>'+(p.event_title?'<span class="kp-e">'+esc(p.event_title)+'</span>':'')+'</small></div>'}).join("")}

/* ---------- Rincian kiriman (dialog) ---------- */
function openPost(id){
  var show=function(p){
    $("dBody").innerHTML='<p class="meta">…</p>';if(!$("dlg").open)$("dlg").showModal();
    sb.from("forum_replies_public").select("*").eq("post_id",p.id).order("created_at").then(function(r){drawPost(p,r.data||[])})};
  var p=st.posts.filter(function(x){return x.id===id})[0];
  if(p)return show(p);
  /* kiriman lama yang tidak ada di 60 teratas (mis. dari tautan di halaman event) */
  sb.from("forum_posts_public").select("*").eq("id",id).maybeSingle().then(function(r){if(r.data)show(r.data);else toast(tr("k_gone"))})}
function drawPost(p,R){
  var act=function(mine,t,id){return st.me?'<button class="lnk" data-x="'+(mine?"del":"rep")+'-'+t+'" data-id="'+id+'">'+esc(tr(mine?"k_delete":"k_report"))+'</button>':""};
  var h='<span class="kk kk-'+p.kind+'">'+esc(tr("k_tab_"+p.kind))+'</span><h2>'+esc(p.title)+'</h2><div class="meta">'+esc(tr("k_by"))+' '+who(p.author_name,p.author_ref,p.author_verified)+' · '+esc(ago(p.created_at))+'</div>'+
   (p.event_title?'<p class="meta"><a class="lnk" href="event?e='+encodeURIComponent(p.event_slug||p.event_id)+'">'+esc(p.event_title)+'</a></p>':'')+
   '<p class="kbody">'+esc(p.body)+'</p><div class="row">'+act(p.is_mine,"post",p.id)+'</div><h3 class="kh">'+esc(tr("k_replies",{n:R.length}))+'</h3>'+
   (R.length?R.map(function(x){return'<div class="krep"><b>'+who(x.author_name,x.author_ref,x.author_verified)+'</b> <small>'+esc(ago(x.created_at))+'</small><p class="kbody">'+esc(x.body)+'</p>'+act(x.is_mine,"reply",x.id)+'</div>'}).join(""):'<p class="meta">'+esc(tr("k_no_replies"))+'</p>')+
   (st.me?'<form id="kRep"><textarea name="b" rows="3" minlength="2" maxlength="600" required placeholder="'+esc(tr("k_reply_ph"))+'"></textarea><div class="row"><button class="btn sm" type="submit">'+esc(tr("k_reply_send"))+'</button></div></form>'
         :'<button class="btn sm" data-x="login">'+esc(tr("k_login_write"))+'</button>')+
   '<div class="row"><button class="btn ghost sm" data-x="close">'+esc(tr("close"))+'</button></div>';
  $("dBody").innerHTML=h;
  var again=function(){loadPosts(st.city).then(function(){openPost(p.id)})};
  $("dBody").onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;var x=b.dataset.x,id=b.dataset.id;
    if(x==="close")return $("dlg").close();if(x==="login")return needLogin();
    if(x==="del-post")return ask({title:tr("k_delete"),text:tr("k_sure_del")}).then(function(v){if(v)run(sb.rpc("forum_delete",{p_post:id,p_reply:null}),tr("k_deleted"),function(){$("dlg").close();loadPosts(st.city)})});
    if(x==="del-reply")return ask({title:tr("k_delete"),text:tr("k_sure_del")}).then(function(v){if(v)run(sb.rpc("forum_delete",{p_post:null,p_reply:id}),tr("k_deleted"),again)});
    if(x==="rep-post"||x==="rep-reply")return ask({title:tr("k_report_h"),input:{ph:tr("k_report_ph"),min:3},ok:tr("k_send")}).then(function(v){if(v)run(sb.rpc("forum_report",{p_post:x==="rep-post"?id:null,p_reply:x==="rep-reply"?id:null,p_reason:v}),tr("k_reported"))})};
  var f=$("kRep");if(f)f.onsubmit=function(ev){ev.preventDefault();var btn=f.querySelector('[type="submit"]');if(btn.disabled)return;
    if(window.IB_WordFilter){var wf=IB_WordFilter.enforce(f.elements.b.value,{userId:st.me&&st.me.id,userLabel:(st.me&&(st.me.user_metadata&&st.me.user_metadata.full_name||st.me.email))||"Anggota",context:"forum_reply"});if(!wf.ok){return toast(wf.message)}}
    btn.disabled=true;
    run(sb.rpc("forum_reply",{p_post:p.id,p_body:f.elements.b.value}),tr("k_replied"),again).then(function(ok){if(!ok)btn.disabled=false})}}

/* ---------- Kiriman baru ---------- */
function openForm(pre){
  if(!st.me)return needLogin();
  var t=today(),kind="teman";
  var pq=pre?sb.from("events").select("id,title").eq("id",pre).eq("status","published").maybeSingle():Promise.resolve({data:null});
  Promise.all([sb.from("events").select("id,title,event_date,cities!inner(name)").eq("status","published").eq("cities.name",st.city).or("end_date.gte."+t+",event_date.gte."+t).order("event_date").limit(60),pq]).then(function(x){
    var r=x[0],E=r.error?[]:(r.data||[]);
    if(pre&&x[1].data&&!E.some(function(e){return e.id===pre}))E.unshift(x[1].data);
    $("dBody").innerHTML='<h2>'+esc(tr("k_form_h"))+'</h2><form id="kForm"><div class="seg" id="kfKind" role="group" aria-label="'+esc(tr("k_f_kind"))+'">'+KINDS.map(function(k){return'<button type="button" data-k="'+k+'"'+(k===kind?' class="on"':'')+'>'+esc(tr("k_tab_"+k))+'</button>'}).join("")+'</div>'+
     '<label class="f">'+esc(tr("k_f_title"))+'<input name="t" minlength="5" maxlength="100" required placeholder="'+esc(tr("k_f_title_ph"))+'"></label>'+
     '<label class="f">'+esc(tr("k_f_body"))+'<textarea name="b" rows="5" minlength="5" maxlength="1000" required placeholder="'+esc(tr("k_f_body_ph"))+'"></textarea></label>'+
     '<label class="f">'+esc(tr("k_f_event"))+'<select name="e"><option value="">'+esc(tr("k_f_noevent"))+'</option>'+E.map(function(e){return'<option value="'+esc(e.id)+'"'+(e.id===pre?' selected':'')+'>'+esc(e.title)+'</option>'}).join("")+'</select></label>'+
     '<div class="row"><button class="btn ghost sm" type="button" data-x="close">'+esc(tr("k_cancel"))+'</button><button class="btn" type="submit">'+esc(tr("k_f_submit"))+'</button></div></form>';
    $("dBody").onclick=function(ev){var c=ev.target.closest("[data-x]");if(c&&c.dataset.x==="close")return $("dlg").close();
      var k=ev.target.closest("#kfKind [data-k]");if(k){kind=k.dataset.k;[].forEach.call($("kfKind").children,function(b){b.classList.toggle("on",b===k)})}};
    var f=$("kForm");f.onsubmit=function(ev){ev.preventDefault();var btn=f.querySelector('[type="submit"]');if(btn.disabled)return;
      if(window.IB_WordFilter){var wf=IB_WordFilter.enforce([f.elements.t.value,f.elements.b.value],{userId:st.me&&st.me.id,userLabel:(st.me&&(st.me.user_metadata&&st.me.user_metadata.full_name||st.me.email))||"Anggota",context:"forum_post"});if(!wf.ok){return toast(wf.message)}}
      btn.disabled=true;
      run(sb.rpc("forum_post",{p_city:st.city,p_kind:kind,p_event:f.elements.e.value||null,p_title:f.elements.t.value,p_body:f.elements.b.value}),tr("k_posted"),function(){$("dlg").close();st.kind="semua";setQS({t:""});loadPosts(st.city)}).then(function(ok){if(!ok)btn.disabled=false})};
    $("dlg").showModal()})}

/* ---------- Pasang ---------- */
$("kTabs").onclick=function(ev){var b=ev.target.closest("[data-k]");if(!b)return;st.kind=b.dataset.k;setQS({t:st.kind==="semua"?"":st.kind});tabs();drawPosts()};
$("kList").onclick=function(ev){if(ev.target.closest("[data-new]"))return openForm();var p=ev.target.closest(".kpost");if(p)openPost(p.dataset.id)};
$("kList").onkeydown=function(ev){if(ev.key!=="Enter"&&ev.key!==" ")return;var p=ev.target.closest(".kpost");if(p){ev.preventDefault();openPost(p.dataset.id)}};
$("kNew").onclick=function(){openForm()};$("kFab").onclick=function(){openForm()};
$("kQ").oninput=function(){st.q=this.value.trim();drawPosts()};
$("kFind").oninput=drawCities;
$("kSwitch").onchange=function(){location.href="komunitas?kota="+encodeURIComponent(this.value)};
$("dlg").onclick=function(ev){if(ev.target===this)this.close()};
$("dlg").addEventListener("close",function(){$("dBody").innerHTML="";$("dBody").onclick=null});
sb.auth.getSession().then(function(r){st.me=r.data.session&&r.data.session.user;if(CITY)city(CITY);else home()});
})();
