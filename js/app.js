// ===== WMS - LOGICA =====
// SMS_ACTIVO false = PAUSADO, te deja crear cuenta sin SMS
// Cuando recargues los $20 en Twilio, cambialo a true
var SMS_ACTIVO = false;
var navStack=['p1'];
function show(id, push){
  try{
    if(push===undefined) push=true;
    var protegidas=['p-admin-menu','p-alta-empleado','p-consulta-usuarios','p-consulta-camiones','p-consulta-montacargas','p-consulta-bitacora','p-reportes','p4','p-checklist','p-nueva-pass','p-cambiar-pin','p-alta-montacargas','p-alta-vehiculo'];
    if(protegidas.indexOf(id)>=0 && !window.sesionActiva && id!=='p-nueva-pass' && id!=='p-cambiar-pin'){alert('Por favor, inicia sesión primero');id='p1';}
    var todos=['p1','p2-admin','p2-admin-registro','p-verificacion','p-felicidades','p-olvido','p-suscripcion','p2-operador','p4','p-admin-menu','p-alta-empleado','p-consulta-usuarios','p-consulta-camiones','p-consulta-montacargas','p-consulta-bitacora','p-reportes','p-checklist','p-nueva-pass','p-cambiar-pin','p-alta-montacargas','p-alta-vehiculo'];
    for(var i=0;i<todos.length;i++){var el=document.getElementById(todos[i]);if(el)el.classList.add('hidden');}
    var dest=document.getElementById(id);if(dest)dest.classList.remove('hidden');
    window.scrollTo(0,0);
    if(push && navStack[navStack.length-1]!==id){navStack.push(id);try{history.pushState({pantalla:id},'', '#'+id);}catch(e){}}
    if(id==='p2-operador'){cargarDatosGuardados();}
    if((id==='p-admin-menu' || id==='p-consulta-montacargas' || id==='p-consulta-camiones') && typeof actualizarContadoresEquipos==='function') actualizarContadoresEquipos();
  }catch(e){var d=document.getElementById(id);if(d){d.classList.remove('hidden');}}
}
function abrirMenuAdmin(){document.getElementById('menuOverlayAdmin').style.display='block';document.getElementById('menuPanelAdmin').style.display='flex';}
function cerrarMenuAdmin(){document.getElementById('menuOverlayAdmin').style.display='none';document.getElementById('menuPanelAdmin').style.display='none';}
function irMenuAdmin(id){cerrarMenuAdmin();show(id);}
window.addEventListener('popstate', function(e){
  var cam=document.getElementById('camaraModal');
  if(cam && cam.style.display==='flex'){ cerrarCamaraHD(); try{history.pushState({pantalla:'p-checklist'},'', '#p-checklist');}catch(err){} return; }
  if(navStack.length>1){navStack.pop();var anterior=navStack[navStack.length-1]||'p1';show(anterior, false);}
  else {try{history.pushState({pantalla:'p1'},'', '#p1');}catch(err){}}
});
try{history.replaceState({pantalla:'p1'},'', '#p1');}catch(e){}
var SUPABASE_URL='https://jcubuvoilbqbtpeuajrp.supabase.co';
var SUPABASE_ANON_KEY='sb_publishable_MVCEb9ZZxJRPunTz5uJExg_vMn3xduY';
var CORREO_SOPORTE='teamsupporthelp@gmail.com';
var supabaseClient=null;
try{if(window.supabase)supabaseClient=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(e){supabaseClient=null;}
window.sesionActiva=false;
var usuarios=[],empresaActual=null,operadorActual=null,tipoChecklistActual='montacargas';
var logoEmpresaURL='';try{logoEmpresaURL=localStorage.getItem('wms_logo')||'./icon-512.png';}catch(e){logoEmpresaURL='./icon-512.png';}
var fotosFinalesArr=[];var streamHD=null;
var fotosCamaraAceptadas=[];
var fotoCamaraTemporal=null;
var flashEncendido=false;
function actualizarBotonFlash(){
  var b=document.getElementById('btnFlashCamara');
  if(b){ b.textContent = flashEncendido ? '⚡ On' : '⚡ Off'; b.style.background = flashEncendido ? '#FBBF24' : '#1E293B'; b.style.color = flashEncendido ? '#000' : '#fff'; }
}
async function toggleFlashCamara(){
  try{
    if(!streamHD){ alert('Primero abre la cámara'); return; }
    var track=streamHD.getVideoTracks()[0];
    var caps=track.getCapabilities ? track.getCapabilities() : {};
    if(!caps.torch){ alert('Este teléfono no tiene flash para la cámara trasera.'); return; }
    flashEncendido=!flashEncendido;
    await track.applyConstraints({advanced:[{torch:flashEncendido}]});
    actualizarBotonFlash();
  }catch(e){ alert('No se pudo prender el flash: '+e.message); }
}
function regresarCamaraHD(){ cerrarCamaraHD(); }
function actualizarContadorCamara(){var el=document.getElementById('contadorFotosCamara');if(el)el.textContent=fotosCamaraAceptadas.length+' / 10';}
function pintarHistorialCamara(){var box=document.getElementById('historialFotosCamara');if(!box)return;box.innerHTML='';fotosCamaraAceptadas.forEach(function(src,i){var img=document.createElement('img');img.src=src;img.style.cssText='width:56px;height:56px;object-fit:cover;border-radius:10px;border:2px solid #fff;flex-shrink:0';img.onclick=function(){if(confirm('¿Deseas quitar esta foto?')){fotosCamaraAceptadas.splice(i,1);pintarHistorialCamara();}};box.appendChild(img);});actualizarContadorCamara();}
function aceptarFotoCamara(){if(!fotoCamaraTemporal)return;if(fotosCamaraAceptadas.length>=10){alert('Ya cuentas con 10 fotos');return;}fotosCamaraAceptadas.push(fotoCamaraTemporal);fotoCamaraTemporal=null;var p=document.getElementById('previewCamaraNueva');if(p)p.style.display='none';pintarHistorialCamara();}
function rechazarFotoCamara(){fotoCamaraTemporal=null;var p=document.getElementById('previewCamaraNueva');if(p)p.style.display='none';}
var usuarioCambiandoPin=null;
function generarSalt(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a).map(function(b){return b.toString(16).padStart(2,'0')}).join('');}
async function hashConSalt(texto, salt){var enc=new TextEncoder();var data=enc.encode(salt+'::'+texto);var buf=await crypto.subtle.digest('SHA-256', data);return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');}
var PUNTOS_MONTACARGAS=["Horquillas en Buen estado (No quebradas, dobladas o fisuradas)","Carro porta horquillas","Mastil o torre de elevacion (Sube y Baja sin dificultad)","Desplazador del mastil","Inclinacion del mastil","Mangueras en buen estado","Cadenas en buen estado","Llanta delantera izquierda","Llanta delantera derecha","Llanta trasera izquierda","Llanta trasera derecha","Direccion del volante","Nivel del aceite Hidraulico","Mangeras del mastil sin fugas","Cadenas del Mastil bien sujetas y ajustadas","Asiento en buen estado","Cinturon de seguridad","Palancas de control hidraulico (Todas hacen su funcion)","Freno de mano","Espejo retrovisor","Direccionales","Alarma de reversa","Luces de navegacion","Luces de trabajo o reflectores delanteros","Guarda o parrilla protectora de cabina","Torreta","Boton de emergencia","Extinguidor (Vigente y Cargado)","Cilindro de Gas LP","Mangueras de Gas LP","Explica Golpes y Daños en Carroceria (Comenta)"];

// ===== VEHICULOS - CHECKLIST DINAMICO - MISMO FORMATO MONTACARGAS =====
function puntosVehiculoPorTipo(tipo){
  if(tipo==='Carro' || tipo==='Pick Up'){
    return ["Tarjeta de Circulación Vigente","Holograma de Verificación","Póliza de Seguro Vigente","Foto del Tablero Visible Tacómetro, Nivel de Combustible","Faro delantero izquierdo (Alta y Baja)","Faro delantero derecho (Alta y Baja)","Direccional Izquierda (delantera y trasera)","Direccional Derecha (delantera y trasera)","Intermitentes (delanteros y traseros)","Lámparas de Reversa","Llanta delantera Izquierda","Llanta delantera Derecha","Llanta trasera Izquierda","Llanta trasera derecha","Llanta de Refacción (si cuenta con ella que este funcional y presión adecuada)","Espejo retrovisor derecho","Espejo retrovisor izquierdo","Parabrisas (Roto, estrellado o fisurado)","Anticongelante","Aceite de Motor","Líquido de Frenos","Líquido de Clutch","Extinguidor (Vigente y Cargado)"];
  }
  if(tipo==='1.5 Toneladas' || tipo==='3.5 Toneladas' || tipo==='5 Toneladas' || tipo==='Rabón' || tipo==='Torton'){
    return ["Tarjeta de Circulación Vigente","Holograma de Verificación","Póliza de Seguro Vigente","Foto del Tablero Visible Tacómetro, Nivel de Combustible","Faro delantero izquierdo (Alta y Baja)","Faro delantero derecho (Alta y Baja)","Direccional Izquierda (delantera y trasera)","Direccional Derecha (delantera y trasera)","Intermitentes (delanteros y traseros)","Lámparas de Reversa","Luces de navegación caja","Luces de navegación cabina","Llanta delantera Izquierda","Llanta delantera Derecha","Llanta trasera Izquierda","Llanta trasera derecha","Llantas traseras dual lado izquierdo","Llantas traseras dual lado derecho","Llanta de Refacción (si cuenta con ella que este funcional y presión adecuada)","Espejo retrovisor y Cóncavo derecho","Espejo retrovisor y Cóncavo izquierdo","Parabrisas (Roto, estrellado o fisurado)","Anticongelante","Aceite de Motor","Líquido de Frenos","Líquido de Clutch","Fugas de Aire en Mangueras y o Tanque caso de ser Neumático","Válvula de Estacionamiento o Bendix sin fugas y no Roto ni quebrado","Extinguidor (Vigente y Cargado)","Usa Urea O Adblue"];
  }
  if(tipo==='Tráiler'){
    return ["Tarjeta de Circulación Vigente","Holograma de Verificación","Póliza de Seguro Vigente","Foto del Tablero Visible Tacómetro, Nivel de Combustible","Faro delantero izquierdo (Alta y Baja)","Faro delantero derecho (Alta y Baja)","Direccional Izquierda (delantera y trasera)","Direccional Derecha (delantera y trasera)","Intermitentes (delanteros y traseros)","Lámparas de Reversa","Luces de navegación caja","Luces de navegación cabina","Luces de navegación del remolque","Direccionales Reversa e Intermitentes del Remolque","Llanta delantera Izquierda","Llanta delantera Derecha","Llanta trasera Izquierda","Llanta trasera derecha","Llantas traseras dual lado izquierdo","Llantas traseras dual lado derecho","Llantas dual del Remolque Lado Izquierdo","Llantas dual del Remolque Lado Derecho","Llanta de Refacción (si cuenta con ella que este funcional y presión adecuada)","Espejo retrovisor y Cóncavo derecho","Espejo retrovisor y Cóncavo izquierdo","Parabrisas (Roto, estrellado o fisurado)","Anticongelante","Aceite de Motor","Líquido de Frenos","Líquido de Clutch","Fugas de Aire en Mangueras y o Tanque caso de ser Neumático","Válvula de Estacionamiento o Bendix sin fugas y no Roto ni quebrado","Extinguidor (Vigente y Cargado)","Usa Urea O Adblue"];
  }
  return ["Tarjeta de Circulación Vigente","Holograma de Verificación","Póliza de Seguro Vigente","Foto del Tablero Visible Tacómetro, Nivel de Combustible","Faro delantero izquierdo (Alta y Baja)","Faro delantero derecho (Alta y Baja)","Direccional Izquierda (delantera y trasera)","Direccional Derecha (delantera y trasera)","Intermitentes (delanteros y traseros)","Lámparas de Reversa","Llanta delantera Izquierda","Llanta delantera Derecha","Llanta trasera Izquierda","Llanta trasera derecha","Llanta de Refacción (si cuenta con ella que este funcional y presión adecuada)","Espejo retrovisor derecho","Espejo retrovisor izquierdo","Parabrisas (Roto, estrellado o fisurado)","Anticongelante","Aceite de Motor","Líquido de Frenos","Líquido de Clutch","Extinguidor (Vigente y Cargado)"];
}
var PUNTOS_CAMIONES=puntosVehiculoPorTipo('Carro');
var PUNTOS_BITACORA=["Kilometraje inicial","Nivel de combustible","Destino de ruta","Hora de salida","Documentos de carga"];
function puntosDe(t){
  if(t==='montacargas') return PUNTOS_MONTACARGAS;
  if(t==='camiones'){
    var tv='Carro'; try{ tv=document.getElementById('vTipoVehiculo').value||'Carro'; }catch(e){}
    return puntosVehiculoPorTipo(tv);
  }
  return PUNTOS_BITACORA;
}
function esPuntoGasLP(texto){var t=(texto||'').toLowerCase();return t.indexOf('gas lp')>=0;}
function puntosVisibles(){var base=puntosDe(tipoChecklistActual);if(tipoChecklistActual!=='montacargas') return base;var tipo='';try{tipo=document.getElementById('dTipo').value;}catch(e){tipo='Gas';}if(tipo==='Electrico'){return base.filter(function(p){return !esPuntoGasLP(p);});}return base;}

// ===== FOTO TABLERO - SIN DOBLE PASO - ACEPTAR UNA VEZ Y LISTO =====
var fotoTableroData=null;
var fotoTableroTemporal=null;
function abrirFotoTablero(){var i=document.getElementById('inputFotoTablero'); if(i) i.click();}
function onFotoTableroChange(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    // En cuanto tomas la foto, en automatico ya queda aceptada, sin palomita / crucecita extra
    fotoTableroData=r.result;
    fotoTableroTemporal=null;
    if(window.fotosFinalesArr && fotosFinalesArr.length<10){
      // Si ya habia una foto de tablero, la reemplazamos para no duplicar
      fotosFinalesArr.unshift(fotoTableroData);
      if(typeof renderFotos==='function') renderFotos();
    }
    renderItemsChecklist();
  };
  r.readAsDataURL(f); e.target.value='';
}
// Ya no usamos aceptar / rechazar con doble paso, quedan por compatibilidad pero ya no se muestran
function aceptarFotoTablero(){ if(fotoTableroTemporal){ fotoTableroData=fotoTableroTemporal; fotoTableroTemporal=null; renderItemsChecklist(); } }
function rechazarFotoTablero(){ fotoTableroTemporal=null; renderItemsChecklist(); }
function eliminarFotoTablero(){
  if(!fotoTableroData) return;
  if(!confirm('¿Deseas quitar esta foto del tablero y tomar otra?')) return;
  fotoTableroData=null; fotoTableroTemporal=null;
  if(window.fotosFinalesArr && fotosFinalesArr.length){
    fotosFinalesArr.shift();
    if(typeof renderFotos==='function') renderFotos();
  }
  renderItemsChecklist();
}
function renderItemsChecklist(){
  var c=document.getElementById('itemsChecklist'); if(!c) return; c.innerHTML='';
  puntosVisibles().forEach(function(item,i){
    if(item.indexOf('Foto del Tablero')>=0){
      c.innerHTML+='<div class="fila-check"><b>'+(i+1)+'. '+item+'</b>'
      +'<label class="check-mini" style="display:flex;align-items:center;justify-content:center"><button type="button" onclick="abrirFotoTablero()" style="width:38px;height:38px;border-radius:10px;background:#2563EB;color:#fff;border:none;font-size:18px;cursor:pointer;line-height:1">📷</button></label>'
      +'<label class="check-mini mal" style="display:flex;align-items:center;justify-content:center"><button type="button" onclick="eliminarFotoTablero()" style="display:'+(fotoTableroData?'flex':'none')+';width:38px;height:38px;border-radius:50%;background:#EF4444;color:#fff;border:none;font-size:18px;cursor:pointer;align-items:center;justify-content:center;line-height:1">❌</button></label></div>'
      +'<div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin:-4px 0 10px;padding:0 10px">'
      +'<img id="previewTablero" src="'+(fotoTableroData||'')+'" style="display:'+(fotoTableroData?'block':'none')+';max-width:100%;border-radius:12px">'
      +'</div>'
      +'<input type="file" id="inputFotoTablero" accept="image/*" capture="environment" style="display:none" onchange="onFotoTableroChange(event)">';
      return;
    }
    c.innerHTML+='<div class="fila-check"><b>'+(i+1)+'. '+item+'</b><label class="check-mini"><input type="radio" name="chk'+i+'" value="BUEN ESTADO" checked></label><label class="check-mini mal"><input type="radio" name="chk'+i+'" value="MAL ESTADO"></label></div>';
  });
  try{var n=puntosVisibles().length; if(tipoChecklistActual==='montacargas') document.getElementById('tituloChecklist').innerText='🏗️ Checklist Montacargas - '+n+' puntos'; if(tipoChecklistActual==='camiones') document.getElementById('tituloChecklist').innerText='🚚 Checklist Vehículo - '+n+' puntos';}catch(e){}
}
function hoyISO(){return new Date().toISOString().slice(0,10)}
function verContrasena(){try{var t=document.getElementById('verPass').checked?'text':'password';document.getElementById('pass1').type=t;document.getElementById('pass2').type=t;}catch(e){}}
function abrirLegal(tipo){document.getElementById(tipo==='terminos'?'modalTerminos':'modalPrivacidad').style.display='flex';}
function cerrarLegal(){document.getElementById('modalTerminos').style.display='none';document.getElementById('modalPrivacidad').style.display='none';}
function marcarReq(id, ok, texto){var el=document.getElementById(id); if(!el) return;el.classList.toggle('ok', ok);el.textContent = texto;}
function validarPass(){var p1=document.getElementById('pass1').value||'';var p2=document.getElementById('pass2').value||'';marcarReq('req8', p1.length>=8, '8 caracteres');marcarReq('reqMay', /[A-Z]/.test(p1), '1 Mayúscula');marcarReq('reqMin', /[a-z]/.test(p1), '1 Minúscula');marcarReq('reqEsp', /[@$#%&]/.test(p1), '1 Caracter especial @$#%&');var inp1=document.getElementById('pass1'), inp2=document.getElementById('pass2');var passValida = p1.length>=8 && /[A-Z]/.test(p1) && /[a-z]/.test(p1) && /[@$#%&]/.test(p1);inp1.classList.toggle('input-ok', passValida);inp1.classList.toggle('input-mal', p1.length>0 && !passValida);if(p2.length>0){var coincide = p1===p2 && passValida;inp2.classList.toggle('input-ok', coincide);inp2.classList.toggle('input-mal', !coincide);inp1.classList.toggle('input-ok', coincide);} else {inp2.classList.remove('input-ok','input-mal');}return passValida;}
function passEsValida(){var p=document.getElementById('pass1').value||'';return p.length>=8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[@$#%&]/.test(p);}
var timerInterval=null, tiempoRestante=120, datosPendientes=null;
function iniciarTimer(){clearInterval(timerInterval);tiempoRestante=120;var el=document.getElementById('timerVerif');el.textContent='2:00';timerInterval=setInterval(function(){tiempoRestante--;var m=Math.floor(tiempoRestante/60), s=tiempoRestante%60;el.textContent=m+':'+(s<10?'0'+s:s);if(tiempoRestante<=0){clearInterval(timerInterval); el.textContent='0:00'; alert('Se acabó el tiempo. Por favor, solicita otro código con REENVIAR CÓDIGO.');}},1000);}
async function enviarSMS(to, message){var res = await fetch('/api/send-sms', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: to, message: message }) });var data = await res.json().catch(function(){return {}});if(!res.ok) throw new Error((data.error || 'No se pudo enviar SMS') + ' | ' + (data.details || data.message || 'sin detalle'));return data;}
async function reenviarCodigoVerificacion(){if(!SMS_ACTIVO){alert('Verificación pausada por ahora. Ya puedes entrar directo.'); return;}if(!datosPendientes){alert('Por favor, vuelve a Activar Suscripción'); return;}var codigo=Math.floor(100000+Math.random()*900000).toString();datosPendientes.codigo=codigo; datosPendientes.expira=Date.now()+120000;try{localStorage.setItem('wms_pendiente', JSON.stringify(datosPendientes));}catch(e){}try{await enviarSMS(datosPendientes.telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 2 minutos para usarlo.');}catch(e){alert('No se pudo reenviar SMS: '+e.message); return;}iniciarTimer();var m=document.getElementById('msgVerif'); m.classList.remove('hidden'); m.innerHTML='✅ Te reenviamos el código por SMS a <b>'+enmascararTelefono(datosPendientes.telefono)+'</b>';}
async function crearEmpresaEnSupabase(datos){
  var conNombre={nombre_empresa:datos.empresa,correo:datos.correo,telefono:datos.telefono,pass:datos.pass_hash,pass_salt:datos.pass_salt,estado:'prueba',nombre_admin:datos.nombre||''};
  var res=await supabaseClient.from('empresas').insert([conNombre]).select().single();
  if(res.error && (res.error.message||'').indexOf('nombre_admin')>=0){
    var sinNombre={nombre_empresa:datos.empresa,correo:datos.correo,telefono:datos.telefono,pass:datos.pass_hash,pass_salt:datos.pass_salt,estado:'prueba'};
    res=await supabaseClient.from('empresas').insert([sinNombre]).select().single();
  }
  return res;
}
function ponerNombreAdmin(nombre, empresa){
  try{var el=document.getElementById('nombreEmpresa2'); if(el) el.innerText=nombre||'Administrador';}catch(e){}
  try{var topE=document.getElementById('nombreEmpresaTop'); if(topE) topE.innerText=empresa||'';}catch(e){}
  try{localStorage.setItem('wms_admin_nombre', nombre||'');}catch(e){}
  try{localStorage.setItem('wms_empresa_nombre', empresa||'');}catch(e){}
}
async function confirmarCodigoVerificacion(){
  var codigo=document.getElementById('codigoVerif').value.trim();
  if(!datosPendientes){ try{datosPendientes=JSON.parse(localStorage.getItem('wms_pendiente')||'null');}catch(e){} }
  if(!datosPendientes){alert('No hay registro pendiente. Por favor, vuelve a Activar Suscripción.'); return;}
  if(SMS_ACTIVO){
    if(codigo!==datosPendientes.codigo){alert('Código incorrecto. Por favor, revisa tu SMS.'); return;}
    if(Date.now()>datosPendientes.expira){alert('Código vencido. Por favor, selecciona REENVIAR CÓDIGO.'); return;}
  }
  if(!supabaseClient){alert('Sin internet'); return;}
  var res=await crearEmpresaEnSupabase(datosPendientes);
  if(res.error){alert('No se pudo crear: '+res.error.message); return;}
  clearInterval(timerInterval);
  try{localStorage.removeItem('wms_pendiente');}catch(e){}
  empresaActual=res.data; window.sesionActiva=true;
  ponerNombreAdmin(datosPendientes.nombre, datosPendientes.empresa);
  mostrarPrueba(); aplicarLogo();
  show('p-felicidades');
}
function irAlPanelDespuesRegistro(){ if(empresaActual){ show('p-admin-menu'); } else { show('p2-admin'); } }
function cerrarSesion(){window.sesionActiva=false;empresaActual=null;operadorActual=null;usuarioCambiandoPin=null;navStack=['p1'];cerrarMenuAdmin();show('p1')}
function aplicarLogo(){
  try{
    var la=document.getElementById('logoAdmin'); if(la) la.src=logoEmpresaURL;
    var lo=document.getElementById('logoOperador'); if(lo) lo.src=logoEmpresaURL;
    var pv=document.getElementById('prevLogo');
    var tieneLogo = logoEmpresaURL && logoEmpresaURL.indexOf('icon-512')===-1;
    if(pv){
      if(tieneLogo){ pv.src=logoEmpresaURL; pv.style.display='block'; }
      else { pv.src=''; pv.style.display='none'; }
    }
    var sin=document.getElementById('sinLogoTxt'); if(sin) sin.style.display = tieneLogo ? 'none' : 'block';
    var btn=document.getElementById('btnEliminarLogo'); if(btn) btn.style.display = tieneLogo ? 'inline-block' : 'none';
  }catch(e){}
}
function subirLogo(e){
  var f=e.target.files[0]; if(!f) return;
  if(f.size > 5*1024*1024){ alert('Ese logo pesa mucho. Por favor, elige uno de menos de 5MB.'); e.target.value=''; return; }
  if(f.type.indexOf('image/')!==0){ alert('Por favor, elige una imagen PNG o JPG.'); e.target.value=''; return; }
  var r=new FileReader();
  r.onload=function(){
    var img=new Image();
    img.onload=function(){
      try{
        var maxW=600, maxH=600, w=img.width, h=img.height;
        var scale=Math.min(1, maxW/w, maxH/h);
        var cw=Math.round(w*scale), ch=Math.round(h*scale);
        var c=document.createElement('canvas'); c.width=cw; c.height=cw; c.height=ch;
        var ctx=c.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,cw,ch);
        ctx.drawImage(img,0,0,cw,ch);
        var out = f.type==='image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg',0.9);
        logoEmpresaURL=out;
        try{localStorage.setItem('wms_logo',logoEmpresaURL)}catch(err){ alert('Logo guardado, pero es muy pesado para este dispositivo. Por favor, intenta con uno más pequeño.'); }
        aplicarLogo();
        alert('¡Listo! Ya quedó tu logo.');
      }catch(err){ logoEmpresaURL=r.result; try{localStorage.setItem('wms_logo',logoEmpresaURL)}catch(e2){} aplicarLogo(); }
    };
    img.onerror=function(){ logoEmpresaURL=r.result; try{localStorage.setItem('wms_logo',logoEmpresaURL)}catch(e){} aplicarLogo(); };
    img.src=r.result;
  };
  r.readAsDataURL(f);
  e.target.value='';
}
function eliminarLogo(){
  if(!confirm('¿Deseas eliminar tu logo?')) return;
  logoEmpresaURL='./icon-512.png';
  try{localStorage.removeItem('wms_logo');}catch(e){}
  aplicarLogo();
  alert('Logo eliminado. Ya puedes subir otro.');
}
async function abrirCamaraHD(){
  var m=document.getElementById('camaraModal');m.style.display='flex';
  fotosCamaraAceptadas=[];fotoCamaraTemporal=null;flashEncendido=false;actualizarBotonFlash();
  var pp=document.getElementById('previewCamaraNueva');if(pp)pp.style.display='none';pintarHistorialCamara();
  try{
    if(streamHD){streamHD.getTracks().forEach(function(t){t.stop()});}
    streamHD=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
    var v=document.getElementById('videoHD');v.srcObject=streamHD;await v.play();
    try{history.pushState({pantalla:'camara'},'', '#camara');}catch(e){}
  }catch(e){alert('No se pudo abrir la cámara HD. Por favor, revisa el permiso de cámara.\n'+e.message);document.getElementById('fotosFinales').click();}
}
function cerrarCamaraHD(){
  try{if(streamHD)streamHD.getTracks().forEach(function(t){t.stop()});}catch(e){}
  flashEncendido=false;actualizarBotonFlash();
  var p=document.getElementById('previewCamaraNueva');if(p)p.style.display='none';fotoCamaraTemporal=null;
  fotosCamaraAceptadas.forEach(function(src){if(fotosFinalesArr.length<10)fotosFinalesArr.push(src);});
  fotosCamaraAceptadas=[];pintarHistorialCamara();renderFotos();document.getElementById('camaraModal').style.display='none';
}
function renderFotos(){var pv=document.getElementById('previewFotos');pv.innerHTML='';fotosFinalesArr.forEach(function(data,idx){var wrap=document.createElement('div');wrap.className='foto-item';var img=document.createElement('img');img.src=data;img.className='preview-foto';var btn=document.createElement('button');btn.className='btn-borrar-foto';btn.innerHTML='×';btn.type='button';btn.onclick=function(){fotosFinalesArr.splice(idx,1);renderFotos();};wrap.appendChild(img);wrap.appendChild(btn);pv.appendChild(wrap);});}
function tomarFotoHD(){
  try{
    var v=document.getElementById('videoHD');if(!v.videoWidth){alert('Por favor, espera a que cargue la cámara.');return;}
    if(fotosCamaraAceptadas.length>=10){alert('Ya cuentas con 10 fotos.');return;}
    if(fotosFinalesArr.length>=10){alert('Ya cuentas con 10 fotos.');return;}
    var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;var ctx=c.getContext('2d');ctx.drawImage(v,0,0,c.width,c.height);
    var data=c.toDataURL('image/jpeg',0.82);
    fotoCamaraTemporal=data;var imgEl=document.getElementById('imgPreviewCamara');if(imgEl)imgEl.src=data;var prev=document.getElementById('previewCamaraNueva');if(prev)prev.style.display='flex';
  }catch(e){alert('No se pudo tomar la foto: '+e.message);}
}
function cargarDatosGuardados(){try{var op=JSON.parse(localStorage.getItem('wms_op_login')||'null');if(op){document.getElementById('opEmpresa').value=op.empresa||'';document.getElementById('opUsuario').value=op.usuario||'';}}catch(e){}try{var ad=JSON.parse(localStorage.getItem('wms_admin_login')||'null');if(ad){document.getElementById('loginCorreo').value=ad.correo||'';}}catch(e){}}
function mostrarPrueba(){if(!empresaActual)return;try{document.getElementById('estadoEmpresa').innerText=empresaActual.estado||'prueba';var fin=new Date(empresaActual.fin_prueba);var dias=Math.ceil((fin-new Date())/(1000*60*60*24));document.getElementById('diasPrueba').innerText=empresaActual.estado==='activo'?'Suscripción activa - $99 / mes':dias>0?'Te quedan '+dias+' días gratis, después $99 / mes':'Tu prueba terminó';}catch(e){}}
function soloDigitos(t){return (t||'').replace(/\D/g,'');}
function enmascararTelefono(tel){var d=soloDigitos(tel);if(d.length>=10) d=d.slice(-10);if(d.length<2) return '+52 *******--';return '+52 *******' + d.slice(-2);}
function esPinValido(pin){if(!/^\d{4}$/.test(pin)) return false;if(['0000','1111','1234','4321','9999','0001'].indexOf(pin)>=0) return false;return true;}
async function registrar(){
  var p1=document.getElementById('pass1').value,p2=document.getElementById('pass2').value;
  if(!passEsValida()){alert('Tu contraseña debe tener 8 caracteres, 1 mayúscula, 1 minúscula y 1 caracter especial @$#%&');return}
  if(p1!==p2){alert('Las contraseñas no coinciden');return}
  if(!document.getElementById('aceptoTerminos').checked || !document.getElementById('aceptoPrivacidad').checked){alert('Por favor, acepta Términos y Aviso de Privacidad para continuar.');return}
  var emp=document.getElementById('empresa').value||'', nombre=document.getElementById('regNombre').value||'', correo=document.getElementById('regCorreo').value, telefono=soloDigitos(document.getElementById('regTelefono').value);
  if(!emp||!nombre){alert('Por favor, ingresa nombre de empresa y tu nombre');return}
  if(!correo){alert('Por favor, ingresa tu correo');return}
  if(telefono.length<10){alert('Por favor, ingresa tu teléfono de 10 dígitos para SMS');return}
  var telefonoCompleto='+52'+telefono.slice(-10);
  var codigo=Math.floor(100000+Math.random()*900000).toString();
  var salt=generarSalt(); var pass_hash=await hashConSalt(p1, salt);
  datosPendientes={empresa:emp,nombre:nombre,correo:correo,telefono:telefono,telefonoCompleto:telefonoCompleto,pass_hash:pass_hash,pass_salt:salt,codigo:codigo,expira:Date.now()+120000};
  try{localStorage.setItem('wms_pendiente', JSON.stringify(datosPendientes));}catch(e){}
  if(!SMS_ACTIVO){
    if(!supabaseClient){alert('Sin internet'); return;}
    var resDirecto=await crearEmpresaEnSupabase(datosPendientes);
    if(resDirecto.error){alert('No se pudo crear: '+resDirecto.error.message); return;}
    try{localStorage.removeItem('wms_pendiente');}catch(e){}
    empresaActual=resDirecto.data; window.sesionActiva=true;
    ponerNombreAdmin(nombre, emp);
    mostrarPrueba(); aplicarLogo();
    show('p-felicidades');
    return;
  }
  try{await enviarSMS(telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 2 minutos para usarlo.');}catch(e){alert('No se pudo enviar el SMS: '+e.message);return;}
  document.getElementById('textoVerificacion').innerText='Te enviamos un código por SMS a '+enmascararTelefono(telefono);
  document.getElementById('codigoVerif').value='';
  var m=document.getElementById('msgVerif'); m.classList.remove('hidden'); m.innerHTML='✅ Te mandamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>';
  iniciarTimer();
  show('p-verificacion');
}
async function iniciarSesion(){
  var correo=document.getElementById('loginCorreo').value,pass=document.getElementById('loginPass').value;
  if(!correo||!pass){alert('Por favor, ingresa tu correo y tu contraseña');return}
  if(!supabaseClient){alert('Sin internet. Por favor, revisa tu conexión.');return}
  var res=await supabaseClient.from('empresas').select('*').eq('correo',correo).single();
  if(res.error||!res.data){alert('Correo o contraseña incorrectos.');return}
  var hashIntento=await hashConSalt(pass, res.data.pass_salt||'');
  if(hashIntento!==res.data.pass){alert('Correo o contraseña incorrectos.');return}
  var fin=new Date(res.data.fin_prueba);
  if(res.data.estado==='bloqueado'||(res.data.estado==='prueba'&&fin<new Date())){empresaActual=res.data;alert('Se acabaron tus 7 días gratis. Por favor, activa tu suscripción de $99 / mes.');show('p-suscripcion');return}
  try{localStorage.setItem('wms_admin_login',JSON.stringify({correo:correo}))}catch(e){}
  empresaActual=res.data;window.sesionActiva=true;
  var nomAdmin = res.data.nombre_admin || '';
  if(!nomAdmin){ try{nomAdmin=localStorage.getItem('wms_admin_nombre')||'';}catch(e){} }
  if(nomAdmin && !res.data.nombre_admin && supabaseClient){
    try{await supabaseClient.from('empresas').update({nombre_admin:nomAdmin}).eq('correo',correo);}catch(e){}
  }
  ponerNombreAdmin(nomAdmin, res.data.nombre_empresa);
  mostrarPrueba();aplicarLogo();await cargarUsuarios();show('p-admin-menu')
}
function activarSuscripcionGoogle(){alert('Aquí Google Play va a abrir su ventana de pago. Suscripción: $99 / mes. Escríbenos a '+CORREO_SOPORTE)}
async function enviarRecuperacion(){
  var telefono=soloDigitos(document.getElementById('telefonoOlvido').value);
  if(telefono.length<10){alert('Por favor, ingresa tu número de 10 dígitos');return}
  if(!supabaseClient){alert('Sin internet');return}
  var telefonoCompleto='+52'+telefono.slice(-10);
  var res=await supabaseClient.from('empresas').select('*').eq('telefono',telefono).single();
  var m=document.getElementById('msgOlvido');m.classList.remove('hidden');
  m.innerHTML='⏳ Enviando tu código por SMS...';
  if(res.data){
    document.getElementById('nuevoPassCorreo').value=res.data.correo||'';
    var codigo=Math.floor(100000+Math.random()*900000).toString();
    try{localStorage.setItem('wms_codigo_recuperacion', JSON.stringify({codigo:codigo, correo:res.data.correo, expira:Date.now()+10*60*1000}));}catch(e){}
    if(!SMS_ACTIVO){ m.innerHTML='✅ Verificación pausada. Ya puedes ingresar tu contraseña nueva.'; setTimeout(function(){show('p-nueva-pass')}, 800); return; }
    try{ await enviarSMS(telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 10 minutos para usarlo.'); m.innerHTML='✅ ¡Listo! Te enviamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>.<br>1. Por favor, ingresa tu código de 6 dígitos<br>2. Crear contraseña nueva y Actualizar'; }catch(e){ m.innerHTML='❌ No se pudo enviar el SMS: '+e.message; return; }
    setTimeout(function(){show('p-nueva-pass')}, 1200);
  } else { m.innerHTML='✅ ¡Listo! Si ese número está registrado, te enviamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>.'; }
}
async function actualizarPass(){
  var correo=document.getElementById('nuevoPassCorreo').value, codigoIngresado=document.getElementById('codigoRecuperacion').value, n1=document.getElementById('nuevoPass1').value, n2=document.getElementById('nuevoPass2').value;
  if(n1!==n2){alert('Las contraseñas no coinciden');return}
  if(n1.length<8){alert('Mínimo 8 caracteres, con mayúscula, minúscula y @$#%&');return}
  var guardado=null; try{guardado=JSON.parse(localStorage.getItem('wms_codigo_recuperacion')||'null');}catch(e){}
  if(SMS_ACTIVO){ if(!guardado || guardado.codigo!==codigoIngresado || Date.now()>guardado.expira || guardado.correo!==correo){alert('Código incorrecto o vencido. Por favor, solicita otro código.');return} }
  if(!supabaseClient){alert('Sin internet');return}
  var salt2=generarSalt(); var hash2=await hashConSalt(n1, salt2);
  var res=await supabaseClient.from('empresas').update({pass:hash2, pass_salt:salt2}).eq('correo',correo);
  if(res.error){alert('No se pudo: '+res.error.message);return}
  try{localStorage.removeItem('wms_codigo_recuperacion');}catch(e){}
  alert('¡Listo! Tu contraseña nueva ya quedó.');show('p2-admin')
}
async function cargarUsuarios(){if(!empresaActual||!supabaseClient)return;var res=await supabaseClient.from('usuarios').select('id,nombre,usuario,rol,telefono,empresa_correo,debe_cambiar_pin,reset_permitido').eq('empresa_correo',empresaActual.correo);usuarios=res.data||[];renderUsuarios()}
async function loginOperador(){
  var emp=document.getElementById('opEmpresa').value,usu=document.getElementById('opUsuario').value,pass=document.getElementById('opPass').value;
  if(!emp||!usu||!pass){alert('Por favor, completa empresa, usuario y PIN');return}
  if(!/^\d{4}$/.test(pass)){alert('Tu PIN debe ser de 4 dígitos.');return}
  if(!supabaseClient){alert('Sin internet. Por favor, revisa tu conexión.');return}
  var res=await supabaseClient.from('usuarios').select('*').eq('usuario',usu).single();
  if(res.error||!res.data){alert('Usuario o PIN incorrectos. Por favor, informa a tu administrador para que te apoye.');return}
  var hashPin=await hashConSalt(pass, res.data.pass_salt||'');
  if(hashPin!==res.data.pass){alert('Usuario o PIN incorrectos.');return}
  if(res.data.debe_cambiar_pin===true || res.data.reset_permitido===true){
    usuarioCambiandoPin=res.data;
    try{document.getElementById('nuevoPin1').value='';document.getElementById('nuevoPin2').value='';}catch(e){}
    try{document.getElementById('tituloCambiarPin').innerText = res.data.reset_permitido===true ? 'Crea tu PIN nuevo' : 'Crea tu PIN nuevo';}catch(e){}
    try{document.getElementById('textoCambiarPin').innerText='Hola '+res.data.nombre+', por favor, actualiza el PIN temporal por uno propio de 4 dígitos.';}catch(e){}
    window.sesionActiva=true;
    show('p-cambiar-pin');
    return;
  }
  try{localStorage.setItem('wms_op_login',JSON.stringify({empresa:emp,usuario:usu}))}catch(e){}
  operadorActual=res.data;document.getElementById('nombreEmpresa').innerText=res.data.nombre||usu;window.sesionActiva=true;aplicarLogo();show('p4');
}
async function olvidoPinOperador(){
  var usu=document.getElementById('opUsuario').value;
  if(!usu){alert('Por favor, ingresa primero tu usuario');return}
  if(!supabaseClient){alert('Sin internet');return}
  var res=await supabaseClient.from('usuarios').select('*').eq('usuario',usu).single();
  if(res.error||!res.data){alert('No encontramos ese usuario. Por favor, informa a tu administrador para que lo revise.');return}
  if(res.data.reset_permitido!==true){
    alert('🔒 Candado activado.\nPor favor, informa a tu administrador para que te habilite el Restablecer PIN y puedas crear uno nuevo.');
    return;
  }
  usuarioCambiandoPin=res.data;
  try{document.getElementById('nuevoPin1').value='';document.getElementById('nuevoPin2').value='';}catch(e){}
  try{document.getElementById('textoCambiarPin').innerText='Tu administrador te habilitó el cambio, '+res.data.nombre+'. Por favor, crea tu PIN nuevo de 4 dígitos.';}catch(e){}
  window.sesionActiva=true;
  show('p-cambiar-pin');
}
async function guardarNuevoPin(){
  if(!usuarioCambiandoPin){alert('Por favor, vuelve a entrar con tu PIN temporal');show('p1');return}
  var p1=document.getElementById('nuevoPin1').value||'';
  var p2=document.getElementById('nuevoPin2').value||'';
  if(!esPinValido(p1)){alert('PIN de 4 dígitos. Por favor, evita usar 1234 ni 0000.');return}
  if(p1!==p2){alert('Los PIN no coinciden. Por favor, ingrésalos iguales.');return}
  var hashViejo=await hashConSalt(p1, usuarioCambiandoPin.pass_salt||'');
  if(hashViejo===usuarioCambiandoPin.pass){alert('Ese es el mismo PIN temporal. Por favor, elige uno diferente, que solo tú conozcas.');return}
  if(!supabaseClient){alert('Sin internet');return}
  var saltNuevo=generarSalt(); var hashNuevo=await hashConSalt(p1, saltNuevo);
  var res=await supabaseClient.from('usuarios').update({pass:hashNuevo, pass_salt:saltNuevo, debe_cambiar_pin:false, reset_permitido:false}).eq('id', usuarioCambiandoPin.id);
  if(res.error){alert('No se pudo guardar: '+res.error.message);return}
  var empresaGuardada=''; var usuarioGuardado=usuarioCambiandoPin.usuario||'';
  try{empresaGuardada=document.getElementById('opEmpresa').value||'';}catch(e){}
  usuarioCambiandoPin=null;
  window.sesionActiva=false; operadorActual=null;
  try{document.getElementById('opPass').value='';}catch(e){}
  try{document.getElementById('opEmpresa').value=empresaGuardada;}catch(e){}
  try{document.getElementById('opUsuario').value=usuarioGuardado;}catch(e){}
  alert('¡Listo! Ya quedó tu PIN nuevo.\nAhora por favor, ingresa empresa, usuario y tu PIN nuevo para entrar a trabajar.');
  show('p1');
  setTimeout(function(){show('p2-operador');},100);
}
async function guardarEmpleado(){
  var nombre=document.getElementById('empNombre').value,usuario=document.getElementById('empUsuario').value,pass=document.getElementById('empPass').value,rol=document.getElementById('empRol').value,tel=document.getElementById('empTel').value;
  if(!nombre||!usuario||!pass){alert('Por favor, completa nombre, usuario y PIN');return}
  if(!esPinValido(pass)){alert('PIN de 4 dígitos. Por favor, evita usar 1234 ni 0000.');return}
  if(!supabaseClient){alert('Sin internet');return}
  var saltPin=generarSalt(); var hashPin=await hashConSalt(pass, saltPin);
  var res=await supabaseClient.from('usuarios').insert([{empresa_correo:empresaActual.correo,nombre:nombre,usuario:usuario,pass:hashPin,pass_salt:saltPin,rol:rol,telefono:tel,debe_cambiar_pin:true,reset_permitido:false}]);
  if(res.error){alert('No se pudo: '+res.error.message);return}
  alert('¡Listo! '+nombre+' creado con PIN temporal '+pass+'\nPor favor, coméntale: "Este es tu PIN temporal, por favor entra y cámbialo por el tuyo"');
  ['empNombre','empUsuario','empPass','empRol','empTel'].forEach(function(i){document.getElementById(i).value=''});await cargarUsuarios();show('p-consulta-usuarios')
}
function renderUsuarios(){var l=document.getElementById('listaUsuarios');document.getElementById('totalUsuarios').innerText=usuarios.length;document.getElementById('sinUsuarios').style.display=usuarios.length?'none':'block';l.innerHTML='';usuarios.forEach(function(u){var esTemporal = u.debe_cambiar_pin===true; var desbloqueado = u.reset_permitido===true; l.innerHTML+='<div class="usuario-card"><div><b>'+u.nombre+'</b><span>Usuario: '+u.usuario+'</span><span>PIN: **** '+(esTemporal?'• PIN temporal - pendiente de cambio':desbloqueado?'• Habilitado para cambiar PIN':'• PIN propio')+'</span><span>Rol: '+(u.rol||'Sin rol')+' '+(u.telefono?'• Tel: '+u.telefono:'')+'</span></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><button class="btn-trash" onclick="eliminarUsuario(\''+u.id+'\',\''+u.nombre+'\')">🗑️</button><button onclick="restablecerPIN(\''+u.id+'\',\''+u.nombre+'\')" style="background:none;border:none;color:#2563eb;text-decoration:underline;font-size:11px;cursor:pointer">Restablecer PIN</button></div></div>'});}
async function restablecerPIN(id,nombre){
  if(!confirm('¿Deseas habilitar a '+nombre+' para que cree su PIN nuevo?'))return;
  if(!supabaseClient){alert('Sin internet');return}
  var res=await supabaseClient.from('usuarios').update({reset_permitido:true}).eq('id',id);
  if(res.error){alert('No se pudo: '+res.error.message);return}
  alert('¡Listo! Ya se habilitó el cambio para '+nombre+'.\nPor favor, coméntale que seleccione ¿Olvidaste tu PIN? y cree su PIN nuevo.');
  await cargarUsuarios();
}
async function eliminarUsuario(id,nombre){if(!confirm('¿Deseas eliminar a '+nombre+'?'))return;if(supabaseClient)await supabaseClient.from('usuarios').delete().eq('id',id);await cargarUsuarios();}
function actualizarTipo(){var t=document.getElementById('dTipo').value,esGas=t==='Gas';document.getElementById('boxCombustible').classList.toggle('hidden',!esGas);document.getElementById('boxBateria').classList.toggle('hidden',esGas);document.getElementById('dClase').value=esGas?'Montacargas Gas':'Montacargas Eléctrico'; renderItemsChecklist();}
function actualizarTipoCombustibleVehiculo(){
  var tipo='';
  try{tipo=document.getElementById('vTipoCombustible').value||'';}catch(e){}
  var boxComb=document.getElementById('boxNivelCombustibleVehiculo');
  var boxBat=document.getElementById('boxNivelBateriaVehiculo');
  if(!boxComb||!boxBat) return;
  if(tipo==='Eléctrico'){ boxComb.classList.add('hidden'); boxBat.classList.remove('hidden'); }
  else if(tipo==='Híbrido'){ boxComb.classList.remove('hidden'); boxBat.classList.remove('hidden'); }
  else { boxComb.classList.remove('hidden'); boxBat.classList.add('hidden'); }
}
// ===== CUADRITO NUMERO VERDE / ROJO A LA PAR DE LA LEYENDA =====
function pintarCuadritoNumero(el, estado){
  if(!el) return;
  if(estado==='ok'){ el.style.border='2px solid #22C55E'; el.style.background='#F0FDF4'; el.style.boxShadow='0 0 0 2px rgba(34,197,94,.15)'; }
  else if(estado==='mal'){ el.style.border='2px solid #EF4444'; el.style.background='#FEF2F2'; el.style.boxShadow='0 0 0 2px rgba(239,68,68,.15)'; }
  else { el.style.border=''; el.style.background=''; el.style.boxShadow=''; }
}
function buscarVehiculoPorNumero(){
  var numEl=document.getElementById('vNumEconomico');
  if(!numEl) return null;
  var num=(numEl.value||'').trim();
  var msgOk=document.getElementById('msgVehiculoEncontrado');
  var msgNo=document.getElementById('msgVehiculoNoEncontrado');
  if(msgOk) msgOk.style.display='none';
  if(msgNo) msgNo.style.display='none';
  if(!num){ pintarCuadritoNumero(numEl,''); return null; }
  var lista=window.listaVehiculos||[];
  var encontrado=lista.find(function(v){ return String(v.num||'').trim()===num; });
  if(encontrado){
    try{ if(encontrado.tipo) document.getElementById('vTipoVehiculo').value=encontrado.tipo; }catch(e){}
    try{ if(encontrado.combustible) document.getElementById('vTipoCombustible').value=encontrado.combustible; }catch(e){}
    actualizarTipoCombustibleVehiculo();
    if(tipoChecklistActual==='camiones') renderItemsChecklist();
    pintarCuadritoNumero(numEl,'ok');
    if(msgOk) msgOk.style.display='block';
    return encontrado;
  } else {
    pintarCuadritoNumero(numEl,'mal');
    if(msgNo) msgNo.style.display='block';
    return null;
  }
}
function buscarMontacargasPorNumero(){
  var numEl=document.getElementById('dUnidad');
  if(!numEl) return null;
  var num=(numEl.value||'').trim();
  var msgOk=document.getElementById('msgMontacargasEncontrado');
  var msgNo=document.getElementById('msgMontacargasNoEncontrado');
  if(msgOk) msgOk.style.display='none';
  if(msgNo) msgNo.style.display='none';
  if(!num){ pintarCuadritoNumero(numEl,''); return null; }
  var lista=window.listaMontacargas||[];
  var encontrado=lista.find(function(m){ return String(m.num||'').trim()===num; });
  if(encontrado){
    var comb=(encontrado.combustible||'').toLowerCase();
    var tipoCheck = comb.indexOf('elect')>=0 ? 'Electrico' : 'Gas';
    try{ document.getElementById('dTipo').value=tipoCheck; }catch(e){}
    try{ if(encontrado.clase) document.getElementById('dClase').value=encontrado.clase; }catch(e){}
    if(typeof actualizarTipo==='function') actualizarTipo();
    pintarCuadritoNumero(numEl,'ok');
    if(msgOk) msgOk.style.display='block';
    return encontrado;
  } else {
    pintarCuadritoNumero(numEl,'mal');
    if(msgNo) msgNo.style.display='block';
    return null;
  }
}
function abrirChecklist(tipo){
  tipoChecklistActual=tipo;
  var tit={camiones:'🚚 Checklist Camión',montacargas:'🏗️ Checklist Montacargas - 31 puntos',bitacora:'🗺️ Bitácora de Ruta'};
  document.getElementById('tituloChecklist').innerText=tit[tipo];
  var boxM=document.getElementById('boxDatosMontacargas');
  var boxV=document.getElementById('boxDatosVehiculo');
  var esVehiculo=(tipo==='camiones');
  if(boxM) boxM.classList.toggle('hidden', esVehiculo);
  if(boxV) boxV.classList.toggle('hidden', !esVehiculo);
  fotoTableroData=null; fotoTableroTemporal=null;
  if(esVehiculo){
    try{document.getElementById('vFecha').value=hoyISO();}catch(e){}
    try{document.getElementById('vOperador').value=operadorActual?operadorActual.nombre:'';}catch(e){}
    try{document.getElementById('vNumEconomico').value=''; pintarCuadritoNumero(document.getElementById('vNumEconomico'),'');}catch(e){}
    try{document.getElementById('vKilometraje').value='';}catch(e){}
    try{document.getElementById('vTurno').value='Matutino';}catch(e){}
    try{document.getElementById('vTipoVehiculo').value='Carro';}catch(e){}
    try{document.getElementById('vTipoCombustible').value='Gasolina';}catch(e){}
    try{document.getElementById('vNivelCombustible').value='';}catch(e){}
    try{document.getElementById('vNivelBateria').value='';}catch(e){}
    try{var m1=document.getElementById('msgVehiculoEncontrado'); if(m1) m1.style.display='none';}catch(e){}
    try{var m2=document.getElementById('msgVehiculoNoEncontrado'); if(m2) m2.style.display='none';}catch(e){}
    actualizarTipoCombustibleVehiculo();
  } else {
    document.getElementById('dFecha').value=hoyISO();
    document.getElementById('dOperador').value=operadorActual?operadorActual.nombre:'';
    document.getElementById('dUnidad').value='';
    try{pintarCuadritoNumero(document.getElementById('dUnidad'),'');}catch(e){}
    document.getElementById('dHorometro').value='';
    document.getElementById('dTipo').value='Gas';
    actualizarTipo();
    document.getElementById('dCombustible').value='';
    document.getElementById('dBateria').value='';
    try{var m3=document.getElementById('msgMontacargasEncontrado'); if(m3) m3.style.display='none';}catch(e){}
    try{var m4=document.getElementById('msgMontacargasNoEncontrado'); if(m4) m4.style.display='none';}catch(e){}
  }
  document.getElementById('comentarioFinal').value='';
  document.getElementById('previewFotos').innerHTML='';
  document.getElementById('fotosFinales').value='';
  fotosFinalesArr=[];
  renderItemsChecklist();
  show('p-checklist')
}
try{document.getElementById('fotosFinales').addEventListener('change',function(e){var files=Array.from(e.target.files||[]);files.slice(0,10).forEach(function(f){var r=new FileReader();r.onload=function(){if(fotosFinalesArr.length<10){fotosFinalesArr.push(r.result);renderFotos();}};r.readAsDataURL(f)});document.getElementById('fotosFinales').value='';});}catch(e){}
function getLibro(){try{return JSON.parse(localStorage.getItem('wms_libro')||'{}')}catch(e){return{}}}
function setLibro(d){try{localStorage.setItem('wms_libro',JSON.stringify(d))}catch(e){}}
async function guardarChecklist(){
  if(tipoChecklistActual==='camiones'){
    var numEco=document.getElementById('vNumEconomico').value.trim();
    if(!numEco){alert('Por favor, ingresa el Número económico. Ej. 05');document.getElementById('vNumEconomico').focus();return}
    var vehEncontrado=buscarVehiculoPorNumero();
    var fechaV=document.getElementById('vFecha').value||hoyISO();
    var mesV=fechaV.slice(0,7);
    var tipoCombV=document.getElementById('vTipoCombustible').value;
    var nivelCombV=document.getElementById('vNivelCombustible').value||'';
    var nivelBatV=document.getElementById('vNivelBateria').value||'';
    var nivelMostrarV='';
    if(tipoCombV==='Eléctrico') nivelMostrarV=nivelBatV;
    else if(tipoCombV==='Híbrido') nivelMostrarV='Comb: '+nivelCombV+' | Bat: '+nivelBatV;
    else nivelMostrarV=nivelCombV;
    var datosV={fecha:fechaV,operador:document.getElementById('vOperador').value,turno:document.getElementById('vTurno').value,unidad:numEco,numero_economico:numEco,clase:'Vehículo',tipoUnidad:document.getElementById('vTipoVehiculo').value,tipoVehiculo:document.getElementById('vTipoVehiculo').value,tipoCombustible:tipoCombV,combustible:nivelCombV,bateria:nivelBatV,kilometraje:document.getElementById('vKilometraje').value,horometro:document.getElementById('vKilometraje').value,tipo:tipoChecklistActual,guardado:new Date().toISOString(),vehiculo_id:vehEncontrado? (vehEncontrado.num||numEco) : numEco, fotoTablero: fotoTableroData ? 'SI' : 'NO'};
    datosV.filas=puntosVisibles().map(function(item,i){
      if(item.indexOf('Foto del Tablero')>=0) return {punto:item,estado: fotoTableroData ? 'FOTO GUARDADA' : 'SIN FOTO',comentario:'',tieneFoto: fotoTableroData ? 'SI' : 'NO',ligaFoto:''};
      var s=document.querySelector('input[name="chk'+i+'"]:checked'); return {punto:item,estado:s?s.value:'',comentario:'',tieneFoto:'NO',ligaFoto:''};
    });
    datosV.comentarioFinal=document.getElementById('comentarioFinal').value||'';datosV.fotosFinales=fotosFinalesArr.length+' fotos';datosV.ligasFotos=fotosFinalesArr.map(function(_,idx){return 'foto_'+numEco+'_'+fechaV+'_'+(idx+1)});
    var libroV=getLibro();if(!libroV[mesV])libroV[mesV]={};if(!libroV[mesV][tipoChecklistActual])libroV[mesV][tipoChecklistActual]={};if(!libroV[mesV][tipoChecklistActual][numEco])libroV[mesV][tipoChecklistActual][numEco]=[];
    var idxV=libroV[mesV][tipoChecklistActual][numEco].findIndex(function(d){return d.fecha===fechaV});if(idxV>=0)libroV[mesV][tipoChecklistActual][numEco][idxV]=datosV;else libroV[mesV][tipoChecklistActual][numEco].push(datosV);
    libroV[mesV][tipoChecklistActual][numEco].sort(function(a,b){return a.fecha.localeCompare(b.fecha)});setLibro(libroV);
    try{if(supabaseClient)await supabaseClient.from('checklists').insert([{tipo:tipoChecklistActual,unidad:numEco,operador:datosV.operador,resultados:datosV.filas.map(function(f){return f.punto+': '+f.estado}).join(' || '),observaciones:'Tipo Vehículo:'+datosV.tipoVehiculo+' Turno:'+datosV.turno+' Km:'+datosV.kilometraje+' Tipo Combustible:'+tipoCombV+' Nivel Comb:'+nivelCombV+' Nivel Bat:'+nivelBatV+' Foto Tablero:'+datosV.fotoTablero+' | GOLPES: '+datosV.comentarioFinal+' | FOTOS: '+datosV.fotosFinales,tiene_foto:fotosFinalesArr.length?'SI':'NO',fecha:new Date(fechaV).toISOString()}])}catch(e){}
    alert('¡Guardado! ✅\nVehículo '+numEco+' ('+datosV.tipoVehiculo+' - '+tipoCombV+')\nFecha: '+fechaV+'\nNivel: '+nivelMostrarV);show('p4');
    return;
  }
  var unidad=document.getElementById('dUnidad').value.trim();if(!unidad){alert('Por favor, ingresa el Número de equipo. Ej. 03');document.getElementById('dUnidad').focus();return}
  var fecha=document.getElementById('dFecha').value||hoyISO(),mes=fecha.slice(0,7),tipoUnidad=document.getElementById('dTipo').value,esGas=tipoUnidad==='Gas';
  var nivel=esGas?document.getElementById('dCombustible').value:document.getElementById('dBateria').value;
  var datos={fecha:fecha,operador:document.getElementById('dOperador').value,turno:document.getElementById('dTurno').value,unidad:unidad,clase:document.getElementById('dClase').value,tipoUnidad:tipoUnidad,horometro:document.getElementById('dHorometro').value,combustible:esGas?nivel:'',bateria:!esGas?nivel:'',tipo:tipoChecklistActual,guardado:new Date().toISOString()};
  datos.filas=puntosVisibles().map(function(item,i){var s=document.querySelector('input[name="chk'+i+'"]:checked');return{punto:item,estado:s?s.value:'',comentario:'',tieneFoto:'NO',ligaFoto:''}});
  datos.comentarioFinal=document.getElementById('comentarioFinal').value||'';datos.fotosFinales=fotosFinalesArr.length+' fotos';datos.ligasFotos=fotosFinalesArr.map(function(_,idx){return 'foto_'+unidad+'_'+fecha+'_'+(idx+1)});
  var libro=getLibro();if(!libro[mes])libro[mes]={};if(!libro[mes][tipoChecklistActual])libro[mes][tipoChecklistActual]={};if(!libro[mes][tipoChecklistActual][unidad])libro[mes][tipoChecklistActual][unidad]=[];
  var idx=libro[mes][tipoChecklistActual][unidad].findIndex(function(d){return d.fecha===fecha});if(idx>=0)libro[mes][tipoChecklistActual][unidad][idx]=datos;else libro[mes][tipoChecklistActual][unidad].push(datos);
  libro[mes][tipoChecklistActual][unidad].sort(function(a,b){return a.fecha.localeCompare(b.fecha)});setLibro(libro);
  try{if(supabaseClient)await supabaseClient.from('checklists').insert([{tipo:tipoChecklistActual,unidad:unidad,operador:datos.operador,resultados:datos.filas.map(function(f){return f.punto+': '+f.estado}).join(' || '),observaciones:'Tipo:'+tipoUnidad+' Turno:'+datos.turno+' Horometro:'+datos.horometro+' Combustible:'+datos.combustible+' Bateria:'+datos.bateria+' | GOLPES: '+datos.comentarioFinal+' | FOTOS: '+datos.fotosFinales,tiene_foto:fotosFinalesArr.length?'SI':'NO',fecha:new Date(fecha).toISOString()}])}catch(e){}
  alert('¡Guardado! ✅\nUnidad '+unidad+' ('+tipoUnidad+')\nFecha: '+fecha+'\nNivel: '+nivel);show('p4');
}
function renderLibro(tipo){try{var mesEl=document.getElementById(tipo==='montacargas'?'mesMontacargas':'mesReporte');if(!mesEl) return;var mes=mesEl.value||'2026-11',sel=document.getElementById('selUnidadMontacargas'),libro=getLibro(),hojas=(libro[mes]&&libro[mes][tipo])||{},unidades=Object.keys(hojas);if(sel&&sel.options.length<=1){sel.innerHTML='<option value="">Todas las unidades</option>'+unidades.map(function(u){return '<option value="'+u+'">Unidad '+u+'</option>'}).join('')}var filtro=sel?sel.value:'',cont=document.getElementById('libroMontacargas');if(!cont) return;if(!unidades.length){cont.innerHTML='<div class="card"><p>No hay registros en '+mes+' todavía.</p></div>';return}var html='';unidades.filter(function(u){return !filtro||u===filtro}).forEach(function(unidad){var dias=hojas[unidad];html+='<div class="card"><b>📄 Hoja Unidad '+unidad+'</b> <span class="badge">'+dias.length+' día(s) en '+mes+'</span></div>';html+='<div class="libro-wrap"><table><tr><th>A - Datos / B - Punto</th>'+dias.map(function(d){return '<th>'+d.fecha+'<br>'+d.operador+'<br>'+(d.tipoUnidad||'')+' - Turno '+d.turno+'<br>Horom '+d.horometro+'<br>'+(d.tipoUnidad==='Electrico'?'Bat '+d.bateria:'Comb '+d.combustible)+'<br><small>'+(d.comentarioFinal||'')+'<br>Fotos: '+(d.fotosFinales||'0 fotos')+'</small></th>'}).join('')+'</tr>';puntosDe(tipo).forEach(function(punto,pi){html+='<tr><td>'+(pi+1)+'. '+punto+'</td>'+dias.map(function(d){var f=(d.filas||[]).find(function(x){return x.punto===punto})||{};return '<td>'+(f.estado==='MAL ESTADO'?'❌ MAL':f.estado==='BUEN ESTADO'?'✅ BUEN':'—')+'</td>'}).join('')+'</tr>'});html+='</table></div>'});cont.innerHTML=html;}catch(e){}}
function verReporteMes(){var mes=document.getElementById('mesReporte').value,libro=getLibro(),hojas=(libro[mes]&&libro[mes]['montacargas'])||{},cont=document.getElementById('contenidoReporte'),unidades=Object.keys(hojas);if(!unidades.length){cont.innerHTML='<div class="card"><p>No hay registros en '+mes+' todavía.</p></div>';return}cont.innerHTML=unidades.map(function(u){return '<div class="card"><b>Unidad '+u+'</b> - '+hojas[u].length+' día(s)<br><span style="font-size:12px">'+hojas[u].map(function(d){return d.fecha+' ('+d.operador+')'}).join(' • ')+'</span></div>'}).join('')}
function descargarMes(tipo){var el=document.getElementById('mesMontacargas');var mes=el?el.value:'2026-11';exportarCSVPorMes(mes||'2026-11',tipo)}
function exportarCSVPorMes(mes,tipo){var libro=getLibro(),hojas=(libro[mes]&&libro[mes][tipo])||{},unidades=Object.keys(hojas);if(!unidades.length){alert('Aún no hay datos en '+mes);return}var csv='Libro '+mes+' - '+tipo+'\n';unidades.forEach(function(u){var dias=hojas[u];csv+='\nHoja Unidad '+u+'\nA - Datos / B - Punto,'+dias.map(function(d){return d.fecha+' - '+d.operador+' - Tipo '+(d.tipoUnidad||'')+' - Turno '+d.turno+' - Horometro '+d.horometro+' - Combustible '+d.combustible+' - Bateria '+d.bateria+' - GOLPES: '+(d.comentarioFinal||'')+' - FOTOS: '+(d.fotosFinales||'')}).join(',')+'\n';puntosDe(tipo).forEach(function(punto,pi){csv+='"'+(pi+1)+'. '+punto.replace(/"/g,'')+'",'+dias.map(function(d){var f=(d.filas||[]).find(function(x){return x.punto===punto})||{};return '"'+(f.estado||'')+'"'}).join(',')+'\n'})});var blob=new Blob([csv],{type:'text/csv'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wms_libro_'+mes+'_'+tipo+'_por_unidad.csv';a.click();alert('¡Listo! Se descargó todo el mes '+mes+'.')}
function exportarCSV(){var mes=document.getElementById('mesReporte').value||'2026-11';exportarCSVPorMes(mes,'montacargas')}
// ===== EQUIPOS 20/20 - MONTACARGAS Y VEHÍCULOS =====
window.listaMontacargas = JSON.parse(localStorage.getItem('wms_montacargas')||'[]');
window.listaVehiculos = JSON.parse(localStorage.getItem('wms_vehiculos')||'[]');
var LIMITE_EQUIPOS = 20;
function actualizarContadoresEquipos(){
  var totalM = window.listaMontacargas.length;
  var totalV = window.listaVehiculos.length;
  var ids = {'contadorMontacargas':totalM+' / 20','contadorVehiculos':totalV+' / 20','totalMontacargas':totalM,'totalVehiculos':totalV,'totalAltaMontacargas':totalM,'totalAltaVehiculos':totalV};
  for(var id in ids){ var el=document.getElementById(id); if(el) el.innerText=ids[id]; }
  var bM=document.getElementById('btnAgregarMontacargas');
  var bV=document.getElementById('btnAgregarVehiculo');
  if(bM){ bM.disabled = totalM>=20; bM.style.opacity = totalM>=20?'0.5':'1'; bM.innerText = totalM>=20?'LÍMITE ALCANZADO (20 / 20)':'+ AGREGAR MONTACARGAS'; }
  if(bV){ bV.disabled = totalV>=20; bV.style.opacity = totalV>=20?'0.5':'1'; bV.innerText = totalV>=20?'LÍMITE ALCANZADO (20 / 20)':'+ AGREGAR VEHÍCULO'; }
  var mM=document.getElementById('msgLimiteMontacargas'); if(mM) mM.style.display = totalM>=20?'block':'none';
  var mV=document.getElementById('msgLimiteVehiculos'); if(mV) mV.style.display = totalV>=20?'block':'none';
  renderListaMontacargas(); renderListaVehiculos();
}
function agregarMontacargas(){
  if(window.listaMontacargas.length>=20){ alert('Se alcanzó el número máximo de montacargas registrados (20)'); return; }
  actualizarContadoresEquipos();
  try{ document.getElementById('montFecha').value = new Date().toISOString().slice(0,10); }catch(e){}
  show('p-alta-montacargas');
}
function agregarVehiculo(){
  if(window.listaVehiculos.length>=20){ alert('Se alcanzó el número máximo de vehículos registrados (20)'); return; }
  actualizarContadoresEquipos();
  try{ document.getElementById('vehFecha').value = new Date().toISOString().slice(0,10); }catch(e){}
  show('p-alta-vehiculo');
}
function guardarMontacargas(){
  if(window.listaMontacargas.length>=20){ alert('Se alcanzó el número máximo de montacargas registrados (20)'); return; }
  var num=document.getElementById('montNum').value.trim();
  if(!num){ alert('Por favor, ingresa el número de unidad'); return; }
  window.listaMontacargas.push({
    num:num,
    fecha:document.getElementById('montFecha').value || new Date().toISOString().slice(0,10),
    marca:document.getElementById('montMarca').value,
    modelo:document.getElementById('montModelo').value,
    clase:document.getElementById('montClase').value,
    horometro:document.getElementById('montHorometro').value,
    capacidad:document.getElementById('montCapacidad').value,
    combustible:document.getElementById('montCombustible').value
  });
  localStorage.setItem('wms_montacargas', JSON.stringify(window.listaMontacargas));
  document.getElementById('montNum').value=''; document.getElementById('montMarca').value=''; document.getElementById('montModelo').value=''; document.getElementById('montClase').value=''; document.getElementById('montHorometro').value=''; document.getElementById('montCapacidad').value='';
  actualizarContadoresEquipos(); show('p-consulta-montacargas');
}
function guardarVehiculo(){
  if(window.listaVehiculos.length>=20){ alert('Se alcanzó el número máximo de vehículos registrados (20)'); return; }
  var num=document.getElementById('vehNum').value.trim();
  var placas=document.getElementById('vehPlacas').value.trim();
  if(!num){ alert('Por favor, ingresa el número económico'); return; }
  if(!placas){ alert('Por favor, ingresa las placas'); return; }
  window.listaVehiculos.push({
    num:num,
    placas:placas,
    fecha:document.getElementById('vehFecha').value || new Date().toISOString().slice(0,10),
    marca:document.getElementById('vehMarca').value,
    modelo:document.getElementById('vehModelo').value,
    tipo:document.getElementById('vehTipo').value,
    km:document.getElementById('vehKm').value,
    combustible:document.getElementById('vehCombustible').value
  });
  localStorage.setItem('wms_vehiculos', JSON.stringify(window.listaVehiculos));
  document.getElementById('vehNum').value=''; document.getElementById('vehPlacas').value=''; document.getElementById('vehMarca').value=''; document.getElementById('vehModelo').value=''; document.getElementById('vehKm').value='';
  actualizarContadoresEquipos(); show('p-consulta-camiones');
}
function renderListaMontacargas(){
  var c=document.getElementById('listaMontacargas'); if(!c) return;
  c.innerHTML = window.listaMontacargas.map(function(e,i){
    return '<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><b>🏗️ Unidad '+(e.num||'')+'</b><br><span style="font-size:12px;opacity:.8">Fecha: '+(e.fecha||'')+' • '+(e.marca||'')+' '+(e.modelo||'')+'<br>Clase: '+(e.clase||'')+' • Horómetro: '+(e.horometro||'')+' • Capacidad: '+(e.capacidad||'')+'<br>Combustible: '+(e.combustible||'')+'</span></div><span onclick="eliminarMontacargas('+i+')" style="color:#EF4444;font-size:20px;cursor:pointer">❌</span></div>'
  }).join('');
}
function renderListaVehiculos(){
  var c=document.getElementById('listaVehiculos'); if(!c) return;
  c.innerHTML = window.listaVehiculos.map(function(e,i){
    return '<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><b>🚚 Unidad '+(e.num||'')+' - '+(e.placas||'')+'</b><br><span style="font-size:12px;opacity:.8">Fecha: '+(e.fecha||'')+' • '+(e.marca||'')+' '+(e.modelo||'')+'<br>Tipo: '+(e.tipo||'')+' • Km: '+(e.km||'')+'<br>Combustible: '+(e.combustible||'')+'</span></div><span onclick="eliminarVehiculo('+i+')" style="color:#EF4444;font-size:20px;cursor:pointer">❌</span></div>'
  }).join('');
}
function eliminarMontacargas(i){
  if(!confirm('¿Deseas eliminar este montacargas?')) return;
  window.listaMontacargas.splice(i,1); localStorage.setItem('wms_montacargas', JSON.stringify(window.listaMontacargas)); actualizarContadoresEquipos();
}
function eliminarVehiculo(i){
  if(!confirm('¿Deseas eliminar este vehículo?')) return;
  window.listaVehiculos.splice(i,1); localStorage.setItem('wms_vehiculos', JSON.stringify(window.listaVehiculos)); actualizarContadoresEquipos();
}
try{if(window.location.hash==='#nueva-pass'){show('p-nueva-pass')}}catch(e){}
try{cargarDatosGuardados();aplicarLogo();actualizarContadoresEquipos();}catch(e){}
try{document.getElementById('btnAdmin').addEventListener('click',function(){show('p2-admin')});}catch(e){}
try{document.getElementById('pass1').addEventListener('input', validarPass);document.getElementById('pass2').addEventListener('input', validarPass);}catch(e){}
