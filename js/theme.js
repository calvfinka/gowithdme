/* Tema terang/gelap. Dimuat di <head> supaya tidak berkedip. Pilihan diingat; awalnya mengikuti pengaturan perangkat. */
(function(){
  var K="gwm-theme",root=document.documentElement,pref=null;
  try{pref=localStorage.getItem(K)}catch(e){}
  function set(t,save){root.setAttribute("data-theme",t);if(save){try{localStorage.setItem(K,t)}catch(e){}}}
  set(pref==="dark"||pref==="light"?pref:(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  document.addEventListener("DOMContentLoaded",function(){
    [].forEach.call(document.querySelectorAll("#theme,#mmTheme"),function(b){
      b.addEventListener("click",function(){set(root.getAttribute("data-theme")==="dark"?"light":"dark",true)});
    });
  });
})();
