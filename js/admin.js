(function(){
if(!sb){$("lock").hidden=false;$("lockT").textContent="Supabase belum dikonfigurasi di js/config.js.";return}
var KEYS=["title","city_id","event_date","end_date","price_label","venue","genre","lineup","mountain","altitude_mdpl","difficulty","duration","description","poster_url","ticket_url","source_ig"];
var CAT={konser:"🎤 Konser",naikgunung:"⛰️ Naik Gunung"},DIF={pemula:"Pemula",menengah:"Menengah",sulit:"Sulit"};
var MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
var rows=[],editing=null,kind="konser",fk="",view="dash";
function tdy(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function fd(s){if(!s)return"";var d=new Date(s+"T00:00:00");return d.getDate()+" "+MON[d.getMonth()]+" "+d.getFullYear()}
function slug(t,d){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+d}
function pv(u){var p=$("pv");p.style.backgroundImage=u?"url('"+u.replace(/'/g,"%27")+"')":"";p.textContent=u?"":"Tarik poster ke sini atau ketuk untuk memilih (JPG/PNG, otomatis dikecilkan)"}
function go(v){view=v;["dash","list","form"].forEach(function(x){$("v_"+x).hidden=x!==v});
  [].forEach.call(document.querySelectorAll("#bnav button"),function(b){b.classList.toggle("on",b.dataset.v===v)});scrollTo(0,0);msg("")}
function setKind(k){kind=k;[].forEach.call(document.querySelectorAll(".kind button"),function(b){b.classList.toggle("on",b.dataset.kind===k)});
  [].forEach.call(document.querySelectorAll("[data-for]"),function(f){f.hidden=f.dataset.for!==k});
  $("lVenue").firstChild.textContent=k==="konser"?"Lokasi / venue":"Basecamp / titik kumpul"}
function newPost(k){editing=null;$("fEv").reset();pv("");$("fTitle").textContent=k==="konser"?"Konser baru":"Pendakian baru";setKind(k);go("form")}
function fill(e,asCopy){editing=asCopy?null:e.id;setKind(e.category);$("fTitle").textContent=asCopy?"Duplikat postingan":"Edit postingan";
  KEYS.forEach(function(k){$("f_"+k).value=e[k]==null?"":e[k]});if(asCopy)$("f_title").value=e.title+" (salinan)";pv(e.poster_url);go("form")}
function badge(e){return'<span class="badge '+(e.status==="published"?"pub":"")+'">'+(e.status==="published"?"Terbit":"Draft")+'</span>'+((e.end_date||e.event_date)<tdy()?' <span class="badge">Selesai</span>':'')}
function detail(e){return e.category==="konser"?(e.genre||""):[e.mountain,e.altitude_mdpl?e.altitude_mdpl+" mdpl":"",DIF[e.difficulty]].filter(Boolean).join(" · ")}
function item(e){return'<div class="it"><div class="th" style="'+(e.poster_url?"background-image:url(\\'"+esc(e.poster_url)+"\\')":"")+'"></div><div class="ib"><b>'+esc(e.title)+'</b><div class="meta">'+CAT[e.category]+' · '+esc(e.cities&&e.cities.name)+' · '+fd(e.event_date)+' '+badge(e)+'</div>'+(detail(e)?'<div class="meta">'+esc(detail(e))+'</div>':'')
  +'<div class="row" style="margin-top:6px"><button class="btn ghost sm" data-a="edit" data-id="'+e.id+'">Edit</button><button class="btn ghost sm" data-a="tog" data-id="'+e.id+'">'+(e.status==="published"?"Tarik":"Terbitkan")+'</button><button class="btn ghost sm" data-a="dup" data-id="'+e.id+'">Duplikat</button><button class="btn ghost sm" data-a="del" data-id="'+e.id+'">Hapus</button></div></div></div>'}
function draw(){
  var n=function(f){return rows.filter(f).length};
  $("nAll").textContent=rows.length;$("nPub").textContent=n(function(e){return e.status==="published"});$("nDr").textContent=n(function(e){return e.status==="draft"});
  $("nKon").textContent=n(function(e){return e.category==="konser"});$("nGun").textContent=n(function(e){return e.category==="naikgunung"});
  var today=tdy();
  var soon=rows.filter(function(e){return e.status==="published"&&(e.end_date||e.event_date)>=today}).sort(function(a,b){return a.event_date<b.event_date?-1:1}).slice(0,5);
  $("soon").innerHTML=soon.length?soon.map(item).join(""):'<div class="meta">Belum ada event terbit yang akan datang.</div>';
  var q=$("flQ").value.toLowerCase(),st=$("flStatus").value,ct=$("flCity").value;
  var l=rows.filter(function(e){return(!fk||e.category===fk)&&(!st||e.status===st)&&(!ct||String(e.city_id)===ct)&&e.title.toLowerCase().indexOf(q)>-1});
  $("items").innerHTML=l.length?l.map(item).join(""):'<div class="empty">Tidak ada postingan yang cocok. Ubah filter atau buat postingan baru.</div>';
}
function load(){return sb.from("events").select("*,cities(name)").order("event_date",{ascending:false}).then(function(r){if(r.error)msg(r.error.message,"err");rows=r.data||[];draw()})}
document.addEventListener("click",function(ev){var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v){if(b.dataset.v==="form")newPost(kind);else go(b.dataset.v)}
  if(b.dataset.new)newPost(b.dataset.new);
  if(b.dataset.kind)setKind(b.dataset.kind);
  if(b.dataset.k!==undefined&&b.closest("#flKind")){fk=b.dataset.k;[].forEach.call(document.querySelectorAll("#flKind .tab"),function(t){t.classList.toggle("on",t===b)});draw()}
  if(b.dataset.a){var e=rows.filter(function(x){return x.id===b.dataset.id})[0];if(!e)return;
    if(b.dataset.a==="edit")fill(e);if(b.dataset.a==="dup")fill(e,true);
    if(b.dataset.a==="tog")sb.from("events").update({status:e.status==="published"?"draft":"published"}).eq("id",e.id).then(function(r){msg(r.error?r.error.message:"Status diubah.",r.error?"err":"ok");load()});
    if(b.dataset.a==="del"&&confirm('Hapus "'+e.title+'"?'))sb.from("events").delete().eq("id",e.id).then(function(r){msg(r.error?r.error.message:"Dihapus.",r.error?"err":"ok");load()})}});
["flStatus","flCity"].forEach(function(i){$(i).onchange=draw});$("flQ").oninput=draw;
$("bCancel").onclick=function(){go("list")};
$("f_poster_url").oninput=function(){pv(this.value)};
$("f_file").onchange=function(){var f=this.files[0];if(!f)return;if(f.size>2*1024*1024)return msg("Poster maksimal 2 MB.","err");
  msg("Mengunggah poster…");var path=Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]+/g,"-");
  sb.storage.from("posters").upload(path,f).then(function(r){if(r.error)return msg(r.error.message,"err");
    var u=sb.storage.from("posters").getPublicUrl(path).data.publicUrl;$("f_poster_url").value=u;pv(u);msg("Poster terunggah.","ok")})};
var saveAs="draft";
$("fEv").addEventListener("click",function(ev){var b=ev.target.closest("[data-save]");if(b)saveAs=b.dataset.save});
$("fEv").onsubmit=function(e){e.preventDefault();var d={};
  KEYS.forEach(function(k){var v=$("f_"+k).value.trim();d[k]=v===""?null:v});
  d.source_ig=d.source_ig&&d.source_ig.replace(/^@/,"");d.city_id=+d.city_id;d.altitude_mdpl=d.altitude_mdpl?+d.altitude_mdpl:null;
  if(d.end_date&&d.end_date<d.event_date)return msg("Tanggal selesai tidak boleh sebelum tanggal mulai.","err");
  if(kind==="konser"){d.mountain=d.altitude_mdpl=d.difficulty=d.duration=null}else{d.genre=d.lineup=null}
  d.category=kind;d.status=saveAs;
  var q;if(editing)q=sb.from("events").update(d).eq("id",editing);else{d.slug=slug(d.title,d.event_date);q=sb.from("events").insert(d)}
  q.then(function(r){if(r.error)return msg(r.error.message.indexOf("duplicate")>-1?"Judul dan tanggal yang sama sudah ada.":r.error.message,"err");
    load().then(function(){go("list");msg(saveAs==="published"?"Tersimpan dan terbit.":"Tersimpan sebagai draft.","ok")})})};
getMe().then(function(m){
  if(!m||m.profile.role!=="admin"){$("lock").hidden=false;$("lockT").textContent=m?"Akun ini bukan admin.":"Silakan masuk dahulu.";return}
  $("panel").hidden=false;$("bnav").hidden=false;$("who").textContent=m.profile.nickname||m.user.email;setKind("konser");
  loadCities($("f_city_id"),true);loadCities($("flCity"),true).then(function(){$("flCity").options[0].text="Semua kota"});load();
});
})();
