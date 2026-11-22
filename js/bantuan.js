(function(){
var tr=window.IB_T||function(k){return k},C=window.IB_CONFIG||{},$=function(i){return document.getElementById(i)};
var mail=C.CONTACT_EMAIL||"",wa=String(C.CONTACT_WA||"").replace(/\D/g,""),waLabel=C.CONTACT_WA_LABEL||wa;
function toast(m){if(window.toast)return window.toast(m);var t=$("toast");if(!t)return;t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("on")},1800)}
if($("hpMail"))$("hpMail").textContent=mail;
if($("hpMailBtn"))$("hpMailBtn").href="mailto:"+mail+"?subject="+encodeURIComponent(tr("hp_subject"))+"&body="+encodeURIComponent(tr("hp_body"));
if($("hpWa"))$("hpWa").textContent=waLabel;
if($("hpWaBtn"))$("hpWaBtn").href="https://wa.me/"+wa+"?text="+encodeURIComponent(tr("hp_wa_msg"));
document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(!b)return;
  var txt=b.dataset.copy==="mail"?mail:wa?"+"+wa:waLabel,src=$(b.dataset.copy==="mail"?"hpMail":"hpWa");
  function sel(){if(!window.getSelection||!src)return;var r=document.createRange();r.selectNodeContents(src);var s=getSelection();s.removeAllRanges();s.addRange(r)}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(function(){toast(tr("hp_copied"))},sel);else sel()});
var box=$("faqBox");
if(box){var items=[].slice.call(box.querySelectorAll("details.fq")),heads=[].slice.call(box.querySelectorAll("h3.hpg"));
  function norm(s){return String(s).toLowerCase()}
  function filter(){var q=norm(($("hq")&&$("hq").value)||"").trim(),any=false;
    items.forEach(function(d){var ok=!q||norm(d.textContent).indexOf(q)>-1;d.hidden=!ok;if(ok)any=true;if(q)d.open=ok});
    heads.forEach(function(h){var n=h.nextElementSibling,vis=false;while(n&&n.tagName==="DETAILS"){if(!n.hidden)vis=true;n=n.nextElementSibling}h.hidden=!vis});
    if($("faqNone"))$("faqNone").hidden=any}
  if($("hq"))$("hq").addEventListener("input",filter);
  function deep(){var m=/^#faq-(\d+)$/.exec(location.hash||""),d=m&&$("faq-"+m[1]);if(d){d.open=true;d.scrollIntoView({block:"center"})}}
  deep();window.addEventListener("hashchange",deep)}
var y=$("year");if(y)y.textContent=new Date().getFullYear();
})();
