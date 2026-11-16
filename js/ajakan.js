(function(){
var sb=window.sb;if(!sb)return;var tr=window.IB_T||function(k){return k};
function mount(e,box){
  sb.auth.getSession().then(function(r){var me=r.data.session&&r.data.session.user;
    sb.from("invitations_public").select("*").eq("event_id",e.id).order("created_at",{ascending:false}).then(function(q){
      var L=q.data||[],ids=L.map(function(i){return i.id});
      var mem=me&&ids.length?sb.from("invitation_members").select("invitation_id,user_id,status,message,profiles(nickname)").in("invitation_id",ids):Promise.resolve({data:[]});
      var con=me&&ids.length?sb.from("invitation_contacts").select("*").in("invitation_id",ids):Promise.resolve({data:[]});
      Promise.all([mem,con]).then(function(x){draw(e,box,me,L,x[0].data||[],x[1].data||[])})})})}
function act(fn,box,e,ok){fn.then(function(r){if(r.error)return alert(r.error.message);if(ok)alert(ok);mount(e,box)})}
function draw(e,box,me,L,M,C){
  var h='<h3>'+tr("aj_h",{n:L.length})+'</h3>';
  h+=L.length?L.map(function(i){var mine=me&&i.host_id===me.id,m=M.filter(function(z){return z.invitation_id===i.id}),my=m.filter(function(z){return me&&z.user_id===me.id})[0],wa=C.filter(function(c){return c.invitation_id===i.id})[0];
    var a=mine?'<button class="btn ghost sm" data-x="cancel" data-i="'+i.id+'">'+tr("aj_cancel")+'</button>':!me?'<button class="btn sm" data-x="login">'+tr("aj_login")+'</button>':!my||my.status==="left"?(i.status==="open"?'<button class="btn sm" data-x="join" data-i="'+i.id+'">'+tr("aj_join")+'</button>':'<span class="meta">'+tr("aj_full")+'</span>'):my.status==="pending"?'<span class="meta">'+tr("aj_pending")+'</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">'+tr("aj_undo")+'</button>':my.status==="approved"?'<span class="meta">'+tr("aj_ok")+'</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">'+tr("aj_leave")+'</button>':'<span class="meta">'+tr("aj_cant")+'</span>';
    var wl=wa&&(mine||(my&&my.status==="approved"))?'<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(wa.wa)+'">WhatsApp host</a> ':"";
    var rq=mine?m.filter(function(z){return z.status==="pending"}).map(function(z){return'<div class="rq"><b>'+esc(z.profiles&&z.profiles.nickname||tr("aj_user"))+'</b>: '+esc(z.message||tr("aj_nomsg"))+' <button class="btn sm" data-x="ok" data-i="'+i.id+'" data-u="'+z.user_id+'">'+tr("aj_accept")+'</button> <button class="btn ghost sm" data-x="no" data-i="'+i.id+'" data-u="'+z.user_id+'">'+tr("aj_reject")+'</button></div>'}).join(""):"";
    return'<div class="aj"><b>'+esc(i.title)+'</b><div class="meta">'+tr("aj_by")+' '+esc(i.host_name||tr("aj_user"))+(i.host_verified?" ✓":"")+' · '+i.filled+'/'+i.capacity+' '+tr("aj_people")+(i.meeting_point?' · '+esc(i.meeting_point):'')+(i.cost_share?' · '+esc(i.cost_share):'')+'</div>'+(i.note?'<p>'+esc(i.note)+'</p>':'')+'<div class="row">'+wl+a+'</div>'+rq+'</div>'}).join(""):'<p class="meta">'+tr("aj_none")+'</p>';
  h+='<button class="btn" data-x="new">'+tr("aj_new")+'</button><form class="ajf" hidden><label class="f">'+tr("aj_f_title")+'<input name="t" maxlength="80" minlength="5" placeholder="'+tr("aj_f_title_ph")+'" required></label><label class="f">'+tr("aj_f_meet")+'<input name="m" maxlength="100" placeholder="'+tr("aj_f_meet_ph")+'"></label><div class="g2"><label class="f">'+tr("aj_f_cap")+'<input name="c" type="number" min="2" max="20" value="4" required></label><label class="f">'+tr("aj_f_cost")+'<input name="p" maxlength="60" placeholder="'+tr("aj_f_cost_ph")+'"></label></div><label class="f">'+tr("aj_f_note")+'<textarea name="n" maxlength="500" placeholder="'+tr("aj_f_note_ph")+'"></textarea></label><label class="f">'+tr("aj_f_wa")+'<input name="w" inputmode="tel" placeholder="08xxxxxxxxxx" required></label><button class="btn" type="submit">'+tr("aj_f_submit")+'</button></form>';
  box.innerHTML=h;
  box.onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;var x=b.dataset.x,i=b.dataset.i;
    if(x==="login"||(x==="new"&&!me)){alert(tr("aj_needlogin"));return location.href="login"}
    if(x==="new")return box.querySelector("form").hidden=!box.querySelector("form").hidden;
    if(x==="join"){var m=prompt(tr("aj_prompt"),"");if(m===null)return;return act(sb.rpc("request_join",{p_inv:i,p_msg:m}),box,e,tr("aj_sent"))}
    if(x==="ok"||x==="no")return act(sb.rpc("decide_member",{p_inv:i,p_user:b.dataset.u,p_ok:x==="ok"}),box,e);
    if((x==="cancel"||x==="leave")&&confirm(tr("aj_sure")))act(sb.rpc("leave_or_cancel",{p_inv:i}),box,e)};
  box.querySelector("form").onsubmit=function(ev){ev.preventDefault();var f=this.elements;
    act(sb.rpc("create_invitation",{p_event:e.id,p_title:f.t.value,p_note:f.n.value,p_meet:f.m.value,p_cost:f.p.value,p_cap:+f.c.value,p_wa:f.w.value}),box,e,tr("aj_posted"))};
}
window.IB_Ajakan={mount:mount};
})();
