// 🔐 SUPABASE CONFIG
const supabaseUrl = 'https://kmaydnzeiyynbphudntj.supabase.co';
const supabaseKey = 'sb_publishable_lV7QSsgPX_5nJh0ksO83ww_7G9szgjj';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 📦 TELEGRAM DATA (seguro en web y Telegram)
let usuario_id = 'demo_user';

if (window.Telegram && Telegram.WebApp) {
  const tg = Telegram.WebApp;
  tg.expand();
  const user = tg.initDataUnsafe?.user || null;
  usuario_id = user ? user.id : 'demo_user';
}

// 🔧 UTILIDADES
function formatoMoneda(valor) {
  return '$' + valor.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Limpiar formularios
function limpiarFormulario(containerId) {
  const cont = document.getElementById(containerId);
  const inputs = cont.querySelectorAll('input, select');
  inputs.forEach(input => input.value = '');
}

// Navegación
function mostrarSeccion(seccion) {
  const cont = document.getElementById('contenido');
  if (seccion === 'agua') renderAgua(cont);
  if (seccion === 'energia') renderEnergia(cont);
  if (seccion === 'gasolina') renderGasolina(cont);
  if (seccion === 'vehiculos') renderVehiculos(cont);
  if (seccion === 'dashboard') renderDashboard(cont);
}

// =========================
// 📊 DASHBOARD
// =========================

async function renderDashboard(cont) {
  cont.innerHTML = `
    <h2>📊 Dashboard de Gastos</h2>

    <label>Año</label>
    <select id="filtroAnio"></select>

    <div id="resumenTotales" style="display:flex; gap:10px; margin:15px 0;"></div>

    <canvas id="grafica"></canvas>
  `;
  await cargarAnios();
}

async function cargarAnios() {
  const { data } = await supabaseClient
    .from('gastos')
    .select('fecha')
    .eq('usuario_id', usuario_id);

  const anios = new Set();

  data.forEach(g => {
    const year = new Date(g.fecha + 'T00:00:00-06:00').getFullYear();
    anios.add(year);
  });

  const select = document.getElementById('filtroAnio');
  const lista = [...anios].sort();

  select.innerHTML = lista.map(a => `<option>${a}</option>`).join('');

  const actual = new Date().getFullYear();
  if (lista.includes(actual)) select.value = actual;

  select.addEventListener('change', cargarGrafica);

  cargarGrafica();
}

async function cargarGrafica() {
  const anio = document.getElementById('filtroAnio')?.value;

  const { data } = await supabaseClient
    .from('gastos')
    .select('*')
    .eq('usuario_id', usuario_id);

  const filtrados = data.filter(g =>
    new Date(g.fecha + 'T00:00:00-06:00').getFullYear() == anio
  );

  procesarDatosGrafica(filtrados);
}

// Procesamiento
function procesarDatosGrafica(data) {

  const meses = {};
  let totalAgua = 0;
  let totalEnergia = 0;
  let totalGasolina = 0;

  data.forEach(g => {

    const fecha = new Date(g.fecha + 'T00:00:00-06:00');

    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
    const label = fecha.toLocaleString('es-MX', { month:'short', year:'numeric' });

    if (!meses[clave]) {
      meses[clave] = { label, agua:0, energia:0, gasolina:0 };
    }

    meses[clave][g.tipo] += g.total;

    if (g.tipo === 'agua') totalAgua += g.total;
    if (g.tipo === 'energia') totalEnergia += g.total;
    if (g.tipo === 'gasolina') totalGasolina += g.total;

  });

  mostrarTotales(totalAgua, totalEnergia, totalGasolina);

  const orden = Object.keys(meses).sort();

  crearGrafica(
    orden.map(k => meses[k].label),
    orden.map(k => meses[k].agua),
    orden.map(k => meses[k].energia),
    orden.map(k => meses[k].gasolina)
  );
}

// Gráfica principal
function crearGrafica(labels, agua, energia, gasolina) {

  const ctx = document.getElementById('grafica');

  if (window.chart) window.chart.destroy();

  window.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Agua', data: agua, backgroundColor:'#0288d1' },
        { label: 'Energía', data: energia, backgroundColor:'#fbc02d' },
        { label: 'Gasolina', data: gasolina, backgroundColor:'#ef5350' }
      ]
    },
    options: {
      plugins: { legend:{ display:false }},
      scales: {
        y: {
          ticks: {
            callback:v => formatoMoneda(v)
          }
        }
      }
    }
  });
}

// Tarjetas
function mostrarTotales(agua, energia, gasolina) {
  document.getElementById('resumenTotales').innerHTML = `
    <div onclick="verDetalle('agua')" style="flex:1;background:#e1f5fe;padding:10px;border-radius:10px;text-align:center;cursor:pointer">
      💧 Agua<br>${formatoMoneda(agua)}
    </div>
    <div onclick="verDetalle('energia')" style="flex:1;background:#fff8e1;padding:10px;border-radius:10px;text-align:center;cursor:pointer">
      ⚡ Energía<br>${formatoMoneda(energia)}
    </div>
    <div onclick="verDetalle('gasolina')" style="flex:1;background:#fdecea;padding:10px;border-radius:10px;text-align:center;cursor:pointer">
      ⛽ Gasolina<br>${formatoMoneda(gasolina)}
    </div>
  `;
}

// =========================
// 🔎 DETALLES
// =========================

function verDetalle(tipo) {
  const cont = document.getElementById('contenido');

  cont.innerHTML = `<button onclick="mostrarSeccion('dashboard')">⬅ Volver</button>
                    <canvas id="graficaDetalle"></canvas>`;

  if (tipo === 'agua') renderDetalle('agua', 'agua', 'consumo_m3', 'm³');
  if (tipo === 'energia') renderDetalle('energia', 'energia', 'consumo_kwh', 'kWh');
  if (tipo === 'gasolina') renderGasolinaDetalle();
}

// Generico agua/energia
async function renderDetalle(tabla, tipo, campo, unidad) {

  const { data } = await supabaseClient
    .from(tabla)
    .select(`${campo}, gastos(fecha,total)`);

  data.sort((a,b)=>new Date(a.gastos.fecha)-new Date(b.gastos.fecha));

  const labels=[], consumo=[], costo=[];

  data.forEach(d=>{
    const f=new Date(d.gastos.fecha+'T00:00:00-06:00');
    labels.push(f.toLocaleString('es-MX',{month:'short',year:'numeric'}));
    consumo.push(d[campo]);
    costo.push(d.gastos.total);
  });

  crearDetalle(labels, consumo, costo, unidad);
}

// gasolina
async function renderGasolinaDetalle() {

  const { data } = await supabaseClient
    .from('gasolina')
    .select(`litros,kilometraje,gastos(fecha,total)`);

  const labels=[], litros=[], costo=[], rendimiento=[];

  data.forEach(d=>{
    const f=new Date(d.gastos.fecha+'T00:00:00-06:00');
    labels.push(f.toLocaleString('es-MX',{month:'short',year:'numeric'}));
    litros.push(d.litros);
    costo.push(d.gastos.total);
    rendimiento.push(d.litros>0 ? d.kilometraje/d.litros : 0);
  });

  crearGasolina(labels, litros, costo, rendimiento);
}

// gráfica detalle
function crearDetalle(labels, consumo, costo, unidad) {

  const ctx=document.getElementById('graficaDetalle');

  if(window.chartDetalle) window.chartDetalle.destroy();

  window.chartDetalle=new Chart(ctx,{
    data:{
      labels,
      datasets:[
        {type:'line',label:'Consumo '+unidad,data:consumo,yAxisID:'y1'},
        {type:'bar',label:'Costo',data:costo,yAxisID:'y2'}
      ]
    },
    options:{
      scales:{
        y1:{position:'left'},
        y2:{position:'right'}
      }
    }
  });
}

function crearGasolina(labels, litros, costo, rendimiento){

  const ctx=document.getElementById('graficaDetalle');

  if(window.chartDetalle) window.chartDetalle.destroy();

  window.chartDetalle=new Chart(ctx,{
    data:{
      labels,
      datasets:[
        {type:'bar',label:'Litros',data:litros},
        {type:'bar',label:'Costo',data:costo},
        {type:'line',label:'km/L',data:rendimiento}
      ]
    }
  });
}


