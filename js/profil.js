/* Dasbor profil pengguna bergaya sosial modern: Event Mendatang, Favorit Tersimpan, Aktivitas Komunitas, Lencana, dan Pengunjung Terakhir. */
(function(){
var tr=window.IB_T||function(k){return k},WF=window.IB_WordFilter,PC=window.IB_ProfileCore;
if(!window.sb){msg(tr("a_notready"),"err");return}
var box=$("pfBox"),Q=new URLSearchParams(location.search).get("u"),SAVED=new URLSearchParams(location.search).get("saved")==="1";
var LOC=tr("locale")||"id-ID",MON=(tr("mon")||"Jan,Feb,Mar,Apr,Mei,Jun,Jul,Agu,Sep,Okt,Nov,Des").split(",");
var GRAD={konser:["#134e4a","#0e5a46"],naikgunung:["#14532d","#0f766e"],pameran:["#9a3412","#d97706"],festival:["#7c2d12","#e4501a"],komedi:["#0f766e","#0284c7"],seminar:["#1e3a8a","#2563eb"],meetup:["#3f3f46","#0e5a46"],lainnya:["#334155","#475569"]};

var state={
  d:null,
  visitors:[],
  logOn:true,
  unread:0,
  tab:"all",
  q:"",
  events:[],
  savedEvents:[],
  upcoming:[],
  activities:[]
};

function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},Math.max(2800,m.length*60))}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function ago(ts){
  if(!ts)return"";
  var s=(new Date(ts).getTime()-Date.now())/1000,a=Math.abs(s),r;
  try{r=new Intl.RelativeTimeFormat(LOC,{numeric:"auto"})}catch(e){return""}
  if(a<60)return r.format(0,"second");if(a<3600)return r.format(Math.round(s/60),"minute");
  if(a<86400)return r.format(Math.round(s/3600),"hour");return r.format(Math.round(s/86400),"day");
}
function dateParts(s){
  if(!s)return{d:"--",m:""};
  var d=new Date(String(s).slice(0,10)+"T00:00:00");
  if(isNaN(d.getTime()))return{d:"--",m:""};
  return{d:("0"+d.getDate()).slice(-2),m:(MON[d.getMonth()]||"").toUpperCase()};
}
function fmtDate(s){
  if(!s)return"";
  try{return new Date(String(s).slice(0,10)+"T00:00:00").toLocaleDateString(LOC,{day:"numeric",month:"short",year:"numeric"})}catch(e){return s}
}
function catLabel(c){
  var k="cat_"+c,v=tr(k);
  if(v&&v!==k)return v.replace(/^[^\w\s]+\s*/,"");
  return PC?PC.interestLabel(c):String(c||"Event");
}
function purl(u){u=String(u||"");return/^(https?:|data:|\/\/)/.test(u)?u:"../"+u.replace(/^\//,"")}
function avatar(p,cls){
  var n=(p.nickname||"?").charAt(0).toUpperCase(),u=p.avatar_url;
  return'<span class="'+cls+'" aria-hidden="true"'+(u?' style="background:center/cover url(\''+esc(u).replace(/\'/g,"%27")+'\')"':"")+'>'+(u?"":esc(n))+'</span>';
}
function nameOf(p){return p.nickname||tr("k_user")}
function handleOf(p){return"@"+String(nameOf(p)).toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18)||"@gwm"}
function shortId(id){return PC?PC.shortUid(id):(WF?WF.shortUid(id):("ID-"+String(id||"").replace(/-/g,"").slice(0,8).toUpperCase()))}
function need(){box.innerHTML='<div class="card pf-login-gate"><h3>'+esc(tr("pf_title").replace(/\s*—.*/,""))+'</h3><p class="meta">'+esc(tr("pf_need"))+'</p><div class="row" style="margin-top:12px"><a class="btn pri" href="login?next='+encodeURIComponent("profil"+location.search)+'">'+esc(tr("pf_login"))+'</a></div></div>'}
function fail(r){box.innerHTML="";msg(/profile_view|schema cache|does not exist/i.test(r&&r.message||"")?tr("pf_sql"):tr("pf_err"),"err")}

function readSavedIds(){
  try{var a=JSON.parse(localStorage.getItem("ib_saved")||"[]");return Array.isArray(a)?a.map(String):[]}catch(e){return[]}
}
function writeSavedIds(ids){
  try{localStorage.setItem("ib_saved",JSON.stringify(ids))}catch(e){}
}

function interestLabel(k){return PC?PC.interestLabel(k,tr):String(k||"")}

function buildBadges(d,st){
  var list=[];
  if(d.verified)list.push({cls:"ok",ic:"✓",txt:tr("pf_b_verified")});
  if(d.role==="admin")list.push({cls:"adm",ic:"★",txt:tr("pf_b_admin")});
  if((st.hosted||0)>0)list.push({cls:"brand",ic:"◆",txt:tr("pf_b_host")});
  if((st.posts||0)>0)list.push({cls:"brand",ic:"▸",txt:tr("pf_b_comm")});
  if((st.joined||0)>0)list.push({cls:"neutral",ic:"●",txt:tr("pf_b_buddy")});
  if(d.level)list.push({cls:"neutral",ic:"▲",txt:tr("pf_b_hiker")+" · "+tr("lv_"+d.level)});
  if(!list.length)list.push({cls:"neutral",ic:"●",txt:tr("pf_b_member")});
  return list.map(function(b){return'<span class="pf-b '+b.cls+'"><i>'+b.ic+'</i>'+esc(b.txt)+'</span>'}).join("");
}

function drawVisitors(d,V,logOn){
  var mine=d.mine,h='<div class="pf-card-hd"><h2>'+esc(tr("pf_vh"))+'</h2></div>';
  if(mine||d.show_visitors){
    h+=V.length?'<div class="pvl">'+V.map(function(v){
      return'<a class="pv" href="profil?u='+encodeURIComponent(v.id)+'">'+avatar(v,"pav")+'<span><b>'+esc(nameOf(v))+(v.verified?' <i class="pf-ck" aria-label="Verified">✓</i>':"")+'</b><small>'+esc(ago(v.visited_at))+'</small></span><small class="mono pf-vid">'+esc(shortId(v.id))+'</small></a>';
    }).join("")+'</div>':'<p class="meta">'+esc(tr("pf_vnone"))+'</p>';
  }
  h+='<p class="meta" style="margin-top:8px">'+esc(mine?tr("pf_vnote_mine"):!logOn?tr("pf_vnote_off"):d.show_visitors?tr("pf_vnote_other"):tr("pf_vnote_hidden"))+'</p>';
  if(mine)h+='<div class="row"><button class="btn ghost sm" data-x="clear" type="button">'+esc(tr("pf_clear"))+'</button></div>';
  else if(logOn)h+='<div class="row"><button class="btn ghost sm" data-x="nolog" type="button">'+esc(tr("pf_nolog"))+'</button></div>';
  return h;
}

function renderUpcomingSection(items,limit){
  var hasQ=!!state.q.trim(),shown=limit?items.slice(0,limit):items;
  var head='<div class="pf-sec-head"><div><h2>'+esc(tr("pf_upcoming_h"))+'</h2><p class="meta">'+esc(tr("pf_upcoming_sub"))+'</p></div>'
    +(limit&&items.length>limit?'<button class="lnk" type="button" data-tab="upcoming">'+esc(tr("pf_view_all"))+' ('+items.length+') →</button>':"")
    +'</div>';
  if(!items.length){
    return head+'<div class="pf-empty"><p class="meta">'+esc(hasQ?tr("pf_no_match"):tr("pf_upcoming_empty"))+'</p>'
      +(!hasQ?'<div class="row"><a class="btn ghost sm" href="event">'+esc(tr("pf_upcoming_cta"))+'</a><a class="btn ghost sm" href="teman">'+esc(tr("nv_a_invite"))+'</a></div>':"")
      +'</div>';
  }
  return head+'<div class="pf-up-list">'+shown.map(function(item){
    var dp=dateParts(item.date),rel=item.relation==="host"?tr("pf_role_host"):item.relation==="joined"?tr("pf_role_joined"):tr("pf_role_saved");
    var meta=[item.city,catLabel(item.category),rel].filter(Boolean).join(" · ");
    return'<a class="pf-up-row" href="'+esc(item.href)+'">'
      +'<div class="pf-date-box" aria-hidden="true"><b class="mono">'+esc(dp.d)+'</b><span>'+esc(dp.m)+'</span></div>'
      +'<div class="pf-up-body"><b>'+esc(item.title)+'</b>'
      +(item.subtitle?'<div class="pf-up-sub">'+esc(item.subtitle)+'</div>':"")
      +'<div class="pf-meta-sep">'+esc(meta)+(item.venue?' · '+esc(item.venue):"")+'</div>'
      +'</div>'
      +'<span class="pf-row-cta">'+esc(tr("pf_open"))+' →</span>'
      +'</a>';
  }).join("")+'</div>';
}

function renderSavedSection(items,limit){
  var hasQ=!!state.q.trim(),shown=limit?items.slice(0,limit):items;
  var head='<div class="pf-sec-head"><div><h2>'+esc(tr("pf_saved_h"))+'</h2><p class="meta">'+esc(tr("pf_saved_sub"))+'</p></div>'
    +(limit&&items.length>limit?'<button class="lnk" type="button" data-tab="saved">'+esc(tr("pf_view_all"))+' ('+items.length+') →</button>':"")
    +'</div>';
  if(!items.length){
    return head+'<div class="pf-empty"><p class="meta">'+esc(hasQ?tr("pf_no_match"):tr("pf_saved_empty"))+'</p>'
      +(!hasQ?'<div class="row"><a class="btn ghost sm" href="event">'+esc(tr("pf_saved_cta"))+'</a></div>':"")
      +'</div>';
  }
  return head+'<div class="pf-fav-grid">'+shown.map(function(ev){
    var g=GRAD[ev.category]||GRAD.lainnya,bg="linear-gradient(155deg,"+g[0]+","+g[1]+")";
    var thumbStyle="background:"+bg;
    var imgHtml=ev.poster_url?'<img src="'+esc(purl(ev.poster_url))+'" alt="'+esc(ev.title)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'
      :'<svg class="pf-fav-svg" aria-hidden="true"><use href="#'+(ev.category==="naikgunung"?"ridge":"bars")+'"/></svg>';
    var evHref=ev.slug?("e/"+encodeURIComponent(ev.slug)):("event?q="+encodeURIComponent(ev.title||""));
    var cityName=ev.city||(ev.cities&&ev.cities.name)||"";
    var meta=[fmtDate(ev.event_date),cityName,catLabel(ev.category),ev.price_label].filter(Boolean).join(" · ");
    var keyId=String(ev.id||ev.slug||"");
    return'<div class="pf-fav-card">'
      +'<a class="pf-fav-thumb" href="'+esc(evHref)+'" style="'+thumbStyle+'">'+imgHtml+'</a>'
      +'<div class="pf-fav-body">'
        +'<a class="pf-fav-ttl" href="'+esc(evHref)+'">'+esc(ev.title)+'</a>'
        +'<div class="pf-meta-sep">'+esc(meta)+'</div>'
        +'<div class="pf-fav-actions">'
          +'<a class="lnk" href="'+esc(evHref)+'">'+esc(tr("pf_open"))+' →</a>'
          +'<button class="btn ghost sm" type="button" data-unsave="'+esc(keyId)+'" aria-label="'+esc(tr("pf_remove")+" "+ev.title)+'">'+esc(tr("pf_remove"))+'</button>'
        +'</div>'
      +'</div>'
      +'</div>';
  }).join("")+'</div>';
}

function renderActivitySection(items,limit){
  var hasQ=!!state.q.trim(),shown=limit?items.slice(0,limit):items;
  var head='<div class="pf-sec-head"><div><h2>'+esc(tr("pf_activity_h"))+'</h2><p class="meta">'+esc(tr("pf_activity_sub"))+'</p></div>'
    +(limit&&items.length>limit?'<button class="lnk" type="button" data-tab="activity">'+esc(tr("pf_view_all"))+' ('+items.length+') →</button>':"")
    +'</div>';
  if(!items.length){
    return head+'<div class="pf-empty"><p class="meta">'+esc(hasQ?tr("pf_no_match"):tr("pf_activity_empty"))+'</p>'
      +(!hasQ?'<div class="row"><a class="btn ghost sm" href="komunitas">'+esc(tr("pf_activity_cta"))+'</a><a class="btn ghost sm" href="teman">'+esc(tr("nv_a_invite"))+'</a></div>':"")
      +'</div>';
  }
  return head+'<div class="pf-act-list">'+shown.map(function(act){
    var typeLbl=act.type==="forum"?tr("pf_act_forum"):tr("pf_act_invite");
    var statLbl=act.type==="forum"?tr("pf_replies_n",{n:act.count}):tr("pf_slots_n",{f:act.filled,c:act.capacity});
    var meta=[typeLbl,act.city,statLbl,ago(act.createdAt)].filter(Boolean).join(" · ");
    return'<a class="pf-act-row" href="'+esc(act.href)+'">'
      +'<div class="pf-act-main">'
        +'<div class="pf-act-kicker">'+esc(meta)+'</div>'
        +'<b>'+esc(act.title)+'</b>'
        +(act.excerpt?'<p class="pf-act-ex">'+esc(act.excerpt)+'</p>':"")
      +'</div>'
      +'<span class="pf-row-cta">'+esc(tr("pf_open"))+' →</span>'
      +'</a>';
  }).join("")+'</div>';
}

function updateMainSections(){
  var q=state.q;
  var up=PC?PC.filterDashboardItems(state.upcoming,q):state.upcoming;
  var sv=PC?PC.filterDashboardItems(state.savedEvents,q):state.savedEvents;
  var ac=PC?PC.filterDashboardItems(state.activities,q):state.activities;
  var body=$("pfDashSections");
  if(!body)return;
  var d=state.d,isAll=state.tab==="all",lim=isAll?4:0,out="";
  if(isAll||state.tab==="upcoming")out+='<section class="card pf-dash-card" id="pfSecUpcoming">'+renderUpcomingSection(up,lim)+'</section>';
  if(d.mine&&(isAll||state.tab==="saved"))out+='<section class="card pf-dash-card" id="pfSecSaved">'+renderSavedSection(sv,lim)+'</section>';
  if(isAll||state.tab==="activity")out+='<section class="card pf-dash-card" id="pfSecActivity">'+renderActivitySection(ac,lim)+'</section>';
  body.innerHTML=out;

  var kUp=$("pfKpiUp"),kSv=$("pfKpiSv"),cUp=$("pfTcUp"),cSv=$("pfTcSv"),cAc=$("pfTcAc");
  if(cUp)cUp.textContent=state.upcoming.length;if(cSv)cSv.textContent=state.savedEvents.length;if(cAc)cAc.textContent=state.activities.length;
  if(kUp)kUp.textContent=state.upcoming.length;
  if(kSv)kSv.textContent=state.savedEvents.length;
  [].forEach.call(document.querySelectorAll(".pf-tabs [data-tab]"),function(b){
    b.classList.toggle("on",b.dataset.tab===state.tab);b.setAttribute("aria-selected",b.dataset.tab===state.tab?"true":"false");
  });
}

function draw(){
  var d=state.d,V=state.visitors,logOn=state.logOn,unread=state.unread;
  var st=d.stats||{},uid=shortId(d.id),joinedStr=new Intl.DateTimeFormat(LOC,{month:"long",year:"numeric"}).format(new Date(d.joined||Date.now()));
  var inboxLabel=esc(tr("pf_inbox"))+(unread>0?' <span class="pf-mbadge" aria-label="'+esc(tr("pf_msg_unread",{n:unread}))+'">'+(unread>99?"99+":unread)+'</span>':"");
  var h='<article class="card pf-hero-card">';
  h+='<div class="pf-cover" aria-hidden="true"><svg class="pf-cover-art" viewBox="0 0 100 100" preserveAspectRatio="none"><use href="#ridge"/></svg>';
  if(d.mine)h+='<span class="pf-cover-tag">'+esc(tr("pf_you"))+'</span>';
  h+='</div>';
  h+='<div class="pf-head-wrap">';
  h+='<div class="pf-top-row">';
  h+='<div class="pf-av-ring">'+avatar(d,"pavb pf-av")+(d.verified?'<span class="pf-vdot" title="'+esc(tr("pf_b_verified"))+'">✓</span>':"")+'</div>';
  h+='<div class="pf-actions">';
  if(d.mine){
    h+='<a class="btn pri sm" href="login?next=profil">'+esc(tr("pf_edit"))+'</a>';
    h+='<a class="btn line sm pf-msg-btn" href="pesan"><svg class="i" aria-hidden="true"><use href="#i-mail"/></svg><span>'+inboxLabel+'</span></a>';
    h+='<a class="btn ghost sm" href="ajukan">'+esc(tr("pf_submit_ev"))+'</a>';
  }else if(Q){
    h+='<a class="btn pri sm pf-msg-btn" href="pesan?u='+encodeURIComponent(Q)+'"><svg class="i" aria-hidden="true"><use href="#i-mail"/></svg><span>'+esc(tr("ms_send"))+'</span></a>';
    h+='<a class="btn ghost sm" href="teman">'+esc(tr("nv_a_invite"))+'</a>';
  }
  h+='<button class="btn ghost sm" data-x="share" data-pid="'+esc(d.id||"")+'" type="button">'+esc(tr("pf_share"))+'</button>';
  h+='<button class="btn ghost sm" data-x="copyid" data-uid="'+esc(uid)+'" type="button">'+esc(tr("pf_copy_uid"))+'</button>';
  h+='</div></div>';

  function capFirst(s){s=String(s||"");return s?s.charAt(0).toUpperCase()+s.slice(1):""}
  var metaLine=[d.city,tr("pf_since",{d:joinedStr}),d.level?tr("pf_level",{l:tr("lv_"+d.level)}):""].filter(Boolean).join(" · ");
  h+='<div class="pf-identity">';
  h+='<h1>'+esc(nameOf(d))+(d.verified?' <span class="pf-ck" title="'+esc(tr("pf_b_verified"))+'">✓</span>':"")+'</h1>';
  h+='<div class="pf-sub-id"><span class="pf-handle">'+esc(handleOf(d))+'</span><span class="pf-dot">·</span><code class="uid-tag mono" title="'+esc(tr("pf_uid_lbl"))+'">'+esc(uid)+'</code></div>';
  h+='<div class="pf-meta-line">'+esc(metaLine)+'</div>';
  h+='</div>';

  if(!d.mine&&!d.is_public){
    h+='<p class="meta pf-private-box">'+esc(tr("pf_private"))+'</p>';
    h+='</div></article>';
  }else{
    h+='</div></article>';
    h+='<div class="pf-dash-grid">';

    /* Left Profile Rail */
    h+='<aside class="pf-rail">';
    h+='<section class="card pf-rail-card">'
      +'<div class="pf-card-hd"><h2>'+esc(tr("pf_about_h"))+'</h2></div>'
      +'<p class="pf-bio">'+(d.bio?esc(d.bio):'<span class="meta">'+esc(tr("pf_nobio"))+'</span>')+'</p>'
      +'<div class="pf-section"><h2>'+esc(tr("pf_badges_h"))+'</h2><div class="pf-badges">'+buildBadges(d,st)+'</div></div>'
      +'<div class="pf-section"><h2>'+esc(tr("pf_int_h"))+'</h2>'
      +((d.interests||[]).length?'<div class="chips">'+d.interests.map(function(k){return'<span class="chip on">'+esc(interestLabel(k))+'</span>'}).join("")+'</div>':'<p class="meta">'+esc(tr("pf_no_int"))+'</p>')
      +'</div>'
      +'<div class="pf-safe-foot"><svg class="i" aria-hidden="true"><use href="#i-users"/></svg><span>'+esc(tr("pf_safe_note"))+'</span></div>'
      +'</section>';
    h+='<section class="card pf-rail-card">'+drawVisitors(d,V,logOn)+'</section>';
    h+='</aside>';

    /* Right Dashboard Workspace */
    h+='<div class="pf-main">';
    h+='<div class="pf-kpi-row">'
      +'<div class="pf-kpi"><span class="pf-kpi-lbl">'+esc(capFirst(tr("pf_kpi_up")))+'</span><b class="mono" id="pfKpiUp">'+state.upcoming.length+'</b></div>'
      +(d.mine
        ?'<div class="pf-kpi"><span class="pf-kpi-lbl">'+esc(capFirst(tr("pf_kpi_sv")))+'</span><b class="mono" id="pfKpiSv">'+state.savedEvents.length+'</b></div>'
        :'<div class="pf-kpi"><span class="pf-kpi-lbl">'+esc(capFirst(tr("pf_s3")))+'</span><b class="mono">'+(st.hosted||0)+'</b></div>')
      +'<div class="pf-kpi"><span class="pf-kpi-lbl">'+esc(capFirst(tr("pf_s1")))+'</span><b class="mono">'+(st.posts||0)+'</b></div>'
      +'<div class="pf-kpi"><span class="pf-kpi-lbl">'+esc(capFirst(tr("pf_s2")))+'</span><b class="mono">'+(st.joined||0)+'</b></div>'
      +'</div>';

    h+='<div class="pf-dash-bar">'
      +'<div class="pf-tabs" role="tablist" aria-label="Profile dashboard sections">'
      +'<button type="button" class="pf-tab on" role="tab" data-tab="all">'+esc(tr("pf_tab_all"))+'</button>'
      +'<button type="button" class="pf-tab" role="tab" data-tab="upcoming">'+esc(tr("pf_tab_upcoming"))+' <span class="pf-tc" id="pfTcUp">0</span></button>'
      +(d.mine?'<button type="button" class="pf-tab" role="tab" data-tab="saved">'+esc(tr("pf_tab_saved"))+' <span class="pf-tc" id="pfTcSv">0</span></button>':"")
      +'<button type="button" class="pf-tab" role="tab" data-tab="activity">'+esc(tr("pf_tab_activity"))+' <span class="pf-tc" id="pfTcAc">0</span></button>'
      +'</div>'
      +'<input id="pfFilterQ" class="pf-search" type="search" value="'+esc(state.q)+'" placeholder="'+esc(tr("pf_search_ph"))+'" aria-label="'+esc(tr("pf_search_ph"))+'">'
      +'</div>';

    h+='<div id="pfDashSections" class="pf-sections"></div>';
    h+='</div></div>';
  }

  box.innerHTML=h;
  if(d.mine||d.is_public)updateMainSections();

  function askConfirm(title,text){
    return new Promise(function(res){
      var dlg=document.createElement("dialog");dlg.className="aqd";
      dlg.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(title||"")+'</h3><p>'+esc(text||"")+'</p><div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(tr("k_cancel")||"Batal")+'</button><button class="btn pri sm" value="ok">'+esc(tr("k_yes")||"Ya")+'</button></div></form>';
      document.body.appendChild(dlg);
      dlg.addEventListener("close",function(){res(dlg.returnValue==="ok");dlg.remove()});
      dlg.showModal();
    });
  }

  var srch=$("pfFilterQ");
  if(srch){
    srch.addEventListener("input",function(){
      state.q=this.value;
      updateMainSections();
    });
  }

  box.onclick=function(ev){
    var tabBtn=ev.target.closest("[data-tab]");
    if(tabBtn){
      state.tab=tabBtn.dataset.tab;
      updateMainSections();
      var bar=document.querySelector(".pf-dash-bar");
      if(bar&&bar.getBoundingClientRect().top<0&&bar.scrollIntoView)bar.scrollIntoView({block:"start"});
      return;
    }
    var unsaveBtn=ev.target.closest("[data-unsave]");
    if(unsaveBtn){
      var rmId=unsaveBtn.dataset.unsave;
      var matched=state.savedEvents.filter(function(e){return String(e.id||e.slug||"")===rmId})[0];
      var ids=readSavedIds().filter(function(x){
        if(x===rmId)return false;
        if(matched&&(x===String(matched.id)||x===String(matched.slug)))return false;
        return true;
      });
      writeSavedIds(ids);
      state.savedEvents=PC?PC.resolveSavedFavorites({savedIds:ids,events:state.events}):[];
      state.upcoming=PC?PC.buildUpcomingEvents({
        today:today(),
        events:state.events,
        savedEvents:state.savedEvents,
        hostedInvites:state.hostedInvites,
        joinedInvites:state.joinedInvites
      }):[];
      updateMainSections();
      toast(tr("pf_removed"));
      return;
    }
    var b=ev.target.closest("[data-x]");if(!b)return;
    if(b.dataset.x==="share"){
      var link=location.origin+location.pathname+"?u="+encodeURIComponent(b.dataset.pid||"");
      if(navigator.share){navigator.share({title:nameOf(d),url:link}).catch(function(){});return}
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(link).then(function(){toast(tr("pf_share_ok"))},function(){toast(link)})}else{toast(link)}
      return;
    }
    if(b.dataset.x==="copyid"){
      var val=b.dataset.uid||"";
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(val).then(function(){toast(tr("pf_uid_copied")+": "+val)},function(){toast(val)});
      }else{toast(val)}
      return;
    }
    if(b.dataset.x==="clear"){
      askConfirm(tr("pf_clear"),tr("pf_sure_clear")).then(function(ok){
        if(!ok)return;
        sb.rpc("profile_visitors_clear").then(function(r){if(r.error)return toast(r.error.message);toast(tr("pf_cleared"));load(true)});
      });
    }
    if(b.dataset.x==="nolog"){
      sb.rpc("profile_log_visits",{p_on:false}).then(function(r){if(r.error)return toast(r.error.message);toast(tr("pf_nolog_ok"));load(true)});
    }
  };
}

function loadStaticEvents(){
  return fetch("../data/events.json").then(function(r){return r.ok?r.json():[]},function(){return[]});
}

function safeQ(p){return Promise.resolve(p).then(function(r){return(r&&!r.error&&r.data)?r.data:[]},function(){return[]})}

function load(){
  sb.auth.getSession().then(function(s){
    var me=s.data.session&&s.data.session.user;if(!me)return need();
    var id=Q||me.id,isMine=id===me.id;
    var unreadQ=isMine?sb.rpc("chat_unread").then(function(r){return r},function(){return{data:0}}):Promise.resolve({data:0});
    Promise.all([
      sb.rpc("profile_view",{p_id:id}),
      sb.from("profile_extra").select("log_visits").eq("user_id",me.id).maybeSingle(),
      unreadQ
    ]).then(function(x){
      var r=x[0];if(r.error)return fail(r.error);if(!r.data){box.innerHTML="";return msg(tr("pf_nf"),"err")}
      var d=r.data,logOn=!(x[1].data&&x[1].data.log_visits===false),unread=+(x[2]&&x[2].data)||0;
      var td=today();
      var pVis=safeQ(sb.rpc("profile_visitors",{p_id:id}));
      var pEv=safeQ(sb.from("events").select("id,slug,title,category,city_id,venue,event_date,end_date,price_label,poster_url,cities(name)").eq("status","published").order("event_date",{ascending:true}).limit(160));
      var pStatic=loadStaticEvents();
      var pForum=safeQ(sb.from("forum_posts_public").select("id,city,kind,title,body,created_at,last_activity,reply_count").eq("author_ref",id).order("created_at",{ascending:false}).limit(10));
      var pHosted=safeQ(sb.from("invitations_public").select("id,event_id,title,note,meeting_point,niche,city,capacity,filled,status,created_at").eq("host_ref",id).order("created_at",{ascending:false}).limit(10));
      var pJoined=isMine?safeQ(sb.from("invitation_members").select("invitation_id,status,invitations(id,event_id,title,meeting_point,niche,status,created_at)").eq("user_id",id).eq("status","approved").limit(10)):Promise.resolve([]);

      Promise.all([pVis,pEv,pStatic,pForum,pHosted,pJoined]).then(function(res){
        var vis=res[0]||[],dbEv=(res[1]||[]).map(function(e){return Object.assign({},e,{city:e.city||(e.cities&&e.cities.name)||""})}),stEv=res[2]||[];
        var forumPosts=res[3]||[],hostedInv=res[4]||[],joinedMem=res[5]||[];
        var evMap={},allEv=[];
        dbEv.concat(stEv).forEach(function(e){
          if(!e)return;
          var k=String(e.slug||e.id||"");
          if(!k||evMap[k])return;
          evMap[k]=true;allEv.push(e);
        });
        var joinedInv=joinedMem.map(function(m){return m.invitations}).filter(Boolean);
        var savedIds=isMine?readSavedIds():[];
        var savedEvents=PC?PC.resolveSavedFavorites({savedIds:savedIds,events:allEv}):[];

        state.d=d;state.visitors=vis;state.logOn=logOn;state.unread=unread;
        state.events=allEv;state.savedEvents=savedEvents;
        state.hostedInvites=hostedInv;state.joinedInvites=joinedInv;
        state.upcoming=PC?PC.buildUpcomingEvents({today:td,events:allEv,savedEvents:savedEvents,hostedInvites:hostedInv,joinedInvites:joinedInv}):[];
        state.activities=PC?PC.buildCommunityActivities({forumPosts:forumPosts,hostedInvites:hostedInv}):[];

        draw();
        if(SAVED){SAVED=false;toast(tr("pf_saved"));try{history.replaceState(null,"",location.pathname+(Q?"?u="+encodeURIComponent(Q):""))}catch(e){}}
      });
    });
  });
}
load();
})();
