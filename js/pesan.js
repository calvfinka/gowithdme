/* Pesan antar pengguna: teks, gambar, voice note. Maks. 5 MB, hilang 10 menit. Aturan ditegakkan di supabase/schema_pesan.sql. */
(function(){
var tr=window.IB_T||function(k){return k};
if(!window.sb){msg(tr("a_notready"),"err");return}
var root=$("pRoot"),Q=new URLSearchParams(location.search),me=null,TH=null,MS={},ch=null,poll=null,tick=null,rec=null,MAX=5*1024*1024;
var EXT={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"mp4","audio/mpeg":"mp3"};
function toast(m){var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},Math.max(2800,m.length*60))}
function av(p){var u=p.avatar_url;return'<span class="pav" aria-hidden="true"'+(u?' style="background:center/cover url(\''+esc(u).replace(/\'/g,"%27")+'\')"':"")+'>'+(u?"":esc((p.nickname||"?").charAt(0).toUpperCase()))+'</span>'}
function nm(p){return p.nickname||tr("k_user")}
function mmss(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+":"+("0"+s%60).slice(-2)}
function fail(e){root.innerHTML="";msg(/chat_|schema cache|does not exist/i.test(e&&e.message||"")?tr("ms_sql"):(e&&e.message)||tr("ms_err"),"err")}
function stop(){clearInterval(poll);clearInterval(tick);if(ch){try{sb.removeChannel(ch)}catch(e){}ch=null}}
function need(){root.innerHTML='<div class="card"><p>'+esc(tr("ms_need"))+'</p><a class="btn" href="login?next=pesan">'+esc(tr("ms_login"))+'</a></div>'}
/* ---------- Kotak masuk ---------- */
function prev(x){return x.last_kind==="image"?"🖼 "+tr("ms_img"):x.last_kind==="voice"?"🎤 "+tr("ms_vn"):x.last_body?esc(x.last_body.slice(0,60)):'<i>'+esc(tr("ms_gone"))+'</i>'}
function sec(t,L){return L.length?'<h2 class="kh">'+esc(t)+'</h2><div class="ms-rows">'+L.map(function(x){return'<a class="ms-row" href="pesan?t='+x.thread_id+'">'+av(x)+'<span><b>'+esc(nm(x))+(x.verified?" ✓":"")+'</b><small>'+prev(x)+'</small></span>'+(x.unread?'<em class="nb">'+x.unread+'</em>':"")+'</a>'}).join("")+'</div>':""}
function inbox(){stop();sb.rpc("chat_inbox").then(function(r){if(r.error)return fail(r.error);
  var L=r.data||[],rq=L.filter(function(x){return x.status==="request"&&x.started_by!==me.id}),rest=L.filter(function(x){return rq.indexOf(x)<0});
  root.innerHTML='<h1>'+esc(tr("ms_h"))+'</h1><p class="ms-note">'+esc(tr("ms_rule"))+'</p>'+sec(tr("ms_req"),rq)+sec(tr("ms_all"),rest)+(L.length?"":'<div class="card"><p class="meta">'+esc(tr("ms_empty"))+'</p></div>');
  poll=setInterval(inbox,15000)})}
/* ---------- Percakapan ---------- */
function openThread(id){sb.rpc("chat_inbox").then(function(r){if(r.error)return fail(r.error);
  TH=(r.data||[]).filter(function(x){return x.thread_id===id})[0];if(!TH){msg(tr("pf_nf"),"err");return inbox()}
  draw();load();stop();
  try{ch=sb.channel("chat-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"thread_id=eq."+id},load).subscribe()}catch(e){}
  poll=setInterval(load,10000);tick=setInterval(left,1000)})}
function draw(){var inc=TH.status==="request"&&TH.started_by!==me.id,ok=TH.status==="accepted";
  root.innerHTML='<div class="ms-h"><a class="lnk" href="pesan" aria-label="'+esc(tr("ms_back"))+'">←</a><a class="ms-who" href="profil?u='+TH.other_id+'">'+av(TH)+'<b>'+esc(nm(TH))+(TH.verified?" ✓":"")+'</b></a><button class="btn ghost sm" data-x="blk" type="button">'+esc(TH.blocked?tr("ms_unblock"):tr("ms_block"))+'</button></div>'
  +'<p class="ms-note">'+esc(tr("ms_rule"))+'</p>'
  +(inc?'<div class="ms-req">'+esc(tr("ms_req_in"))+' <button class="btn sm" data-x="acc" type="button">'+esc(tr("ms_acc"))+'</button></div>':"")
  +'<div class="ms-list" id="mList" aria-live="polite"></div>'
  +(TH.blocked?'<p class="ms-note">'+esc(tr("ms_blocked"))+'</p>':'<p class="ms-hint" id="mHint">'+(ok?"":esc(TH.started_by===me.id?tr("ms_wait"):tr("ms_acc_hint")))+'</p><div class="ms-bar"><button class="ico-btn" data-x="img" type="button" aria-label="'+esc(tr("ms_img"))+'"'+(ok?"":" disabled")+'>🖼</button><input id="mFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden><textarea id="mTxt" rows="1" maxlength="1000" placeholder="'+esc(tr("ms_ph"))+'"></textarea><button class="ico-btn" id="mMic" data-x="mic" type="button" aria-label="'+esc(tr("ms_vn"))+'"'+(ok?"":" disabled")+'>🎤</button><button class="btn" data-x="send" type="button" aria-label="'+esc(tr("ms_send_btn"))+'">➤</button></div>')}
function body(m){if(m.kind==="text")return esc(m.body).replace(/\n/g,"<br>");
  return m.kind==="image"?'<img class="ms-img" data-p="'+esc(m.file_path)+'" alt="'+esc(tr("ms_img"))+'">':'<audio controls preload="none" data-p="'+esc(m.file_path)+'"></audio><small> '+mmss(m.duration_s||0)+'</small>'}
function load(){if(!TH)return;sb.from("chat_messages").select("*").eq("thread_id",TH.thread_id).order("created_at").limit(200).then(function(r){if(r.error)return;
  var L=$("mList");if(!L)return;var fresh=false;
  r.data.forEach(function(m){if(MS[m.id])return;MS[m.id]=1;fresh=true;var mine=m.sender_id===me.id,d=document.createElement("div");
    d.className="ms-b"+(mine?" me":"");d.dataset.exp=new Date(m.expires_at).getTime();d.dataset.id=m.id;
    d.innerHTML=body(m)+'<small class="ms-m"><span class="lf"></span>'+(mine?"":' <button class="lnk" data-x="rep" data-m="'+m.id+'" type="button" aria-label="'+esc(tr("ms_rep"))+'">⚑</button>')+'</small>';
    L.appendChild(d);
    var f=d.querySelector("[data-p]");if(f)sb.storage.from("chat").createSignedUrl(f.dataset.p,600).then(function(s){if(s.data)f.src=s.data.signedUrl})});
  if(fresh){L.scrollTop=L.scrollHeight;sb.rpc("chat_mark_read",{p_thread:TH.thread_id});
    sb.rpc("chat_inbox").then(function(x){var t=(x.data||[]).filter(function(y){return y.thread_id===TH.thread_id})[0];if(t&&t.status!==TH.status){TH=t;draw();MS={};load()}})}
  left()})}
function left(){var L=$("mList");if(!L)return;var now=Date.now();
  [].forEach.call(L.querySelectorAll(".ms-b"),function(d){var s=(+d.dataset.exp-now)/1000;if(s<=0){d.remove();return}d.querySelector(".lf").textContent=tr("ms_left",{t:mmss(s)})});
  if(!L.querySelector(".ms-b"))L.innerHTML='<p class="meta ms-gone">'+esc(tr("ms_gone_all"))+'</p>';else{var g=L.querySelector(".ms-gone");if(g)g.remove()}}
function busy(b){[].forEach.call(root.querySelectorAll(".ms-bar button"),function(x){x.disabled=b||(x.dataset.x!=="send"&&TH.status!=="accepted")})}
function askDlg(o){return new Promise(function(res){
  var d=document.createElement("dialog");d.className="aqd";
  d.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(o.title||"")+'</h3>'+(o.text?'<p>'+esc(o.text)+'</p>':'')+
   (o.input?'<textarea name="v" rows="3" maxlength="200" placeholder="'+esc(o.ph||"")+'"></textarea>':'')+
   '<div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(tr("k_cancel")||"Batal")+'</button><button class="btn pri sm" value="ok">'+esc(o.ok||tr("k_yes")||"Ya")+'</button></div></form>';
  document.body.appendChild(d);
  d.addEventListener("close",function(){var v=d.querySelector("textarea"),ok=d.returnValue==="ok";res(ok?(v?v.value.trim():true):null);d.remove()});
  d.showModal();var t=d.querySelector("textarea");if(t)t.focus()})}
function send(){var t=$("mTxt"),v=t.value.trim();if(!v)return;
  if(window.IB_WordFilter){var wf=IB_WordFilter.enforce(v,{userId:me&&me.id,userLabel:(me&&(me.user_metadata&&me.user_metadata.full_name||me.email))||"Anggota",context:"chat_message"});if(!wf.ok)return toast(wf.message)}
  busy(true);
  sb.rpc("chat_send",{p_thread:TH.thread_id,p_kind:"text",p_body:v,p_path:null,p_size:null,p_dur:null}).then(function(r){busy(false);
    if(r.error)return toast(r.error.message);t.value="";if(TH.status==="request"){TH.status="request"}load();
    if(TH.status==="request"&&TH.started_by===me.id)toast(tr("ms_sent_req"))})}
function sendFile(kind,blob,mime,dur){if(blob.size>MAX)return toast(tr("ms_big"));if(!EXT[mime])return toast(tr("ms_type"));
  var p=TH.thread_id+"/"+me.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+EXT[mime];busy(true);
  sb.storage.from("chat").upload(p,blob,{contentType:mime,upsert:false}).then(function(u){if(u.error)throw u.error;
    return sb.rpc("chat_send",{p_thread:TH.thread_id,p_kind:kind,p_body:null,p_path:p,p_size:blob.size,p_dur:dur||null}).then(function(r){if(r.error){sb.storage.from("chat").remove([p]);throw r.error}})})
   .then(load).catch(function(e){toast(e.message||tr("ms_err"))}).then(function(){busy(false)})}
function mic(){var b=$("mMic");
  if(rec){rec.stop();return}
  if(!navigator.mediaDevices||!window.MediaRecorder)return toast(tr("ms_mic_deny"));
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
    var mt=["audio/webm","audio/ogg","audio/mp4"].filter(function(x){return MediaRecorder.isTypeSupported(x)})[0]||"",ck=[],t0=Date.now(),iv;
    rec=new MediaRecorder(s,mt?{mimeType:mt,audioBitsPerSecond:32000}:{audioBitsPerSecond:32000});
    rec.ondataavailable=function(e){if(e.data.size)ck.push(e.data)};
    rec.onstop=function(){clearInterval(iv);s.getTracks().forEach(function(x){x.stop()});var d=Math.round((Date.now()-t0)/1000),type=(rec.mimeType||mt||"audio/webm").split(";")[0];rec=null;b.textContent="🎤";b.classList.remove("rec");
      if(d<1)return;sendFile("voice",new Blob(ck,{type:type}),type,Math.min(d,120))};
    rec.start();b.classList.add("rec");iv=setInterval(function(){var d=(Date.now()-t0)/1000;b.textContent="⏹ "+mmss(d);if(d>=120)rec.stop()},250)
  }).catch(function(){toast(tr("ms_mic_deny"))})}
root.addEventListener("click",function(ev){var b=ev.target.closest("[data-x]");if(!b||!TH&&b.dataset.x!=="x")return;var x=b.dataset.x;
  if(x==="send")return send();if(x==="img")return $("mFile").click();if(x==="mic")return mic();
  if(x==="acc")return sb.rpc("chat_accept",{p_thread:TH.thread_id}).then(function(){openThread(TH.thread_id)});
  if(x==="blk"){
    var goBlk=TH.blocked?Promise.resolve(true):askDlg({title:tr("ms_block"),text:tr("ms_sure_block"),ok:tr("ms_block")});
    return goBlk.then(function(ok){if(!ok)return;sb.rpc("chat_block",{p_user:TH.other_id,p_on:!TH.blocked}).then(function(r){if(r.error)return toast(r.error.message);openThread(TH.thread_id)})});
  }
  if(x==="rep"){
    return askDlg({title:tr("ms_rep"),text:tr("ms_rep_p"),input:true,ph:tr("ms_rep_p"),ok:tr("k_send")||"Kirim"}).then(function(why){
      if(why===null)return;
      sb.rpc("chat_report",{p_msg:b.dataset.m,p_reason:why}).then(function(r){toast(r.error?r.error.message:tr("ms_rep_ok"))});
    });
  }});
root.addEventListener("change",function(ev){if(ev.target.id!=="mFile")return;var f=ev.target.files[0];ev.target.value="";if(f)sendFile("image",f,f.type)});
root.addEventListener("keydown",function(ev){if(ev.target.id==="mTxt"&&ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();send()}});
sb.auth.getSession().then(function(s){me=s.data.session&&s.data.session.user;if(!me)return need();
  var u=Q.get("u"),t=Q.get("t");
  if(u)return sb.rpc("chat_open",{p_other:u}).then(function(r){if(r.error){toast(window.IB_ErrText?IB_ErrText(r.error):r.error.message);return inbox()}try{history.replaceState(null,"","pesan?t="+r.data)}catch(e){}openThread(r.data)});
  t?openThread(t):inbox()});
})();

(function(){
  function injectTip(){
    if(!window.GWMBot)return;
    var root=document.getElementById("pRoot");if(!root||root.querySelector(".gwm-bot-tip"))return;
    var ctx="inbox";
    if(root.querySelector(".ms-bar"))ctx="thread";
    if(root.textContent&&/belum|empty|no conversation|tidak ada/i.test(root.textContent.slice(0,200)))ctx="empty";
    var tip=document.createElement("div");tip.innerHTML=GWMBot.tipHtml(ctx);
    var note=root.querySelector(".ms-note,.ms-h");
    if(note&&note.parentNode)note.parentNode.insertBefore(tip.firstChild,note.nextSibling);
    else if(tip.firstChild)root.insertBefore(tip.firstChild,root.firstChild);
  }
  var r=document.getElementById("pRoot");
  if(r){new MutationObserver(injectTip).observe(r,{childList:true,subtree:true});setTimeout(injectTip,400)}
})();
