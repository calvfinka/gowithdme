/* Moderasi komunitas di /admin. Baca langsung dari tabel forum_* (RLS: hanya admin), tindakan lewat admin_forum_moderate (supabase/schema_forum_admin.sql). */
(function(){
if(!window.sb)return;
var tab="rep",reports={},ready=false,busy=false;
var KIND={teman:"Cari teman",tanya:"Tanya info",tips:"Tips"},ST={open:"Tayang",hidden:"Disembunyikan",deleted:"Dihapus"};
function nm(p){return p&&p.nickname?p.nickname:"Pengguna"}
function dt(s){if(!s)return"";try{return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(s))}catch(e){return""}}
function one(x){return Array.isArray(x)?x[0]:x}
function sqlHint(err){return/handled_at|admin_forum_moderate|does not exist|schema cache/i.test(err.message||"")?"Jalankan supabase/schema_forum_admin.sql di SQL Editor Supabase, lalu muat ulang. ("+err.message+")":err.message}

/* Laporan yang belum ditangani, dikelompokkan per kiriman/balasan */
function loadReports(){
  return sb.from("forum_reports").select("post_id,reply_id,reason,created_at,profiles(nickname)").is("handled_at",null).order("created_at",{ascending:false}).limit(500).then(function(r){
    if(r.error){msg(sqlHint(r.error),"err");return false}
    reports={};(r.data||[]).forEach(function(x){var k=x.post_id?"post:"+x.post_id:"reply:"+x.reply_id;(reports[k]=reports[k]||[]).push(x)});
    var n=Object.keys(reports).length;
    $("fmNRep").textContent=n;$("nFrep").textContent=n;$("fCta").hidden=!n;$("bFrep").hidden=!n;$("bFrep").textContent=n;
    return true})}

var PCOLS="id,city,kind,title,body,status,created_at,profiles(nickname),events(title)",RCOLS="id,post_id,body,status,created_at,profiles(nickname),forum_posts(id,title,city)";
function fetchItems(){
  var ids=function(t){return Object.keys(reports).filter(function(k){return k.indexOf(t+":")===0}).map(function(k){return k.slice(t.length+1)})};
  var P,R;
  if(tab==="rep"){
    var pi=ids("post"),ri=ids("reply");
    P=pi.length?sb.from("forum_posts").select(PCOLS).in("id",pi):Promise.resolve({data:[]});
    R=ri.length?sb.from("forum_replies").select(RCOLS).in("id",ri):Promise.resolve({data:[]});
  }else if(tab==="new"){
    P=sb.from("forum_posts").select(PCOLS).eq("status","open").order("created_at",{ascending:false}).limit(40);
    R=sb.from("forum_replies").select(RCOLS).eq("status","open").order("created_at",{ascending:false}).limit(40);
  }else{
    P=sb.from("forum_posts").select(PCOLS).in("status",["hidden","deleted"]).order("created_at",{ascending:false}).limit(40);
    R=sb.from("forum_replies").select(RCOLS).in("status",["hidden","deleted"]).order("created_at",{ascending:false}).limit(40);
  }
  return Promise.all([P,R]).then(function(x){
    var err=x[0].error||x[1].error;if(err){msg(sqlHint(err),"err");return[]}
    var L=(x[0].data||[]).map(function(r){return{t:"post",row:r}}).concat((x[1].data||[]).map(function(r){return{t:"reply",row:r}}));
    L.sort(function(a,b){return a.row.created_at<b.row.created_at?1:-1});return L})}

function btn(a,t,id,label,cls){return'<button class="btn '+(cls||"ghost")+' sm" data-fa="'+a+'" data-t="'+t+'" data-id="'+id+'" type="button">'+label+'</button>'}
function card(it){
  var r=it.row,t=it.t,rs=reports[t+":"+r.id]||[],post=t==="reply"?one(r.forum_posts):null,city=t==="post"?r.city:post&&post.city;
  var ctx=t==="post"?'<span class="badge">'+(KIND[r.kind]||r.kind)+'</span> <span class="badge">'+esc(r.city)+'</span>':'<span class="badge">Balasan</span>'+(post?' <span class="meta">di: '+esc(post.title)+' · '+esc(post.city)+'</span>':'');
  var h='<div class="fm"><div class="ctx">'+ctx+' <span class="badge '+(r.status==="open"?"pub":"")+'">'+(ST[r.status]||r.status)+'</span></div>';
  if(t==="post")h+='<b class="t">'+esc(r.title)+'</b>';
  h+='<div class="meta">'+esc(nm(one(r.profiles)))+' · '+esc(dt(r.created_at))+(t==="post"&&one(r.events)?' · event: '+esc(one(r.events).title):'')+'</div><div class="bd">'+esc(r.body)+'</div>';
  if(rs.length)h+='<div class="rs hot"><b>'+rs.length+' laporan belum diperiksa</b>'+rs.slice(0,5).map(function(x){return'<div>“'+esc(x.reason)+'” <span class="meta">— '+esc(nm(one(x.profiles)))+', '+esc(dt(x.created_at))+'</span></div>'}).join("")+(rs.length>5?'<div class="meta">dan '+(rs.length-5)+' lainnya</div>':'')+'</div>';
  h+='<div class="row">';
  if(r.status==="open"){
    if(rs.length)h+=btn("keep",t,r.id,"Abaikan laporan");
    h+=btn("hide",t,r.id,"Sembunyikan")+btn("delete",t,r.id,"Hapus");
    if(t==="post"&&city)h+='<a class="btn ghost sm" target="_blank" rel="noopener" href="id/komunitas?kota='+encodeURIComponent(city)+'&p='+encodeURIComponent(r.id)+'">Lihat di situs</a>';
  }else if(r.status==="hidden"){h+=btn("keep",t,r.id,"Pulihkan","")+btn("delete",t,r.id,"Hapus")}
  else h+='<span class="meta">Sudah dihapus. Tidak bisa dipulihkan dari panel.</span>';
  return h+'</div></div>'}


/* ---------- Grup & kota ---------- */
var GROUP_RE=/^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel|t\.me|discord\.gg|discord\.com\/invite)\//i,KG={umum:"Umum",konser:"Konser",gunung:"Gunung"};
var C={cities:[],stats:{},groups:[],wait:[],names:[]};
function opt(v,l,sel){return'<option value="'+esc(v)+'"'+(sel?" selected":"")+'>'+esc(l)+'</option>'}
function cfg(){
  var box=$("fmList");box.innerHTML='<div class="meta">Memuat…</div>';
  Promise.all([sb.from("forum_cities").select("*").order("sort").order("name"),sb.from("forum_city_stats").select("city,posts,groups,waiting"),sb.from("forum_groups").select("*").order("created_at"),sb.rpc("admin_forum_waitlist"),sb.from("cities").select("name").order("name")]).then(function(x){
    var err=x[0].error||x[1].error||x[2].error||x[4].error;if(err){box.innerHTML="";msg(sqlHint(err),"err");return}
    C.cities=x[0].data||[];C.stats={};(x[1].data||[]).forEach(function(r){C.stats[r.city]=r});C.groups=x[2].data||[];
    C.wait=x[3].error?null:(x[3].data||[]);C.names=(x[4].data||[]).map(function(c){return c.name});
    drawCfg()})}
function drawCfg(edit){
  var box=$("fmList"),g=edit||{};
  var h='<h3 class="kh">Kota komunitas</h3>';
  h+=C.cities.length?C.cities.map(function(c){var st=C.stats[c.name]||{};
    return'<div class="fm"><b class="t">'+esc(c.name)+' <span class="badge '+(c.active?"pub":"")+'">'+(c.active?"Buka":"Tutup")+'</span></b><div class="meta">'+(st.posts||0)+' kiriman · '+(st.groups||0)+' grup aktif · '+(st.waiting||0)+' menunggu</div>'+
     '<div class="row"><label class="meta">Urutan <input type="number" class="sm" style="width:70px" data-sort="'+esc(c.name)+'" value="'+(c.sort||100)+'"></label>'+
     btnC("togcity",c.name,c.active?"Tutup kota":"Buka kota")+'</div></div>'}).join(""):'<div class="empty">Belum ada kota. Tambahkan di bawah.</div>';
  h+='<form class="fm cfgf" data-f="city"><b class="t">Buka kota baru</b><label class="f">Nama kota<input name="name" list="cfgNames" maxlength="60" required placeholder="mis. Semarang"></label><datalist id="cfgNames">'+C.names.map(function(n){return'<option value="'+esc(n)+'">'}).join("")+'</datalist><div class="row"><button class="btn sm" type="submit">Buka kota</button></div><p class="meta">Tulis persis seperti di daftar kota agar cocok dengan filter event. Kota tidak bisa dihapus dari sini; pakai Tutup kota.</p></form>';
  h+='<h3 class="kh">Permintaan kota</h3>';
  if(C.wait===null)h+='<div class="msg err">Jalankan supabase/schema_forum_admin2.sql agar daftar permintaan tampil.</div>';
  else h+=C.wait.length?C.wait.map(function(w){return'<div class="fm"><b class="t">'+esc(w.city)+'</b><div class="meta">'+w.n+' orang minta dikabari'+(w.is_open?' · sudah dibuka':'')+'</div>'+(w.is_open?'':'<div class="row">'+btnC("opencity",w.city,"Buka kota ini")+'</div>')+'</div>'}).join(""):'<div class="empty">Belum ada permintaan kota.</div>';
  h+='<h3 class="kh">Grup WhatsApp / Telegram / Discord</h3>';
  h+='<form class="fm cfgf" data-f="group"><b class="t" id="cfgGT">'+(g.id?"Edit grup":"Tambah grup")+'</b><input type="hidden" name="id" value="'+esc(g.id||"")+'">'+
   '<div class="g2"><label class="f">Kota<select name="city" required>'+opt("","Pilih kota")+C.cities.map(function(c){return opt(c.name,c.name,c.name===g.city)}).join("")+'</select></label>'+
   '<label class="f">Jenis<select name="kind">'+Object.keys(KG).map(function(k){return opt(k,KG[k],k===(g.kind||"umum"))}).join("")+'</select></label></div>'+
   '<label class="f">Nama grup<input name="name" minlength="3" maxlength="60" required value="'+esc(g.name||"")+'" placeholder="mis. Konser Bandung Bareng"></label>'+
   '<label class="f">Tautan undangan (https)<input name="url" type="url" required value="'+esc(g.url||"")+'" placeholder="https://chat.whatsapp.com/…"></label>'+
   '<label class="f">Catatan (opsional, maks. 140)<input name="note" maxlength="140" value="'+esc(g.note||"")+'" placeholder="mis. Admin: Kak Rina, aktif jam 9–21"></label>'+
   '<div class="row"><button class="btn sm" type="submit">'+(g.id?"Simpan":"Tambah")+'</button>'+(g.id?'<button class="btn ghost sm" type="button" data-ca="cancelgrp">Batal</button>':'')+'</div><p class="meta">Hanya tautan WhatsApp, Telegram, dan Discord yang diterima. Pastikan grupnya punya admin yang aktif.</p></form>';
  var by={};C.groups.forEach(function(r){(by[r.city]=by[r.city]||[]).push(r)});
  var order=C.cities.map(function(c){return c.name}).concat(Object.keys(by).filter(function(k){return!C.cities.some(function(c){return c.name===k})}));
  var any=false;
  order.forEach(function(cn){if(!by[cn])return;any=true;h+='<div class="ctx" style="margin:12px 0 4px"><b>'+esc(cn)+'</b></div>'+by[cn].map(function(r){
    return'<div class="fm"><b class="t">'+esc(r.name)+' <span class="badge">'+(KG[r.kind]||r.kind)+'</span> <span class="badge '+(r.active?"pub":"")+'">'+(r.active?"Aktif":"Nonaktif")+'</span></b><div class="meta" style="overflow-wrap:anywhere">'+esc(r.url)+(r.note?' · '+esc(r.note):'')+'</div><div class="row">'+
     btnC("editgrp",r.id,"Edit")+btnC("toggrp",r.id,r.active?"Nonaktifkan":"Aktifkan")+btnC("delgrp",r.id,"Hapus")+'</div></div>'}).join("")});
  if(!any)h+='<div class="empty">Belum ada grup.</div>';
  box.innerHTML=h;box.dataset.cfg="1"}
function btnC(a,id,label){return'<button class="btn ghost sm" data-ca="'+a+'" data-id="'+esc(id)+'" type="button">'+esc(label)+'</button>'}
function cfgDone(r,ok,after){if(r.error){msg(sqlHint(r.error),"err");return false}msg(ok,"ok");(after||cfg)();return true}
function cfgAct(a,id){
  if(a==="togcity"){var c=C.cities.filter(function(x){return x.name===id})[0];if(!c)return;
    if(c.active&&!confirm("Tutup komunitas "+id+"? Kiriman lama tetap tersimpan, tetapi kota tidak tampil di publik."))return;
    return sb.from("forum_cities").update({active:!c.active}).eq("name",id).then(function(r){cfgDone(r,c.active?"Kota ditutup.":"Kota dibuka.")})}
  if(a==="opencity")return sb.from("forum_cities").insert({name:id}).then(function(r){cfgDone(r,id+" dibuka. Tambahkan grup untuk kota ini.")});
  var g=C.groups.filter(function(x){return x.id===id})[0];
  if(a==="cancelgrp")return drawCfg();
  if(!g)return;
  if(a==="editgrp"){drawCfg(g);var f=document.querySelector('form[data-f="group"]');if(f&&f.scrollIntoView)f.scrollIntoView({behavior:"smooth",block:"center"});return}
  if(a==="toggrp")return sb.from("forum_groups").update({active:!g.active}).eq("id",id).then(function(r){cfgDone(r,g.active?"Grup dinonaktifkan.":"Grup diaktifkan.")});
  if(a==="delgrp"){if(!confirm('Hapus grup "'+g.name+'"?'))return;return sb.from("forum_groups").delete().eq("id",id).then(function(r){cfgDone(r,"Grup dihapus.")})}}
function cfgSubmit(f){
  var d=function(n){return f.elements[n].value.trim()};
  if(f.dataset.f==="city"){var name=d("name");if(!name)return;
    if(C.cities.some(function(c){return c.name.toLowerCase()===name.toLowerCase()}))return msg("Kota itu sudah ada di daftar.","err");
    return sb.from("forum_cities").insert({name:name,sort:100}).then(function(r){cfgDone(r,name+" dibuka.")})}
  var row={city:d("city"),kind:d("kind"),name:d("name"),url:d("url"),note:d("note")||null};
  if(!row.city)return msg("Pilih kota.","err");
  if(!GROUP_RE.test(row.url))return msg("Tautan harus https dari WhatsApp (chat.whatsapp.com atau whatsapp.com/channel), Telegram (t.me), atau Discord (discord.gg atau discord.com/invite).","err");
  var id=d("id"),q=id?sb.from("forum_groups").update(row).eq("id",id):sb.from("forum_groups").insert(row);
  return q.then(function(r){cfgDone(r,id?"Grup disimpan.":"Grup ditambahkan.")})}

function show(){
  if(tab==="cfg")return cfg();
  var box=$("fmList");box.innerHTML='<div class="meta">Memuat…</div>';
  fetchItems().then(function(L){
    var none={rep:"Tidak ada laporan yang menunggu. 🎉",new:"Belum ada kiriman atau balasan.",off:"Tidak ada yang disembunyikan atau dihapus."}[tab];
    box.innerHTML=L.length?L.map(card).join(""):'<div class="empty">'+none+'</div>'})}
function refresh(){return loadReports().then(function(ok){if(ok)show()})}

document.addEventListener("click",function(ev){
  var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v==="forum"&&ready)refresh();
  if(b.dataset.ft){tab=b.dataset.ft;[].forEach.call(document.querySelectorAll("#fmTabs .tab"),function(x){x.classList.toggle("on",x===b)});show()}
  if(b.dataset.ca){cfgAct(b.dataset.ca,b.dataset.id);return}
  if(b.dataset.fa){
    if(busy)return;var a=b.dataset.fa,t=b.dataset.t,id=b.dataset.id;
    if(a==="delete"&&!confirm("Hapus permanen? Ini tidak bisa dipulihkan dari panel."))return;
    busy=true;
    sb.rpc("admin_forum_moderate",{p_post:t==="post"?id:null,p_reply:t==="reply"?id:null,p_action:a}).then(function(r){
      busy=false;
      if(r.error){msg(sqlHint(r.error),"err");return}
      msg({keep:"Laporan diabaikan dan item tayang.",hide:"Disembunyikan dari publik.","delete":"Dihapus."}[a],"ok");refresh()},function(){busy=false;msg("Gagal menghubungi server.","err")})}
});
document.addEventListener("submit",function(ev){var f=ev.target.closest&&ev.target.closest("form.cfgf");if(!f)return;ev.preventDefault();if(busy)return;busy=true;
  Promise.resolve(cfgSubmit(f)).then(function(){busy=false},function(){busy=false;msg("Gagal menghubungi server.","err")})});
document.addEventListener("change",function(ev){var i=ev.target;if(!i.dataset||i.dataset.sort===undefined)return;
  var v=parseInt(i.value,10);if(isNaN(v)||v<0||v>9999)return msg("Urutan harus angka 0 sampai 9999.","err");
  sb.from("forum_cities").update({sort:v}).eq("name",i.dataset.sort).then(function(r){cfgDone(r,"Urutan disimpan.")})});
getMe().then(function(m){if(!m||m.profile.role!=="admin")return;ready=true;loadReports()});
})();
