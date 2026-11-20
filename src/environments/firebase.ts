// NO VERSIONAR (ignorado en .gitignore). Plantilla: firebase.example.ts
// En la nube este archivo se genera desde los secretos del pipeline antes de `ng build`.
// Pega aqui la configuracion de la APP WEB (Firebase > Configuracion del proyecto > Tus apps > Web).
// No uses los valores de google-services.json: son de la app Android.
export const firebaseConfig = {
  apiKey: 'AIzaSyB52zwwfpkRUkhaQoacF62xCeE_R2mB2pY',
  authDomain: 'atemporal-f0125.firebaseapp.com',
  projectId: 'atemporal-f0125',
  storageBucket: 'atemporal-f0125.firebasestorage.app',
  messagingSenderId: '314117413244',
  appId: '1:314117413244:web:47cfea19f16e77ef35acf9',
  measurementId: 'G-XSCZM6W9KY',
};

// Firebase > Configuracion del proyecto > Cloud Messaging > Certificados web push
export const vapidKey = 'BPynAukpiB0LHXB057C6tm2qx5_KtrN314CrYbX4z7X37ul0pUdS3p8UkaLI_FivaX5c_QlP3Yr8_u357CjBpB8';