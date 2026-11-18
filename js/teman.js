/* Cari Teman: ajakan bebas (tanpa event) + ajakan event dalam satu tempat, dengan niche kombinasi dan tingkat jangkauan.
   Tulis lewat RPC di supabase/schema_ajakan_luas.sql (dan schema_ajakan*.sql untuk gabung/keluar/laporan). */
(function(){
var sb=window.sb,tr=window.IB_T||function(k){return k},LOC=tr("locale"),REG=window.IB_REGIONS||{};
var $=function(i){return document.getElementById(i)};
var esc=window.esc||function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var NICHES=[["musik","mic"],["petualangan","mtn"],["olahraga","users"],["kuliner","chat"],["hobi","ticket"],["belajar","note"],["seni","bag"],["sosial","heart"]];
var TAGS={musik:["konser","festival","karaoke","jamsession","kpop"],petualangan:["naikgunung","camping","pantai","roadtrip","sepeda"],
  olahraga:["lari","futsal","badminton","gym","renang"],kuliner:["kulineran","ngopi","nongkrong","masak"],
  hobi:["game","boardgame","fotografi","film","anime"],belajar:["belajarbareng","bahasa","bisnis","karier","coding"],
  seni:["pameran","museum","teater","komedi"],sosial:["relawan","donasi","lingkungan"]};
var NIDS=NICHES.map(function(n){return n[0]});
var CK="gwm_tcity",QS=new URLSearchParams(location.search);
function rd(k,x){try{return localStorage.getItem(k)||x}catch(e){return x}}
function wr(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function ic(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function plus(d,n){var t=new Date(d+"T00:00:00Z");t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)}
function provOf(c){if(!c)return"";for(var p in REG)if(REG[p].indexOf(c)>-1)return p;return""}
function waNum(s){var d=String(s||"").replace(/\D/g,"");if(d.indexOf("00")===0)d=d.slice(2);if(d.charAt(0)==="0")d="62"+d.slice(1);return d}
function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},Math.max(2800,m.length*70))}
function needLogin(){toast(tr("aj_needlogin"));setTimeout(function(){location.href="login"},900)}
function run(p,okMsg,after){return p.then(function(r){if(r.error){toast(r.error.message||tr("aj_err"));return false}if(okMsg)toast(okMsg);if(after)after();return true},function(){toast(tr("aj_err"));return false})}
function dfmt(d){try{return new Date(d+"T00:00:00").toLocaleDateString(LOC,{day:"numeric",month:"short"})}catch(e){return d||""}}
function nlabel(n){return NIDS.indexOf(n)>-1?tr("ct_n_"+n):""}
function tlabel(t){return tr("ct_t_"+t)}

var st={rows:[],me:null,mem:[],con:[],got:{},city:rd(CK,""),mode:"near",niche:[],tag:[],shown:12,focus:QS.get("i")||"",ready:false,nosql:false};
(QS.get("n")||"").split(",").forEach(function(n){if(NIDS.indexOf(n)>-1&&st.niche.indexOf(n)<0)st.niche.push(n)});

/* ---------- aturan jangkauan + urutan ---------- */
function near(i){var c=st.city;if(!c)return true;
  if(i.reach==="online"||i.reach==="nasional")return true;
  if(i.reach==="provinsi")return!!provOf(i.city)&&provOf(i.city)===provOf(c);
  return i.city===c}
function score(i){var s=0,c=st.city;
  if(c){if(i.city===c)s+=30;else if(provOf(i.city)&&provOf(i.city)===provOf(c))s+=15;else if(i.reach==="nasional"||i.reach==="online")s+=8}
  if(st.niche.indexOf(i.niche)>-1)s+=6;
  (i.tags||[]).forEach(function(t){if(st.tag.indexOf(t)>-1)s+=10});
  if(i.status==="open")s+=2;return s}
function list(){
  var L=st.rows.filter(function(i){
    if(st.mode==="near"&&!near(i))return false;
    if(st.niche.length&&st.niche.indexOf(i.niche)<0)return false;
    if(st.tag.length&&!(i.tags||[]).some(function(t){return st.tag.indexOf(t)>-1}))return false;
    return true});
  L.sort(function(a,b){return score(b)-score(a)||((a.when_date||"")<(b.when_date||"")?-1:(a.when_date||"")>(b.when_date||"")?1:0)||(a.created_at<b.created_at?1:-1)});
  return L}

/* ---------- data ---------- */
function load(){return sb.from("invitations_public").select("*").order("created_at",{ascending:false}).limit(300).then(function(r){
  st.rows=r.data||[];st.nosql=st.rows.length>0&&!("reach" in st.rows[0]);st.ready=true},function(){st.ready=true})}
function session(){return sb.auth.getSession().then(function(r){st.me=r.data.session&&r.data.session.user||null},function(){})}
function ensure(ids,cb){if(!st.me){cb();return}
  var need=ids.filter(function(id){return!st.got[id]});if(!need.length){cb();return}
  var m=sb.from("invitation_members").select("invitation_id,user_id,status,message,profiles(nickname)").in("invitation_id",need),
      c=sb.from("invitation_contacts").select("*").in("invitation_id",need);
  Promise.all([m,c]).then(function(x){need.forEach(function(id){st.got[id]=1});
    st.mem=st.mem.filter(function(z){return need.indexOf(z.invitation_id)<0}).concat(x[0].data||[]);
    st.con=st.con.filter(function(z){return need.indexOf(z.invitation_id)<0}).concat(x[1].data||[]);cb()},cb)}
function reload(){st.got={};st.mem=[];st.con=[];return Promise.all([session(),load()]).then(draw)}

/* ---------- kartu ---------- */
function placeTxt(i){return i.reach==="online"?tr("ct_reach_online"):(i.city||"")+(i.reach==="provinsi"?" · "+tr("ct_reach_provinsi"):i.reach==="nasional"?" · "+tr("ct_reach_nasional"):"")}
function badges(i){var h=i.niche?'<span class="tm-b n">'+esc(nlabel(i.niche))+'</span>':"";
  (i.tags||[]).forEach(function(t){h+='<span class="tm-b">'+esc(tlabel(t))+'</span>'});return h}
function card(i){var me=st.me,mine=!!i.is_mine,m=st.mem.filter(function(z){return z.invitation_id===i.id}),
  my=m.filter(function(z){return me&&z.user_id===me.id})[0],wa=st.con.filter(function(c){return c.invitation_id===i.id})[0],a="";
  if(mine)a='<button class="btn ghost sm" data-x="cancel" data-i="'+i.id+'">'+tr("aj_cancel")+'</button>';
  else if(!me)a='<button class="btn sm" data-x="login">'+tr("aj_login")+'</button>';
  else if(!my||my.status==="left")a=i.status==="open"?'<button class="btn sm" data-x="join" data-i="'+i.id+'">'+tr("aj_join")+'</button>':'<span class="meta">'+tr("aj_full")+'</span>';
  else if(my.status==="pending")a='<span class="meta">'+tr("aj_pending")+'</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">'+tr("aj_undo")+'</button>';
  else if(my.status==="approved")a='<span class="meta">'+tr("aj_ok")+'</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">'+tr("aj_leave")+'</button>';
  else a='<span class="meta">'+tr("aj_cant")+'</span>';
  var wl=wa&&(mine||(my&&my.status==="approved"))?'<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(waNum(wa.wa))+'">'+tr("aj_wa")+'</a> ':"";
  var rq=mine?m.filter(function(z){return z.status==="pending"}).map(function(z){
    return'<div class="rq"><b>'+esc(z.profiles&&z.profiles.nickname||tr("aj_user"))+'</b>: '+esc(z.message||tr("aj_nomsg"))+
     ' <button class="btn sm" data-x="ok" data-i="'+i.id+'" data-u="'+z.user_id+'">'+tr("aj_accept")+'</button> <button class="btn ghost sm" data-x="no" data-i="'+i.id+'" data-u="'+z.user_id+'">'+tr("aj_reject")+'</button></div>'}).join(""):"";
  var rep=me&&!mine?' <button class="lnk" data-x="report" data-i="'+i.id+'">'+tr("aj_report")+'</button>':"";
  var host=(i.host_ref?'<a class="lnk" href="profil?u='+encodeURIComponent(i.host_ref)+'">':'')+esc(i.host_name||tr("aj_user"))+(i.host_verified?" ✓":"")+(i.host_ref?'</a>':'');
  var ev=i.event_id&&i.event_title?'<div class="meta">'+ic("ticket")+' <a class="lnk" href="event?e='+encodeURIComponent(i.event_slug||i.event_id)+'">'+esc(i.event_title)+'</a></div>':"";
  return'<div class="aj tm-card'+(st.focus===i.id?' focus':'')+'" id="tm-'+esc(i.id)+'"><div class="tm-bs">'+badges(i)+'</div><b>'+esc(i.title)+'</b>'+ev+
   '<div class="meta">'+ic("pin")+' '+esc(placeTxt(i))+(i.when_date?' · '+ic("cal")+' '+esc(dfmt(i.when_date)):'')+'</div>'+
   '<div class="meta">'+tr("aj_by")+' '+host+' · '+i.filled+'/'+i.capacity+' '+tr("aj_people")+(i.meeting_point?' · '+esc(i.meeting_point):'')+(i.cost_share?' · '+esc(i.cost_share):'')+'</div>'+
   (i.note?'<p>'+esc(i.note)+'</p>':'')+
   '<div class="row">'+wl+a+'<button class="btn line sm" type="button" data-x="share" data-i="'+i.id+'">'+tr("share")+'</button>'+rep+'</div>'+rq+'</div>'}

/* ---------- gambar halaman ---------- */
function cityOpts(sel,allLabel){var h=allLabel?'<option value="">'+esc(allLabel)+'</option>':'<option value="">'+esc(tr("ct_pick"))+'</option>';
  Object.keys(REG).forEach(function(p){h+='<optgroup label="'+esc(window.IB_PROV?IB_PROV(p):p)+'">'+REG[p].map(function(c){return'<option'+(c===sel?' selected':'')+' value="'+esc(c)+'">'+esc(c)+'</option>'}).join("")+'</optgroup>'});return h}
function chips(){
  var box=$("tmNiche");if(!box)return;
  var cnt={};st.rows.forEach(function(i){if(i.niche)cnt[i.niche]=(cnt[i.niche]||0)+1});
  box.innerHTML=NICHES.map(function(n){var on=st.niche.indexOf(n[0])>-1;
    return'<button type="button" class="tm-c" data-n="'+n[0]+'" aria-pressed="'+on+'">'+ic(n[1])+'<span>'+esc(nlabel(n[0]))+'</span>'+(cnt[n[0]]?'<small>'+cnt[n[0]]+'</small>':'')+'</button>'}).join("");
  var tg=$("tmTags"),T=[];st.niche.forEach(function(n){T=T.concat(TAGS[n])});
  st.tag=st.tag.filter(function(t){return T.indexOf(t)>-1});
  tg.hidden=!T.length;
  tg.innerHTML=T.map(function(t){return'<button type="button" class="tm-c sm" data-t="'+t+'" aria-pressed="'+(st.tag.indexOf(t)>-1)+'"><span>'+esc(tlabel(t))+'</span></button>'}).join("");
  $("tmCombo").hidden=st.niche.length<2}
function draw(){
  var box=$("tmList");if(!box)return;
  if(st.nosql){box.innerHTML='<p class="meta">'+esc(tr("ct_nosql"))+'</p>';return}
  chips();
  var L=list(),f=st.focus&&st.rows.filter(function(i){return i.id===st.focus})[0];
  if(f){L=L.filter(function(i){return i.id!==f.id});L.unshift(f)}
  var CAP=48,total=L.length;L=L.slice(0,CAP);
  var vis=L.slice(0,st.shown);
  $("tmCount").textContent=tr("ct_count_h",{n:total});
  ensure(vis.map(function(i){return i.id}),function(){
    var h=vis.length?vis.map(card).join(""):'<p class="meta">'+esc(tr("ct_none"))+'</p>';
    if(L.length>st.shown)h+='<div class="row"><button class="btn line" type="button" data-x="more">'+esc(tr("ct_more"))+'</button></div>';
    if(total>CAP&&st.shown>=L.length)h+='<p class="meta">'+esc(tr("ct_capped",{n:CAP}))+'</p>';
    box.innerHTML=h;
    if(f&&!draw.done){draw.done=1;var el=$("tm-"+f.id);if(el&&el.scrollIntoView)setTimeout(function(){el.scrollIntoView({block:"center"})},60)}})}

/* ---------- dialog kecil ---------- */
function ask(o){return new Promise(function(res){
  var d=document.createElement("dialog");d.className="aqd";
  d.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(o.title||"")+'</h3>'+(o.text?'<p>'+esc(o.text)+'</p>':'')+
   (o.input?'<textarea name="v" rows="3" maxlength="'+(o.input.max||200)+'"'+(o.input.min?' required minlength="'+o.input.min+'"':'')+' placeholder="'+esc(o.input.ph||"")+'"></textarea>':'')+
   '<div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(o.no||tr("aj_no"))+'</button><button class="btn sm" value="ok">'+esc(o.ok||tr("aj_yes"))+'</button></div></form>';
  document.body.appendChild(d);
  d.addEventListener("close",function(){var v=d.querySelector("textarea"),ok=d.returnValue==="ok";res(ok?(v?v.value.trim():true):null);d.remove()});
  d.showModal();var t=d.querySelector("textarea");if(t)t.focus()})}

/* ---------- formulir ajakan bebas ---------- */
function openForm(){
  if(!st.me)return needLogin();
  var t0=today(),d=document.createElement("dialog");d.className="aqd tm-dlg";
  var tg=NICHES.map(function(n){return'<fieldset class="tm-fs"><legend>'+esc(nlabel(n[0]))+'</legend>'+TAGS[n[0]].map(function(t){
    return'<label class="tm-c sm"><input type="checkbox" name="tg" value="'+t+'" data-p="'+n[0]+'"><span>'+esc(tlabel(t))+'</span></label>'}).join("")+'</fieldset>'}).join("");
  var rs=["kota","provinsi","nasional","online"].map(function(r){return'<option value="'+r+'">'+esc(tr("ct_reach_"+r))+'</option>'}).join("");
  d.innerHTML='<form class="aqf tm-form"><h3>'+esc(tr("aj_new").replace(/^\+\s*/,""))+'</h3>'+
   '<label class="f">'+tr("aj_f_title")+'<input name="t" maxlength="80" minlength="5" required placeholder="'+esc(tr("ct_f_title_ph"))+'"></label>'+
   '<label class="f">'+tr("ct_f_niche")+'<select name="n" required><option value="">'+esc(tr("ct_pick"))+'</option>'+NICHES.map(function(n){return'<option value="'+n[0]+'">'+esc(nlabel(n[0]))+'</option>'}).join("")+'</select></label>'+
   '<div class="f"><span>'+tr("ct_f_tags")+'</span><span class="meta">'+esc(tr("ct_f_tags_hint"))+'</span>'+tg+'</div>'+
   '<label class="f">'+tr("ct_reach_h")+'<select name="r">'+rs+'</select><span class="meta" id="tmRh"></span></label>'+
   '<label class="f" id="tmCw">'+tr("ct_f_city")+'<select name="c" required>'+cityOpts(st.city,"")+'</select></label>'+
   '<label class="f">'+tr("ct_f_date")+'<input name="d" type="date" required min="'+t0+'" max="'+plus(t0,60)+'" value="'+t0+'"></label>'+
   '<label class="f">'+tr("aj_f_meet")+'<input name="m" maxlength="100" placeholder="'+esc(tr("aj_f_meet_ph"))+'"></label>'+
   '<div class="g2"><label class="f">'+tr("aj_f_cap")+'<input name="k" type="number" min="2" max="20" value="4" required></label><label class="f">'+tr("aj_f_cost")+'<input name="p" maxlength="60" placeholder="'+esc(tr("aj_f_cost_ph"))+'"></label></div>'+
   '<label class="f">'+tr("aj_f_note")+'<textarea name="o" maxlength="500" placeholder="'+esc(tr("aj_f_note_ph"))+'"></textarea></label>'+
   '<label class="f">'+tr("aj_f_wa")+'<input name="w" inputmode="tel" placeholder="08xxxxxxxxxx" required></label>'+
   '<div class="row"><button class="btn ghost" type="button" data-x="close">'+esc(tr("aj_no"))+'</button><button class="btn" type="submit">'+tr("aj_f_submit")+'</button></div></form>';
  document.body.appendChild(d);
  var fm=d.querySelector("form"),f=fm.elements;
  function reachUi(){var on=f.r.value==="online";$("tmCw").hidden=on;f.c.required=!on;$("tmRh").textContent=tr("ct_rh_"+f.r.value)}
  f.r.onchange=reachUi;reachUi();
  fm.onchange=function(ev){var x=ev.target;if(x.name!=="tg")return;
    var on=[].filter.call(fm.querySelectorAll('input[name="tg"]'),function(c){return c.checked});
    if(on.length>3){x.checked=false;toast(tr("ct_tag_max"));return}
    if(x.checked&&!f.n.value)f.n.value=x.dataset.p};
  d.addEventListener("click",function(ev){if(ev.target===d||ev.target.closest('[data-x="close"]'))d.close()});
  d.addEventListener("close",function(){d.remove()});
  fm.onsubmit=function(ev){ev.preventDefault();var btn=fm.querySelector('[type="submit"]');if(btn.disabled)return;btn.disabled=true;
    var tags=[].filter.call(fm.querySelectorAll('input[name="tg"]'),function(c){return c.checked}).map(function(c){return c.value});
    run(sb.rpc("create_invitation_open",{p_title:f.t.value,p_note:f.o.value,p_meet:f.m.value,p_cost:f.p.value,p_cap:+f.k.value,p_wa:f.w.value,
      p_niche:f.n.value,p_tags:tags,p_reach:f.r.value,p_city:f.r.value==="online"?null:f.c.value,p_date:f.d.value}),tr("aj_posted"),function(){d.close();reload()})
    .then(function(ok){if(!ok)btn.disabled=false})};
  d.showModal()}

/* ---------- aksi di daftar ---------- */
function bind(){
  $("tmNiche").onclick=function(e){var b=e.target.closest("button[data-n]");if(!b)return;var n=b.dataset.n,k=st.niche.indexOf(n);
    if(k>-1)st.niche.splice(k,1);else st.niche.push(n);st.shown=12;draw()};
  $("tmTags").onclick=function(e){var b=e.target.closest("button[data-t]");if(!b)return;var t=b.dataset.t,k=st.tag.indexOf(t);
    if(k>-1)st.tag.splice(k,1);else st.tag.push(t);st.shown=12;draw()};
  var cs=$("tmCity");cs.innerHTML=cityOpts(st.city,tr("ct_city_all"));
  cs.onchange=function(){st.city=cs.value;wr(CK,st.city);st.shown=12;draw()};
  [].forEach.call(document.querySelectorAll("#tmMode button"),function(b){b.onclick=function(){st.mode=b.dataset.m;
    [].forEach.call(document.querySelectorAll("#tmMode button"),function(x){x.setAttribute("aria-pressed",x===b)});st.shown=12;draw()}});
  $("tmNew").onclick=openForm;
  $("tmList").onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;var x=b.dataset.x,i=b.dataset.i;
    if(x==="more"){st.shown+=12;return draw()}
    if(x==="login")return needLogin();
    var again=function(){reload();if(window.IB_AjakanBadge)window.IB_AjakanBadge()};
    if(x==="share"){var ij=st.rows.filter(function(z){return z.id===i})[0];
      if(ij&&window.IB_Share){var u=new URL(location.href);u.search="";u.searchParams.set("i",i);IB_Share.open({title:ij.title,text:tr("aj_share_text",{t:ij.title,e:ij.event_title||nlabel(ij.niche)||"GWM"}),url:u.toString()})}return}
    if(x==="join")return ask({title:tr("aj_msg_h"),input:{ph:tr("aj_msg_ph"),max:200},ok:tr("aj_send")}).then(function(v){if(v===null)return;run(sb.rpc("request_join",{p_inv:i,p_msg:v}),tr("aj_sent"),again)});
    if(x==="ok"||x==="no")return run(sb.rpc("decide_member",{p_inv:i,p_user:b.dataset.u,p_ok:x==="ok"}),null,again);
    if(x==="cancel")return ask({title:tr("aj_cancel"),text:tr("aj_sure_cancel")}).then(function(v){if(v)run(sb.rpc("leave_or_cancel",{p_inv:i}),tr("aj_cancelled"),again)});
    if(x==="leave")return ask({title:tr("aj_leave"),text:tr("aj_sure_leave")}).then(function(v){if(v)run(sb.rpc("leave_or_cancel",{p_inv:i}),tr("aj_left"),again)});
    if(x==="report")return ask({title:tr("aj_report_h"),input:{ph:tr("aj_report_ph"),min:3,max:200},ok:tr("aj_send")}).then(function(v){if(v)run(sb.rpc("report_invitation",{p_inv:i,p_reason:v}),tr("aj_reported"),again)})}}

/* ---------- beranda: ringkas ---------- */
function home(){var box=$("tmHome");if(!box)return;
  Promise.all([session(),load()]).then(function(){
    if(st.nosql)return;
    var cnt={};st.rows.forEach(function(i){if(i.niche)cnt[i.niche]=(cnt[i.niche]||0)+1});
    $("tmHomeChips").innerHTML=NICHES.map(function(n){return'<a class="tm-c" href="teman?n='+n[0]+'">'+ic(n[1])+'<span>'+esc(nlabel(n[0]))+'</span>'+(cnt[n[0]]?'<small>'+cnt[n[0]]+'</small>':'')+'</a>'}).join("");
    st.mode="near";var L=list().slice(0,3);
    $("tmHomeList").innerHTML=L.length?L.map(function(i){return'<a class="tm-mini" href="teman?i='+encodeURIComponent(i.id)+'"><span class="tm-bs">'+badges(i)+'</span><b>'+esc(i.title)+'</b><small>'+esc(placeTxt(i))+(i.when_date?' · '+esc(dfmt(i.when_date)):'')+' · '+i.filled+'/'+i.capacity+'</small></a>'}).join(""):'<p class="meta">'+esc(tr("ct_none_home"))+'</p>';
    box.hidden=false})}

function init(){
  if($("tmHome")){if(sb)home();return}
  if(!$("tmList"))return;
  if(!sb){var m=$("msg");if(m){m.textContent=tr("aj_off");m.hidden=false}return}
  bind();
  Promise.all([session(),load()]).then(draw)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
