# Ruedas - Sistema Interno de Concesionaria

## Stack
- **Frontend:** React 18 + Vite — carpeta `front/`
- **Backend:** Node.js + Express — carpeta `back/`
- **Base de datos:** PostgreSQL en Neon (serverless)
- **Hosting:** Frontend en Vercel, Backend en Render

## Estructura del proyecto
```
ruedas/
├── front/               # React app (Vite)
│   └── src/
│       ├── api/         # Funciones fetch al backend
│       ├── components/  # Layout, KpiCard, StatusBadge
│       ├── pages/       # Dashboard, Vehicles, Sellers, etc.
│       └── styles/      # global.css con CSS variables
├── back/                # Express API
│   ├── src/
│   │   ├── routes/      # vehicles.js, sellers.js, kpis.js
│   │   ├── db.js        # Pool de conexión a Neon
│   │   └── index.js     # Entry point
│   ├── migrations/      # SQL de creación de tablas
│   └── uploads/         # Fotos de vehículos (local dev)
```

## Base de datos
Tablas: `sellers`, `vehicles`, `vehicle_photos`

Enums:
- `vehicle_type`: utility | road | luxury
- `vehicle_status`: available | sold | withdrawn

Las características específicas por tipo de vehículo se guardan en columna JSONB `features`.

## Variables de entorno
### Backend (`back/.env`)
```
PORT=3001
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
```

### Frontend — en Vercel
```
VITE_API_URL=https://ruedas-back.onrender.com
```

## Cómo levantar en desarrollo
```bash
# Backend
cd back && npm run dev   # puerto 3001

# Frontend
cd front && npm run dev  # puerto 5173
```
El front hace proxy a `/api` → `localhost:3001` via vite.config.js.

## API endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/vehicles | Listar vehículos (filtros: status, type, search) |
| POST | /api/vehicles | Crear vehículo (multipart/form-data con fotos) |
| PUT | /api/vehicles/:id/status | Cambiar estado (sold/withdrawn) |
| GET | /api/sellers | Listar vendedores con stats |
| GET | /api/kpis/general | KPIs generales |
| GET | /api/kpis/sellers | KPIs por vendedor |
| GET | /api/kpis/monthly | Ventas mensuales (últimos 12 meses) |

## Convenciones de código
- Sin TypeScript — JS plano en todo el proyecto
- CSS con variables (`var(--accent)`, `var(--primary)`, etc.) — sin Tailwind ni librerías UI
- Fetch nativo para llamadas API (sin axios)
- Queries SQL parametrizadas siempre (`$1, $2...`) — sin concatenación

## Git — Flujo de ramas
- `main` → producción (Vercel + Render)
- `develop` → staging/integración, se prueba acá antes de pasar a main
- `isidro` → rama de Isidro
- `vichen` → rama de Vichen

**Día a día:**
```bash
git pull origin develop        # traerse lo último antes de arrancar
# ... codear ...
git add .
git commit -m "descripción"
git push origin isidro         # (o vichen)
```
Luego abrir PR en GitHub: `isidro` → `develop` (o `vichen` → `develop`).
Cuando develop está estable → PR `develop` → `main`.

## Notas importantes
- Las fotos en producción se guardan en `uploads/` localmente — pendiente migrar a S3 o Cloudinary
- El backend en Render usa el free tier: se "duerme" tras 15 min de inactividad
- No hay autenticación implementada todavía
