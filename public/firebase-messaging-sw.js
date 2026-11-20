/* Service worker de Firebase Cloud Messaging: muestra las notificaciones con la web cerrada
 * o en segundo plano. La configuracion llega en la URL de registro (ver push-web.service.ts),
 * asi este archivo no contiene datos del proyecto y se puede versionar. */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const configuracion = JSON.parse(new URL(self.location.href).searchParams.get('config') || '{}');

if (configuracion.projectId) {
  firebase.initializeApp(configuracion);
  // Los mensajes con bloque `notification` (los que envia el backend) se muestran solos.
  firebase.messaging();
}

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
      if (abierta) return abierta.focus();
      return clients.openWindow('/inicio');
    }),
  );
});
