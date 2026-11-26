// ===== WMS - LOGICA =====
// SMS_ACTIVO false = PAUSADO, te deja crear cuenta sin SMS
// Cuando recargues los $20 en Twilio, cambialo a true
var SMS_ACTIVO = false;
var navStack=['p1'];
function show(id, push){
  try{
    if(push===undefined) push=true;
    var protegidas=['p-admin-menu','p-alta-empleado','p-consulta-usuarios','p-consulta-camiones','p-consulta-montacargas','p-consulta-bitacora','p-reportes','p4','p-checklist','p-nueva-pass'];
    if(protegidas.indexOf(id)>=0 && !window.sesionActiva && id!=='p-nueva-pass'){alert('Primero inicia sesión');id='p1';}
    var todos=['p1','p2-admin','p2-admin-registro','p-verificacion','p-felicidades','p-olvido','p-suscripcion','p2-operador','p4','p-admin-menu','p-alta-empleado','p-consulta-usuarios','p-consulta-camiones','p-consulta-montacargas','p-consulta-bitacora','p-reportes','p-checklist','p-nueva-pass'];
    for(var i=0;i<todos.length;i++){var el=document.getElementById(todos[i]);if(el)el.classList.add('hidden');}
    var dest=document.getElementById(id);if(dest)dest.classList.remove('hidden');
    window.scrollTo(0,0);
    if(push && navStack[navStack.length-1]!==id){navStack.push(id);try{history.pushState({pantalla:id},'', '#'+id);}catch(e){}}
    if(id==='p2-operador'){cargarDatosGuardados();}
    if(id==='p-consulta-montacargas' && typeof renderLibro==='function')renderLibro('montacargas');
  }catch(e){var d=document.getElementById(id);if(d){d.classList.remove('hidden');}}
}
function abrirMenuAdmin(){document.getElementById('menuOverlayAdmin').style.display='block';document.getElementById('menuPanelAdmin').style.display='flex';}
function cerrarMenuAdmin(){document.getElementById('menuOverlayAdmin').style.display='none';document.getElementById('menuPanelAdmin').style.display='none';}
function irMenuAdmin(id){cerrarMenuAdmin();show(id);}
window.addEventListener('popstate', function(e){
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
function generarSalt(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a).map(function(b){return b.toString(16).padStart(2,'0')}).join('');}
async function hashConSalt(texto, salt){var enc=new TextEncoder();var data=enc.encode(salt+'::'+texto);var buf=await crypto.subtle.digest('SHA-256', data);return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');}
var PUNTOS_MONTACARGAS=["Horquillas en Buen estado (No quebradas, dobladas o fisuradas)","Carro porta horquillas","Mastil o torre de elevacion (Sube y Baja sin dificultad)","Desplazador del mastil","Inclinacion del mastil","Mangueras en buen estado","Cadenas en buen estado","Llanta delantera izquierda","Llanta delantera derecha","Llanta trasera izquierda","Llanta trasera derecha","Direccion del volante","Nivel del aceite Hidraulico","Mangeras del mastil sin fugas","Cadenas del Mastil bien sujetas y ajustadas","Asiento en buen estado","Cinturon de seguridad","Palancas de control hidraulico (Todas hacen su funcion)","Freno de mano","Espejo retrovisor","Direccionales","Alarma de reversa","Luces de navegacion","Luces de trabajo o reflectores delanteros","Guarda o parrilla protectora de cabina","Torreta","Boton de emergencia","Extinguidor (Vigente y Cargado)","Cilindro de Gas LP","Mangueras de Gas LP","Explica Golpes y Daños en Carroceria (Comenta)"];
var PUNTOS_CAMIONES=["Luces","Frenos","Llantas","Espejos","Claxon","Nivel de aceite","Nivel de anticongelante","Documentos"];
var PUNTOS_BITACORA=["Kilometraje inicial","Nivel de combustible","Destino de ruta","Hora de salida","Documentos de carga"];
function puntosDe(t){return t==='montacargas'?PUNTOS_MONTACARGAS:t==='camiones'?PUNTOS_CAMIONES:PUNTOS_BITACORA}
function esPuntoGasLP(texto){var t=(texto||'').toLowerCase();return t.indexOf('gas lp')>=0;}
function puntosVisibles(){var base=puntosDe(tipoChecklistActual);if(tipoChecklistActual!=='montacargas') return base;var tipo='';try{tipo=document.getElementById('dTipo').value;}catch(e){tipo='Gas';}if(tipo==='Electrico'){return base.filter(function(p){return !esPuntoGasLP(p);});}return base;}
function renderItemsChecklist(){var c=document.getElementById('itemsChecklist');if(!c)return;c.innerHTML='';puntosVisibles().forEach(function(item,i){c.innerHTML+='<div class="fila-check"><b>'+(i+1)+'. '+item+'</b><label class="check-mini"><input type="radio" name="chk'+i+'" value="BUEN ESTADO" checked></label><label class="check-mini mal"><input type="radio" name="chk'+i+'" value="MAL ESTADO"></label></div>';});try{var n=puntosVisibles().length;if(tipoChecklistActual==='montacargas') document.getElementById('tituloChecklist').innerText='🏗️ Checklist Montacargas - '+n+' puntos';}catch(e){}}
function hoyISO(){return new Date().toISOString().slice(0,10)}
function verContrasena(){try{var t=document.getElementById('verPass').checked?'text':'password';document.getElementById('pass1').type=t;document.getElementById('pass2').type=t;}catch(e){}}
function abrirLegal(tipo){document.getElementById(tipo==='terminos'?'modalTerminos':'modalPrivacidad').style.display='flex';}
function cerrarLegal(){document.getElementById('modalTerminos').style.display='none';document.getElementById('modalPrivacidad').style.display='none';}
function marcarReq(id, ok, texto){var el=document.getElementById(id); if(!el) return;el.classList.toggle('ok', ok);el.textContent = texto;}
function validarPass(){var p1=document.getElementById('pass1').value||'';var p2=document.getElementById('pass2').value||'';marcarReq('req8', p1.length>=8, '8 caracteres');marcarReq('reqMay', /[A-Z]/.test(p1), '1 Mayúscula');marcarReq('reqMin', /[a-z]/.test(p1), '1 Minúscula');marcarReq('reqEsp', /[@$#%&]/.test(p1), '1 Caracter especial @$#%&');var inp1=document.getElementById('pass1'), inp2=document.getElementById('pass2');var passValida = p1.length>=8 && /[A-Z]/.test(p1) && /[a-z]/.test(p1) && /[@$#%&]/.test(p1);inp1.classList.toggle('input-ok', passValida);inp1.classList.toggle('input-mal', p1.length>0 && !passValida);if(p2.length>0){var coincide = p1===p2 && passValida;inp2.classList.toggle('input-ok', coincide);inp2.classList.toggle('input-mal', !coincide);inp1.classList.toggle('input-ok', coincide);} else {inp2.classList.remove('input-ok','input-mal');}return passValida;}
function passEsValida(){var p=document.getElementById('pass1').value||'';return p.length>=8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[@$#%&]/.test(p);}
var timerInterval=null, tiempoRestante=120, datosPendientes=null;
function iniciarTimer(){clearInterval(timerInterval);tiempoRestante=120;var el=document.getElementById('timerVerif');el.textContent='2:00';timerInterval=setInterval(function(){tiempoRestante--;var m=Math.floor(tiempoRestante/60), s=tiempoRestante%60;el.textContent=m+':'+(s<10?'0'+s:s);if(tiempoRestante<=0){clearInterval(timerInterval); el.textContent='0:00'; alert('Se acabó el tiempo. Pide otro código con REENVIAR CÓDIGO.');}},1000);}
async function enviarSMS(to, message){var res = await fetch('/api/send-sms', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to: to, message: message }) });var data = await res.json().catch(function(){return {}});if(!res.ok) throw new Error((data.error || 'No se pudo enviar SMS') + ' | ' + (data.details || data.message || 'sin detalle'));return data;}
async function reenviarCodigoVerificacion(){if(!SMS_ACTIVO){alert('Verificación pausada por ahora. Ya puedes entrar directo.'); return;}if(!datosPendientes){alert('Vuelve a Activar Suscripción'); return;}var codigo=Math.floor(100000+Math.random()*900000).toString();datosPendientes.codigo=codigo; datosPendientes.expira=Date.now()+120000;try{localStorage.setItem('wms_pendiente', JSON.stringify(datosPendientes));}catch(e){}try{await enviarSMS(datosPendientes.telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 2 minutos para usarlo.');}catch(e){alert('No se pudo reenviar SMS: '+e.message); return;}iniciarTimer();var m=document.getElementById('msgVerif'); m.classList.remove('hidden'); m.innerHTML='✅ Te reenviamos el código por SMS a <b>'+enmascararTelefono(datosPendientes.telefono)+'</b>';}
async function confirmarCodigoVerificacion(){
  var codigo=document.getElementById('codigoVerif').value.trim();
  if(!datosPendientes){ try{datosPendientes=JSON.parse(localStorage.getItem('wms_pendiente')||'null');}catch(e){} }
  if(!datosPendientes){alert('No hay registro pendiente. Vuelve a Activar Suscripción.'); return;}
  if(SMS_ACTIVO){
    if(codigo!==datosPendientes.codigo){alert('Código incorrecto. Revisa tu SMS.'); return;}
    if(Date.now()>datosPendientes.expira){alert('Código vencido. Dale a REENVIAR CÓDIGO.'); return;}
  }
  if(!supabaseClient){alert('Sin internet'); return;}
  var res=await supabaseClient.from('empresas').insert([{nombre_empresa:datosPendientes.empresa,correo:datosPendientes.correo,telefono:datosPendientes.telefono,pass:datosPendientes.pass_hash,pass_salt:datosPendientes.pass_salt,estado:'prueba'}]).select().single();
  if(res.error){alert('No se pudo crear: '+res.error.message); return;}
  clearInterval(timerInterval);
  try{localStorage.removeItem('wms_pendiente');}catch(e){}
  empresaActual=res.data; window.sesionActiva=true;
  document.getElementById('nombreEmpresa2').innerText=datosPendientes.empresa;
  mostrarPrueba(); aplicarLogo();
  show('p-felicidades');
}
function irAlPanelDespuesRegistro(){ if(empresaActual){ show('p-admin-menu'); } else { show('p2-admin'); } }
function cerrarSesion(){window.sesionActiva=false;empresaActual=null;operadorActual=null;navStack=['p1'];cerrarMenuAdmin();show('p1')}
function aplicarLogo(){try{document.getElementById('logoAdmin').src=logoEmpresaURL;document.getElementById('logoOperador').src=logoEmpresaURL;}catch(e){}}
function subirLogo(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){logoEmpresaURL=r.result;try{localStorage.setItem('wms_logo',logoEmpresaURL)}catch(err){}aplicarLogo();alert('¡Listo Lulú! Ya quedó tu logo.')};r.readAsDataURL(f);}
async function abrirCamaraHD(){var m=document.getElementById('camaraModal');m.style.display='flex';try{if(streamHD){streamHD.getTracks().forEach(function(t){t.stop()});}streamHD=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920,min:1280},height:{ideal:1080,min:720}}});var v=document.getElementById('videoHD');v.srcObject=streamHD;await v.play();}catch(e){alert('No se pudo abrir la cámara HD, Lulú. Revisa el permiso de cámara.\n'+e.message);document.getElementById('fotosFinales').click();}}
function cerrarCamaraHD(){try{if(streamHD)streamHD.getTracks().forEach(function(t){t.stop()});}catch(e){}document.getElementById('camaraModal').style.display='none';}
function renderFotos(){var pv=document.getElementById('previewFotos');pv.innerHTML='';fotosFinalesArr.forEach(function(data,idx){var wrap=document.createElement('div');wrap.className='foto-item';var img=document.createElement('img');img.src=data;img.className='preview-foto';var btn=document.createElement('button');btn.className='btn-borrar-foto';btn.innerHTML='×';btn.type='button';btn.onclick=function(){fotosFinalesArr.splice(idx,1);renderFotos();};wrap.appendChild(img);wrap.appendChild(btn);pv.appendChild(wrap);});}
function tomarFotoHD(){try{var v=document.getElementById('videoHD');if(!v.videoWidth){alert('Espera que cargue la cámara, Lulú.');return;}var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;var ctx=c.getContext('2d');ctx.drawImage(v,0,0,c.width,c.height);var data=c.toDataURL('image/jpeg',0.92);if(fotosFinalesArr.length>=8){alert('Ya tienes 8 fotos, Lulú.');return;}fotosFinalesArr.push(data);renderFotos();}catch(e){alert('No se pudo tomar la foto: '+e.message);}}
function cargarDatosGuardados(){try{var op=JSON.parse(localStorage.getItem('wms_op_login')||'null');if(op){document.getElementById('opEmpresa').value=op.empresa||'';document.getElementById('opUsuario').value=op.usuario||'';}}catch(e){}try{var ad=JSON.parse(localStorage.getItem('wms_admin_login')||'null');if(ad){document.getElementById('loginCorreo').value=ad.correo||'';}}catch(e){}}
function mostrarPrueba(){if(!empresaActual)return;try{document.getElementById('estadoEmpresa').innerText=empresaActual.estado||'prueba';var fin=new Date(empresaActual.fin_prueba);var dias=Math.ceil((fin-new Date())/(1000*60*60*24));document.getElementById('diasPrueba').innerText=empresaActual.estado==='activo'?'Suscripción activa - $99 / mes':dias>0?'Te quedan '+dias+' días gratis, después $99 / mes':'Tu prueba terminó';}catch(e){}}
function soloDigitos(t){return (t||'').replace(/\D/g,'');}
function enmascararTelefono(tel){var d=soloDigitos(tel);if(d.length>=10) d=d.slice(-10);if(d.length<2) return '+52 *******--';return '+52 *******' + d.slice(-2);}
function esPinValido(pin){if(!/^\d{4}$/.test(pin)) return false;if(['0000','1111','1234','4321','9999','0001'].indexOf(pin)>=0) return false;return true;}
async function registrar(){
  var p1=document.getElementById('pass1').value,p2=document.getElementById('pass2').value;
  if(!passEsValida()){alert('Tu contraseña debe tener 8 caracteres, 1 mayúscula, 1 minúscula y 1 caracter especial @$#%&');return}
  if(p1!==p2){alert('Las contraseñas no coinciden');return}
  if(!document.getElementById('aceptoTerminos').checked || !document.getElementById('aceptoPrivacidad').checked){alert('Tienes que aceptar Términos y Aviso de Privacidad, Lulú.');return}
  var emp=document.getElementById('empresa').value||'', nombre=document.getElementById('regNombre').value||'', correo=document.getElementById('regCorreo').value, telefono=soloDigitos(document.getElementById('regTelefono').value);
  if(!emp||!nombre){alert('Pon nombre de empresa y tu nombre');return}
  if(!correo){alert('Pon tu correo');return}
  if(telefono.length<10){alert('Pon tu teléfono de 10 dígitos para SMS');return}
  var telefonoCompleto='+52'+telefono.slice(-10);
  var codigo=Math.floor(100000+Math.random()*900000).toString();
  var salt=generarSalt(); var pass_hash=await hashConSalt(p1, salt);
  datosPendientes={empresa:emp,nombre:nombre,correo:correo,telefono:telefono,telefonoCompleto:telefonoCompleto,pass_hash:pass_hash,pass_salt:salt,codigo:codigo,expira:Date.now()+120000};
  try{localStorage.setItem('wms_pendiente', JSON.stringify(datosPendientes));}catch(e){}
  if(!SMS_ACTIVO){
    if(!supabaseClient){alert('Sin internet'); return;}
    var resDirecto=await supabaseClient.from('empresas').insert([{nombre_empresa:emp,correo:correo,telefono:telefono,pass:pass_hash,pass_salt:salt,estado:'prueba'}]).select().single();
    if(resDirecto.error){alert('No se pudo crear: '+resDirecto.error.message); return;}
    try{localStorage.removeItem('wms_pendiente');}catch(e){}
    empresaActual=resDirecto.data; window.sesionActiva=true;
    document.getElementById('nombreEmpresa2').innerText=emp;
    mostrarPrueba(); aplicarLogo();
    show('p-felicidades');
    return;
  }
  try{await enviarSMS(telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 2 minutos para usarlo.');}catch(e){alert('No se pudo mandar el SMS: '+e.message);return;}
  document.getElementById('textoVerificacion').innerText='Te enviamos un código por SMS a '+enmascararTelefono(telefono);
  document.getElementById('codigoVerif').value='';
  var m=document.getElementById('msgVerif'); m.classList.remove('hidden'); m.innerHTML='✅ Te mandamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>';
  iniciarTimer();
  show('p-verificacion');
}
async function iniciarSesion(){
  var correo=document.getElementById('loginCorreo').value,pass=document.getElementById('loginPass').value;
  if(!correo||!pass){alert('Pon tu correo y tu contraseña');return}
  if(!supabaseClient){alert('Sin internet, Lulú.');return}
  var res=await supabaseClient.from('empresas').select('*').eq('correo',correo).single();
  if(res.error||!res.data){alert('Correo o contraseña incorrectos.');return}
  var hashIntento=await hashConSalt(pass, res.data.pass_salt||'');
  if(hashIntento!==res.data.pass){alert('Correo o contraseña incorrectos.');return}
  var fin=new Date(res.data.fin_prueba);
  if(res.data.estado==='bloqueado'||(res.data.estado==='prueba'&&fin<new Date())){empresaActual=res.data;alert('Se acabaron tus 7 días gratis. Activa tu suscripción de $99 / mes.');show('p-suscripcion');return}
  try{localStorage.setItem('wms_admin_login',JSON.stringify({correo:correo}))}catch(e){}
  empresaActual=res.data;window.sesionActiva=true;document.getElementById('nombreEmpresa2').innerText=res.data.nombre_empresa;mostrarPrueba();aplicarLogo();await cargarUsuarios();show('p-admin-menu')
}
function activarSuscripcionGoogle(){alert('Aquí Google Play va a abrir su ventana de pago. Suscripción: $99 / mes. Escríbenos a '+CORREO_SOPORTE)}
async function enviarRecuperacion(){
  var telefono=soloDigitos(document.getElementById('telefonoOlvido').value);
  if(telefono.length<10){alert('Pon tu número de 10 dígitos');return}
  if(!supabaseClient){alert('Sin internet');return}
  var telefonoCompleto='+52'+telefono.slice(-10);
  var res=await supabaseClient.from('empresas').select('*').eq('telefono',telefono).single();
  var m=document.getElementById('msgOlvido');m.classList.remove('hidden');
  m.innerHTML='⏳ Mandando tu código por SMS...';
  if(res.data){
    document.getElementById('nuevoPassCorreo').value=res.data.correo||'';
    var codigo=Math.floor(100000+Math.random()*900000).toString();
    try{localStorage.setItem('wms_codigo_recuperacion', JSON.stringify({codigo:codigo, correo:res.data.correo, expira:Date.now()+10*60*1000}));}catch(e){}
    if(!SMS_ACTIVO){ m.innerHTML='✅ Verificación pausada. Ya puedes poner tu contraseña nueva.'; setTimeout(function(){show('p-nueva-pass')}, 800); return; }
    try{ await enviarSMS(telefonoCompleto, 'Tu codigo WMS Check List es: '+codigo+'. Tienes 10 minutos para usarlo.'); m.innerHTML='✅ ¡Listo! Te mandamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>.<br>1. Pon tu código de 6 dígitos<br>2. Crear contraseña nueva y Actualizar'; }catch(e){ m.innerHTML='❌ No se pudo mandar el SMS: '+e.message; return; }
    setTimeout(function(){show('p-nueva-pass')}, 1200);
  } else { m.innerHTML='✅ ¡Listo! Si ese número está registrado, te mandamos tu código por SMS a <b>'+enmascararTelefono(telefono)+'</b>.'; }
}
async function actualizarPass(){
  var correo=document.getElementById('nuevoPassCorreo').value, codigoIngresado=document.getElementById('codigoRecuperacion').value, n1=document.getElementById('nuevoPass1').value, n2=document.getElementById('nuevoPass2').value;
  if(n1!==n2){alert('Las contraseñas no coinciden');return}
  if(n1.length<8){alert('Mínimo 8 caracteres, con mayúscula, minúscula y @$#%&');return}
  var guardado=null; try{guardado=JSON.parse(localStorage.getItem('wms_codigo_recuperacion')||'null');}catch(e){}
  if(SMS_ACTIVO){ if(!guardado || guardado.codigo!==codigoIngresado || Date.now()>guardado.expira || guardado.correo!==correo){alert('Código incorrecto o vencido. Pide otro código.');return} }
  if(!supabaseClient){alert('Sin internet');return}
  var salt2=generarSalt(); var hash2=await hashConSalt(n1, salt2);
  var res=await supabaseClient.from('empresas').update({pass:hash2, pass_salt:salt2}).eq('correo',correo);
  if(res.error){alert('No se pudo: '+res.error.message);return}
  try{localStorage.removeItem('wms_codigo_recuperacion');}catch(e){}
  alert('¡Listo! Tu contraseña nueva ya quedó.');show('p2-admin')
}
async function cargarUsuarios(){if(!empresaActual||!supabaseClient)return;var res=await supabaseClient.from('usuarios').select('id,nombre,usuario,rol,telefono,empresa_correo').eq('empresa_correo',empresaActual.correo);usuarios=res.data||[];renderUsuarios()}
async function loginOperador(){
  var emp=document.getElementById('opEmpresa').value,usu=document.getElementById('opUsuario').value,pass=document.getElementById('opPass').value;
  if(!emp||!usu||!pass){alert('Llena empresa, usuario y PIN');return}
  if(!/^\d{4}$/.test(pass)){alert('Tu PIN debe ser de 4 dígitos,.');return}
  if(!supabaseClient){alert('Sin internet, .');return}
  var res=await supabaseClient.from('usuarios').select('*').eq('usuario',usu).single();
  if(res.error||!res.data){alert('Usuario o PIN incorrectos. Pídele a tu Admin que te lo recuerde.');return}
  var hashPin=await hashConSalt(pass, res.data.pass_salt||'');
  if(hashPin!==res.data.pass){alert('Usuario o PIN incorrectos.');return}
  try{localStorage.setItem('wms_op_login',JSON.stringify({empresa:emp,usuario:usu}))}catch(e){}
  operadorActual=res.data;document.getElementById('nombreEmpresa').innerText=res.data.nombre||usu;window.sesionActiva=true;aplicarLogo();show('p4');
}
async function guardarEmpleado(){
  var nombre=document.getElementById('empNombre').value,usuario=document.getElementById('empUsuario').value,pass=document.getElementById('empPass').value,rol=document.getElementById('empRol').value,tel=document.getElementById('empTel').value;
  if(!nombre||!usuario||!pass){alert('Falta nombre, usuario y PIN');return}
  if(!esPinValido(pass)){alert('PIN de 4 dígitos,. No uses 1234 ni 0000.');return}
  if(!supabaseClient){alert('Sin internet');return}
  var saltPin=generarSalt(); var hashPin=await hashConSalt(pass, saltPin);
  var res=await supabaseClient.from('usuarios').insert([{empresa_correo:empresaActual.correo,nombre:nombre,usuario:usuario,pass:hashPin,pass_salt:saltPin,rol:rol,telefono:tel}]);
  if(res.error){alert('No se pudo: '+res.error.message);return}
  ['empNombre','empUsuario','empPass','empRol','empTel'].forEach(function(i){document.getElementById(i).value=''});await cargarUsuarios();show('p-consulta-usuarios')
}
function renderUsuarios(){var l=document.getElementById('listaUsuarios');document.getElementById('totalUsuarios').innerText=usuarios.length;document.getElementById('sinUsuarios').style.display=usuarios.length?'none':'block';l.innerHTML='';usuarios.forEach(function(u){l.innerHTML+='<div class="usuario-card"><div><b>'+u.nombre+'</b><span>Usuario: '+u.usuario+'</span><span>PIN: ****</span><span>Rol: '+(u.rol||'Sin rol')+' '+(u.telefono?'• Tel: '+u.telefono:'')+'</span></div><button class="btn-trash" onclick="eliminarUsuario(\''+u.id+'\',\''+u.nombre+'\')">🗑️</button></div>'});}
async function eliminarUsuario(id,nombre){if(!confirm('¿Seguro que quieres eliminar a '+nombre+'?'))return;if(supabaseClient)await supabaseClient.from('usuarios').delete().eq('id',id);await cargarUsuarios();}
function actualizarTipo(){var t=document.getElementById('dTipo').value,esGas=t==='Gas';document.getElementById('boxCombustible').classList.toggle('hidden',!esGas);document.getElementById('boxBateria').classList.toggle('hidden',esGas);document.getElementById('dClase').value=esGas?'Montacargas Gas':'Montacargas Eléctrico'; renderItemsChecklist();}
function abrirChecklist(tipo){tipoChecklistActual=tipo;var tit={camiones:'🚚 Checklist Camión',montacargas:'🏗️ Checklist Montacargas - 31 puntos',bitacora:'🗺️ Bitácora de Ruta'};document.getElementById('tituloChecklist').innerText=tit[tipo];document.getElementById('dFecha').value=hoyISO();document.getElementById('dOperador').value=operadorActual?operadorActual.nombre:'';document.getElementById('dUnidad').value='';document.getElementById('dHorometro').value='';document.getElementById('dTipo').value='Gas';actualizarTipo();document.getElementById('dCombustible').value='';document.getElementById('dBateria').value='';document.getElementById('comentarioFinal').value='';document.getElementById('previewFotos').innerHTML='';document.getElementById('fotosFinales').value='';fotosFinalesArr=[];renderItemsChecklist();show('p-checklist')}
try{document.getElementById('fotosFinales').addEventListener('change',function(e){var files=Array.from(e.target.files||[]);files.slice(0,8).forEach(function(f){var r=new FileReader();r.onload=function(){fotosFinalesArr.push(r.result);renderFotos();};r.readAsDataURL(f)});document.getElementById('fotosFinales').value='';});}catch(e){}
function getLibro(){try{return JSON.parse(localStorage.getItem('wms_libro')||'{}')}catch(e){return{}}}
function setLibro(d){try{localStorage.setItem('wms_libro',JSON.stringify(d))}catch(e){}}
async function guardarChecklist(){
  var unidad=document.getElementById('dUnidad').value.trim();if(!unidad){alert('Pon el Numero de unidad, Lulú. Ej. 03');document.getElementById('dUnidad').focus();return}
  var fecha=document.getElementById('dFecha').value||hoyISO(),mes=fecha.slice(0,7),tipoUnidad=document.getElementById('dTipo').value,esGas=tipoUnidad==='Gas';
  var nivel=esGas?document.getElementById('dCombustible').value:document.getElementById('dBateria').value;
  var datos={fecha:fecha,operador:document.getElementById('dOperador').value,turno:document.getElementById('dTurno').value,unidad:unidad,clase:document.getElementById('dClase').value,tipoUnidad:tipoUnidad,horometro:document.getElementById('dHorometro').value,combustible:esGas?nivel:'',bateria:!esGas?nivel:'',tipo:tipoChecklistActual,guardado:new Date().toISOString()};
  datos.filas=puntosVisibles().map(function(item,i){var s=document.querySelector('input[name="chk'+i+'"]:checked');return{punto:item,estado:s?s.value:'',comentario:'',tieneFoto:'NO',ligaFoto:''}});
  datos.comentarioFinal=document.getElementById('comentarioFinal').value||'';datos.fotosFinales=fotosFinalesArr.length+' fotos';datos.ligasFotos=fotosFinalesArr.map(function(_,idx){return 'foto_'+unidad+'_'+fecha+'_'+(idx+1)});
  var libro=getLibro();if(!libro[mes])libro[mes]={};if(!libro[mes][tipoChecklistActual])libro[mes][tipoChecklistActual]={};if(!libro[mes][tipoChecklistActual][unidad])libro[mes][tipoChecklistActual][unidad]=[];
  var idx=libro[mes][tipoChecklistActual][unidad].findIndex(function(d){return d.fecha===fecha});if(idx>=0)libro[mes][tipoChecklistActual][unidad][idx]=datos;else libro[mes][tipoChecklistActual][unidad].push(datos);
  libro[mes][tipoChecklistActual][unidad].sort(function(a,b){return a.fecha.localeCompare(b.fecha)});setLibro(libro);
  try{if(supabaseClient)await supabaseClient.from('checklists').insert([{tipo:tipoChecklistActual,unidad:unidad,operador:datos.operador,resultados:datos.filas.map(function(f){return f.punto+': '+f.estado}).join(' || '),observaciones:'Tipo:'+tipoUnidad+' Turno:'+datos.turno+' Horometro:'+datos.horometro+' Combustible:'+datos.combustible+' Bateria:'+datos.bateria+' | GOLPES: '+datos.comentarioFinal+' | FOTOS: '+datos.fotosFinales,tiene_foto:fotosFinalesArr.length?'SI':'NO',fecha:new Date(fecha).toISOString()}])}catch(e){}
  alert('¡Guardado, Lulú! ✅\nUnidad '+unidad+' ('+tipoUnidad+')\nFecha: '+fecha+'\nNivel: '+nivel);show('p4');
}
function renderLibro(tipo){try{var mes=document.getElementById(tipo==='montacargas'?'mesMontacargas':'mesReporte').value||'2026-11',sel=document.getElementById('selUnidadMontacargas'),libro=getLibro(),hojas=(libro[mes]&&libro[mes][tipo])||{},unidades=Object.keys(hojas);if(sel&&sel.options.length<=1){sel.innerHTML='<option value="">Todas las unidades</option>'+unidades.map(function(u){return '<option value="'+u+'">Unidad '+u+'</option>'}).join('')}var filtro=sel?sel.value:'',cont=document.getElementById('libroMontacargas');if(!unidades.length){cont.innerHTML='<div class="card"><p>No hay registros en '+mes+' todavía.</p></div>';return}var html='';unidades.filter(function(u){return !filtro||u===filtro}).forEach(function(unidad){var dias=hojas[unidad];html+='<div class="card"><b>📄 Hoja Unidad '+unidad+'</b> <span class="badge">'+dias.length+' día(s) en '+mes+'</span></div>';html+='<div class="libro-wrap"><table><tr><th>A - Datos / B - Punto</th>'+dias.map(function(d){return '<th>'+d.fecha+'<br>'+d.operador+'<br>'+(d.tipoUnidad||'')+' - Turno '+d.turno+'<br>Horom '+d.horometro+'<br>'+(d.tipoUnidad==='Electrico'?'Bat '+d.bateria:'Comb '+d.combustible)+'<br><small>'+(d.comentarioFinal||'')+'<br>Fotos: '+(d.fotosFinales||'0 fotos')+'</small></th>'}).join('')+'</tr>';puntosDe(tipo).forEach(function(punto,pi){html+='<tr><td>'+(pi+1)+'. '+punto+'</td>'+dias.map(function(d){var f=(d.filas||[]).find(function(x){return x.punto===punto})||{};return '<td>'+(f.estado==='MAL ESTADO'?'❌ MAL':f.estado==='BUEN ESTADO'?'✅ BUEN':'—')+'</td>'}).join('')+'</tr>'});html+='</table></div>'});cont.innerHTML=html;}catch(e){}}
function verReporteMes(){var mes=document.getElementById('mesReporte').value,libro=getLibro(),hojas=(libro[mes]&&libro[mes]['montacargas'])||{},cont=document.getElementById('contenidoReporte'),unidades=Object.keys(hojas);if(!unidades.length){cont.innerHTML='<div class="card"><p>No hay registros en '+mes+' todavía.</p></div>';return}cont.innerHTML=unidades.map(function(u){return '<div class="card"><b>Unidad '+u+'</b> - '+hojas[u].length+' día(s)<br><span style="font-size:12px">'+hojas[u].map(function(d){return d.fecha+' ('+d.operador+')'}).join(' • ')+'</span></div>'}).join('')}
function descargarMes(tipo){var mes=document.getElementById('mesMontacargas').value||'2026-11';exportarCSVPorMes(mes,tipo)}
function exportarCSVPorMes(mes,tipo){var libro=getLibro(),hojas=(libro[mes]&&libro[mes][tipo])||{},unidades=Object.keys(hojas);if(!unidades.length){alert('Aún no hay datos en '+mes);return}var csv='Libro '+mes+' - '+tipo+'\n';unidades.forEach(function(u){var dias=hojas[u];csv+='\nHoja Unidad '+u+'\nA - Datos / B - Punto,'+dias.map(function(d){return d.fecha+' - '+d.operador+' - Tipo '+(d.tipoUnidad||'')+' - Turno '+d.turno+' - Horometro '+d.horometro+' - Combustible '+d.combustible+' - Bateria '+d.bateria+' - GOLPES: '+(d.comentarioFinal||'')+' - FOTOS: '+(d.fotosFinales||'')}).join(',')+'\n';puntosDe(tipo).forEach(function(punto,pi){csv+='"'+(pi+1)+'. '+punto.replace(/"/g,'')+'",'+dias.map(function(d){var f=(d.filas||[]).find(function(x){return x.punto===punto})||{};return '"'+(f.estado||'')+'"'}).join(',')+'\n'})});var blob=new Blob([csv],{type:'text/csv'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wms_libro_'+mes+'_'+tipo+'_por_unidad.csv';a.click();alert('¡Listo! Se descargó todo el mes '+mes+', Lulú.')}
function exportarCSV(){var mes=document.getElementById('mesReporte').value||'2026-11';exportarCSVPorMes(mes,'montacargas')}
try{if(window.location.hash==='#nueva-pass'){show('p-nueva-pass')}}catch(e){}
try{cargarDatosGuardados();aplicarLogo();}catch(e){}
try{document.getElementById('btnAdmin').addEventListener('click',function(){show('p2-admin')});}catch(e){}
try{document.getElementById('pass1').addEventListener('input', validarPass);document.getElementById('pass2').addEventListener('input', validarPass);}catch(e){}
