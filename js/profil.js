/* Profil pengguna + pengunjung terakhir. Data lewat fungsi profile_* (supabase/schema_profil.sql).
   Profil hanya bisa dibuka pengguna yang sudah masuk; membuka profil orang lain tercatat sebagai kunjungan (bisa dimatikan). */
(function(){
var tr=window.IB_T||function(k){return k};
if(!window.sb){msg(tr("a_notready"),"err");return}
var box=$("pfBox"),Q=new URLSearchParams(location.search).get("u"),SAVED=new URLSearchParams(location.search).get("saved")==="1";
function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},Math.max(2800,m.length*60))}
function ago(ts){var s=(new Date(ts).getTime()-Date.now())/1000,a=Math.abs(s),r;
  try{r=new Intl.RelativeTimeFormat(tr("locale"),{numeric:"auto"})}catch(e){return""}
  if(a<60)return r.format(0,"second");if(a<3600)return r.format(Math.round(s/60),"minute");
  if(a<86400)return r.format(Math.round(s/3600),"hour");return r.format(Math.round(s/86400),"day")}
function avatar(p,cls){var n=(p.nickname||"?").charAt(0).toUpperCase(),u=p.avatar_url;
  return'<span class="'+cls+'" aria-hidden="true"'+(u?' style="background:center/cover url(\''+esc(u).replace(/\'/g,"%27")+'\')"':"")+'>'+(u?"":esc(n))+'</span>'}
function nameOf(p){return p.nickname||tr("k_user")}
function need(){box.innerHTML='<div class="card"><p>'+esc(tr("pf_need"))+'</p><a class="btn" href="login?next='+encodeURIComponent("profil"+location.search)+'">'+esc(tr("pf_login"))+'</a></div>'}
function fail(r){box.innerHTML="";msg(/profile_view|schema cache|does not exist/i.test(r&&r.message||"")?tr("pf_sql"):tr("pf_err"),"err")}

function drawVisitors(d,V,logOn){
  var mine=d.mine,h='<h2 class="kh">'+esc(tr("pf_vh"))+'</h2>';
  if(mine||d.show_visitors){
    h+=V.length?'<div class="pvl">'+V.map(function(v){return'<a class="pv" href="profil?u='+encodeURIComponent(v.id)+'">'+avatar(v,"pav")+'<span><b>'+esc(nameOf(v))+(v.verified?" ✓":"")+'</b><small>'+esc(ago(v.visited_at))+'</small></span></a>'}).join("")+'</div>':'<p class="meta">'+esc(tr("pf_vnone"))+'</p>'}
  h+='<p class="meta">'+esc(mine?tr("pf_vnote_mine"):!logOn?tr("pf_vnote_off"):d.show_visitors?tr("pf_vnote_other"):tr("pf_vnote_hidden"))+'</p>';
  if(mine)h+='<div class="row"><button class="btn ghost sm" data-x="clear" type="button">'+esc(tr("pf_clear"))+'</button></div>';
  else if(logOn)h+='<div class="row"><button class="btn ghost sm" data-x="nolog" type="button">'+esc(tr("pf_nolog"))+'</button></div>';
  return h}

function draw(d,V,logOn){
  var st=d.stats||{},h='<div class="card pfc"><div class="pfh">'+avatar(d,"pavb")+'<div><h1>'+esc(nameOf(d))+'</h1>'+
    '<div class="meta">'+esc(tr("pf_since",{d:new Intl.DateTimeFormat(tr("locale"),{month:"long",year:"numeric"}).format(new Date(d.joined))}))+(d.city?' · '+esc(d.city):'')+'</div>'+
    (d.verified?'<span class="badge ok">✓</span> ':'')+(d.mine?'<span class="badge">'+esc(tr("pf_you"))+'</span>':'')+'</div></div>';
  if(!d.mine&&!d.is_public)h+='<p class="meta">'+esc(tr("pf_private"))+'</p></div>';
  else{
    h+='<p class="kbody">'+(d.bio?esc(d.bio):'<span class="meta">'+esc(tr("pf_nobio"))+'</span>')+'</p>';
    if((d.interests||[]).length)h+='<div class="chips">'+d.interests.map(function(k){return'<span class="chip on">'+esc(tr("it_"+k))+'</span>'}).join("")+'</div>';
    if(d.level)h+='<p class="meta">'+esc(tr("pf_level",{l:tr("lv_"+d.level)}))+'</p>';
    h+='<div class="st"><div><b>'+(st.posts||0)+'</b>'+esc(tr("pf_s1"))+'</div><div><b>'+(st.joined||0)+'</b>'+esc(tr("pf_s2"))+'</div><div><b>'+(st.hosted||0)+'</b>'+esc(tr("pf_s3"))+'</div></div>';
    if(d.mine)h+='<div class="row"><a class="btn sm" href="login?next=profil">'+esc(tr("pf_edit"))+'</a></div>';
    h+='</div><div class="card pfc">'+drawVisitors(d,V,logOn)+'</div>'}
  box.innerHTML=h;
  box.onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;
    if(b.dataset.x==="clear"){if(!confirm(tr("pf_sure_clear")))return;sb.rpc("profile_visitors_clear").then(function(r){if(r.error)return toast(r.error.message);toast(tr("pf_cleared"));load()})}
    if(b.dataset.x==="nolog")sb.rpc("profile_log_visits",{p_on:false}).then(function(r){if(r.error)return toast(r.error.message);toast(tr("pf_nolog_ok"));load(true)})}}

/* skipView: tidak membuka ulang lewat profile_view (agar tidak mencatat kunjungan lagi) */
function load(skipView){
  sb.auth.getSession().then(function(s){
    var me=s.data.session&&s.data.session.user;if(!me)return need();
    var id=Q||me.id;
    Promise.all([sb.rpc("profile_view",{p_id:id}),sb.from("profile_extra").select("log_visits").eq("user_id",me.id).maybeSingle()]).then(function(x){
      var r=x[0];if(r.error)return fail(r.error);if(!r.data){box.innerHTML="";return msg(tr("pf_nf"),"err")}
      var d=r.data,logOn=!(x[1].data&&x[1].data.log_visits===false);
      /* profile_view mencatat kunjungan sebelum daftar dibaca, jadi pengunjung langsung terlihat di daftar */
      sb.rpc("profile_visitors",{p_id:id}).then(function(v){draw(d,v.data||[],logOn);
        if(SAVED){SAVED=false;toast(tr("pf_saved"));try{history.replaceState(null,"",location.pathname+(Q?"?u="+encodeURIComponent(Q):""))}catch(e){}}})})})}
load();
})();
