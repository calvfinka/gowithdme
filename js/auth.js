(function(){var tr=window.IB_T||function(k){return k},WF=window.IB_WordFilter;
if(!sb){msg((!window.supabase?tr("a_lib"):!(window.IB_CONFIG&&IB_CONFIG.SUPABASE_URL)?tr("a_cfg"):tr("a_notready")),"err");return}
var mode="login",holding=false,AFTER="gwm_after";
var OAUTH_NAMES={google:"Google",facebook:"Facebook",discord:"Discord",github:"GitHub"};
/* Arah setelah masuk: ?next=... atau beranda. Disimpan di sessionStorage supaya tetap jalan setelah OAuth/email membawa pengguna kembali. */
function setAfter(){try{sessionStorage.setItem(AFTER,JSON.stringify({to:safeNext("./"),t:Date.now()}))}catch(e){}}
function takeAfter(){try{var v=JSON.parse(sessionStorage.getItem(AFTER)||"null");sessionStorage.removeItem(AFTER);return v&&Date.now()-v.t<6e5?v.to:null}catch(e){return null}}
function goAfter(){var to=takeAfter();if(!to)return false;msg(tr("a_redirect"),"ok");setTimeout(function(){location.href=to},350);return true}
function seg(m){mode=m;$("fLogin").hidden=m!=="login";$("fReg").hidden=m!=="reg";$("sLogin").classList.toggle("on",m==="login");$("sReg").classList.toggle("on",m==="reg");msg("")}
$("sLogin").onclick=function(){seg("login")};$("sReg").onclick=function(){seg("reg")};
$("fLogin").onsubmit=function(e){e.preventDefault();msg(tr("processing"));holding=true;setAfter();
  sb.auth.signInWithPassword({email:$("lEmail").value.trim(),password:$("lPass").value}).then(function(r){
    if(r.error){holding=false;takeAfter();return msg(/not confirmed/i.test(r.error.message||"")?tr("a_unconfirmed"):tr("a_bad"),"err")}
    msg(tr("a_redirect"),"ok");logLocation(function(){holding=false;goAfter()})})};
$("fReg").onsubmit=function(e){e.preventDefault();
  if(!$("rConsent").checked)return msg(tr("a_consent"),"err");
  var nick=$("rNick").value.trim();
  if(WF){var ck=WF.enforce(nick,{userId:"signup",userLabel:nick,context:"signup_nickname",lang:window.IB_LANG});if(!ck.ok)return msg(ck.message,"err")}
  msg(tr("processing"));setAfter();
  sb.auth.signUp({email:$("rEmail").value.trim(),password:$("rPass").value,options:{data:{nickname:nick},emailRedirectTo:location.href}}).then(function(r){
    if(r.error){takeAfter();return msg(friendlyErr(r.error),"err")}
    var us=r.data&&r.data.user;if(us&&us.identities&&us.identities.length===0){takeAfter();return msg(tr("a_exists"),"err")}
    if(!r.data.session)takeAfter();
    msg(r.data.session?tr("a_created"):tr("a_created_mail"),"ok")})};

/* Login OAuth: Google, Facebook, Discord, GitHub */
[].forEach.call(document.querySelectorAll("[data-oauth]"),function(btn){
  btn.onclick=function(){
    var p=btn.dataset.oauth,label=OAUTH_NAMES[p]||p;
    msg(tr("a_oauth_redir",{p:label}));
    setAfter();
    var opts={redirectTo:location.origin+location.pathname};
    if(p==="google")opts.queryParams={prompt:"select_account"};
    sb.auth.signInWithOAuth({provider:p,options:opts}).then(function(r){
      if(r.error){takeAfter();msg(tr("a_oauth_off",{p:label}),"err")}
    },function(){takeAfter();msg(tr("a_oauth_off",{p:label}),"err")});
  };
});

$("lForgot").onclick=function(){var em=$("lEmail").value.trim();if(!em)return msg(tr("a_needmail"),"err");
  sb.auth.resetPasswordForEmail(em,{redirectTo:location.href}).then(function(r){msg(r.error?friendlyErr(r.error):tr("a_resetsent"),r.error?"err":"ok")})};
/* Login tanpa password: link sekali pakai ke email. */
$("lMagic").onclick=function(){var em=$("lEmail").value.trim();if(!em)return msg(tr("a_needmail"),"err");
  msg(tr("processing"));setAfter();var b=this;b.disabled=true;
  sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.href,shouldCreateUser:false}}).then(function(r){
    b.disabled=false;
    if(r.error){takeAfter();return msg(/signups? not allowed|not found/i.test(r.error.message||"")?tr("a_magic_none"):r.error.message,"err")}
    msg(tr("a_magic_sent"),"ok")})};
/* Ganti email */
$("fMail").onsubmit=function(e){e.preventDefault();var ne=$("nEmail").value.trim(),btn=this.querySelector('[type="submit"]');
  getMe().then(function(m){
    if(!m)return;
    if(ne.toLowerCase()===String(m.user.email||"").toLowerCase())return msg(tr("ce_same"),"err");
    btn.disabled=true;msg(tr("processing"));
    return sb.auth.updateUser({email:ne},{emailRedirectTo:location.href}).then(function(r){
      btn.disabled=false;
      if(r.error)return msg(friendlyErr(r.error),"err");
      $("nEmail").value="";msg(tr("ce_sent"),"ok")})})};
if(/type=email_change/.test(location.hash))setTimeout(function(){msg(tr("ce_done"),"ok")},600);
$("bOut").onclick=function(){sb.auth.signOut().then(function(){location.href="./"},function(){location.href="./"})};
function logLocation(done){
  var fin=false,end=function(){if(!fin){fin=true;if(done)done()}},t=setTimeout(end,7000);
  if(!navigator.geolocation){$("locSt").textContent=tr("a_nogps");clearTimeout(t);return end()}
  navigator.geolocation.getCurrentPosition(function(p){
    $("locSt").textContent=tr("a_loc",{m:Math.round(p.coords.accuracy)});
    try{sb.functions.invoke("log-login",{body:{lat:p.coords.latitude,lng:p.coords.longitude,device:navigator.userAgent}}).catch(function(){})}catch(x){}
    clearTimeout(t);end()
  },function(){$("locSt").textContent=tr("a_denied");clearTimeout(t);end()},{enableHighAccuracy:true,timeout:6000});
}
$("bLoc").onclick=function(){logLocation()};
var recovering=false;
function show(){if(recovering||holding)return;getMe().then(function(m){
  $("guest").hidden=!!m;$("me").hidden=!m;var mn=document.querySelector("main.auth-pg");if(mn)mn.classList.toggle("wide",!!m);if(!m)return;document.title=tr("ac_title");
  var p=m.profile,n=p.nickname||m.user.email.split("@")[0];
  $("av").textContent=p.avatar_url?"":n.charAt(0).toUpperCase();$("av").style.background=p.avatar_url?"center/cover url('"+p.avatar_url.replace(/'/g,"%27")+"')":"";$("nm").textContent=n;$("em").textContent=/@phone\.jurkon\.my\.id$/.test(m.user.email)?"+"+m.user.email.split("@")[0]:m.user.email;
  if($("meUid"))$("meUid").textContent=WF?WF.shortUid(m.user.id):("ID-"+String(m.user.id||"").slice(0,8).toUpperCase());
  $("bv").hidden=!p.verified;$("ba").hidden=p.role!=="admin";$("lAdmin").hidden=p.role!=="admin";
  if(dirty)return;
  $("pNick").value=p.nickname||"";loadCities($("pCity"),true).then(function(){$("pCity").value=p.city_id||"";setDirty(false)});
  loadExtra(m.user.id);
})}
/* ---- profil diperluas: bio, minat, level, privasi, statistik ---- */
var INT=["konser","festival","pameran","naikgunung","camping","pop","rock","indie","edm","jazz","hiphop","dangdut","kpop"],LV=["pemula","menengah","sulit"],sel=[];
function drawInt(){$("pInt").innerHTML=INT.map(function(k){return'<button type="button" class="chip" data-k="'+k+'" aria-pressed="'+(sel.indexOf(k)>-1)+'">'+esc(tr("it_"+k))+'</button>'}).join("");$("pIntN").textContent=sel.length+"/8"}
$("pInt").onclick=function(ev){var b=ev.target.closest("[data-k]");if(!b)return;var k=b.dataset.k,i=sel.indexOf(k);
  if(i>-1)sel.splice(i,1);else{if(sel.length>=8)return msg(tr("pe_max"),"err");sel.push(k)}drawInt();setDirty(true)};
$("pBio").oninput=function(){$("pBioN").textContent=this.value.length+"/200"};
$("pLevel").innerHTML='<option value="">'+esc(tr("pe_nolevel"))+'</option>'+LV.map(function(k){return'<option value="'+k+'">'+esc(tr("lv_"+k))+'</option>'}).join("");
function loadExtra(id){
  Promise.all([sb.rpc("profile_view",{p_id:id}),sb.from("profile_extra").select("log_visits").eq("user_id",id).maybeSingle()]).then(function(x){
    var r=x[0];if(r.error||!r.data){setExtra(false);return}
    setExtra(true);var d=r.data,st=d.stats||{};
    $("sPosts").textContent=st.posts||0;$("sJoined").textContent=st.joined||0;$("sHosted").textContent=st.hosted||0;
    $("pBio").value=d.bio||"";$("pBioN").textContent=($("pBio").value||"").length+"/200";sel=(d.interests||[]).slice();drawInt();$("pLevel").value=d.level||"";
    $("pPublic").checked=d.is_public!==false;$("pShowV").checked=d.show_visitors!==false;$("pLog").checked=!(x[1].data&&x[1].data.log_visits===false);setDirty(false)})}
function setExtra(on){$("fExtra").hidden=!on;$("me").classList.toggle("has-extra",!!on)}
setExtra(false);
/* ---- ruang edit: penanda perubahan, navigasi bagian, salin ID ---- */
var dirty=false;
function setDirty(v){dirty=!!v;var st=$("pStat");if(!st)return;st.textContent=dirty?tr("ac_dirty"):tr("ac_after");st.classList.toggle("dirty",dirty)}
$("fAll").addEventListener("input",function(){setDirty(true)});
$("fAll").addEventListener("change",function(){setDirty(true)});
$("pCancel").addEventListener("click",function(e){if(dirty&&!window.confirm(tr("ac_leave")))e.preventDefault()});
window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue=""}});
var SECS=["s-basic","s-about","s-priv","s-acct"],navEl=$("acctNav");
function markSec(id){[].forEach.call(navEl.querySelectorAll("[data-go]"),function(b){var on=b.dataset.go===id;b.classList.toggle("on",on);if(on){b.setAttribute("aria-current","true");if(navEl.scrollWidth>navEl.clientWidth+4&&navEl.scrollTo)navEl.scrollTo({left:Math.max(0,b.offsetLeft-16),behavior:"smooth"})}else b.removeAttribute("aria-current")})}
navEl.onclick=function(ev){var b=ev.target.closest("[data-go]");if(!b)return;var el=$(b.dataset.go);if(!el)return;
  var calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;el.scrollIntoView({behavior:calm?"auto":"smooth",block:"start"});markSec(b.dataset.go)};
var spyBusy=false;
window.addEventListener("scroll",function(){if(spyBusy||$("me").hidden)return;spyBusy=true;requestAnimationFrame(function(){spyBusy=false;
  var cur=SECS[0];SECS.forEach(function(id){var el=$(id);if(el&&el.offsetParent!==null&&el.getBoundingClientRect().top<=Math.max(170,window.innerHeight*.35))cur=id});
  if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)cur=SECS[SECS.length-1];markSec(cur)})},{passive:true});
$("bCopy").onclick=function(){var v=$("meUid").textContent||"";function ok(){msg(tr("pf_uid_copied")+": "+v,"ok")}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(ok,function(){msg(v,"ok")});else msg(v,"ok")};
$("pCancel").href=safeNext("profil");$("pBack").href=safeNext("profil");
$("fAll").onsubmit=function(e){e.preventDefault();var btn=this.querySelector('[type="submit"]'),nick=$("pNick").value.trim(),bio=$("pBio").value.trim();
  if(!nick)return msg(tr("pe_nick_need"),"err");
  btn.disabled=true;msg(tr("processing"));
  getMe().then(function(m){
    if(WF){
      var ck=WF.enforce([nick,bio],{userId:m.user.id,userLabel:nick,context:"profile_edit",lang:window.IB_LANG});
      if(!ck.ok){btn.disabled=false;msg(ck.message,"err");return null}
    }
    return sb.from("profiles").update({nickname:nick,city_id:$("pCity").value||null}).eq("id",m.user.id);
  }).then(function(r){
    if(r===null)return;
    if(r.error)throw r.error;
    var more=function(){return $("fExtra").hidden?null:sb.rpc("profile_save",{p_bio:$("pBio").value,p_interests:sel,p_level:$("pLevel").value||null,p_public:$("pPublic").checked,p_show_visitors:$("pShowV").checked,p_log_visits:$("pLog").checked})};
    /* samakan nama di header (diambil dari data sesi) dengan nama panggilan baru */
    return sb.auth.updateUser({data:{nickname:nick}}).then(more,more)
  }).then(function(r){
    if(r===undefined)return;
    if(r&&r.error)throw r.error;
    setDirty(false);msg(tr("pe_saved_go"),"ok");var to=safeNext("profil");if(to==="profil")to="profil?saved=1";
    setTimeout(function(){location.href=to},700)
  }).catch(function(err){btn.disabled=false;msg(friendlyErr(err),"err")})};
sb.auth.onAuthStateChange(function(ev){
  if(ev==="PASSWORD_RECOVERY"){recovering=true;var mn0=document.querySelector("main.auth-pg");if(mn0)mn0.classList.remove("wide");$("guest").hidden=true;$("me").hidden=true;$("rec").hidden=false;msg(tr("a_recover"),"ok");return}
  if(ev==="SIGNED_IN"&&!holding&&goAfter())return;
  show()});
$("fRec").onsubmit=function(e){e.preventDefault();var p=$("nPass").value;
  if(p.length<8)return msg(tr("a_pass8"),"err");
  sb.auth.updateUser({password:p}).then(function(r){if(r.error)return msg(friendlyErr(r.error),"err");
    recovering=false;$("rec").hidden=true;$("nPass").value="";msg(tr("a_passok"),"ok");show()})};
/* ---- Daftar / masuk dengan WhatsApp (OTP) + gaya tombol email link ---- */
(function(){
  var EN=window.IB_LANG==="en",C=window.IB_CONFIG||{},KEY=C.SUPABASE_ANON_KEY,FN=(C.SUPABASE_URL||"")+"/functions/v1/";
  var G=$("guest"),grid=document.querySelector("#guest .oauth-grid"),hd=document.querySelector("#guest .auth-hd");
  if(!G||!grid||!hd||!KEY)return;
  var T=EN?{btn:"Sign up / in with WhatsApp",title:"Sign up or sign in with WhatsApp",lbl:"WhatsApp number",send:"Send code",auto:"New here? Your account is created automatically after verification.",to:"We sent a 6-digit code to WhatsApp",lbc:"Verification code",cph:"······",nick:"Nickname (for new accounts)",nph:"Optional",ok:"Verify & continue",resend:"Resend code",chg:"Change number",back:"Back",sent:"Code sent to your WhatsApp.",wait:"Wait a minute before requesting another code.",bad:"Enter a valid mobile number, e.g. 812 3456 7890.",fail:"Could not send the code. Try again.",wrong:"Wrong or expired code.",many:"Too many attempts. Request a new code.",lfail:"Could not sign you in. Try again."}
  :{btn:"Daftar / masuk dengan WhatsApp",title:"Daftar atau masuk dengan WhatsApp",lbl:"Nomor WhatsApp",send:"Kirim kode",auto:"Belum punya akun? Akun dibuat otomatis setelah verifikasi.",to:"Kode 6 digit dikirim ke WhatsApp",lbc:"Kode verifikasi",cph:"······",nick:"Nama panggilan (untuk akun baru)",nph:"Boleh dikosongkan",ok:"Verifikasi & lanjut",resend:"Kirim ulang kode",chg:"Ganti nomor",back:"Kembali",sent:"Kode dikirim ke WhatsApp kamu.",wait:"Tunggu 1 menit sebelum minta kode lagi.",bad:"Masukkan nomor HP yang valid, contoh 812 3456 7890.",fail:"Gagal mengirim kode. Coba lagi.",wrong:"Kode salah atau kedaluwarsa.",many:"Terlalu banyak percobaan. Minta kode baru.",lfail:"Gagal masuk. Coba lagi."};
  var st=document.createElement("style");
  st.textContent=".oa-wa{grid-column:1/-1}#guest.ph-on>*:not(.auth-hd):not(.ph-panel){display:none!important}.ph-panel[hidden]{display:none}.ph-t{font-weight:700;margin:6px 0 12px}.ph-row{display:flex;gap:8px;align-items:stretch}.ph-pre{display:flex;align-items:center;padding:0 14px;border-radius:12px;background:rgba(127,127,127,.14);font-weight:700;white-space:nowrap}.ph-row input{flex:1;min-width:0}#phCode{font-size:1.5em;letter-spacing:.4em;text-align:center}.ph-note{margin:10px 0 0}.ph-links{display:flex;justify-content:space-between;gap:12px;margin-top:10px}.ph-back{margin-bottom:4px}#lMagic.oauth-btn{width:100%;margin-top:8px}";
  document.head.appendChild(st);
  /* tombol WhatsApp di daftar tombol atas */
  var wa=document.createElement("button");wa.type="button";wa.id="bWa";wa.className="btn ghost oauth-btn oa-wa";
  wa.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg><span>'+T.btn+'</span>';
  grid.insertBefore(wa,grid.firstChild);
  /* tombol "Email me a login link" ikut gaya tombol atas */
  var lm=$("lMagic");
  if(lm&&lm.classList){lm.classList.add("oauth-btn");lm.insertAdjacentHTML("afterbegin",'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>')}
  /* panel nomor HP */
  var pn=document.createElement("div");pn.className="ph-panel";pn.hidden=true;
  pn.innerHTML='<button class="lnk ph-back" id="phBack" type="button">← '+T.back+'</button><p class="ph-t">'+T.title+'</p>'+
   '<form id="fPhone" novalidate>'+
   '<div id="phS1"><label class="f">'+T.lbl+'<div class="ph-row"><span class="ph-pre">+62</span><input id="phNum" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="812 3456 7890"></div></label>'+
   '<button class="btn pri block" id="phSend" type="submit">'+T.send+'</button><p class="meta ph-note">'+T.auto+'</p></div>'+
   '<div id="phS2" hidden><p class="meta" id="phTo"></p>'+
   '<label class="f">'+T.lbc+'<input id="phCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="'+T.cph+'"></label>'+
   '<label class="f">'+T.nick+'<input id="phNick" type="text" maxlength="30" autocomplete="nickname" placeholder="'+T.nph+'"></label>'+
   '<button class="btn pri block" id="phOk" type="button">'+T.ok+'</button>'+
   '<div class="ph-links"><button class="lnk" id="phRe" type="button" disabled>'+T.resend+'</button><button class="lnk" id="phChg" type="button">'+T.chg+'</button></div></div>'+
   '</form><p class="meta auth-agree ph-note" id="phAg"></p>';
  hd.parentNode.insertBefore(pn,hd.nextSibling);
  var ag=document.querySelector("#guest p.auth-agree:not(#phAg)");if(ag)$("phAg").innerHTML=ag.innerHTML;else $("phAg").hidden=true;
  var timer=null;
  function open(on){G.classList.toggle("ph-on",on);pn.hidden=!on;msg("");if(on)setTimeout(function(){var i=$("phS2").hidden?$("phNum"):$("phCode");i.focus()},50)}
  wa.onclick=function(){open(true)};$("phBack").onclick=function(){open(false)};
  function num(){var d=$("phNum").value.replace(/\D/g,"");if(d.indexOf("62")===0)d=d.slice(2);if(d.charAt(0)==="0")d=d.slice(1);return d}
  function full(){return"62"+num()}
  function call(name,body){return fetch(FN+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+KEY},body:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._s=r.status;return j})})}
  function cd(){var b=$("phRe"),n=60;b.disabled=true;clearInterval(timer);b.textContent=T.resend+" ("+n+")";
    timer=setInterval(function(){n--;if(n<=0){clearInterval(timer);b.disabled=false;b.textContent=T.resend}else b.textContent=T.resend+" ("+n+")"},1000)}
  function sendCode(btn){
    if(!/^8\d{8,12}$/.test(num()))return msg(T.bad+" [+62 "+(num()||"-")+"]","err");
    msg(tr("processing"));btn.disabled=true;
    call("send-otp",{phone:full()}).then(function(j){
      if(j.ok){$("phS1").hidden=true;$("phS2").hidden=false;$("phTo").textContent=T.to+" +62 "+num();$("phCode").value="";$("phCode").focus();msg(T.sent,"ok");$("phSend").disabled=false;return cd()}
      if(j._s===429&&!$("phS2").hidden)return cd();
      btn.disabled=false;msg(j._s===429?T.wait:j._s===400?T.bad+" [server]":T.fail,"err")
    }).catch(function(){btn.disabled=false;msg(T.fail,"err")})}
  function verify(){
    var code=$("phCode").value.replace(/\D/g,""),nick=$("phNick").value.trim();
    if(code.length!==6)return msg(T.wrong,"err");
    if(nick&&WF){var ck=WF.enforce(nick,{userId:"signup",userLabel:nick,context:"signup_nickname",lang:window.IB_LANG});if(!ck.ok)return msg(ck.message,"err")}
    var b=$("phOk");b.disabled=true;msg(tr("processing"));holding=true;setAfter();
    function stop(m){holding=false;takeAfter();b.disabled=false;msg(m,"err")}
    call("verify-otp",{phone:full(),code:code,nickname:nick}).then(function(j){
      if(!j.token_hash)return stop(j._s===429?T.many:j._s===400?T.wrong:T.lfail+" [verify-otp "+j._s+(j.detail?": "+j.detail:j.error?": "+j.error:j.message?": "+j.message:"")+"]");
      return sb.auth.verifyOtp({token_hash:j.token_hash,type:"magiclink"}).then(function(r){
        if(r.error)return stop(T.lfail+" [auth: "+(r.error.message||r.error.code||"?")+"]");
        msg(tr("a_redirect"),"ok");
        logLocation(function(){holding=false;G.classList.remove("ph-on");if(!goAfter())show()})})
    }).catch(function(){stop(T.lfail+" [network: verify-otp tidak terjangkau]")})}
  $("fPhone").onsubmit=function(e){e.preventDefault();if($("phS2").hidden)sendCode($("phSend"));else verify()};
  $("phNum").oninput=$("phCode").oninput=function(){msg("")};
  $("phOk").onclick=verify;
  $("phRe").onclick=function(){sendCode(this)};
  $("phChg").onclick=function(){clearInterval(timer);$("phS2").hidden=true;$("phS1").hidden=false;$("phSend").disabled=false;msg("");$("phNum").focus()};
})();
show();
})();
