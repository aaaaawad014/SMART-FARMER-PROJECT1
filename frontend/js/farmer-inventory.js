// frontend/js/farmer-inventory.js
requireLogin("login.html");

// modal popup
const modalBack=document.getElementById("modalBack");
const mTitle=document.getElementById("mTitle");
const mBody=document.getElementById("mBody");
const mBtns=document.getElementById("mBtns");
document.getElementById("mClose").onclick=()=>modalBack.style.display="none";

function popup({title="Message", message="", buttons=[{text:"OK", type:"primary"}]}) {
  mTitle.textContent=title; mBody.textContent=message; mBtns.innerHTML="";
  buttons.forEach(b=>{
    const btn=document.createElement("button");
    btn.className="mBtn "+(b.type||"");
    btn.textContent=b.text||"OK";
    btn.onclick=()=>{ if(b.onClick) b.onClick(); modalBack.style.display="none"; };
    mBtns.appendChild(btn);
  });
  modalBack.style.display="flex";
}

document.getElementById("logoutBtn").onclick=(e)=>{
  e.preventDefault();
  popup({
    title:"Logout?",
    message:"Do you want to logout now?",
    buttons:[
      {text:"Cancel"},
      {text:"Logout", type:"danger", onClick:()=>logout("../index.html")}
    ]
  });
};

const tbody=document.getElementById("tbody");
const search=document.getElementById("search");
let allItems=[];

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function render(list){
  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="5" style="color:rgba(234,242,255,.75)">No items found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(i=>`
    <tr>
      <td><span class="pill">${esc(i.itemName || i.name || "-")}</span></td>
      <td>${esc(i.category || "General")}</td>
      <td>${Number(i.availableQty ?? i.qty ?? 0)}</td>
      <td>${esc(i.unit || "kg")}</td>
      <td class="right">${Number(i.price || 0)}</td>
    </tr>
  `).join("");
}

async function load(){
  tbody.innerHTML = `<tr><td colspan="5" style="color:rgba(234,242,255,.75)">Loading…</td></tr>`;
  try{
    allItems = await loadInventory(); // from farmer-logic.js
    render(allItems);
    if(!allItems.length){
      popup({title:"Inventory Empty", message:"Admin has not added items yet.", buttons:[{text:"OK", type:"primary"}]});
    }
  }catch(e){
    render([]);
    popup({title:"Load Failed ❌", message:e.message, buttons:[{text:"OK", type:"danger"}]});
  }
}

document.getElementById("reloadBtn").onclick = load;

search.addEventListener("input", ()=>{
  const q = search.value.trim().toLowerCase();
  if(!q){ render(allItems); return; }
  render(allItems.filter(i =>
    String(i.itemName||i.name||"").toLowerCase().includes(q) ||
    String(i.category||"").toLowerCase().includes(q)
  ));
});

// auto load
load();
