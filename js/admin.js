(function(){
if(!sb){$("lock").hidden=false;$("lockT").textContent=(!window.supabase?"Pustaka Supabase gagal dimuat dari CDN. Cek koneksi/pemblokir iklan lalu muat ulang.":!(window.IB_CONFIG&&IB_CONFIG.SUPABASE_URL)?"File js/config.js tidak terbaca atau kosong. Buka alamat /js/config.js untuk mengeceknya.":"Supabase belum siap. Muat ulang halaman.");return}
var KEYS=["title","city_id","event_date","end_date","price_label","venue","genre","lineup","mountain","altitude_mdpl","difficulty","duration","quota","organizer","contact_wa","description","poster_url","ticket_url","source_ig","sponsor_label","featured_until"];
var CAT={konser:"Konser",naikgunung:"Naik Gunung",pameran:"Pameran",festival:"Festival",komedi:"Komedi",seminar:"Seminar",meetup:"Meetup",lainnya:"Lainnya"},DIF={pemula:"Pemula",menengah:"Menengah",sulit:"Sulit"};
var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
var ST={published:"Terbit",draft:"Draft",pending:"Menunggu",rejected:"Ditolak"};
var rows=[],editing=null,editStatus="draft",kind="konser",fk="",view="dash";
/* "hari ini" menurut WIB, sama dengan situs publik (bukan jam perangkat admin) */
function tdy(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}
function fd(s){if(!s)return"";var d=new Date(s+"T00:00:00");return d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
function slug(t,d){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+d}
function pv(u){var p=$("pv");p.style.backgroundImage=u?"url('"+u.replace(/'/g,"%27")+"')":"";p.textContent=u?"":"Tarik poster ke sini atau ketuk untuk memilih (JPG/PNG, otomatis dikecilkan)"}
var VIEW_TITLES={dash:"Beranda",review:"Persetujuan Event",forum:"Komunitas & Grup",words:"Filter Kata (ID)",sponsor:"Lead Sponsor",list:"Kelola Postingan",blog:"Artikel Blog",arsip:"Arsip Blog",stats:"Statistik Situs",form:"Buat / Edit Postingan"};
/* Dialog modal inline pengganti alert/confirm/prompt */
window.admAsk=function(o){o=o||{};return new Promise(function(res){
  var d=document.createElement("dialog");d.className="aqd adm-dlg";
  var chips=Array.isArray(o.presets)&&o.presets.length?'<div class="adm-presets">'+o.presets.map(function(p){return'<button type="button" class="chip" data-preset="'+esc(p)+'">'+esc(p)+'</button>'}).join("")+'</div>':"";
  var inpHtml="";
  if(o.banForm){
    inpHtml='<label class="f">Lama blokir (hari, 0 = permanen)<input name="days" type="number" min="0" max="3650" value="7" required></label>'+
      '<label class="f">Alasan (dibaca pengguna)<textarea name="why" rows="3" maxlength="300" required>Melanggar aturan komunitas GWM.</textarea></label>';
  }else if(o.input){
    inpHtml=chips+'<label class="f">'+(o.inputLabel?esc(o.inputLabel):"")+'<textarea name="v" rows="3" maxlength="300" placeholder="'+esc(o.ph||"")+'">'+esc(o.def||"")+'</textarea></label>';
  }
  d.innerHTML='<form method="dialog" class="aqf"><h3>'+esc(o.title||"Konfirmasi")+'</h3>'+(o.text?'<p class="meta" style="margin-bottom:10px">'+esc(o.text)+'</p>':"")+inpHtml+
    '<div class="row"><button class="btn ghost sm" value="no" formnovalidate>'+esc(o.no||"Batal")+'</button><button class="btn pri sm" value="ok">'+esc(o.ok||"Lanjutkan")+'</button></div></form>';
  document.body.appendChild(d);
  d.addEventListener("click",function(ev){
    var pr=ev.target.closest("[data-preset]");if(!pr)return;
    var ta=d.querySelector('textarea[name="v"]');if(ta){ta.value=pr.dataset.preset;ta.focus()}
  });
  d.addEventListener("close",function(){
    var ok=d.returnValue==="ok";
    if(!ok){d.remove();return res(null)}
    if(o.banForm){
      var days=parseInt(d.querySelector('[name="days"]').value,10);
      var why=d.querySelector('[name="why"]').value.trim();
      d.remove();return res({days:isNaN(days)?7:days,why:why});
    }
    var ta=d.querySelector('textarea[name="v"]');
    d.remove();res(ta?ta.value.trim():true);
  });
  d.showModal();
})};
function go(v){view=v;["dash","review","forum","words","sponsor","list","blog","arsip","stats","form"].forEach(function(x){var el=$("v_"+x);if(el)el.hidden=x!==v});
  [].forEach.call(document.querySelectorAll("#bnav button"),function(b){b.classList.toggle("on",b.dataset.v===v||(b.dataset.g||"").split(",").indexOf(v)>-1)});
  [].forEach.call(document.querySelectorAll("#admSide button"),function(b){b.classList.toggle("on",b.dataset.v===v)});
  [].forEach.call(document.querySelectorAll(".seg[data-g] button"),function(b){b.classList.toggle("on",b.dataset.v===v)});
  if($("admSection"))$("admSection").textContent=VIEW_TITLES[v]||"Admin";
  scrollTo(0,0);msg("")}
function setKind(k){kind=k;[].forEach.call(document.querySelectorAll(".kind button"),function(b){b.classList.toggle("on",b.dataset.kind===k)});
  [].forEach.call(document.querySelectorAll("[data-for]"),function(f){f.hidden=f.dataset.for==="konser"?(k==="naikgunung"||k==="pameran"):f.dataset.for!==k});
  $("lVenue").firstChild.textContent=k==="naikgunung"?"Basecamp / titik kumpul":"Lokasi / venue"}
function newPost(k){editing=null;editStatus="draft";$("fEv").reset();pv("");$("fTitle").textContent=k==="naikgunung"?"Pendakian baru":"Event baru: "+(CAT[k]||k);setKind(k);go("form")}
function fill(e,asCopy){editing=asCopy?null:e.id;editStatus=asCopy?"draft":e.status;setKind(e.category);$("fTitle").textContent=asCopy?"Duplikat postingan":"Edit postingan";
  KEYS.forEach(function(k){$("f_"+k).value=e[k]==null?"":e[k]});if(asCopy)$("f_title").value=e.title+" (salinan)";pv(e.poster_url);go("form")}
function badge(e){return'<span class="badge '+(e.status==="published"?"pub":e.status==="pending"?"adm":"")+'">'+(ST[e.status]||e.status)+'</span>'+(e.is_community?' <span class="badge">Komunitas</span>':'')+((e.end_date||e.event_date)<tdy()?' <span class="badge">Selesai</span>':'')}
function detail(e){return e.category!=="naikgunung"?(e.genre||""):[e.mountain,e.altitude_mdpl?e.altitude_mdpl+" mdpl":"",DIF[e.difficulty],e.quota?"kuota "+e.quota:"",e.organizer,e.contact_wa?"WA "+e.contact_wa:""].filter(Boolean).join(" · ")}
function reason(e){var s=e.event_submissions;s=Array.isArray(s)?s[0]:s;return s&&s.reject_reason||""}
function who(e){var s=e.event_submissions;s=Array.isArray(s)?s[0]:s;return s&&s.profiles&&s.profiles.nickname?s.profiles.nickname:""}
function item(e){return'<div class="it"><div class="th" style="'+(e.poster_url?"background-image:url('"+esc(e.poster_url).replace(/'/g,"%27")+"')":"")+'"></div><div class="ib"><b>'+esc(e.title)+'</b><div class="meta">'+CAT[e.category]+' · '+esc(e.cities&&e.cities.name)+' · '+fd(e.event_date)+' '+badge(e)+'</div>'+(detail(e)?'<div class="meta">'+esc(detail(e))+'</div>':'')+(who(e)?'<div class="meta">Diajukan oleh '+esc(who(e))+'</div>':'')+(e.status==="rejected"&&reason(e)?'<div class="meta" style="color:var(--err)">Alasan: '+esc(reason(e))+'</div>':'')
  +'<div class="row" style="margin-top:6px"><button class="btn ghost sm" data-a="edit" data-id="'+e.id+'">Edit</button>'+(e.status==="pending"||e.status==="rejected"?'<button class="btn sm" data-a="ok" data-id="'+e.id+'">Setujui</button>'+(e.status==="pending"?'<button class="btn ghost sm" data-a="no" data-id="'+e.id+'">Tolak</button>':''):'<button class="btn ghost sm" data-a="tog" data-id="'+e.id+'">'+(e.status==="published"?"Tarik":"Terbitkan")+'</button>')+'<button class="btn ghost sm" data-a="dup" data-id="'+e.id+'">Duplikat</button><button class="btn ghost sm" data-a="del" data-id="'+e.id+'">Hapus</button></div></div></div>'}
function draw(){
  var n=function(f){return rows.filter(f).length};
  $("nAll").textContent=rows.length;$("nPub").textContent=n(function(e){return e.status==="published"});$("nDr").textContent=n(function(e){return e.status==="draft"});
  $("nKon").textContent=n(function(e){return e.category==="konser"});$("nGun").textContent=n(function(e){return e.category==="naikgunung"});
  var pend=rows.filter(function(e){return e.status==="pending"}).sort(function(a,b){return(a.created_at||"")<(b.created_at||"")?-1:1});
  $("nPend").textContent=pend.length;$("nPend2").textContent=pend.length;$("pendCta").hidden=!pend.length;$("bPend").hidden=!pend.length;$("bPend").textContent=pend.length;if($("sPend")){$("sPend").hidden=!pend.length;$("sPend").textContent=pend.length}
  $("rev").innerHTML=pend.length?pend.map(item).join(""):'<div class="empty">Tidak ada pengajuan yang menunggu.</div>';
  var today=tdy();
  var soon=rows.filter(function(e){return e.status==="published"&&(e.end_date||e.event_date)>=today}).sort(function(a,b){return a.event_date<b.event_date?-1:1}).slice(0,5);
  $("soon").innerHTML=soon.length?soon.map(item).join(""):'<div class="meta">Belum ada event terbit yang akan datang.</div>';
  var q=$("flQ").value.toLowerCase(),st=$("flStatus").value,ct=$("flCity").value;
  var l=rows.filter(function(e){return(!fk||e.category===fk)&&(!st||e.status===st)&&(!ct||String(e.city_id)===ct)&&e.title.toLowerCase().indexOf(q)>-1});
  $("items").innerHTML=l.length?l.map(item).join(""):'<div class="empty">Tidak ada postingan yang cocok. Ubah filter atau buat postingan baru.</div>';
}
function load(){return sb.from("events").select("*,cities(name),event_submissions(user_id,reject_reason,profiles(nickname))").order("event_date",{ascending:false}).then(function(r){if(r.error)msg(friendlyErr(r.error),"err");rows=r.data||[];draw()})}
document.addEventListener("click",function(ev){var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v){if(b.dataset.v==="form")newPost(kind);else go(b.dataset.v)}
  if(b.dataset.new)newPost(b.dataset.new);
  if(b.dataset.kind)setKind(b.dataset.kind);
  if(b.dataset.k!==undefined&&b.closest("#flKind")){fk=b.dataset.k;[].forEach.call(document.querySelectorAll("#flKind .tab"),function(t){t.classList.toggle("on",t===b)});draw()}
  if(b.dataset.a){var e=rows.filter(function(x){return x.id===b.dataset.id})[0];if(!e)return;
    if(b.dataset.a==="edit")fill(e);
    if(b.dataset.a==="ok")sb.rpc("admin_review_event",{p_id:e.id,p_ok:true,p_reason:null}).then(function(r){msg(r.error?friendlyErr(r.error):"Disetujui dan tayang.",r.error?"err":"ok");load()});
    if(b.dataset.a==="no"){
      admAsk({title:"Tolak pengajuan event",text:'Berikan alasan penolakan untuk "'+e.title+'" agar pengaju dapat memperbaiki.',input:true,ph:"Tulis alasan penolakan (opsional)…",presets:["Poster kurang jelas / tidak sesuai","Tanggal atau lokasi belum lengkap","Kontak penyelenggara tidak valid","Konten tidak sesuai panduan GWM"],ok:"Tolak Pengajuan"}).then(function(why){
        if(why===null)return;
        sb.rpc("admin_review_event",{p_id:e.id,p_ok:false,p_reason:why}).then(function(r){msg(r.error?friendlyErr(r.error):"Pengajuan ditolak.",r.error?"err":"ok");load()});
      });
    }
    if(b.dataset.a==="dup")fill(e,true);
    if(b.dataset.a==="tog")sb.from("events").update({status:e.status==="published"?"draft":"published"}).eq("id",e.id).then(function(r){msg(r.error?friendlyErr(r.error):"Status diubah.",r.error?"err":"ok");load()});
    if(b.dataset.a==="del"){
      admAsk({title:"Hapus postingan",text:'Hapus permanen "'+e.title+'"?',ok:"Hapus"}).then(function(ok){
        if(!ok)return;
        sb.from("events").delete().eq("id",e.id).then(function(r){msg(r.error?friendlyErr(r.error):"Dihapus.",r.error?"err":"ok");load()});
      });
    }}});
["flStatus","flCity"].forEach(function(i){$(i).onchange=draw});$("flQ").oninput=draw;
$("bCancel").onclick=function(){go("list")};
$("f_poster_url").oninput=function(){pv(this.value)};
$("f_file").onchange=function(){var f=this.files[0];if(!f)return;if(f.size>2*1024*1024)return msg("Poster maksimal 2 MB.","err");
  msg("Mengunggah poster…");var path=Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]+/g,"-");
  sb.storage.from("posters").upload(path,f,{cacheControl:"31536000"}).then(function(r){if(r.error)return msg(friendlyErr(r.error),"err");
    var u=sb.storage.from("posters").getPublicUrl(path).data.publicUrl;$("f_poster_url").value=u;pv(u);msg("Poster terunggah.","ok")})};
var saveAs="draft";
/* Enter di kolom isian tidak boleh menyimpan diam-diam (browser menekan tombol "Simpan draft" yang pertama, sehingga postingan terbit bisa jadi draft). Simpan hanya lewat tombol. */
$("fEv").addEventListener("keydown",function(ev){if(ev.key==="Enter"&&ev.target.tagName==="INPUT")ev.preventDefault()});
$("fEv").onsubmit=function(e){e.preventDefault();var d={};saveAs=(e.submitter&&e.submitter.dataset.save)||(editing?editStatus:"draft");
  KEYS.forEach(function(k){var v=$("f_"+k).value.trim();d[k]=v===""?null:v});
  d.source_ig=d.source_ig&&d.source_ig.replace(/^@/,"");d.city_id=+d.city_id;d.altitude_mdpl=d.altitude_mdpl?+d.altitude_mdpl:null;d.quota=d.quota?+d.quota:null;
  if(d.contact_wa){var w=d.contact_wa.replace(/\D/g,"");if(w.charAt(0)==="0")w="62"+w.slice(1);if(!/^62\d{8,13}$/.test(w))return msg("Nomor WhatsApp tidak valid.","err");d.contact_wa=w}
  if(d.end_date&&d.end_date<d.event_date)return msg("Tanggal selesai tidak boleh sebelum tanggal mulai.","err");
  if(kind==="naikgunung"||kind==="pameran"){d.genre=d.lineup=null}if(kind!=="naikgunung"){d.mountain=d.altitude_mdpl=d.difficulty=d.duration=d.quota=d.organizer=d.contact_wa=null}
  d.category=kind;d.status=saveAs;
  if($("f_is_featured")&&$("f_is_featured")!==document.documentElement){d.is_featured=!!$("f_is_featured").checked;d.boost_score=Math.max(0,Math.min(100,parseInt(($("f_boost_score")||{}).value,10)||0))}
  /* Anti-duplikat: kota + tanggal mulai + 10 huruf/angka pertama judul yang sama dengan postingan lain */
  var nk=function(t){return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,10)};
  var dup=rows.filter(function(x){return x.id!==editing&&x.city_id===d.city_id&&x.event_date===d.event_date&&nk(x.title)===nk(d.title)})[0];
  if(dup)return msg('Sudah ada postingan yang sama: "'+dup.title+'" ('+(ST[dup.status]||dup.status)+'). Edit yang itu, atau ubah judul/tanggal.',"err");
  var q;if(editing)q=sb.from("events").update(d).eq("id",editing);else{d.slug=slug(d.title+" "+(($("f_city_id").selectedOptions[0]||{}).text||""),d.event_date);q=sb.from("events").insert(d)}
  q.then(function(r){if(r.error)return msg(r.error.message.indexOf("duplicate")>-1?"Postingan yang sama (kota, tanggal, judul) sudah ada.":r.error.message,"err");
    load().then(function(){go("list");msg(saveAs==="published"?"Tersimpan dan terbit.":"Tersimpan sebagai draft.","ok")})})};
getMe().then(function(m){
  if(!m||m.profile.role!=="admin"){$("lock").hidden=false;$("lockT").textContent=m?"Akun ini bukan admin.":"Silakan masuk dahulu.";return}
  $("panel").hidden=false;$("bnav").hidden=false;if(window.IB_MountainBind)IB_MountainBind($("f_mountain"),$("f_altitude_mdpl"));$("who").textContent=m.profile.nickname||m.user.email;setKind("konser");
  loadCities($("f_city_id"),true);loadCities($("flCity"),true).then(function(){$("flCity").options[0].text="Semua kota"});load();
});
})();
