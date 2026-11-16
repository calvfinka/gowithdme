/* Komunitas per kota: papan kiriman, tautan grup, daftar tunggu. Tulis lewat RPC di supabase/schema_forum.sql */
(function(){
var tr=window.IB_T||function(k){return k};
if(!window.sb){msg(tr("k_off"),"err");return}
var KINDS=["teman","tanya","tips"],st={city:null,kind:"semua",me:null,posts:[]};
var QS=new URLSearchParams(location.search),CITY=QS.get("kota"),POST=QS.get("p"),EVT=QS.get("event");
function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2800)}
function needLogin(){toast(tr("aj_needlogin"));setTimeout(function(){location.href="login"},900)}
function run(p,okMsg,after){return p.then(function(r){if(r.error){toast(r.error.message||tr("k_err"));return false}if(okMsg)toast(okMsg);if(after)after();return true},function(){toast(tr("k_err"));return false})}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function ago(ts){var s=(new Date(ts).getTime()-Date.now())/1000,a=Math.abs(s),r;
  try{r=new Intl.RelativeTimeFormat(tr("locale"),{numeric:"auto"})}catch(e){return""}
  if(a<60)return r.format(0,"second");if(a<3600)return r.format(Math.round(s/60),"minute");
  if(a<86400)return r.format(Math.round(s/3600),"hour");if(a<2592000)return r.format(Math.round(s/86400),"day");
  return r.format(Math.round(s/2592000),"month")}
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

/* ---------- Beranda: daftar kota ---------- */
function home(){
  $("kHome").hidden=false;$("kCity").hidden=true;
  sb.from("forum_city_stats").select("*").order("sort").then(function(r){
    if(r.error||!r.data){$("kCities").innerHTML='<p class="meta">'+esc(tr("k_off"))+'</p>';return}
    var A=r.data.filter(function(c){return c.active});
    $("kCities").innerHTML=A.map(function(c){return'<a class="kcard" href="komunitas?kota='+encodeURIComponent(c.city)+'"><b>'+esc(c.city)+'</b><span>'+esc(tr("k_stats",{p:c.posts,g:c.groups}))+'</span></a>'}).join("");
    var names=A.map(function(c){return c.city}),all=[];
    Object.keys(window.IB_REGIONS||{}).forEach(function(p){IB_REGIONS[p].forEach(function(c){if(names.indexOf(c)<0)all.push(c)})});all.sort();
    var k=$("kSoon");k.hidden=!all.length;
    k.innerHTML='<h3>'+esc(tr("k_soon_h"))+'</h3><p class="meta">'+esc(tr("k_soon_p"))+'</p><div class="krow"><select id="kPick" aria-label="'+esc(tr("k_pick"))+'"><option value="">'+esc(tr("k_pick"))+'</option>'+
      all.map(function(c){return'<option>'+esc(c)+'</option>'}).join("")+'</select><button class="btn sm" id="kNotify" type="button">'+esc(tr("k_notify"))+'</button></div>';
    $("kNotify").onclick=function(){var v=$("kPick").value;if(!v)return;if(!st.me)return needLogin();run(sb.rpc("forum_waitlist_join",{p_city:v,p_on:true}),tr("k_notified"))}})}

/* ---------- Halaman kota ---------- */
function city(name){
  sb.from("forum_city_stats").select("*").eq("city",name).maybeSingle().then(function(r){
    if(!r.data||!r.data.active)return home();
    st.city=name;$("kHome").hidden=true;$("kCity").hidden=false;
    document.title=tr("k_city_h",{c:name})+" — GWM";
    $("kTitle").textContent=tr("k_city_h",{c:name});$("kSub").textContent=tr("k_city_p",{c:name});$("kSafe").textContent=tr("k_safety");
    $("kNew").textContent=st.me?tr("k_new"):tr("k_login_write");
    tabs();loadGroups(name);
    loadPosts(name).then(function(){
      /* tautan dari halaman event: ?p=<id kiriman> membuka kiriman, ?event=<id event> membuka formulir dengan event terpilih */
      if(POST){var id=POST;POST=null;openPost(id)}else if(EVT&&st.me){var ev=EVT;EVT=null;openForm(ev)}})})}
function loadGroups(name){
  sb.from("forum_groups").select("*").eq("city",name).order("created_at").then(function(r){
    var G=(r.data||[]).filter(function(g){return/^https:\/\//.test(g.url)});
    $("kGroups").innerHTML='<h2 class="kh">'+esc(tr("k_groups_h"))+'</h2>'+(G.length?'<div class="kgl">'+G.map(function(g){
      return'<a class="kgroup" href="'+esc(g.url)+'" target="_blank" rel="noopener noreferrer nofollow"><span><b>'+esc(g.name)+'</b><small>'+esc([plat(g.url),tr("k_g_"+g.kind),g.note].filter(Boolean).join(" · "))+'</small></span><em>'+esc(tr("k_group_open"))+'</em></a>'}).join("")+'</div><p class="meta">'+esc(tr("k_groups_note"))+'</p>':'<p class="meta">'+esc(tr("k_no_groups"))+'</p>')})}
function tabs(){$("kTabs").innerHTML=["semua"].concat(KINDS).map(function(k){return'<button type="button" data-k="'+k+'"'+(st.kind===k?' class="on"':'')+'>'+esc(tr("k_tab_"+k))+'</button>'}).join("")}
function loadPosts(name){
  return sb.from("forum_posts_public").select("*").eq("city",name).order("last_activity",{ascending:false}).limit(60).then(function(r){st.posts=r.data||[];drawPosts()})}
function drawPosts(){
  var L=st.posts.filter(function(p){return st.kind==="semua"||p.kind===st.kind});
  $("kList").innerHTML=L.length?L.map(function(p){
    var b=p.body.length>140?p.body.slice(0,140)+"…":p.body;
    return'<div class="kpost" role="button" tabindex="0" data-id="'+esc(p.id)+'"><span class="kk kk-'+p.kind+'">'+esc(tr("k_tab_"+p.kind))+'</span><b>'+esc(p.title)+'</b><p>'+esc(b)+'</p><small>'+esc(tr("k_by"))+' '+esc(p.author_name||tr("k_user"))+(p.author_verified?" ✓":"")+' · '+esc(ago(p.last_activity))+' · '+esc(tr("k_replies",{n:p.reply_count}))+(p.event_title?' · '+esc(p.event_title):'')+'</small></div>'}).join(""):'<p class="meta">'+esc(tr("k_none"))+'</p>'}

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
  var h='<span class="kk kk-'+p.kind+'">'+esc(tr("k_tab_"+p.kind))+'</span><h2>'+esc(p.title)+'</h2><div class="meta">'+esc(tr("k_by"))+' '+esc(p.author_name||tr("k_user"))+(p.author_verified?" ✓":"")+' · '+esc(ago(p.created_at))+'</div>'+
   (p.event_title?'<p class="meta"><a class="lnk" href="event?e='+encodeURIComponent(p.event_slug||p.event_id)+'">'+esc(p.event_title)+'</a></p>':'')+
   '<p class="kbody">'+esc(p.body)+'</p><div class="row">'+act(p.is_mine,"post",p.id)+'</div><h3 class="kh">'+esc(tr("k_replies",{n:R.length}))+'</h3>'+
   (R.length?R.map(function(x){return'<div class="krep"><b>'+esc(x.author_name||tr("k_user"))+(x.author_verified?" ✓":"")+'</b> <small>'+esc(ago(x.created_at))+'</small><p class="kbody">'+esc(x.body)+'</p>'+act(x.is_mine,"reply",x.id)+'</div>'}).join(""):'<p class="meta">'+esc(tr("k_no_replies"))+'</p>')+
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
  var f=$("kRep");if(f)f.onsubmit=function(ev){ev.preventDefault();var btn=f.querySelector('[type="submit"]');if(btn.disabled)return;btn.disabled=true;
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
    var f=$("kForm");f.onsubmit=function(ev){ev.preventDefault();var btn=f.querySelector('[type="submit"]');if(btn.disabled)return;btn.disabled=true;
      run(sb.rpc("forum_post",{p_city:st.city,p_kind:kind,p_event:f.elements.e.value||null,p_title:f.elements.t.value,p_body:f.elements.b.value}),tr("k_posted"),function(){$("dlg").close();st.kind="semua";tabs();loadPosts(st.city)}).then(function(ok){if(!ok)btn.disabled=false})};
    $("dlg").showModal()})}

/* ---------- Pasang ---------- */
$("kTabs").onclick=function(ev){var b=ev.target.closest("[data-k]");if(!b)return;st.kind=b.dataset.k;tabs();drawPosts()};
$("kList").onclick=function(ev){var p=ev.target.closest(".kpost");if(p)openPost(p.dataset.id)};
$("kList").onkeydown=function(ev){if(ev.key!=="Enter"&&ev.key!==" ")return;var p=ev.target.closest(".kpost");if(p){ev.preventDefault();openPost(p.dataset.id)}};
$("kNew").onclick=function(){openForm()};
$("dlg").onclick=function(ev){if(ev.target===this)this.close()};
$("dlg").addEventListener("close",function(){$("dBody").innerHTML="";$("dBody").onclick=null});
sb.auth.getSession().then(function(r){st.me=r.data.session&&r.data.session.user;if(CITY)city(CITY);else home()});
})();
