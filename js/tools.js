(function(){
var $=function(i){return document.getElementById(i)};
var ITEMS=["Carrier + rain cover","Jas hujan / ponco","Sepatu gunung","Headlamp + baterai","Jaket windproof","Sleeping bag","Tenda","Matras","Kompor + gas","Nesting & alat makan","Air minum min. 2 liter","Logistik & snack","P3K pribadi","Powerbank","Trash bag","KTP & SIMAKSI"];
var KEY="ib_packing",saved={};
try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
$("pl").innerHTML=ITEMS.map(function(t,i){return'<li><label><input type="checkbox" data-i="'+i+'"'+(saved[i]?" checked":"")+'> '+t+'</label></li>'}).join("");
function prog(){var n=document.querySelectorAll("#pl input:checked").length;$("pbar").style.width=(n/ITEMS.length*100)+"%";$("pcount").textContent=n+" / "+ITEMS.length+" siap"}
$("pl").onchange=function(e){saved[e.target.dataset.i]=e.target.checked;try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(x){}prog()};
$("pReset").onclick=function(){saved={};try{localStorage.removeItem(KEY)}catch(x){}[].forEach.call(document.querySelectorAll("#pl input"),function(i){i.checked=false});prog()};
prog();
function calc(){
  var t=+$("total").value||0,n=Math.max(1,+$("orang").value||1),a=+$("admin").value||0;
  var per=Math.ceil((t*(1+a/100))/n/1000)*1000;
  $("hasil").innerHTML=t?'Per orang: <b>Rp'+per.toLocaleString("id-ID")+'</b><br><small>Dibulatkan ke atas Rp1.000, sudah termasuk cadangan '+a+'%</small>':'Isi total biaya untuk melihat hasil.';
}
["total","orang","admin"].forEach(function(i){$(i).oninput=calc});calc();
})();
