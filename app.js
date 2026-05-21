// =========================
// 🔐 CONFIG
// =========================
const supabaseUrl = 'https://kmaydnzeiyynbphudntj.supabase.co';
const supabaseKey = 'sb_publishable_lV7QSsgPX_5nJh0ksO83ww_7G9szgjj';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let usuario_id = 'demo_user';

if (window.Telegram && Telegram.WebApp) {
  const tg = Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe?.user || null;
  usuario_id = user ? user.id : 'demo_user';
}

// =========================
// 🛠️ UTILIDADES
// =========================
function formatoMoneda(valor) {
  return '$' + valor.toLocaleString('es-MX', { minimumFractionDigits:2 });
}

function obtenerFechaMX(fecha) {
  return new Date(fecha + 'T00:00:00-06:00');
}

function obtenerAnio() {
  return document.getElementById('filtroAnio')?.value;
}

function limpiarFormulario(containerId) {
  const cont = document.getElementById(containerId);
  cont.querySelectorAll('input,select').forEach(i => i.value = '');
}

// =========================
// 🧭 NAVEGACIÓN
// =========================
function mostrarSeccion(s){
  const cont=document.getElementById('contenido');
  if(s==='agua') renderAgua(cont);
  if(s==='energia') renderEnergia(cont);
  if(s==='gasolina') renderGasolina(cont);
  if(s==='vehiculos') renderVehiculos(cont);
  if(s==='dashboard') renderDashboard(cont);
}

// =========================
// 💧 AGUA
// =========================
function renderAgua(c){
  c.innerHTML=`
  <h2>💧 Agua</h2>
  <input id="mes" type="month">
  <input id="consumo" placeholder="m³">
  <input id="total" placeholder="$">
  <button onclick="guardarAgua()">Guardar</button>`;
}

async function guardarAgua(){
  const mes=document.getElementById('mes').value;
  const consumo=parseFloat(document.getElementById('consumo').value);
  const total=parseFloat(document.getElementById('total').value);

  const [anio,mesNum]=mes.split("-");

  const {data:gasto}=await supabaseClient.from('gastos')
  .insert([{tipo:'agua',fecha:`${anio}-${mesNum}-01`,total,usuario_id}]).select().single();

  await supabaseClient.from('agua')
  .insert([{gasto_id:gasto.id,consumo_m3:consumo}]);

  alert("✅ Guardado");
  limpiarFormulario('contenido');
}

// =========================
// ⚡ ENERGÍA
// =========================
function renderEnergia(c){
  c.innerHTML=`
  <h2>⚡ Energía</h2>
  <input id="mes" type="month">
  <input id="lectura_anterior">
  <input id="lectura_actual">
  <input id="consumo_kwh" readonly>
  <input id="total_energia">
  <button onclick="guardarEnergia()">Guardar</button>`;

  document.getElementById('lectura_actual').addEventListener('input',calcular);
  document.getElementById('lectura_anterior').addEventListener('input',calcular);
}

function calcular(){
  const a=parseFloat(document.getElementById('lectura_anterior').value)||0;
  const b=parseFloat(document.getElementById('lectura_actual').value)||0;
  document.getElementById('consumo_kwh').value=b>=a?b-a:'';
}

async function guardarEnergia(){
  const mes=document.getElementById('mes').value;
  const [anio,mesNum]=mes.split("-");
  const lectura_anterior=parseFloat(document.getElementById('lectura_anterior').value);
  const lectura_actual=parseFloat(document.getElementById('lectura_actual').value);
  const total=parseFloat(document.getElementById('total_energia').value);

  const consumo=lectura_actual-lectura_anterior;

  const {data:gasto}=await supabaseClient.from('gastos')
  .insert([{tipo:'energia',fecha:`${anio}-${mesNum}-01`,total,usuario_id}]).select().single();

  await supabaseClient.from('energia')
  .insert([{gasto_id:gasto.id,consumo_kwh:consumo,lectura_anterior,lectura_actual}]);

  alert("✅ Guardado");
  limpiarFormulario('contenido');
}

// =========================
// ⛽ GASOLINA
// =========================
async function renderGasolina(c){
  const {data}=await supabaseClient.from('vehiculos').select('*');

  c.innerHTML=`
  <h2>⛽ Gasolina</h2>
  <select id="vehiculo">${data.map(v=>`<option value="${v.id}">${v.modelo}</option>`)}</select>
  <input id="litros">
  <input id="precio">
  <input id="km">
  <button onclick="guardarGasolina()">Guardar</button>`;
}

async function guardarGasolina(){
  const litros=parseFloat(document.getElementById('litros').value);
  const precio=parseFloat(document.getElementById('precio').value);
  const km=parseFloat(document.getElementById('km').value);

  const total=litros*precio;

  const {data:gasto}=await supabaseClient.from('gastos')
  .insert([{tipo:'gasolina',fecha:new Date(),total,usuario_id}]).select().single();

  await supabaseClient.from('gasolina')
  .insert([{gasto_id:gasto.id,litros,kilometraje:km,precio_litro:precio}]);

  alert("✅ Guardado");
}

// =========================
// 🚗 VEHÍCULOS
// =========================
function renderVehiculos(c){
  c.innerHTML=`
  <h2>🚗 Vehículos</h2>
  <input id="modelo">
  <input id="placas">
  <button onclick="guardarVehiculo()">Guardar</button>`;
}

async function guardarVehiculo(){
  await supabaseClient.from('vehiculos').insert([{
    modelo:document.getElementById('modelo').value,
    placas:document.getElementById('placas').value,
    usuario_id
  }]);
  alert("✅ Guardado");
}

// =========================
// 📊 DASHBOARD
// =========================
async function renderDashboard(cont){
  cont.innerHTML=`
  <h2>📊 Dashboard</h2>
  <select id="filtroAnio"></select>
  <div id="resumen"></div>
  <canvas id="grafica"></canvas>`;
  await cargarAnios();
}

async function cargarAnios(){
  const {data}=await supabaseClient.from('gastos').select('fecha');
  const anios=[...new Set(data.map(g=>obtenerFechaMX(g.fecha).getFullYear()))];
  const select=document.getElementById('filtroAnio');
  select.innerHTML=anios.map(a=>`<option>${a}</option>`).join('');
  select.value=new Date().getFullYear();
  select.onchange=cargarGrafica;
  cargarGrafica();
}

async function cargarGrafica(){
  const anio=obtenerAnio();
  const {data}=await supabaseClient.from('gastos').select('*');

  const filtrados=data.filter(g=>obtenerFechaMX(g.fecha).getFullYear()==anio);

  procesar(filtrados);
}

function procesar(data){
  const meses={},tot={agua:0,energia:0,gasolina:0};

  data.forEach(g=>{
    const f=obtenerFechaMX(g.fecha);
    const key=f.getFullYear()+"-"+f.getMonth();
    const label=f.toLocaleString('es-MX',{month:'short',year:'numeric'});

    if(!meses[key]) meses[key]={label,agua:0,energia:0,gasolina:0};

    meses[key][g.tipo]+=g.total;
    tot[g.tipo]+=g.total;
  });

  mostrarTotales(tot);

  const orden=Object.keys(meses).sort();

  crearGrafica(
    orden.map(k=>meses[k].label),
    orden.map(k=>meses[k].agua),
    orden.map(k=>meses[k].energia),
    orden.map(k=>meses[k].gasolina)
  );
}

function mostrarTotales(t){
  document.getElementById('resumen').innerHTML=`
  <div onclick="verDetalle('agua')">💧 ${formatoMoneda(t.agua)}</div>
  <div onclick="verDetalle('energia')">⚡ ${formatoMoneda(t.energia)}</div>
  <div onclick="verDetalle('gasolina')">⛽ ${formatoMoneda(t.gasolina)}</div>`;
}

// =========================
// 🔎 DETALLE
// =========================
function verDetalle(tipo){
  const cont=document.getElementById('contenido');
  cont.innerHTML=`<button onclick="mostrarSeccion('dashboard')">⬅</button><canvas id="graficaDetalle"></canvas>`;

  if(tipo==='agua') detalle('agua','consumo_m3','m³');
  if(tipo==='energia') detalle('energia','consumo_kwh','kWh');
  if(tipo==='gasolina') detalleGasolina();
}

async function detalle(tabla,campo,unidad){
  const anio=obtenerAnio();

  const {data}=await supabaseClient.from(tabla)
  .select(`${campo},gastos(fecha,total)`);

  const filtrados=data.filter(d=>obtenerFechaMX(d.gastos.fecha).getFullYear()==anio);

  const labels=[],consumo=[],costo=[];

  filtrados.forEach(d=>{
    const f=obtenerFechaMX(d.gastos.fecha);
    labels.push(f.toLocaleString('es-MX',{month:'short'}));
    consumo.push(d[campo]);
    costo.push(d.gastos.total);
  });

  graficaDetalle(labels,consumo,costo,unidad);
}

function graficaDetalle(labels,consumo,costo,unidad){
  const ctx=document.getElementById('graficaDetalle');
  if(window.chartDetalle) window.chartDetalle.destroy();

  window.chartDetalle=new Chart(ctx,{
    data:{
      labels,
      datasets:[
        {type:'line',label:unidad,data:consumo,yAxisID:'y1'},
        {type:'bar',label:'Costo',data:costo,yAxisID:'y2'}
      ]
    },
    options:{
      scales:{
        y2:{position:'right',
          ticks:{callback:v=>formatoMoneda(v)}
        }
      }
    }
  });
}

async function detalleGasolina(){
  const anio=obtenerAnio();

  const {data}=await supabaseClient.from('gasolina')
  .select(`litros,kilometraje,gastos(fecha,total)`);

  const filtrados=data.filter(d=>obtenerFechaMX(d.gastos.fecha).getFullYear()==anio);

  const labels=[],litros=[],costo=[],rend=[];

  filtrados.forEach(d=>{
    const f=obtenerFechaMX(d.gastos.fecha);
    labels.push(f.toLocaleString('es-MX',{month:'short'}));
    litros.push(d.litros);
    costo.push(d.gastos.total);
    rend.push(d.litros>0?d.kilometraje/d.litros:0);
  });

  if(window.chartDetalle) window.chartDetalle.destroy();

  window.chartDetalle=new Chart(document.getElementById('graficaDetalle'),{
    data:{
      labels,
      datasets:[
        {type:'bar',label:'Litros',data:litros},
        {type:'bar',label:'Costo',data:costo},
        {type:'line',label:'km/L',data:rend}
      ]
    }
  });
}


