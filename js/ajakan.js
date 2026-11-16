(function(){
var sb=window.sb;if(!sb)return;
function mount(e,box){
  sb.auth.getSession().then(function(r){var me=r.data.session&&r.data.session.user;
    sb.from("invitations_public").select("*").eq("event_id",e.id).order("created_at",{ascending:false}).then(function(q){
      var L=q.data||[],ids=L.map(function(i){return i.id});
      var mem=me&&ids.length?sb.from("invitation_members").select("invitation_id,user_id,status,message,profiles(nickname)").in("invitation_id",ids):Promise.resolve({data:[]});
      var con=me&&ids.length?sb.from("invitation_contacts").select("*").in("invitation_id",ids):Promise.resolve({data:[]});
      Promise.all([mem,con]).then(function(x){draw(e,box,me,L,x[0].data||[],x[1].data||[])})})})}
function act(fn,box,e,ok){fn.then(function(r){if(r.error)return alert(r.error.message);if(ok)alert(ok);mount(e,box)})}
function draw(e,box,me,L,M,C){
  var h='<h3>🤝 Ajakan barengan ('+L.length+')</h3>';
  h+=L.length?L.map(function(i){var mine=me&&i.host_id===me.id,m=M.filter(function(z){return z.invitation_id===i.id}),my=m.filter(function(z){return me&&z.user_id===me.id})[0],wa=C.filter(function(c){return c.invitation_id===i.id})[0];
    var a=mine?'<button class="btn ghost sm" data-x="cancel" data-i="'+i.id+'">Batalkan ajakan</button>':!me?'<button class="btn sm" data-x="login">Masuk untuk gabung</button>':!my||my.status==="left"?(i.status==="open"?'<button class="btn sm" data-x="join" data-i="'+i.id+'">Gabung</button>':'<span class="meta">Penuh</span>'):my.status==="pending"?'<span class="meta">⏳ Menunggu persetujuan host</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">Batal</button>':my.status==="approved"?'<span class="meta">✅ Diterima</span> <button class="lnk" data-x="leave" data-i="'+i.id+'">Keluar</button>':'<span class="meta">Belum bisa bergabung</span>';
    var wl=wa&&(mine||(my&&my.status==="approved"))?'<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(wa.wa)+'">💬 WhatsApp host</a> ':"";
    var rq=mine?m.filter(function(z){return z.status==="pending"}).map(function(z){return'<div class="rq"><b>'+esc(z.profiles&&z.profiles.nickname||"Pengguna")+'</b>: '+esc(z.message||"(tanpa pesan)")+' <button class="btn sm" data-x="ok" data-i="'+i.id+'" data-u="'+z.user_id+'">Terima</button> <button class="btn ghost sm" data-x="no" data-i="'+i.id+'" data-u="'+z.user_id+'">Tolak</button></div>'}).join(""):"";
    return'<div class="aj"><b>'+esc(i.title)+'</b><div class="meta">oleh '+esc(i.host_name||"Pengguna")+(i.host_verified?" ✓":"")+' · '+i.filled+'/'+i.capacity+' orang'+(i.meeting_point?' · 📍 '+esc(i.meeting_point):'')+(i.cost_share?' · 💸 '+esc(i.cost_share):'')+'</div>'+(i.note?'<p>'+esc(i.note)+'</p>':'')+'<div class="row">'+wl+a+'</div>'+rq+'</div>'}).join(""):'<p class="meta">Belum ada ajakan untuk event ini. Jadilah yang pertama.</p>';
  h+='<button class="btn" data-x="new">+ Buat ajakan</button><form class="ajf" hidden><label class="f">Judul ajakan<input name="t" maxlength="80" minlength="5" placeholder="contoh: Berangkat bareng dari Cicaheum" required></label><label class="f">Titik kumpul<input name="m" maxlength="100" placeholder="Area umum, bukan alamat rumah"></label><div class="g2"><label class="f">Jumlah orang (termasuk kamu)<input name="c" type="number" min="2" max="20" value="4" required></label><label class="f">Patungan<input name="p" maxlength="60" placeholder="contoh: Rp50 rb/orang"></label></div><label class="f">Catatan<textarea name="n" maxlength="500" placeholder="Rencana, kendaraan, syarat"></textarea></label><label class="f">WhatsApp (hanya dilihat peserta yang kamu terima)<input name="w" inputmode="tel" placeholder="08xxxxxxxxxx" required></label><button class="btn" type="submit">Terbitkan ajakan</button></form>';
  box.innerHTML=h;
  box.onclick=function(ev){var b=ev.target.closest("[data-x]");if(!b)return;var x=b.dataset.x,i=b.dataset.i;
    if(x==="login"||(x==="new"&&!me)){alert("Masuk dulu untuk memakai fitur ini.");return location.href="login"}
    if(x==="new")return box.querySelector("form").hidden=!box.querySelector("form").hidden;
    if(x==="join"){var m=prompt("Pesan singkat untuk host (opsional):","");if(m===null)return;return act(sb.rpc("request_join",{p_inv:i,p_msg:m}),box,e,"Permintaan terkirim. Tunggu persetujuan host.")}
    if(x==="ok"||x==="no")return act(sb.rpc("decide_member",{p_inv:i,p_user:b.dataset.u,p_ok:x==="ok"}),box,e);
    if((x==="cancel"||x==="leave")&&confirm("Yakin?"))act(sb.rpc("leave_or_cancel",{p_inv:i}),box,e)};
  box.querySelector("form").onsubmit=function(ev){ev.preventDefault();var f=this.elements;
    act(sb.rpc("create_invitation",{p_event:e.id,p_title:f.t.value,p_note:f.n.value,p_meet:f.m.value,p_cost:f.p.value,p_cap:+f.c.value,p_wa:f.w.value}),box,e,"Ajakan terbit.")};
}
window.IB_Ajakan={mount:mount};
})();
