if(/\.html$/.test(location.pathname))history.replaceState(null,"",location.pathname.replace(/index\.html$/,"").replace(/\.html$/,"")+location.search+location.hash);
// Klien Supabase bersama + utilitas UI error/pesan (login, admin, halaman publik yang memuat file ini).
(function(){
  var C=window.IB_CONFIG||{};
  window.sb=(window.supabase&&C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;

  /* $ aman: selalu mengembalikan elemen atau dummy agar .textContent dll tidak melempar. */
  var DUM=document.createElement("div");
  window.$=function(i){return document.getElementById(i)||DUM};

  /* Escape HTML — satu sumber kebenaran untuk semua halaman. */
  window.esc=function(s){
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
    });
  };

  /* Pesan di elemen #msg (form login, ajukan, admin, profil). type: "ok"|"err"|"" .
     Sukses otomatis hilang setelah 4.5 dtk; error tetap sampai diganti. */
  var _msgT;
  window.msg=function(t,type){
    var m=$("msg");
    if(m===DUM)return;
    clearTimeout(_msgT);
    m.hidden=!t;
    m.textContent=t||"";
    m.className="msg"+(type?" "+type:"");
    if(t&&type==="ok"){
      _msgT=setTimeout(function(){m.hidden=true;m.textContent="";m.className="msg"},4500);
    }
  };

  /* Toast ringan di #toast (halaman publik & beberapa form). Durasi menyesuaikan panjang pesan. */
  var _toastT;
  window.toast=function(m,ms){
    var t=$("toast");
    if(t===DUM)return;
    t.textContent=m||"";
    t.classList.add("on");
    clearTimeout(_toastT);
    var d=ms!=null?ms:Math.max(2400,Math.min(6000,(m||"").length*55));
    _toastT=setTimeout(function(){t.classList.remove("on")},d);
  };

  /* Petakan error Supabase / jaringan ke teks ramah pengguna (menghormati i18n bila tersedia). */
  window.friendlyErr=function(err){
    var tr=window.IB_T||function(k){return k};
    if(!err)return tr("a_notready")||"Terjadi kesalahan. Coba lagi.";
    var raw=(err.message||err.error_description||String(err)||"").toLowerCase();
    var code=err.code||err.status||"";

    if(/failed to fetch|networkerror|network request failed|load failed|offline/i.test(raw))
      return tr("err_network")||"Koneksi bermasalah. Periksa internet lalu coba lagi.";
    if(/jwt|session|expired|invalid claim|not authenticated/i.test(raw)||code===401)
      return tr("err_session")||"Sesi berakhir. Silakan masuk kembali.";
    if(/row-level security|rls|permission|policy|403|42501/i.test(raw)||code===403)
      return tr("err_perm")||"Anda tidak punya izin untuk tindakan ini.";
    if(/duplicate|unique|already exists|23505/i.test(raw))
      return tr("err_dup")||"Data sudah ada. Ubah judul, tanggal, atau kota.";
    if(/rate limit|too many requests|429/i.test(raw)||code===429)
      return tr("err_rate")||"Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    if(/email not confirmed|not confirmed/i.test(raw))
      return tr("a_unconfirmed")||"Email belum dikonfirmasi. Cek kotak masuk.";
    if(/invalid login|invalid credentials|wrong password|a_bad/i.test(raw))
      return tr("a_bad")||"Email atau kata sandi salah.";
    if(/user already registered|already been registered/i.test(raw))
      return tr("a_exists")||"Email ini sudah terdaftar. Silakan masuk.";
    if(/signups? not allowed|not found/i.test(raw))
      return tr("a_magic_none")||"Email belum terdaftar. Daftar dulu, atau periksa ejaannya.";
    if(/storage|bucket|mime|file size|payload too large/i.test(raw))
      return tr("err_upload")||"Gagal mengunggah berkas. Pastikan format & ukuran sesuai.";
    if(/timeout|aborted/i.test(raw))
      return tr("err_timeout")||"Permintaan kehabisan waktu. Coba lagi.";

    /* Fallback: jangan tampilkan pesan teknis mentah ke pengguna. */
    if(raw.length>120||/postgres|supabase|rpc|sql|stack/i.test(raw))
      return tr("a_notready")||"Terjadi kesalahan. Coba lagi nanti.";
    return err.message||tr("a_notready")||"Terjadi kesalahan.";
  };

  /* ?next=... : tujuan setelah masuk atau menyimpan profil. Hanya alamat relatif aman. */
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
