if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search+location.hash);
// Klien Supabase bersama + utilitas UI (msg/toast/esc/friendlyErr)
/* Simpan alamat asli sebelum klien Supabase membersihkan #hash: auth.js membacanya untuk hasil tautan konfirmasi email (sukses atau galat). */
window.IB_ARRIVAL={hash:location.hash,search:location.search};
/* Tautan reset password yang mendarat di halaman selain login (mis. Site URL Supabase = beranda, atau alamat tujuan tidak ada di daftar Redirect URL) dibawa ke halaman login dengan token utuh, supaya form "Buat password baru" tampil. */
window.IB_RECOVERY_REDIRECT=false;
(function(){
  var h=location.hash||"",q=location.search||"";
  if(!/(^|[#&?])type=recovery(&|$)/.test(h+"&"+q.replace(/^\?/,""))||!(/access_token=/.test(h)||/[?&]code=/.test(q)||/token_hash=/.test(h+q)))return;
  if(/\/login(\.html)?$/.test(location.pathname))return;
  var m=location.pathname.match(/^(.*\/)(id|en)\/[^\/]*$/),dir=m?m[1]+m[2]+"/":location.pathname.replace(/[^\/]*$/,"")+"id/";
  window.IB_RECOVERY_REDIRECT=true;location.replace(dir+"login"+q+h);
})();
(function(){
  var C=window.IB_CONFIG||{};
  window.sb=window.IB_RECOVERY_REDIRECT?null:(window.supabase&&C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
  var DUM=document.createElement("div");
  window.$=function(i){return document.getElementById(i)||DUM};
  window.esc=function(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
    });
  };
  var _msgT;
  window.msg=function(t,type){
    var m=$("msg");if(m===DUM)return;
    clearTimeout(_msgT);
    m.hidden=!t;m.textContent=t||"";m.className="msg"+(type?" "+type:"");
    if(t&&type==="ok")_msgT=setTimeout(function(){m.hidden=true;m.textContent="";m.className="msg"},4500);
  };
  var _toastT;
  window.toast=function(m,ms){
    var t=$("toast");if(t===DUM)return;
    t.textContent=m||"";t.classList.add("on");clearTimeout(_toastT);
    var d=ms!=null?ms:Math.max(2400,Math.min(6000,(m||"").length*55));
    _toastT=setTimeout(function(){t.classList.remove("on")},d);
  };
  window.friendlyErr=function(err){
    var tr=window.IB_T||function(k){return k};
    if(!err)return tr("a_notready")||"Terjadi kesalahan. Coba lagi.";
    var raw=(err.message||err.error_description||String(err)||"").toLowerCase();
    var code=err.code||err.status||"";
    if(/failed to fetch|networkerror|network request failed|load failed|offline/i.test(raw))
      return tr("err_network")||"Koneksi bermasalah. Periksa internet lalu coba lagi.";
    if(/jwt|session|expired|invalid claim|not authenticated/i.test(raw)||code===401)
      return tr("err_session")||"Sesi berakhir. Silakan masuk kembali.";
    if(/password should|weak password|known to be weak|easy to guess/i.test(raw))
      return tr(/at least|characters/.test(raw)?"su_e_pass_short":"su_e_pass_weak")||"Password terlalu lemah.";
    if(/email rate limit|over_email_send_rate_limit/i.test(raw+" "+code))
      return tr("su_e_mail_rate")||"Batas pengiriman email tercapai. Tunggu beberapa menit.";
    if(/row-level security|rls|permission|policy|403|42501/i.test(raw)||code===403)
      return tr("err_perm")||"Anda tidak punya izin untuk tindakan ini.";
    if(/duplicate|unique|already exists|23505/i.test(raw))
      return tr("err_dup")||"Data sudah ada. Ubah judul, tanggal, atau kota.";
    if(/rate limit|too many requests|429/i.test(raw)||code===429)
      return tr("err_rate")||"Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    if(/email not confirmed|not confirmed/i.test(raw))
      return tr("a_unconfirmed")||"Email belum dikonfirmasi. Cek kotak masuk.";
    if(/invalid login|invalid credentials|wrong password/i.test(raw))
      return tr("a_bad")||"Email atau kata sandi salah.";
    if(/user already registered|already been registered/i.test(raw))
      return tr("a_exists")||"Email ini sudah terdaftar. Silakan masuk.";
    if(/signups? not allowed|not found/i.test(raw))
      return tr("a_magic_none")||"Email belum terdaftar. Daftar dulu, atau periksa ejaannya.";
    if(/storage|bucket|mime|file size|payload too large/i.test(raw))
      return tr("err_upload")||"Gagal mengunggah berkas. Pastikan format & ukuran sesuai.";
    if(/timeout|aborted/i.test(raw))
      return tr("err_timeout")||"Permintaan kehabisan waktu. Coba lagi.";
    if(raw.length>120||/postgres|supabase|rpc|sql|stack/i.test(raw))
      return tr("a_notready")||"Terjadi kesalahan. Coba lagi nanti.";
    return err.message||tr("a_notready")||"Terjadi kesalahan.";
  };
  window.safeNext=function(def){
    var n=new URLSearchParams(location.search).get("next")||"";
    return /^[a-z0-9][a-z0-9_\-\/.?=&%]*$/i.test(n)&&n.indexOf("..")<0?n:def;
  };
  window.getMe=function(){
    if(!sb)return Promise.resolve(null);
    return sb.auth.getSession().then(function(r){
      var s=r.data.session;if(!s)return null;
      return sb.from("profiles").select("*").eq("id",s.user.id).single()
        .then(function(p){return{user:s.user,profile:p.data||{}}});
    });
  };
  window.loadCities=function(sel,withEmpty){
    if(!sb||!sel)return Promise.resolve();
    return sb.from("cities").select("id,name").order("name").then(function(r){
      if(r.error){sel.innerHTML='<option value="">'+(window.IB_T?IB_T("pickcity"):"Pilih kota")+'</option>';return}
      sel.innerHTML=(withEmpty?'<option value="">'+(window.IB_T?IB_T("pickcity"):"Pilih kota")+'</option>':"")
        +(r.data||[]).map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join("");
    });
  };
})();
