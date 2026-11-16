/* Ajukan event / open trip oleh publik. Tulis lewat RPC submit_event (status selalu pending, admin yang menyetujui). */
(function(){
var tr=window.IB_T||function(k){return k};
if(!sb){msg(!window.supabase?tr("a_lib"):!(window.IB_CONFIG&&IB_CONFIG.SUPABASE_URL)?tr("a_cfg"):tr("a_notready"),"err");return}
var kind="konser",me=null,posterUrl="",busy=false;
var CAT={konser:tr("cat_konser"),naikgunung:tr("cat_naikgunung"),pameran:tr("cat_pameran")};
var ST={draft:tr("sj_st_pending"),pending:tr("sj_st_pending"),published:tr("sj_st_published"),rejected:tr("sj_st_rejected")};
var GENRES=["Pop","Rock","Indie","EDM","Hip-hop","Dangdut","Jazz","Festival campuran","Lainnya"];
var v=function(k){return $("a_"+k).value.trim()};
function tdy(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function dirUrl(c,slug){return location.origin+location.pathname.replace(/[^\/]*$/,"")+(c==="naikgunung"?"gunung":"event")+"?e="+encodeURIComponent(slug)}
function fdate(s){try{return new Date(s+"T00:00:00").toLocaleDateString(tr("locale"),{day:"numeric",month:"short",year:"numeric"})}catch(e){return s}}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2600)}
function pv(u){var p=$("pv");p.style.backgroundImage=u?"url('"+u.replace(/'/g,"%27")+"')":"";p.textContent=u?"":tr("sj_drop")}

function setKind(k){kind=k;
  [].forEach.call(document.querySelectorAll("#kind button"),function(b){b.classList.toggle("on",b.dataset.kind===k)});
  [].forEach.call(document.querySelectorAll("[data-for]"),function(f){f.hidden=f.dataset.for!==k});
  var trip=k==="naikgunung";
  $("lStart").textContent=trip?tr("sj_l_depart"):tr("sj_l_start");$("lEnd").textContent=trip?tr("sj_l_return"):tr("sj_l_end");
  $("lVenue").textContent=trip?tr("sj_l_meet"):tr("sj_l_venue");
  $("a_mountain").required=trip;$("a_quota").required=trip}

function fillSelects(){
  $("a_genre").innerHTML='<option value="">'+tr("sj_pick")+'</option>'+GENRES.map(function(g){return'<option>'+esc(g)+'</option>'}).join("");
  $("a_dif").innerHTML='<option value="">'+tr("sj_pick")+'</option>'+["pemula","menengah","sulit"].map(function(d){return'<option value="'+d+'">'+esc(tr("dif_"+d))+'</option>'}).join("");
  loadCities($("a_city"),true);
  $("a_start").min=tdy();$("a_end").min=tdy();
  if(window.IB_MountainBind)IB_MountainBind($("a_mountain"),$("a_alt"))}

/* ---- poster ---- */
function shrink(f){return new Promise(function(res){if(f.size<250*1024)return res(f);var i=new Image();i.onload=function(){var s=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);c.toBlob(function(b){res(b&&b.size<f.size?new File([b],f.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"}):f)},"image/jpeg",.85)};i.onerror=function(){res(f)};i.src=URL.createObjectURL(f)})}
function up(f){if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type))return msg(tr("sj_poster_type"),"err");
  msg(tr("sj_uploading"));
  shrink(f).then(function(g){if(g.size>2*1024*1024)return msg(tr("sj_poster_big"),"err");
    var path=me.user.id+"/"+Date.now()+"-"+g.name.replace(/[^a-zA-Z0-9.]+/g,"-");
    sb.storage.from("posters").upload(path,g,{contentType:g.type}).then(function(r){if(r.error)return msg(r.error.message,"err");
      posterUrl=sb.storage.from("posters").getPublicUrl(path).data.publicUrl;pv(posterUrl);msg(tr("sj_uploaded"),"ok")})})}
$("a_file").onchange=function(){up(this.files[0])};
var dz=$("pv");["dragenter","dragover"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.add("over")})});
["dragleave","drop"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.remove("over")})});
dz.addEventListener("drop",function(e){up(e.dataTransfer.files[0])});

/* ---- kirim ---- */
$("kind").onclick=function(ev){var b=ev.target.closest("button");if(b)setKind(b.dataset.kind)};
$("a_desc").oninput=function(){$("ccDesc").textContent=this.value.length};
$("fSub").addEventListener("keydown",function(ev){if(ev.key==="Enter"&&ev.target.tagName==="INPUT")ev.preventDefault()});
$("fSub").onsubmit=function(ev){ev.preventDefault();if(busy)return;
  if(!$("a_ok").checked)return msg(tr("sj_consent"),"err");
  if(v("end")&&v("end")<v("start"))return msg(tr("sj_end_before"),"err");
  var p={category:kind,title:v("title"),city_id:v("city"),price_label:v("price"),event_date:v("start"),end_date:v("end"),venue:v("venue"),description:v("desc"),
    ticket_url:v("ticket"),source_ig:v("ig"),poster_url:posterUrl};
  if(kind==="konser"){p.genre=v("genre");p.lineup=v("lineup")}
  if(kind==="naikgunung"){p.mountain=v("mountain");p.altitude_mdpl=v("alt");p.difficulty=v("dif");p.duration=v("dur");p.quota=v("quota");p.organizer=v("org");p.contact_wa=v("wa")}
  busy=true;$("a_send").disabled=true;msg(tr("sj_sending"));
  sb.rpc("submit_event",{p:p}).then(function(r){busy=false;$("a_send").disabled=false;
    if(r.error)return msg(r.error.message,"err");
    $("fSub").reset();posterUrl="";pv("");$("ccDesc").textContent="0";setKind("konser");
    msg(tr("sj_submit_ok"),"ok");scrollTo({top:0,behavior:"smooth"});loadMine()})};

/* ---- pengajuan saya ---- */
function itemHtml(s){var e=s.events;if(!e)return"";var bad=e.status==="rejected",ok=e.status==="published";
  return'<div class="it"><div class="th"></div><div class="ib"><b>'+esc(e.title)+'</b>'
   +'<div class="meta">'+esc(CAT[e.category]||e.category)+' · '+esc(e.cities&&e.cities.name||"")+' · '+esc(fdate(e.event_date))+' <span class="badge '+(ok?"pub":"")+'">'+esc(ST[e.status]||e.status)+'</span></div>'
   +(bad?'<div class="meta" style="color:var(--err)">'+esc(tr("sj_reason"))+': '+esc(s.reject_reason||"-")+'</div>':'')
   +'<div class="row" style="margin-top:6px">'
   +(ok?'<a class="btn ghost sm" href="'+esc(dirUrl(e.category,e.slug))+'">'+esc(tr("sj_view"))+'</a><button class="btn ghost sm" type="button" data-a="share" data-id="'+e.id+'">'+esc(tr("share"))+'</button>':'')
   +(bad?'<button class="btn ghost sm" type="button" data-a="reuse" data-id="'+e.id+'">'+esc(tr("sj_reuse"))+'</button>':'')
   +(ok?'':'<button class="btn ghost sm" type="button" data-a="del" data-id="'+e.id+'">'+esc(tr("sj_withdraw"))+'</button>')
   +'</div></div></div>'}
var mine=[];
function loadMine(){return sb.from("event_submissions").select("reject_reason,created_at,events(id,title,slug,category,event_date,status,cities(name))").eq("user_id",me.user.id).order("created_at",{ascending:false}).then(function(r){
  mine=r.data||[];$("mine").innerHTML=mine.length?mine.map(itemHtml).join(""):'<div class="empty">'+esc(tr("sj_none"))+'</div>'})}
$("mine").onclick=function(ev){var b=ev.target.closest("[data-a]");if(!b)return;var id=b.dataset.id,s=mine.filter(function(x){return x.events&&x.events.id===id})[0];if(!s)return;
  if(b.dataset.a==="share"&&window.IB_Share){var e=s.events;return IB_Share.open({title:e.title,text:tr("share_text2",{t:e.title}),url:dirUrl(e.category,e.slug)})}
  if(b.dataset.a==="del"){if(!confirm(tr("sj_sure")))return;return sb.rpc("withdraw_event",{p_id:id}).then(function(r){if(r.error)return msg(r.error.message,"err");toast(tr("sj_withdrawn"));loadMine()})}
  if(b.dataset.a==="reuse")sb.from("events").select("*").eq("id",id).single().then(function(r){var e=r.data;if(!e)return;
    setKind(e.category);var m={title:"title",city_id:"city",price_label:"price",event_date:"start",end_date:"end",venue:"venue",genre:"genre",lineup:"lineup",mountain:"mountain",altitude_mdpl:"alt",difficulty:"dif",duration:"dur",quota:"quota",organizer:"org",description:"desc",ticket_url:"ticket"};
    Object.keys(m).forEach(function(k){$("a_"+m[k]).value=e[k]==null?"":e[k]});
    $("a_ig").value=e.source_ig?"@"+e.source_ig:"";$("a_wa").value=e.contact_wa?"0"+String(e.contact_wa).slice(2):"";
    if(e.event_date<tdy())$("a_start").value="";if(e.end_date&&e.end_date<tdy())$("a_end").value="";
    posterUrl=e.poster_url||"";pv(posterUrl);$("ccDesc").textContent=$("a_desc").value.length;scrollTo({top:0,behavior:"smooth"});msg(tr("sj_reused"),"ok")})};

if($("year"))$("year").textContent=new Date().getFullYear();
getMe().then(function(m){me=m;$("guest").hidden=!!m;$("wrap").hidden=!m;if(!m)return;fillSelects();setKind("konser");loadMine()});
})();
