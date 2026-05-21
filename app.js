// 🔐 SUPABASE CONFIG
const supabaseUrl = 'https://kmaydnzeiyynbphudntj.supabase.co';
const supabaseKey = 'sb_publishable_lV7QSsgPX_5nJh0ksO83ww_7G9szgjj';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 📦 TELEGRAM DATA
const tg = Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || null;

const usuario_id = user ? user.id : 'demo_user';

// Navegación
function mostrarSeccion(seccion) {
  const cont = document.getElementById('contenido');

  if (seccion === 'agua') renderAgua(cont);
  if (seccion === 'energia') renderEnergia(cont);
  if (seccion === 'gasolina') renderGasolina(cont);
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
  }
}


// ⚡ Energía

function renderEnergia(cont) {
  cont.innerHTML = `
    <h2>⚡ Energía</h2>

    <input id="periodo" placeholder="Periodo (02 Ene 26 al 12 Mar 26)">

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
  document.getElementById('lectura_actual').addEventListener('input', calcularConsumo);
  document.getElementById('lectura_anterior').addEventListener('input', calcularConsumo);
}

function calcularConsumo() {
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

  const periodo = document.getElementById('periodo').value;
  const lectura_anterior = parseFloat(document.getElementById('lectura_anterior').value);
  const lectura_actual = parseFloat(document.getElementById('lectura_actual').value);
  const consumo = lectura_actual - lectura_anterior;
  const total = parseFloat(document.getElementById('total_energia').value);

  if (!periodo || !lectura_anterior || !lectura_actual || !total) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  if (lectura_actual < lectura_anterior) {
    alert("❌ La lectura actual no puede ser menor a la anterior");
    return;
  }

  // 1️⃣ Insert en gastos
  const { data: gasto, error: err1 } = await supabaseClient
    .from('gastos')
    .insert([{
      tipo: 'energia',
      fecha: new Date(),
      total,
      usuario_id
    }])
    .select()
    .single();

  if (err1) {
    alert(err1.message);
    return;
  }

  // 2️⃣ Insert en energia
  const { error: err2 } = await supabaseClient
    .from('energia')
    .insert([{
      gasto_id: gasto.id,
      consumo_kwh: consumo,
      periodo,
      lectura_anterior,
      lectura_actual
    }]);

  if (err2) {
    alert(err2.message);
  } else {
    alert("✅ Energía guardada correctamente");
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
}

// 📊 Dashboard básico

async function renderDashboard(cont) {

  const { data } = await supabaseClient
    .from('gastos')
    .select('*')
    .eq('usuario_id', usuario_id);

  let total = 0;
  let porTipo = {};

  data.forEach(g => {
    total += g.total;

    if (!porTipo[g.tipo]) porTipo[g.tipo] = 0;
    porTipo[g.tipo] += g.total;
  });

  let html = `<h2>📊 Dashboard</h2>`;
  html += `<h3>Total: $${total}</h3>`;

  for (let tipo in porTipo) {
    html += `<p>${tipo}: $${porTipo[tipo]}</p>`;
  }

  cont.innerHTML = html;
}

// Prueba de conexión a base de datos
async function testDB() {
  console.log("🔍 Probando conexión...");

  const { data, error } = await supabaseClient
    .from('gastos')
    .select('*');

  if (error) {
    console.error("❌ ERROR:", error);
    alert("Error: " + error.message);
  } else {
    console.log("✅ DATOS:", data);
    alert("Conexión exitosa ✅");
  }
}


