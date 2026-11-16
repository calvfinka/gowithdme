/* Diskusi komunitas di rincian event: kiriman forum yang ditautkan ke event ini. Data dari view forum_posts_public (supabase/schema_forum.sql). */
(function(){
var sb=window.sb;if(!sb)return;
var tr=window.IB_T||function(k){return k},esc=window.esc||function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
function ago(ts){var s=(new Date(ts).getTime()-Date.now())/1000,a=Math.abs(s),r;
  try{r=new Intl.RelativeTimeFormat(tr("locale"),{numeric:"auto"})}catch(e){return""}
  if(a<60)return r.format(0,"second");if(a<3600)return r.format(Math.round(s/60),"minute");
  if(a<86400)return r.format(Math.round(s/3600),"hour");if(a<2592000)return r.format(Math.round(s/86400),"day");
  return r.format(Math.round(s/2592000),"month")}
function mount(e,box){
  if(!e||!e.id||!box)return;
  var cq=e.city?sb.from("forum_city_stats").select("city,active").eq("city",e.city).maybeSingle():Promise.resolve({data:null});
  var pq=sb.from("forum_posts_public").select("id,city,kind,title,author_name,author_verified,last_activity,reply_count",{count:"exact"}).eq("event_id",e.id).order("last_activity",{ascending:false}).limit(5);
  Promise.all([cq,pq]).then(function(x){
    /* Forum belum dipasang (view tidak ada): bagian ini diam saja, tidak menampilkan galat */
    if(x[1].error){box.innerHTML="";return}
    var open=!!(x[0].data&&x[0].data.active),L=x[1].data||[],n=x[1].count==null?L.length:x[1].count;
    if(!L.length&&!open){box.innerHTML="";return}
    var base="komunitas?kota="+encodeURIComponent(e.city||"");
    var h='<h3>'+esc(tr("fe_h",{n:n}))+'</h3>';
    h+=L.length?L.map(function(p){
      return'<a class="kpost" href="'+base+'&p='+encodeURIComponent(p.id)+'"><span class="kk kk-'+esc(p.kind)+'">'+esc(tr("k_tab_"+p.kind))+'</span><b>'+esc(p.title)+'</b><small>'+esc(tr("k_by"))+' '+esc(p.author_name||tr("k_user"))+(p.author_verified?" ✓":"")+' · '+esc(ago(p.last_activity))+' · '+esc(tr("k_replies",{n:p.reply_count}))+'</small></a>'}).join(""):'<p class="meta">'+esc(tr("fe_none"))+'</p>';
    if(open)h+='<div class="row"><a class="btn line sm" href="'+base+'&event='+encodeURIComponent(e.id)+'">'+esc(tr("fe_write"))+'</a>'+(n>L.length?' <a class="btn line sm" href="'+base+'">'+esc(tr("fe_all",{c:e.city}))+'</a>':'')+'</div>';
    box.innerHTML=h}).catch(function(){box.innerHTML=""})}
window.IB_ForumEvent={mount:mount};
})();
