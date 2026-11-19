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
  $("guest").hidden=!!m;$("me").hidden=!m;if(!m)return;
  var p=m.profile,n=p.nickname||m.user.email.split("@")[0];
  $("av").textContent=p.avatar_url?"":n.charAt(0).toUpperCase();$("av").style.background=p.avatar_url?"center/cover url('"+p.avatar_url.replace(/'/g,"%27")+"')":"";$("nm").textContent=n;$("em").textContent=/@phone\.jurkon\.my\.id$/.test(m.user.email)?"+"+m.user.email.split("@")[0]:m.user.email;
  if($("meUid"))$("meUid").textContent=WF?WF.shortUid(m.user.id):("ID-"+String(m.user.id||"").slice(0,8).toUpperCase());
  $("bv").hidden=!p.verified;$("ba").hidden=p.role!=="admin";$("lAdmin").hidden=p.role!=="admin";
  $("pNick").value=p.nickname||"";loadCities($("pCity"),true).then(function(){$("pCity").value=p.city_id||""});
  loadExtra(m.user.id);
})}
/* ---- profil diperluas: bio, minat, level, privasi, statistik ---- */
var INT=["konser","festival","pameran","naikgunung","camping","pop","rock","indie","edm","jazz","hiphop","dangdut","kpop"],LV=["pemula","menengah","sulit"],sel=[];
function drawInt(){$("pInt").innerHTML=INT.map(function(k){return'<button type="button" class="chip" data-k="'+k+'" aria-pressed="'+(sel.indexOf(k)>-1)+'">'+esc(tr("it_"+k))+'</button>'}).join("")}
$("pInt").onclick=function(ev){var b=ev.target.closest("[data-k]");if(!b)return;var k=b.dataset.k,i=sel.indexOf(k);
  if(i>-1)sel.splice(i,1);else{if(sel.length>=8)return msg(tr("pe_max"),"err");sel.push(k)}drawInt()};
$("pBio").oninput=function(){$("pBioN").textContent=this.value.length};
$("pLevel").innerHTML='<option value="">'+esc(tr("pe_nolevel"))+'</option>'+LV.map(function(k){return'<option value="'+k+'">'+esc(tr("lv_"+k))+'</option>'}).join("");
function loadExtra(id){
  Promise.all([sb.rpc("profile_view",{p_id:id}),sb.from("profile_extra").select("log_visits").eq("user_id",id).maybeSingle()]).then(function(x){
    var r=x[0];if(r.error||!r.data){$("fExtra").hidden=true;return}
    $("fExtra").hidden=false;var d=r.data,st=d.stats||{};
    $("sPosts").textContent=st.posts||0;$("sJoined").textContent=st.joined||0;$("sHosted").textContent=st.hosted||0;
    $("pBio").value=d.bio||"";$("pBioN").textContent=($("pBio").value||"").length;sel=(d.interests||[]).slice();drawInt();$("pLevel").value=d.level||"";
    $("pPublic").checked=d.is_public!==false;$("pShowV").checked=d.show_visitors!==false;$("pLog").checked=!(x[1].data&&x[1].data.log_visits===false)})}
$("fExtra").hidden=true;
$("pCancel").href=safeNext("profil");
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
    return $("fExtra").hidden?null:sb.rpc("profile_save",{p_bio:$("pBio").value,p_interests:sel,p_level:$("pLevel").value||null,p_public:$("pPublic").checked,p_show_visitors:$("pShowV").checked,p_log_visits:$("pLog").checked})
  }).then(function(r){
    if(r===undefined)return;
    if(r&&r.error)throw r.error;
    msg(tr("pe_saved_go"),"ok");var to=safeNext("profil");if(to==="profil")to="profil?saved=1";
    setTimeout(function(){location.href=to},700)
  }).catch(function(err){btn.disabled=false;msg(friendlyErr(err),"err")})};
sb.auth.onAuthStateChange(function(ev){
  if(ev==="PASSWORD_RECOVERY"){recovering=true;$("guest").hidden=true;$("me").hidden=true;$("rec").hidden=false;msg(tr("a_recover"),"ok");return}
  if(ev==="SIGNED_IN"&&!holding&&goAfter())return;
  show()});
$("fRec").onsubmit=function(e){e.preventDefault();var p=$("nPass").value;
  if(p.length<8)return msg(tr("a_pass8"),"err");
  sb.auth.updateUser({password:p}).then(function(r){if(r.error)return msg(friendlyErr(r.error),"err");
    recovering=false;$("rec").hidden=true;$("nPass").value="";msg(tr("a_passok"),"ok");show()})};
/* ---- Login nomor HP: kode OTP lewat WhatsApp (Fonnte) ---- */
(function(){
  var EN=window.IB_LANG==="en",C=window.IB_CONFIG||{},KEY=C.SUPABASE_ANON_KEY,FN=C.SUPABASE_URL+"/functions/v1/";
  var T=EN?{open:"Sign in with phone number (WhatsApp)",ph:"WhatsApp number, e.g. 0812xxxxxxx",send:"Send code",code:"6-digit code",ok:"Verify & sign in",back:"Back",resend:"Resend code",sent:"Code sent to your WhatsApp.",wait:"Wait a minute before requesting another code.",bad:"Invalid phone number.",fail:"Could not send the code. Try again.",wrong:"Wrong or expired code.",many:"Too many attempts. Request a new code.",lbl:"Phone number",lbc:"Code"}
  :{open:"Masuk dengan nomor HP (WhatsApp)",ph:"Nomor WhatsApp, contoh 0812xxxxxxx",send:"Kirim kode",code:"Kode 6 digit",ok:"Verifikasi & masuk",back:"Kembali",resend:"Kirim ulang kode",sent:"Kode dikirim ke WhatsApp kamu.",wait:"Tunggu 1 menit sebelum minta kode lagi.",bad:"Nomor tidak valid.",fail:"Gagal mengirim kode. Coba lagi.",wrong:"Kode salah atau kedaluwarsa.",many:"Terlalu banyak percobaan. Minta kode baru.",lbl:"Nomor HP",lbc:"Kode"};
  var seg0=$("sLogin")&&$("sLogin").parentNode;if(!seg0||!KEY)return;
  var box=document.createElement("div");
  box.innerHTML='<button class="btn ghost block" id="phOpen" type="button">'+T.open+'</button>'+
   '<form id="fPhone" hidden>'+
   '<label class="f">'+T.lbl+'<input id="phNum" type="tel" inputmode="tel" autocomplete="tel" placeholder="'+T.ph+'" required></label>'+
   '<button class="btn pri block" id="phSend" type="submit">'+T.send+'</button>'+
   '<div id="phStep2" hidden>'+
   '<label class="f">'+T.lbc+'<input id="phCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="'+T.code+'"></label>'+
   '<button class="btn pri block" id="phOk" type="button">'+T.ok+'</button></div>'+
   '<p class="auth-links"><button class="lnk" id="phBack" type="button">'+T.back+'</button></p></form>';
  seg0.parentNode.insertBefore(box,seg0);
  var f=$("fPhone"),timer=null;
  function call(name,body){return fetch(FN+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+KEY},body:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._s=r.status;return j})})}
  function panel(on){f.hidden=!on;$("phOpen").hidden=on;seg0.hidden=on;if(on){$("fLogin").hidden=true;$("fReg").hidden=true}else seg(mode);msg("")}
  $("phOpen").onclick=function(){panel(true)};
  $("phBack").onclick=function(){panel(false)};
  function cooldown(){var b=$("phSend"),n=60;b.disabled=true;clearInterval(timer);
    timer=setInterval(function(){n--;if(n<=0){clearInterval(timer);b.disabled=false;b.textContent=T.resend}else b.textContent=T.resend+" ("+n+")"},1000)}
  f.onsubmit=function(e){e.preventDefault();msg(tr("processing"));$("phSend").disabled=true;
    call("send-otp",{phone:$("phNum").value}).then(function(j){
      if(j.ok){$("phStep2").hidden=false;$("phCode").focus();msg(T.sent,"ok");return cooldown()}
      $("phSend").disabled=false;
      msg(j._s===429?T.wait:j._s===400?T.bad:T.fail,"err")
    }).catch(function(){$("phSend").disabled=false;msg(T.fail,"err")})};
  $("phOk").onclick=function(){var code=$("phCode").value.replace(/\D/g,"");if(code.length!==6)return msg(T.wrong,"err");
    var b=this;b.disabled=true;msg(tr("processing"));holding=true;setAfter();
    call("verify-otp",{phone:$("phNum").value,code:code}).then(function(j){
      if(!j.token_hash){holding=false;takeAfter();b.disabled=false;return msg(j._s===429?T.many:T.wrong,"err")}
      return sb.auth.verifyOtp({token_hash:j.token_hash,type:"magiclink"}).then(function(r){
        if(r.error){holding=false;takeAfter();b.disabled=false;return msg(T.fail,"err")}
        msg(tr("a_redirect"),"ok");
        logLocation(function(){holding=false;if(!goAfter())show()})})
    }).catch(function(){holding=false;takeAfter();b.disabled=false;msg(T.fail,"err")})};
})();
show();
})();
