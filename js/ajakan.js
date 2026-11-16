/* Ajakan barengan + "cari teman" + Ajakan saya. Semua tulis lewat fungsi RPC di supabase/schema_ajakan*.sql */
(function(){
var sb=window.sb;if(!sb)return;
var tr=window.IB_T||function(k){return k},esc=window.esc||function(s){return String(s==null?"":s)};
function waNum(s){var d=String(s||"").replace(/\D/g,"");if(d.indexOf("00")===0)d=d.slice(2);if(d.charAt(0)==="0")d="62"+d.slice(1);return d}
function toast(m){var t=document.getElementById("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2800)}
/* Dialog kecil pengganti alert/prompt/confirm. o: {title,text,input:{ph,min,max},ok,no} -> Promise(true | teks | null) */
function ask(o){return new Promise(function(res){
  var d=document.createElement("dialog");d.className="aqd";
  d.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(o.title||"")+'</h3>'+(o.text?'<p>'+esc(o.text)+'</p>':'')+
   (o.input?'<textarea name="v" rows="3" maxlength="'+(o.input.max||200)+'"'+(o.input.min?' required minlength="'+o.input.min+'"':'')+' placeholder="'+esc(o.input.ph||"")+'"></textarea>':'')+
   '<div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(o.no||tr("aj_no"))+'</button><button class="btn sm" value="ok">'+esc(o.ok||tr("aj_yes"))+'</button></div></form>';
  document.body.appendChild(d);
  d.addEventListener("close",function(){var v=d.querySelector("textarea"),ok=d.returnValue==="ok";res(ok?(v?v.value.trim():true):null);d.remove()});
  d.showModal();var t=d.querySelector("textarea");if(t)t.focus()})}
function run(p,okMsg,after){return p.then(function(r){if(r.error){toast(r.error.message||tr("aj_err"));return false}if(okMsg)toast(okMsg);if(after)after();return true},function(){toast(tr("aj_err"));return false})}
function needLogin(){toast(tr("aj_needlogin"));setTimeout(function(){location.href="login"},900)}
function refresh(){if(window.IB_AjakanBadge)window.IB_AjakanBadge()}

/* ---------- Di dalam rincian event ---------- */
function mount(e,box){
  sb.auth.getSession().then(function(r){var me=r.data.session&&r.data.session.user;
    var qi=sb.from("invitations_public").select("*").eq("event_id",e.id).order("created_at",{ascending:false});
    var qs=sb.from("event_social").select("*").eq("event_id",e.id).maybeSingle();
    var qm=me?sb.from("event_interests").select("event_id").eq("event_id",e.id).eq("user_id",me.id).maybeSingle():Promise.resolve({data:null});
    Promise.all([qi,qs,qm]).then(function(x){
      var L=x[0].data||[],ids=L.map(function(i){return i.id}),soc=x[1].data||{interested:0},mineInt=!!x[2].data;
      var mem=me&&ids.length?sb.from("invitation_members").select("invitation_id,user_id,status,message,profiles(nickname)").in("invitation_id",ids):Promise.resolve({data:[]});
      var con=me&&ids.length?sb.from("invitation_contacts").select("*").in("invitation_id",ids):Promise.resolve({data:[]});
      Promise.all([mem,con]).then(function(y){draw(e,box,me,L,y[0].data||[],y[1].data||[],soc,mineInt)})
    }).catch(function(){box.innerHTML='<p class="meta">'+esc(tr("aj_err"))+'</p>'})})}

function card(e,me,i,M,C){
  var mine=!!i.is_mine,m=M.filter(function(z){return z.invitation_id===i.id}),
   my=m.filter(function(z){return me&&z.user_id===me.id})[0],wa=C.filter(function(c){return c.invitation_id===i.id})[0],a="";
  if(mine)a='<button class="btn ghost sm" data-x="edit" data-i="'+i.id+'">'+tr("aj_edit")+'</button> <button class="btn ghost sm" data-x="cancel" data-i="'+i.id+'">'+tr("aj_cancel")+'</button>';
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
  var ed=mine?'<form class="ajf ed" data-i="'+i.id+'" hidden><label class="f">'+tr("aj_f_title")+'<input name="t" maxlength="80" minlength="5" required value="'+esc(i.title)+'"></label>'+
   '<label class="f">'+tr("aj_f_meet")+'<input name="m" maxlength="100" value="'+esc(i.meeting_point||"")+'"></label>'+
   '<div class="g2"><label class="f">'+tr("aj_f_cap")+'<input name="c" type="number" min="2" max="20" required value="'+i.capacity+'"></label><label class="f">'+tr("aj_f_cost")+'<input name="p" maxlength="60" value="'+esc(i.cost_share||"")+'"></label></div>'+
   '<label class="f">'+tr("aj_f_note")+'<textarea name="n" maxlength="500">'+esc(i.note||"")+'</textarea></label><button class="btn" type="submit">'+tr("aj_f_save")+'</button></form>':"";
  return'<div class="aj"><b>'+esc(i.title)+'</b><div class="meta">'+tr("aj_by")+' '+esc(i.host_name||tr("aj_user"))+(i.host_verified?" ✓":"")+' · '+i.filled+'/'+i.capacity+' '+tr("aj_people")+
   (i.meeting_point?' · '+esc(i.meeting_point):'')+(i.cost_share?' · '+esc(i.cost_share):'')+'</div>'+(i.note?'<p>'+esc(i.note)+'</p>':'')+
   '<div class="row">'+wl+a+'<button class="btn line sm ajsh" type="button" data-x="share" data-i="'+i.id+'">'+tr("share")+'</button>'+rep+'</div>'+rq+ed+'</div>'}

function draw(e,box,me,L,M,C,soc,mineInt){
  var h='<h3>'+tr("aj_h",{n:L.length})+'</h3>';
  var n=+soc.interested||0;
  h+='<div class="aji"><button class="btn line sm" data-x="interest" aria-pressed="'+mineInt+'">'+tr(mineInt?"aj_interest_on":"aj_interest")+'</button>'+(n?' <span class="meta">'+tr("aj_interest_n",{n:n})+'</span>':'')+'</div>';
  h+=L.length?L.map(function(i){return card(e,me,i,M,C)}).join(""):'<p class="meta">'+tr("aj_none")+'</p>';
  h+='<button class="btn" data-x="new">'+tr("aj_new")+'</button><form class="ajf nw" hidden>'+(n?'<p class="meta">'+tr("aj_hint_new",{n:n})+'</p>':'')+
   '<label class="f">'+tr("aj_f_title")+'<input name="t" maxlength="80" minlength="5" placeholder="'+tr("aj_f_title_ph")+'" required></label>'+
   '<label class="f">'+tr("aj_f_meet")+'<input name="m" maxlength="100" placeholder="'+tr("aj_f_meet_ph")+'"></label>'+
   '<div class="g2"><label class="f">'+tr("aj_f_cap")+'<input name="c" type="number" min="2" max="20" value="4" required></label><label class="f">'+tr("aj_f_cost")+'<input name="p" maxlength="60" placeholder="'+tr("aj_f_cost_ph")+'"></label></div>'+
   '<label class="f">'+tr("aj_f_note")+'<textarea name="n" maxlength="500" placeholder="'+tr("aj_f_note_ph")+'"></textarea></label>'+
   '<label class="f">'+tr("aj_f_wa")+'<input name="w" inputmode="tel" placeholder="08xxxxxxxxxx" required></label><button class="btn" type="submit">'+tr("aj_f_submit")+'</button></form>';
  box.innerHTML=h;
  var again=function(){mount(e,box);refresh()};
  box.onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;var x=b.dataset.x,i=b.dataset.i;
    if(x==="share"){var ij=L.filter(function(z){return z.id===i})[0];if(ij&&window.IB_Share){var u=new URL(location.href);u.searchParams.set("e",e.slug||e.id);IB_Share.open({title:ij.title,text:tr("aj_share_text",{t:ij.title,e:e.title}),url:u.origin+u.pathname+u.search})}return}
    if(x==="login"||(!me&&(x==="new"||x==="interest")))return needLogin();
    if(x==="new"){var f=box.querySelector("form.nw");f.hidden=!f.hidden;return}
    if(x==="edit"){var ef=box.querySelector('form.ed[data-i="'+i+'"]');if(ef)ef.hidden=!ef.hidden;return}
    if(x==="interest")return run(sb.rpc("set_interest",{p_event:e.id,p_on:!mineInt}),tr(mineInt?"aj_interest_off":"aj_interest_added"),again);
    if(x==="join")return ask({title:tr("aj_msg_h"),input:{ph:tr("aj_msg_ph"),max:200},ok:tr("aj_send")}).then(function(v){if(v===null)return;run(sb.rpc("request_join",{p_inv:i,p_msg:v}),tr("aj_sent"),again)});
    if(x==="ok"||x==="no")return run(sb.rpc("decide_member",{p_inv:i,p_user:b.dataset.u,p_ok:x==="ok"}),null,again);
    if(x==="cancel")return ask({title:tr("aj_cancel"),text:tr("aj_sure_cancel")}).then(function(v){if(v)run(sb.rpc("leave_or_cancel",{p_inv:i}),tr("aj_cancelled"),again)});
    if(x==="leave")return ask({title:tr("aj_leave"),text:tr("aj_sure_leave")}).then(function(v){if(v)run(sb.rpc("leave_or_cancel",{p_inv:i}),tr("aj_left"),again)});
    if(x==="report")return ask({title:tr("aj_report_h"),input:{ph:tr("aj_report_ph"),min:3,max:200},ok:tr("aj_send")}).then(function(v){if(v)run(sb.rpc("report_invitation",{p_inv:i,p_reason:v}),tr("aj_reported"),again)})};
  box.onsubmit=function(ev){ev.preventDefault();var fm=ev.target,f=fm.elements,btn=fm.querySelector('[type="submit"]');if(btn.disabled)return;btn.disabled=true;
    var p=fm.classList.contains("ed")
     ?run(sb.rpc("edit_invitation",{p_inv:fm.dataset.i,p_title:f.t.value,p_note:f.n.value,p_meet:f.m.value,p_cost:f.p.value,p_cap:+f.c.value}),tr("aj_saved"),again)
     :run(sb.rpc("create_invitation",{p_event:e.id,p_title:f.t.value,p_note:f.n.value,p_meet:f.m.value,p_cost:f.p.value,p_cap:+f.c.value,p_wa:f.w.value}),tr("aj_posted"),again);
    p.then(function(ok){if(!ok)btn.disabled=false})}
}

/* ---------- Ajakan saya (dialog) + lencana di bilah atas ---------- */
function evTitle(ev){return ev?(window.IB_LANG==="en"&&ev.title_en?ev.title_en:ev.title):""}
function openEvent(id,slug){var d=document.getElementById("dlg");if(d&&d.open&&d.dataset.mine)d.close();
  if(window.IB_OpenEv&&window.IB_OpenEv(id)!==false)return;location.href="event?e="+encodeURIComponent(slug||id)}
function mine(){
  sb.auth.getSession().then(function(r){var me=r.data.session&&r.data.session.user;if(!me)return needLogin();
    var hosted=sb.from("invitations").select("id,title,status,capacity,event_id,events(id,slug,title,title_en)").eq("host_id",me.id).in("status",["open","full"]).order("created_at",{ascending:false});
    var joined=sb.from("invitation_members").select("invitation_id,status").eq("user_id",me.id).in("status",["pending","approved"]);
    var ints=sb.from("event_interests").select("event_id,events(id,slug,title,title_en)").eq("user_id",me.id);
    Promise.all([hosted,joined,ints]).then(function(x){
      var H=x[0].data||[],J=x[1].data||[],I=x[2].data||[],hid=H.map(function(z){return z.id}),jid=J.map(function(z){return z.invitation_id}),eid=I.map(function(z){return z.event_id});
      var pend=hid.length?sb.from("invitation_members").select("invitation_id").in("invitation_id",hid).eq("status","pending"):Promise.resolve({data:[]});
      var jp=jid.length?sb.from("invitations_public").select("id,title,event_id,status").in("id",jid):Promise.resolve({data:[]});
      var soc=eid.length?sb.from("event_social").select("event_id,open_invites").in("event_id",eid):Promise.resolve({data:[]});
      Promise.all([pend,jp,soc]).then(function(y){
        var P={};(y[0].data||[]).forEach(function(z){P[z.invitation_id]=(P[z.invitation_id]||0)+1});
        var JP=y[1].data||[],S={};(y[2].data||[]).forEach(function(z){S[z.event_id]=z.open_invites});
        var evIds=JP.map(function(z){return z.event_id}).filter(function(v,i,a){return a.indexOf(v)===i});
        (evIds.length?sb.from("events").select("id,slug,title,title_en").in("id",evIds):Promise.resolve({data:[]})).then(function(z){
          var EV={};(z.data||[]).forEach(function(v){EV[v.id]=v});
          var row=function(t,sub,id,slug,badge){return'<button class="amr" type="button" data-id="'+esc(id)+'" data-slug="'+esc(slug||"")+'"><span><b>'+esc(t)+'</b><small>'+esc(sub||"")+'</small></span>'+(badge?'<em>'+esc(badge)+'</em>':'')+'</button>'};
          var sec=function(h,arr){return'<h4>'+esc(h)+'</h4>'+(arr.length?arr.join(""):'<p class="meta">—</p>')};
          var html='<div class="amb"><h3>'+tr("aj_my")+'</h3>'+
           sec(tr("aj_my_host"),H.map(function(i){var ev=i.events;return row(i.title,evTitle(ev),ev&&ev.id,ev&&ev.slug,P[i.id]?tr("aj_waiting_n",{n:P[i.id]}):"")}))+
           sec(tr("aj_my_joined"),JP.map(function(i){var ev=EV[i.event_id];var st=J.filter(function(q){return q.invitation_id===i.id})[0];return row(i.title,evTitle(ev),i.event_id,ev&&ev.slug,st&&st.status==="approved"?tr("aj_ok"):tr("aj_pending"))}))+
           sec(tr("aj_my_interest"),I.map(function(i){var ev=i.events,n=S[i.event_id]||0;return row(evTitle(ev),"",i.event_id,ev&&ev.slug,n?tr("aj_has_new",{n:n}):"")}))+
           '<div class="row"><button class="btn ghost sm" type="button" data-close>'+tr("close")+'</button></div></div>';
          var d=document.createElement("dialog");d.className="aqd amd";d.innerHTML=html;document.body.appendChild(d);
          d.addEventListener("close",function(){d.remove()});
          d.addEventListener("click",function(ev){if(ev.target===d||ev.target.closest("[data-close]"))return d.close();
            var b=ev.target.closest(".amr");if(b){d.close();openEvent(b.dataset.id,b.dataset.slug)}});
          d.showModal()})})
    }).catch(function(){toast(tr("aj_err"))})})}

function setupBadge(){
  var right=document.querySelector(".topbar .right");if(!right||document.getElementById("ajMy"))return;
  var b=document.createElement("button");b.id="ajMy";b.type="button";b.className="ico-btn";b.hidden=true;b.setAttribute("aria-label",tr("aj_my"));b.title=tr("aj_my");
  b.innerHTML='<svg class="i" style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="ajn" hidden></span>';
  right.insertBefore(b,right.firstChild);b.onclick=mine;
  window.IB_AjakanBadge=function(){sb.auth.getSession().then(function(r){var me=r.data.session&&r.data.session.user;b.hidden=!me;if(!me)return;
    sb.from("invitations").select("id").eq("host_id",me.id).in("status",["open","full"]).then(function(q){var ids=(q.data||[]).map(function(z){return z.id}),n=b.querySelector(".ajn");
      if(!ids.length){n.hidden=true;return}
      sb.from("invitation_members").select("invitation_id",{count:"exact",head:true}).in("invitation_id",ids).eq("status","pending").then(function(c){var k=c.count||0;n.textContent=k;n.hidden=!k})})})};
  sb.auth.onAuthStateChange(function(){window.IB_AjakanBadge()});window.IB_AjakanBadge()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setupBadge);else setupBadge();

window.IB_Ajakan={mount:mount,mine:mine};
})();
