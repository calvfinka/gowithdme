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

function show(){
  var box=$("fmList");box.innerHTML='<div class="meta">Memuat…</div>';
  fetchItems().then(function(L){
    var none={rep:"Tidak ada laporan yang menunggu. 🎉",new:"Belum ada kiriman atau balasan.",off:"Tidak ada yang disembunyikan atau dihapus."}[tab];
    box.innerHTML=L.length?L.map(card).join(""):'<div class="empty">'+none+'</div>'})}
function refresh(){return loadReports().then(function(ok){if(ok)show()})}

document.addEventListener("click",function(ev){
  var b=ev.target.closest("button");if(!b)return;
  if(b.dataset.v==="forum"&&ready)refresh();
  if(b.dataset.ft){tab=b.dataset.ft;[].forEach.call(document.querySelectorAll("#fmTabs .tab"),function(x){x.classList.toggle("on",x===b)});show()}
  if(b.dataset.fa){
    if(busy)return;var a=b.dataset.fa,t=b.dataset.t,id=b.dataset.id;
    if(a==="delete"&&!confirm("Hapus permanen? Ini tidak bisa dipulihkan dari panel."))return;
    busy=true;
    sb.rpc("admin_forum_moderate",{p_post:t==="post"?id:null,p_reply:t==="reply"?id:null,p_action:a}).then(function(r){
      busy=false;
      if(r.error){msg(sqlHint(r.error),"err");return}
      msg({keep:"Laporan diabaikan dan item tayang.",hide:"Disembunyikan dari publik.","delete":"Dihapus."}[a],"ok");refresh()},function(){busy=false;msg("Gagal menghubungi server.","err")})}
});
getMe().then(function(m){if(!m||m.profile.role!=="admin")return;ready=true;loadReports()});
})();
