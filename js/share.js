/* Tombol bagikan untuk semua: kartu event, rincian, ajakan, pengajuan, dan halaman. IB_Share.open({title,text,url}) */
(function(){
var tr=window.IB_T||function(k){return k},dlg=null;
function toast(m){if(window.toast)return window.toast(m);var t=document.getElementById("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},2400)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function clean(u){try{var x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:location.href}catch(e){return location.href}}
function copy(text,input){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text).then(function(){toast(tr("copied"))},function(){fallback()});
  fallback();
  function fallback(){try{input.select();input.setSelectionRange(0,9999);if(document.execCommand("copy"))return toast(tr("copied"))}catch(e){}toast(tr("copy_manual"))}}
function build(){
  dlg=document.createElement("dialog");dlg.className="shr";dlg.setAttribute("aria-label",tr("share"));
  dlg.innerHTML='<div class="shb"><div class="shh"><b>'+esc(tr("share"))+'</b><button type="button" class="shx" data-sh-close aria-label="'+esc(tr("close"))+'">×</button></div>'
   +'<p class="shp" id="shT"></p><div class="shg" id="shG"></div>'
   +'<div class="shc"><input id="shU" readonly aria-label="URL"><button type="button" class="btn sm" id="shCp">'+esc(tr("copy_link"))+'</button></div>'
   +'<button type="button" class="btn line sm block" id="shNat" hidden>'+esc(tr("share_more"))+'</button></div>';
  document.body.appendChild(dlg);
  dlg.addEventListener("click",function(ev){if(ev.target===dlg||ev.target.closest("[data-sh-close]"))dlg.close()});
}
function links(d){var u=encodeURIComponent(d.url),t=encodeURIComponent(d.text),tu=encodeURIComponent(d.text+" "+d.url);
  return[["WhatsApp","https://wa.me/?text="+tu],["Telegram","https://t.me/share/url?url="+u+"&text="+t],["X","https://twitter.com/intent/tweet?text="+t+"&url="+u],
    ["Facebook","https://www.facebook.com/sharer/sharer.php?u="+u],["Email","mailto:?subject="+encodeURIComponent(d.title)+"&body="+tu]]}
function sheet(d){
  if(!dlg)build();
  dlg.querySelector("#shT").textContent=d.title;
  dlg.querySelector("#shG").innerHTML=links(d).map(function(l){return'<a class="btn line sm" target="_blank" rel="noopener noreferrer" href="'+esc(l[1])+'">'+esc(l[0])+'</a>'}).join("");
  var inp=dlg.querySelector("#shU");inp.value=d.url;
  dlg.querySelector("#shCp").onclick=function(){copy(d.url,inp)};
  var nat=dlg.querySelector("#shNat");nat.hidden=!navigator.share;
  nat.onclick=function(){navigator.share({title:d.title,text:d.text,url:d.url}).then(function(){dlg.close()},function(){})};
  if(!dlg.open)dlg.showModal()}
function open(d){
  d={title:String(d.title||document.title).slice(0,140),text:String(d.text||d.title||document.title).slice(0,240),url:clean(d.url||location.href)};
  var mobile=/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  if(mobile&&navigator.share)return navigator.share({title:d.title,text:d.text,url:d.url}).catch(function(e){if(!e||e.name!=="AbortError")sheet(d)});
  sheet(d)}
window.IB_Share={open:open};
/* tombol bagikan halaman di bilah atas */
var pg=document.getElementById("pgShare");
if(pg)pg.addEventListener("click",function(){var u=location.origin+location.pathname;open({title:document.title,text:tr("share_page",{t:document.title}),url:u})});
})();
