const ENVIO_MXN = 199;

async function cargarBolsa() {
  const contenedor = document.getElementById('contenido-bolsa');
  const usuario = obtenerUsuario();
  if (!usuario) {
    contenedor.innerHTML = `
      <div class="tarjeta p-5 text-center">
        <i class="bi bi-bag fs-1 text-muted"></i>
        <p class="text-muted mt-3">Inicia sesión para ver tu bolsa.</p>
        <a class="btn-negro mt-2" href="login.html">Iniciar sesión</a>
      </div>`;
    return;
  }

  try {
    const bolsa = await peticion('/bolsa');
    if (bolsa.articulos.length === 0) {
      contenedor.innerHTML = `
        <div class="tarjeta p-5 text-center">
          <i class="bi bi-bag fs-1 text-muted"></i>
          <p class="text-muted mt-3 mb-3">Tu bolsa está vacía.</p>
          <a class="btn-negro" href="catalogo.html">Ver catálogo</a>
        </div>`;
      return;
    }

    const total = bolsa.subtotal + ENVIO_MXN;
    contenedor.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          ${bolsa.articulos.map(renderizarLinea).join('')}
        </div>
        <div class="col-lg-4">
          <div class="tarjeta p-4">
            <h2 class="h6 mb-3 text-uppercase text-muted">Resumen</h2>
            <div class="d-flex justify-content-between mb-2">
              <span class="text-muted">Subtotal</span>
              <span>${formatearPrecio(bolsa.subtotal)}</span>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <span class="text-muted">Envío</span>
              <span>${formatearPrecio(ENVIO_MXN)}</span>
            </div>
            <div class="d-flex justify-content-between border-top pt-3 mb-4">
              <strong>Total</strong>
              <strong>${formatearPrecio(total)}</strong>
            </div>
            <button type="button" class="btn-negro w-100" id="btn-ordenar">Generar pedido</button>
          </div>
        </div>
      </div>`;

    document.querySelectorAll('.btn-cantidad').forEach((boton) => {
      boton.addEventListener('click', () => {
        const idDetalle = Number(boton.dataset.id);
        const delta = Number(boton.dataset.delta);
        actualizarCantidad(idDetalle, delta);
      });
    });

    document.querySelectorAll('.btn-eliminar-linea').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const idDetalle = Number(boton.dataset.id);
        const confirmar = await mostrarConfirmacion('Eliminar artículo', '¿Quieres quitar este artículo de tu bolsa?');
        if (!confirmar) return;
        try {
          await peticion(`/bolsa/articulos/${idDetalle}`, { method: 'DELETE' });
          actualizarContadorBolsa();
          cargarBolsa();
        } catch (error) {
          mostrarAlerta('No se pudo eliminar', error.message, 'error');
        }
      });
    });

    document.getElementById('btn-ordenar').addEventListener('click', generarPedido);
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

function renderizarLinea(linea) {
  return `
    <div class="tarjeta p-3 mb-3">
      <div class="d-flex gap-3 align-items-center">
        <img src="${linea.imagen_url || 'https://placehold.co/120x120/f5f5f5/9a9a9a?text=TD'}"
             alt="${linea.nombre}" class="rounded" style="width:90px;height:90px;object-fit:cover;"
             onerror="this.onerror=null;this.src='https://placehold.co/120x120/f5f5f5/9a9a9a?text=TD';">
        <div class="flex-grow-1">
          <h3 class="h6 mb-1">${linea.nombre}</h3>
          <p class="small text-muted mb-2">${formatearPrecio(linea.precio_unitario)} c/u</p>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn-ghost btn-sm px-2 btn-cantidad"
              data-id="${linea.id_detalle}" data-delta="-1">−</button>
            <span class="px-2">${linea.cantidad}</span>
            <button type="button" class="btn-ghost btn-sm px-2 btn-cantidad"
              data-id="${linea.id_detalle}" data-delta="1">+</button>
          </div>
        </div>
        <div class="text-end">
          <div class="fw-bold mb-2">${formatearPrecio(linea.subtotal_linea)}</div>
          <button type="button" class="btn-ghost btn-sm px-3 btn-eliminar-linea" data-id="${linea.id_detalle}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}

async function actualizarCantidad(idDetalle, delta) {
  const usuario = obtenerUsuario();
  const bolsa = await peticion('/bolsa');
  const linea = bolsa.articulos.find((a) => a.id_detalle === idDetalle);
  if (!linea) return;
  const nueva = linea.cantidad + delta;
  if (nueva < 1) return;
  if (usuario && nueva > linea.existencias) {
    mostrarAlerta('Sin existencias', `Solo hay ${linea.existencias} disponibles de este producto.`, 'error');
    return;
  }
  try {
    await peticion(`/bolsa/articulos/${idDetalle}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: nueva }),
    });
    actualizarContadorBolsa();
    cargarBolsa();
  } catch (error) {
    mostrarAlerta('No se pudo actualizar', error.message, 'error');
  }
}

async function generarPedido() {
  try {
    const domicilios = await peticion('/domicilios');

    const overlay = crearModalSistema();
    const acciones = overlay.querySelector('.modal-sistema-acciones');
    overlay.querySelector('.modal-sistema-titulo').textContent = 'Dirección de envío';

    const guardadas = domicilios.length
      ? `<div class="contenedor-guardadas">
         <p class="small text-muted mb-2">Dirección guardada:</p>
         <div class="mb-2">${domicilios.map((d) => `
           <label class="d-block tarjeta p-3 mb-2 opcion-domicilio" style="cursor:pointer">
             <input type="radio" name="domicilio" value="${d.id_domicilio}" class="me-2" checked>
             <span><strong>${d.nombre || 'Dirección'}</strong><br>
             <small class="text-muted">${d.calle} ${d.numero || ''}, ${d.colonia}, ${d.codigo_postal} ${d.municipio}, ${d.estado}</small></span>
           </label>`).join('')}
         </div>
         <button type="button" class="btn-ghost btn-sm mb-3 btn-agregar-direccion">Usar otra dirección</button>
       </div>`
      : '';

    const campos = `
      <div class="form-nueva-direccion ${domicilios.length ? 'd-none' : ''}">
        <p class="small text-danger mb-2 aviso-formulario d-none" id="aviso-direccion"></p>
        <div class="campo-form mb-2">
          <label>Nombre</label>
          <input type="text" class="form-control" id="ped-nombre" placeholder="Nombre de la persona que recibe">
        </div>
        <div class="campo-form mb-2">
          <label>Calle *</label>
          <input type="text" class="form-control" id="ped-calle">
        </div>
        <div class="campo-form mb-2">
          <label>Número *</label>
          <input type="text" class="form-control" id="ped-numero">
        </div>
        <div class="campo-form mb-2">
          <label>Colonia *</label>
          <input type="text" class="form-control" id="ped-colonia">
        </div>
        <div class="campo-form mb-2">
          <label>Código Postal *</label>
          <input type="text" class="form-control" id="ped-cp" maxlength="5" inputmode="numeric" placeholder="Ej. 44100">
          <small id="aviso-cp" class="text-muted"></small>
        </div>
        <div class="campo-form mb-2">
          <label>Municipio *</label>
          <input type="text" class="form-control" id="ped-municipio">
        </div>
        <div class="campo-form mb-2">
          <label>Estado *</label>
          <select class="form-select" id="ped-estado"></select>
        </div>
        <div class="campo-form mb-2">
          <label>País</label>
          <input type="text" class="form-control" id="ped-pais" value="México" readonly>
        </div>
      </div>`;

    overlay.querySelector('.modal-sistema-mensaje').innerHTML = guardadas + campos;
    acciones.innerHTML = `
      <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
      <button type="button" class="btn-negro btn-sm px-4 modal-generar-pedido">Generar pedido</button>`;
    overlay.classList.add('visible');

    llenarEstadosDesde('ped-estado');
    const cp = document.getElementById('ped-cp');
    cp.addEventListener('input', () => {
      if (/^\d{5}$/.test(cp.value.trim())) autocompletarCodigoPostalDesde(cp, 'ped-municipio', 'ped-estado');
    });

    overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));

    const btnAgregar = overlay.querySelector('.btn-agregar-direccion');
    if (btnAgregar) {
      btnAgregar.addEventListener('click', () => {
        overlay.querySelectorAll('input[name="domicilio"]').forEach((r) => (r.disabled = true));
        overlay.querySelector('.contenedor-guardadas').classList.add('d-none');
        overlay.querySelector('.form-nueva-direccion').classList.remove('d-none');
      });
    }

    overlay.querySelector('.modal-generar-pedido').addEventListener('click', async () => {
      const radio = overlay.querySelector('input[name="domicilio"]:checked:not(:disabled)');
      let idDomicilio = radio ? Number(radio.value) : null;

      if (!idDomicilio) {
        const camposRequeridos = ['ped-nombre', 'ped-calle', 'ped-numero', 'ped-colonia', 'ped-cp', 'ped-municipio', 'ped-estado'];
        const faltantes = camposRequeridos.filter((id) => {
          const input = document.getElementById(id);
          const valido = input.value.trim() !== '';
          input.classList.toggle('invalido', !valido);
          return !valido;
        });
        if (faltantes.length) {
          const aviso = document.getElementById('aviso-direccion');
          aviso.textContent = 'Completa los campos obligatorios de la dirección.';
          aviso.classList.remove('d-none');
          return;
        }

        try {
          const nuevo = await peticion('/domicilios', {
            method: 'POST',
            body: JSON.stringify({
              nombre: document.getElementById('ped-nombre').value.trim() || null,
              calle: document.getElementById('ped-calle').value.trim(),
              numero: document.getElementById('ped-numero').value.trim(),
              colonia: document.getElementById('ped-colonia').value.trim(),
              codigo_postal: document.getElementById('ped-cp').value.trim(),
              municipio: document.getElementById('ped-municipio').value.trim(),
              estado: document.getElementById('ped-estado').value.trim(),
              pais: 'México',
            }),
          });
          idDomicilio = nuevo.domicilio.id_domicilio;
        } catch (error) {
          const aviso = document.getElementById('aviso-direccion');
          aviso.textContent = error.message;
          aviso.classList.remove('d-none');
          return;
        }
      }

      // Paso 1 resuelto: pasar al paso 2 (datos de tarjeta de prueba).
      mostrarPasoPago(overlay, idDomicilio);
    });
  } catch (error) {
    mostrarAlerta('No se pudo generar', error.message, 'error');
  }
}

// Algoritmo de Luhn para validar el número de tarjeta en el cliente.
function luhnValido(numero) {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = Number(numero[i]);
    if (doble) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    doble = !doble;
  }
  return suma % 10 === 0;
}

// Valida formato MM/AA y que la tarjeta no esté vencida.
function expiracionValida(texto) {
  const coincidencia = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(texto);
  if (!coincidencia) return false;
  const mes = Number(coincidencia[1]);
  const anio = 2000 + Number(coincidencia[2]);
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;
  return anio > anioActual || (anio === anioActual && mes >= mesActual);
}

// Paso 2 del flujo: formulario de tarjeta de PRUEBA (simulación, sin pasarela).
// El número de tarjeta se valida solo en el cliente y NUNCA viaja al backend:
// al backend solo llega metodo_pago: 'tarjeta_prueba'.
function mostrarPasoPago(overlay, idDomicilio) {
  overlay.querySelector('.modal-sistema-titulo').textContent = 'Pago';
  overlay.querySelector('.modal-sistema-mensaje').innerHTML = `
    <p class="small text-muted mb-3"><i class="bi bi-shield-check me-1"></i>Pago de prueba &mdash; los datos no se envían ni se almacenan.</p>
    <div class="campo-form mb-2">
      <label>Número de tarjeta *</label>
      <input type="text" class="form-control" id="pago-numero" inputmode="numeric" maxlength="19"
             placeholder="4111 1111 1111 1111" autocomplete="off">
      <small class="text-muted" id="aviso-pago-numero"></small>
      <small class="text-muted d-block mt-1">Tarjeta de prueba: 4111 1111 1111 1111 (Visa)</small>
    </div>
    <div class="campo-form mb-2">
      <label>Titular *</label>
      <input type="text" class="form-control" id="pago-titular" placeholder="Nombre como aparece en la tarjeta" autocomplete="off">
      <small class="text-muted" id="aviso-pago-titular"></small>
    </div>
    <div class="row g-2 mb-2">
      <div class="col-6 campo-form">
        <label>Expiración *</label>
        <input type="text" class="form-control" id="pago-expiracion" inputmode="numeric" maxlength="5"
               placeholder="MM/AA" autocomplete="off">
        <small class="text-muted" id="aviso-pago-expiracion"></small>
      </div>
      <div class="col-6 campo-form">
        <label>CVV *</label>
        <input type="text" class="form-control" id="pago-cvv" inputmode="numeric" maxlength="4"
               placeholder="123" autocomplete="off">
        <small class="text-muted" id="aviso-pago-cvv"></small>
      </div>
    </div>`;

  const acciones = overlay.querySelector('.modal-sistema-acciones');
  acciones.innerHTML = `
    <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
    <button type="button" class="btn-negro btn-sm px-4 modal-pagar">Pagar</button>`;
  overlay.classList.add('visible');

  const numero = document.getElementById('pago-numero');
  const expiracion = document.getElementById('pago-expiracion');
  const cvv = document.getElementById('pago-cvv');

  // Formato en vivo: solo dígitos, agrupados de 4 en 4 (hasta 19 dígitos).
  numero.addEventListener('input', () => {
    numero.value = numero.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  expiracion.addEventListener('input', () => {
    let valor = expiracion.value.replace(/\D/g, '').slice(0, 4);
    if (valor.length > 2) valor = valor.slice(0, 2) + '/' + valor.slice(2);
    expiracion.value = valor;
  });
  cvv.addEventListener('input', () => {
    cvv.value = cvv.value.replace(/\D/g, '').slice(0, 4);
  });

  overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));

  function marcarCampo(input, idAviso, valido, mensaje) {
    input.classList.toggle('invalido', !valido);
    document.getElementById(idAviso).textContent = valido ? '' : mensaje;
    return valido;
  }

  overlay.querySelector('.modal-pagar').addEventListener('click', async () => {
    const numeroLimpio = numero.value.replace(/[\s-]/g, '');
    const titular = document.getElementById('pago-titular').value.trim();
    const expiracionValor = expiracion.value.trim();
    const cvvValor = cvv.value.trim();

    const validaciones = [
      marcarCampo(numero, 'aviso-pago-numero',
        /^\d{13,19}$/.test(numeroLimpio) && luhnValido(numeroLimpio),
        'Número inválido (13-19 dígitos y verificación de tarjeta). Prueba: 4111 1111 1111 1111'),
      marcarCampo(document.getElementById('pago-titular'), 'aviso-pago-titular',
        titular.length >= 3,
        'Escribe el nombre del titular (mínimo 3 letras).'),
      marcarCampo(expiracion, 'aviso-pago-expiracion',
        expiracionValida(expiracionValor),
        'Fecha inválida o vencida (formato MM/AA).'),
      marcarCampo(cvv, 'aviso-pago-cvv',
        /^\d{3,4}$/.test(cvvValor),
        'CVV inválido (3 o 4 dígitos).'),
    ];

    if (validaciones.includes(false)) return;

    // Evita doble clic: deshabilita el botón mientras se genera el pedido.
    const botonPagar = overlay.querySelector('.modal-pagar');
    botonPagar.disabled = true;
    botonPagar.textContent = 'Procesando...';

    try {
      const resultado = await peticion('/ordenes', {
        method: 'POST',
        body: JSON.stringify({ id_domicilio: idDomicilio, metodo_pago: 'tarjeta_prueba' }),
      });
      overlay.classList.remove('visible');
      actualizarContadorBolsa();
      mostrarAlerta('Pedido generado', `Tu pedido ${resultado.orden.folio_orden} fue creado con éxito.`, 'exito');
      setTimeout(() => { window.location.href = 'pedidos.html'; }, 1200);
    } catch (error) {
      botonPagar.disabled = false;
      botonPagar.textContent = 'Pagar';
      mostrarAlerta('No se pudo generar', error.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', cargarBolsa);
