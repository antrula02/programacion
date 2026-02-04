// UI
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
const toast = $("#toast");
function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.remove("show"), 2400);
}

// Nav
const toggle = $("[data-nav-toggle]");
const nav = $("[data-nav]");
if(toggle && nav){
  toggle.addEventListener("click", ()=>{
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>{
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded","false");
  }));
}

// Year
const y = $("#year"); if(y) y.textContent = String(new Date().getFullYear());

// Reveal
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add("in"); });
},{threshold:0.12});
$$(".reveal").forEach(el=>io.observe(el));

// Portal mode
const portalBtn = $("#portalBtn");
if(portalBtn){
  portalBtn.addEventListener("click", ()=>{
    document.body.classList.toggle("portalOn");
    showToast(document.body.classList.contains("portalOn") ? "⚡ Portal activado" : "Portal desactivado");
  });
}

// Interactives
$$("[data-scare]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const t = btn.getAttribute("data-scare");
    if(t==="lights"){
      document.body.classList.add("portalOn");
      setTimeout(()=>document.body.classList.remove("portalOn"), 900);
      showToast("🔴 Alarma de luces…");
    }
    if(t==="glitch"){ glitchFlash(); showToast("📼 Señal inestable"); }
    if(t==="whisper"){ showToast("…¿me oyes? (👂)"); }
  });
});
function glitchFlash(){
  const o=document.createElement("div");
  o.style.position="fixed";o.style.inset="0";o.style.zIndex="100";o.style.pointerEvents="none";
  o.style.background="linear-gradient(90deg, rgba(255,42,109,.18), rgba(0,229,255,.18))";
  o.style.mixBlendMode="screen";
  document.body.appendChild(o);
  o.animate([{opacity:0},{opacity:1},{opacity:0}],{duration:260,iterations:2});
  setTimeout(()=>o.remove(),600);
}

// Particles
const canvas = $("#particles");
const ctx = canvas?.getContext("2d");
let W=0,H=0,parts=[];
function resize(){
  if(!canvas) return;
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();
function init(n=70){
  parts = Array.from({length:n}, ()=>({
    x: Math.random()*W,
    y: Math.random()*H,
    r: 0.7 + Math.random()*2.0,
    vx: (-0.2 + Math.random()*0.4),
    vy: (0.15 + Math.random()*0.5),
    a: 0.08 + Math.random()*0.18
  }));
}
init();
function tick(){
  if(!ctx) return requestAnimationFrame(tick);
  ctx.clearRect(0,0,W,H);
  const portal = document.body.classList.contains("portalOn");
  for(const p of parts){
    p.x += p.vx * (portal ? 2.1 : 1);
    p.y += p.vy * (portal ? 2.1 : 1);
    if(p.y > H+10){ p.y=-10; p.x=Math.random()*W; }
    if(p.x < -10) p.x=W+10;
    if(p.x > W+10) p.x=-10;

    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = portal ? `rgba(0,229,255,${p.a})` : `rgba(255,42,109,${p.a})`;
    ctx.fill();
  }
  requestAnimationFrame(tick);
}
tick();

// Booking calendar (real API)
const elMonth = $("[data-cal-month]");
const elGrid  = $("[data-cal-grid]");
const elSelected = $("[data-cal-selected]");
const elTimes = $("[data-cal-times]");
const btnPrev = $("[data-cal-prev]");
const btnNext = $("[data-cal-next]");
const btnBook = $("[data-cal-book]");

const bkName = $("#bkName");
const bkPhone = $("#bkPhone");
const bkEmail = $("#bkEmail");
const bkPlayers = $("#bkPlayers");
const bkMode = $("#bkMode");
const bkNotes = $("#bkNotes");

let view = new Date(); view.setDate(1);
let selectedDateISO=null, selectedTime=null;
let availability = new Map();

const pad2 = (n)=>String(n).padStart(2,"0");
const toISO = (d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const monthKey = (d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
const formatES = (iso)=>{
  const [yy,mm,dd]=iso.split("-").map(Number);
  return new Date(yy,mm-1,dd).toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
};

async function fetchAvailability(ym){
  const res = await fetch(`/api/availability?month=${encodeURIComponent(ym)}`);
  if(!res.ok) throw new Error("availability");
  const data = await res.json();
  const map = new Map();
  Object.entries(data).forEach(([iso,info])=>map.set(iso,info));
  return map;
}

function render(){
  if(!elMonth || !elGrid) return;
  const y=view.getFullYear(), m=view.getMonth();
  elMonth.textContent = new Date(y,m,1).toLocaleDateString("es-ES",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());

  const first = new Date(y,m,1);
  const firstDow = (first.getDay()+6)%7; // Monday=0
  const daysInMonth = new Date(y,m+1,0).getDate();
  const prevDays = firstDow;

  elGrid.innerHTML="";
  const prevMonthDays = new Date(y,m,0).getDate();
  for(let i=prevDays;i>0;i--){
    const b=document.createElement("button");
    b.type="button"; b.className="day muted"; b.textContent=String(prevMonthDays - i + 1); b.disabled=true;
    elGrid.appendChild(b);
  }

  const todayISO = toISO(new Date());
  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(y,m,d);
    const iso = toISO(date);
    const info = availability.get(iso);

    const b=document.createElement("button");
    b.type="button"; b.className="day"; b.textContent=String(d);

    const past = iso < todayISO;
    const closed = info?.closed === true;
    if(past || closed){
      b.classList.add("unavailable");
      b.disabled=true;
    }
    if(iso===selectedDateISO) b.classList.add("selected");

    const hasAvailable = info && !info.closed && info.times.some(x=>x.available);
    if(hasAvailable && !b.disabled){
      const badge=document.createElement("span"); badge.className="badge"; b.appendChild(badge);
    }

    b.addEventListener("click", ()=>{
      if(b.disabled) return;
      selectedDateISO=iso;
      selectedTime=null;
      updateSelected();
      render();
    });

    elGrid.appendChild(b);
  }

  const total = prevDays + daysInMonth;
  const rem = total % 7;
  const fill = rem===0?0:7-rem;
  for(let i=1;i<=fill;i++){
    const b=document.createElement("button");
    b.type="button"; b.className="day muted"; b.textContent=String(i); b.disabled=true;
    elGrid.appendChild(b);
  }
}

function updateSelected(){
  if(!elSelected || !elTimes || !btnBook) return;
  if(!selectedDateISO){
    elSelected.textContent="—";
    elTimes.innerHTML='<span class="muted">Selecciona una fecha…</span>';
    btnBook.disabled=true;
    return;
  }
  elSelected.textContent = formatES(selectedDateISO);
  const info = availability.get(selectedDateISO);
  if(!info || info.closed){
    elTimes.innerHTML='<span class="muted">No disponible</span>';
    btnBook.disabled=true;
    return;
  }
  elTimes.innerHTML="";
  info.times.forEach(({t,available})=>{
    const b=document.createElement("button");
    b.type="button"; b.className="timeBtn"; b.textContent=t;

    if(available){
      b.classList.add("free");
    }else{
      b.classList.add("busy");
      b.disabled=true;
    }
    if(t===selectedTime) b.classList.add("selected");

    b.addEventListener("click", ()=>{
      if(b.disabled) return;
      selectedTime=t;
      updateSelected();
    });

    elTimes.appendChild(b);
  });
  btnBook.disabled = !selectedTime;
}

async function loadMonth(){
  availability = await fetchAvailability(monthKey(view));
  render();
  updateSelected();
}
async function changeMonth(delta){
  view = new Date(view.getFullYear(), view.getMonth()+delta, 1);
  await loadMonth();
}
if(btnPrev) btnPrev.addEventListener("click", ()=>changeMonth(-1));
if(btnNext) btnNext.addEventListener("click", ()=>changeMonth(1));

function validate(){
  if(!bkName.value.trim()) return "Escribe tu nombre";
  if(!bkPhone.value.trim()) return "Escribe tu teléfono";
  if(!bkEmail.value.trim()) return "Escribe tu email";
  return null;
}

async function book(){
  if(!selectedDateISO || !selectedTime) return;
  const err = validate();
  if(err){ showToast("⚠️ " + err); return; }

  btnBook.disabled=true;
  btnBook.textContent="Confirmando...";
  try{
    const payload = {
      date: selectedDateISO,
      time: selectedTime,
      name: bkName.value.trim(),
      phone: bkPhone.value.trim(),
      email: bkEmail.value.trim(),
      players: Number(bkPlayers.value),
      mode: bkMode.value,
      notes: bkNotes.value.trim()
    };
    const res = await fetch("/api/book", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok){
      showToast("❌ " + (data?.error || "No se pudo reservar"));
      return;
    }
    showToast("✅ Reserva confirmada. Código: " + data.code);
    await loadMonth();
    selectedTime=null;
    updateSelected();
  } catch(e){
    showToast("❌ Error de red / servidor");
  } finally{
    btnBook.textContent="Confirmar reserva";
    btnBook.disabled = !selectedDateISO || !selectedTime;
  }
}
if(btnBook) btnBook.addEventListener("click", book);

(async ()=>{ 
  try{ await loadMonth(); }
  catch(e){ showToast("⚠️ No se pudo conectar con el servidor. Lee README."); }
})();


// LIGHTNING_EVERY_10S
const lightning = document.getElementById("lightning");
function triggerLightning(){
  if(!lightning) return;
  lightning.classList.remove("on");
  // force reflow
  void lightning.offsetWidth;
  lightning.classList.add("on");
  // subtle rumble/shake
  document.body.animate([
    { transform: "translate(0,0)" },
    { transform: "translate(-1px,0)" },
    { transform: "translate(1px,0)" },
    { transform: "translate(0,0)" }
  ], { duration: 260, iterations: 1 });
}
// randomize slightly so it feels organic
setInterval(()=>triggerLightning(), 10000);
