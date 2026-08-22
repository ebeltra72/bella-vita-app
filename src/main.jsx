import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import Sesion from './auth/Sesion'

// Se hornea en el bundle en tiempo de build, no se lee en runtime: si la
// variable no está cargada en Vercel cuando corre `vite build`, el deploy sale
// sin clave y no hay forma de arreglarlo sin volver a desplegar.
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const raiz = ReactDOM.createRoot(document.getElementById('root'))

// Sin la clave, ClerkProvider tira y la app queda en blanco con un error de
// consola que no dice qué hacer. Preferimos una pantalla que lo explique: el
// que la va a ver es quien está desplegando, no un usuario.
if (!PUBLISHABLE_KEY) {
  raiz.render(
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', background: '#F8F5F2', fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: '#FFFFFF', border: '1px solid #EDE8E4', borderRadius: 18,
        padding: '30px 26px', maxWidth: 460, lineHeight: 1.6,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2C2320', marginBottom: 10 }}>
          Falta configurar el acceso
        </div>
        <div style={{ fontSize: 14, color: '#9A8C89' }}>
          No está definida <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Hay que cargarla en
          las variables de entorno del proyecto y volver a desplegar: al ser una
          variable <code>VITE_</code>, se resuelve durante el build y no alcanza con
          agregarla después.
        </div>
      </div>
    </div>
  )
} else {
  raiz.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <Sesion />
      </ClerkProvider>
    </React.StrictMode>
  )
}
