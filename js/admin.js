(function(){
if(!sb){$("lock").hidden=false;$("lockT").textContent="Supabase belum dikonfigurasi di js/config.js.";return}
var CAT={konser:"Konser",naikgunung:"Naik Gunung"},rows=[],editing=null;
function slug(t,d){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+d}
function pv(u){var p=$("pv");p.style.backgroundImage=u?"url('"+u.replace(/'/g,"%27")+"')":"";p.textContent=u?"":"Pratinjau poster"}
function reset(){editing=null;$("fEv").reset();$("fTitle").textContent="Postingan baru";$("bCancel").hidden=true;pv("")}
function list(){sb.from("events").select("*,cities(name)").order("created_at",{ascending:false}).then(function(r){
  rows=r.data||[];$("cnt").textContent=rows.length;
  $("tb").innerHTML=rows.length?rows.map(function(e){return'<tr><td>'+esc(e.title)+'</td><td>'+CAT[e.category]+'</td><td>'+esc(e.cities&&e.cities.name)+'</td><td>'+esc(e.event_date)+'</td><td><span class="badge '+(e.status==="published"?"pub":"")+'">'+(e.status==="published"?"Terbit":"Draft")+'</span></td><td><div class="row"><button class="btn ghost sm" data-a="edit" data-id="'+e.id+'">Edit</button><button class="btn ghost sm" data-a="tog" data-id="'+e.id+'">'+(e.status==="published"?"Tarik":"Terbitkan")+'</button><button class="btn ghost sm" data-a="del" data-id="'+e.id+'">Hapus</button></div></td></tr>'}).join(""):'<tr><td colspan="6" class="meta">Belum ada postingan. Buat yang pertama di formulir.</td></tr>'})}
$("tb").onclick=function(ev){var b=ev.target.closest("button");if(!b)return;var e=rows.filter(function(x){return x.id===b.dataset.id})[0];if(!e)return;
  if(b.dataset.a==="edit"){editing=e.id;$("fTitle").textContent="Edit postingan";$("bCancel").hidden=false;
    ["title","category","city_id","venue","event_date","price_label","description","poster_url","ticket_url","source_ig","status"].forEach(function(k){$("f_"+k).value=e[k]==null?"":e[k]});pv(e.poster_url);scrollTo({top:0,behavior:"smooth"})}
  if(b.dataset.a==="tog")sb.from("events").update({status:e.status==="published"?"draft":"published"}).eq("id",e.id).then(function(r){msg(r.error?r.error.message:"Status diubah.",r.error?"err":"ok");list()});
  if(b.dataset.a==="del"&&confirm("Hapus \""+e.title+"\"?"))sb.from("events").delete().eq("id",e.id).then(function(r){msg(r.error?r.error.message:"Dihapus.",r.error?"err":"ok");list()})};
$("bCancel").onclick=reset;
$("f_poster_url").oninput=function(){pv(this.value)};
$("f_file").onchange=function(){var f=this.files[0];if(!f)return;if(f.size>2*1024*1024)return msg("Poster maksimal 2 MB.","err");
  msg("Mengunggah poster…");var path=Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9.]+/g,"-");
  sb.storage.from("posters").upload(path,f).then(function(r){if(r.error)return msg(r.error.message,"err");
    var u=sb.storage.from("posters").getPublicUrl(path).data.publicUrl;$("f_poster_url").value=u;pv(u);msg("Poster terunggah.","ok")})};
$("fEv").onsubmit=function(e){e.preventDefault();var d={};
  ["title","category","city_id","venue","event_date","price_label","description","poster_url","ticket_url","source_ig","status"].forEach(function(k){var v=$("f_"+k).value.trim();d[k]=v===""?null:v});
  d.source_ig=d.source_ig&&d.source_ig.replace(/^@/,"");d.city_id=+d.city_id;
  var q;if(editing)q=sb.from("events").update(d).eq("id",editing);else{d.slug=slug(d.title,d.event_date);q=sb.from("events").insert(d)}
  q.then(function(r){if(r.error)return msg(r.error.message,"err");msg("Tersimpan.","ok");reset();list()})};
// guard UI. Keamanan sebenarnya ada di RLS (is_admin) pada Supabase
getMe().then(function(m){
  if(!m||m.profile.role!=="admin"){$("lock").hidden=false;$("lockT").textContent=m?"Akun ini bukan admin.":"Silakan masuk dahulu.";return}
  $("panel").hidden=false;$("who").textContent=m.profile.nickname||m.user.email;
  loadCities($("f_city_id"),false);list();
});
})();
