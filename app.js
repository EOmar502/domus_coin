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
  if (seccion === 'gas') renderGas(cont);
  if (seccion === 'vehiculos') renderVehiculos(cont);
  if (seccion === 'dashboard') renderDashboard(cont);
}

// 💧 Modulo del Agua

function renderAgua(cont) {
  cont.innerHTML = `
    <h2>💧 Agua</h2>

    <label for="mes">Mes y Año</label>
    <input type="month" id="mes">

    <label for="consumo">Consumo (m³)</label>
    <input id="consumo" type="number" placeholder="Ej: 15.0">

    <label for="total">Total ($)</label>
    <input id="total" type="number" placeholder="Ej: 350.00">

    <button onclick="guardarAgua()">💾 Guardar</button>
  `;
}

async function guardarAgua() {
  const mes = document.getElementById('mes').value;
  const consumo = parseFloat(document.getElementById('consumo').value);
  const total = parseFloat(document.getElementById('total').value);

  // Validaciones
  if (!mes) {
    alert("⚠️ Selecciona mes y año");
    return;
  }

  if (!consumo || !total) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  // Separar año y mes
  const [anio, mesNum] = mes.split("-");

  // Convertir a nombre
  const nombresMes = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const nombreMes = nombresMes[parseInt(mesNum) - 1];

  // 1. Guardar gasto general
  const { data: gasto, error: err1 } = await supabaseClient
    .from('gastos')
    .insert([{
      tipo: 'agua',
      fecha: `${anio}-${mesNum}-01`,
      total,
      usuario_id
    }])
    .select()
    .single();

  if (err1) {
    alert(err1.message);
    return;
  }

  // 2. Guardar detalle agua
  const { error: err2 } = await supabaseClient
    .from('agua')
    .insert([{
      gasto_id: gasto.id,
      consumo_m3: consumo,
      mes: `${nombreMes} ${anio}`
    }]);

  if (err2) {
    alert(err2.message);
  } else {
    alert("✅ Agua guardada correctamente");

    limpiarFormulario('contenido');
  }
}


// ⚡ Energía

function renderEnergia(cont) {
  cont.innerHTML = `
    <h2>⚡ Energía</h2>

    <label for="mes">Mes y Año</label>
    <input type="month" id="mes">
    
    <label>Lectura anterior (kWh)</label>
    <input id="lectura_anterior" type="number">

    <label>Lectura actual (kWh)</label>
    <input id="lectura_actual" type="number">

    <label>Consumo calculado (kWh)</label>
    <input id="consumo_kwh" type="number" readonly>

    <label>Total ($)</label>
    <input id="total_energia" type="number">

    <button onclick="guardarEnergia()">💾 Guardar</button>
  `;

  // cálculo automático
  document.getElementById('lectura_actual').addEventListener('input', calcularConsumoEnergia);
  document.getElementById('lectura_anterior').addEventListener('input', calcularConsumoEnergia);
}

function calcularConsumoEnergia() {
  const anterior = parseFloat(document.getElementById('lectura_anterior').value) || 0;
  const actual = parseFloat(document.getElementById('lectura_actual').value) || 0;

  const consumo = actual - anterior;

  if (consumo >= 0) {
    document.getElementById('consumo_kwh').value = consumo;
  } else {
    document.getElementById('consumo_kwh').value = '';
  }
}

async function guardarEnergia() {

  const mes = document.getElementById('mes').value;
  const lectura_anterior = parseFloat(document.getElementById('lectura_anterior').value);
  const lectura_actual = parseFloat(document.getElementById('lectura_actual').value);
  const total = parseFloat(document.getElementById('total_energia').value);

  if (!mes) {
    alert("⚠️ Selecciona mes");
    return;
  }

  if (!lectura_anterior || !lectura_actual || !total) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  if (lectura_actual < lectura_anterior) {
    alert("❌ Lectura actual menor a la anterior");
    return;
  }

  const [anio, mesNum] = mes.split("-");

  const nombresMes = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const nombreMes = nombresMes[parseInt(mesNum) - 1];
  const consumo = lectura_actual - lectura_anterior;

  // 1. Insert en gastos
  const { data: gasto, error: err1 } = await supabaseClient
    .from('gastos')
    .insert([{
      tipo: 'energia',
      fecha: `${anio}-${mesNum}-01`,
      total,
      usuario_id
    }])
    .select()
    .single();

  if (err1) {
    alert(err1.message);
    return;
  }

  // 2. Insert en energía
  const { error: err2 } = await supabaseClient
    .from('energia')
    .insert([{
      gasto_id: gasto.id,
      consumo_kwh: consumo,
      periodo: `${nombreMes} ${anio}`,
      lectura_anterior,
      lectura_actual
    }]);

  if (err2) {
    alert(err2.message);
  } else {
    alert("✅ Energía guardada correctamente");
    limpiarFormulario('contenido');
  }
}

// 💨 Gas

function renderGas(cont) {
  cont.innerHTML = `
    <h2>💨 Gas</h2>

    <label for="mes">Mes y Año</label>
    <input type="month" id="mes">
    
    <label>Lectura anterior (m3)</label>
    <input id="lectura_anterior" type="number">

    <label>Lectura actual (m3)</label>
    <input id="lectura_actual" type="number">

    <label>Consumo calculado (m3)</label>
    <input id="consumo_m3" type="number" readonly>

    <label>Total ($)</label>
    <input id="total_gas" type="number">

    <button onclick="guardarGas()">💾 Guardar</button>
  `;

  // cálculo automático
  document.getElementById('lectura_actual').addEventListener('input', calcularConsumoGas);
  document.getElementById('lectura_anterior').addEventListener('input', calcularConsumoGas);
}

function calcularConsumoGas() {
  const anterior = parseFloat(document.getElementById('lectura_anterior').value) || 0;
  const actual = parseFloat(document.getElementById('lectura_actual').value) || 0;

  const consumo = actual - anterior;

  if (consumo >= 0) {
    document.getElementById('consumo_m3').value = consumo;
  } else {
    document.getElementById('consumo_m3').value = '';
  }
}

async function guardarGas() {

  const mes = document.getElementById('mes').value;
  const lectura_anterior = parseFloat(document.getElementById('lectura_anterior').value);
  const lectura_actual = parseFloat(document.getElementById('lectura_actual').value);
  const total = parseFloat(document.getElementById('total_gas').value);

  if (!mes) {
    alert("⚠️ Selecciona mes");
    return;
  }

  if (!lectura_anterior || !lectura_actual || !total) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  if (lectura_actual < lectura_anterior) {
    alert("❌ Lectura actual menor a la anterior");
    return;
  }

  const [anio, mesNum] = mes.split("-");

  const nombresMes = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const nombreMes = nombresMes[parseInt(mesNum) - 1];
  const consumo = lectura_actual - lectura_anterior;

  // 1. Insert en gastos
  const { data: gasto, error: err1 } = await supabaseClient
    .from('gastos')
    .insert([{
      tipo: 'gas',
      fecha: `${anio}-${mesNum}-01`,
      total,
      usuario_id
    }])
    .select()
    .single();

  if (err1) {
    alert(err1.message);
    return;
  }

  // 2. Insert en gas
  const { error: err2 } = await supabaseClient
    .from('gas')
    .insert([{
      gasto_id: gasto.id,
      consumo_m3: consumo,
      periodo: `${nombreMes} ${anio}`,
      lectura_anterior,
      lectura_actual
    }]);

  if (err2) {
    alert(err2.message);
  } else {
    alert("✅ Gas guardada correctamente");
    limpiarFormulario('contenido');
  }
}


// 🚗 Vehículos

function renderVehiculos(cont) {
  cont.innerHTML = `
    <h2>🚗 Vehículos</h2>

    <input id="modelo" placeholder="Modelo">
    <input id="placas" placeholder="Placas">

    <button onclick="guardarVehiculo()">Guardar</button>
  `;
}

async function guardarVehiculo() {
  const modelo = document.getElementById('modelo').value;
  const placas = document.getElementById('placas').value;

  await supabaseClient
    .from('vehiculos')
    .insert([{
      modelo,
      placas,
      usuario_id
    }]);

  alert("✅ Vehículo guardado");
  limpiarFormulario('contenido');

}

// ⛽ Gasolina

async function renderGasolina(cont) {

  const { data: vehiculos } = await supabaseClient
    .from('vehiculos')
    .select('*');

  let options = vehiculos.map(v =>
    `<option value="${v.id}">${v.modelo} (${v.placas})</option>`
  ).join('');

  cont.innerHTML = `
    <h2>⛽ Gasolina</h2>

    <select id="vehiculo">${options}</select>

    <input id="litros" placeholder="Litros">
    <input id="precio" placeholder="Precio por litro">
    <input id="km" placeholder="Kilometraje">

    <button onclick="guardarGasolina()">Guardar</button>
  `;
}

async function guardarGasolina() {

  const vehiculo_id = document.getElementById('vehiculo').value;
  const litros = parseFloat(document.getElementById('litros').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const km = parseFloat(document.getElementById('km').value);

  const total = litros * precio;

  const { data: gasto } = await supabaseClient
    .from('gastos')
    .insert([{
      tipo: 'gasolina',
      fecha: new Date(),
      total,
      usuario_id
    }])
    .select()
    .single();

  await supabaseClient
    .from('gasolina')
    .insert([{
      gasto_id: gasto.id,
      vehiculo_id,
      litros,
      kilometraje: km,
      precio_litro: precio
    }]);

  alert("✅ Gasolina guardada");
  limpiarFormulario('contenido');

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
  let totalGas = 0;

  data.forEach(g => {

    const fecha = new Date(g.fecha + 'T00:00:00-06:00');

    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
    const label = fecha.toLocaleString('es-MX', { month:'short', year:'numeric' });

    if (!meses[clave]) {
      meses[clave] = { label, agua:0, energia:0, gasolina:0, gas:0 };
    }

    meses[clave][g.tipo] += g.total;

    if (g.tipo === 'agua') totalAgua += g.total;
    if (g.tipo === 'energia') totalEnergia += g.total;
    if (g.tipo === 'gasolina') totalGasolina += g.total;
    if (g.tipo === 'gas') totalGas += g.total;

  });

  mostrarTotales(totalAgua, totalEnergia, totalGasolina, totalGas);

  const orden = Object.keys(meses).sort();

  crearGrafica(
    orden.map(k => meses[k].label),
    orden.map(k => meses[k].agua),
    orden.map(k => meses[k].energia),
    orden.map(k => meses[k].gasolina),
    orden.map(k => meses[k].gas)
  );
}

// Gráfica principal
function crearGrafica(labels, agua, energia, gasolina, gas) {

  const ctx = document.getElementById('grafica');

  if (window.chart) window.chart.destroy();

  window.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Agua', data: agua, backgroundColor:'#0288d1' },
        { label: 'Energía', data: energia, backgroundColor:'#fbc02d' },
        { label: 'Gasolina', data: gasolina, backgroundColor:'#ef5350' },
        { label: 'Gas', data: gas, backgroundColor:'#808080' }
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
function mostrarTotales(agua, energia, gasolina, gas) {
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
    <div onclick="verDetalle('gas')" style="flex:1;background:#D3D3D3;padding:10px;border-radius:10px;text-align:center;cursor:pointer">
      💨 Gas<br>${formatoMoneda(gas)}
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
  if (tipo === 'gas') renderDetalle('gas', 'gas', 'consumo_m3', 'm3');
}

// Generico agua/energia/gas
async function renderDetalle(tabla, tipo, campo, unidad) {

const { data } = await supabaseClient
  .from(tabla)
  .select(`${campo}, gastos(fecha,total)`);

// ✅ FILTRO POR AÑO
const anio = document.getElementById('filtroAnio')?.value;

const filtrados = data.filter(d =>
  new Date(d.gastos.fecha + 'T00:00:00-06:00').getFullYear() == anio
);

// ✅ ORDENAR
filtrados.sort((a,b)=>
  new Date(a.gastos.fecha + 'T00:00:00-06:00') -
  new Date(b.gastos.fecha + 'T00:00:00-06:00')
);

const labels=[], consumo=[], costo=[];

// ✅ usar filtrados
filtrados.forEach(d=>{
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

  const anio = document.getElementById('filtroAnio')?.value;

  const filtrados = data.filter(d =>
    new Date(d.gastos.fecha + 'T00:00:00-06:00').getFullYear() == anio
    );

    filtrados.forEach(d=>{
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
        y2:{position:'right',
          ticks:{callback:v=>formatoMoneda(v)}
        }
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


