# Magdalena Smart Farming 🌾🚜

**Magdalena Smart Farming** es un sistema premium de agricultura de precisión diseñado para el monitoreo inteligente de cultivos en la región del Magdalena. La plataforma permite la recolección de telemetría de sensores en tiempo real (humedad, temperatura, pH y estado del gateway), el cálculo automatizado de la salud del cultivo y el procesamiento de eventos mediante una arquitectura moderna desacoplada.

El sistema está diseñado bajo un modelo híbrido **Edge-Cloud** preparado para funcionar de forma desconectada e implementar la sincronización de datos de manera automática cuando hay conectividad disponible.

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue estándares de desarrollo modernos, garantizando escalabilidad, mantenibilidad y robustez:

1. **Arquitectura Hexagonal (Clean Architecture / DDD)**:
   * **Domain**: Contiene las entidades puras del negocio (`Parcela`, `Sensor`), los eventos de dominio y los puertos (interfaces) de comunicación.
   * **Application**: Implementa las reglas de negocio y los casos de uso (`CreateParcela`, `DeleteParcela`, `GetParcelaStats`, `LoginUseCase`, etc.), además del servicio de simulación (`SimulationService`).
   * **Infrastructure**: Contiene los adaptadores de tecnología concretos. Implementa la persistencia con PostgreSQL/Spring Data JPA, la mensajería asíncrona con RabbitMQ y los controladores web/WebSocket.

2. **Arquitectura Orientada a Eventos (EDA)**:
   * Utiliza **RabbitMQ** como broker de mensajería para distribuir de manera asíncrona los eventos del sistema (`UserLoggedInEvent`, `ManualReadingEvent`, `ParcelaCreatedEvent`, etc.) bajo el exchange `magdalena.events`.

3. **Event Sourcing**:
   * Las lecturas de los sensores e hitos operativos clave se almacenan en un **Event Store** inmutable dentro de PostgreSQL, permitiendo auditar, reproducir y analizar el histórico completo de eventos de la finca.

4. **Frontend Reactivo & Glassmorphism**:
   * Construido con **Vanilla HTML, JS y CSS** para maximizar el rendimiento (sin frameworks pesados).
   * Diseño de interfaz responsivo y estético con acabados oscuros elegantes y efectos visuales modernos.
   * Integración de gráficos interactivos a 60FPS usando **Chart.js** y actualizaciones bidireccionales en tiempo real mediante **WebSockets (STOMP)**.

5. **Preparado para Dispositivos Móviles**:
   * El frontend web está configurado para ser compilado y empaquetado directamente en una aplicación móvil nativa (Android) utilizando **Capacitor**.
   * Incluye detección inteligente de entorno móvil para interceptar llamadas de red y servir **datos simulados (Mock Data)** autónomos si no hay conexión a un servidor central.

---

## 📂 Estructura del Proyecto

```text
Magdalena_Smart_Farming/
├── backend/                       # API REST & WebSocket (Spring Boot + Maven)
│   ├── src/main/java/com/magdalena/
│   │   ├── domain/                # Modelos de dominio, Eventos y Puertos (Interfaces)
│   │   ├── application/           # Casos de uso y servicios lógicos
│   │   └── infrastructure/        # Adaptadores (Web, Persistence, Messaging, Config)
│   ├── pom.xml                    # Configuración de dependencias Maven
│   └── Dockerfile                 # Construcción en múltiples etapas para producción
├── frontend/                      # Cliente Web & Móvil (Vite + Vanilla JS)
│   ├── src/                       # Lógica JS, estilos CSS y utilidades
│   │   ├── utils/                 # Manejo de mock API, base de datos local y llamadas fetch
│   │   └── assets/                # Imágenes y recursos estáticos
│   ├── index.html                 # Página de acceso (Login)
│   ├── dashboard.html             # Panel principal de monitoreo en tiempo real
│   ├── sensors.html               # Configuración y administración de sensores
│   ├── analysis.html              # Análisis de tendencias e históricos con Chart.js
│   ├── sync.html                  # Centro de sincronización y estado de red
│   ├── capacitor.config.json      # Configuración de Capacitor para empaquetado móvil
│   └── vite.config.js             # Configuración de empaquetado y servidor Vite
├── docs/                          # Documentación del proyecto
│   ├── Requerimientos.docx        # Catálogo de Requerimientos Funcionales y No Funcionales
│   └── Historias_de_Usuario.docx  # Historias de usuario definidas para el sistema
├── docker-compose.yml             # Orquestación de contenedores (Postgres, RabbitMQ y Backend)
└── README.md                      # Documentación del proyecto
```

---

## 🛠️ Tecnologías y Requisitos

### Tecnologías Principales:
* **Backend**: Java 21, Spring Boot 3, Spring Data JPA, Spring AMQP (RabbitMQ), Spring WebSocket.
* **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), JavaScript (ESModules), Vite 8, Chart.js 4, Capacitor 8.
* **Base de Datos y Mensajería**: PostgreSQL 16, RabbitMQ 3.13 (con plugin de administración habilitado).
* **Entorno**: Docker y Docker Compose.

### Requisitos de Desarrollo:
* Java Development Kit (JDK) 21 instalado.
* Apache Maven 3.9+.
* Node.js (v18+) y npm.
* Docker Desktop (activo en tu máquina).

---

## 🚀 Instalación y Despliegue Local

### 1. Levantar Servicios de Infraestructura (Docker)
Para iniciar PostgreSQL y RabbitMQ, ejecuta en el directorio raíz del proyecto:
```bash
docker-compose up -d postgres rabbitmq
```
* **PostgreSQL** estará disponible en el puerto `5432` con la base de datos `magdalena_db`.
* **RabbitMQ** estará disponible en el puerto `5672` para mensajería y en el `15672` para el panel de administración web (Credenciales por defecto: `guest` / `guest`).

### 2. Ejecutar el Backend (Java/Spring Boot)
Entra en la carpeta del backend, compila y ejecuta el servidor:
```bash
cd backend
mvn clean install
mvn spring-boot:run
```
El servidor backend se levantará en el puerto `8080` e inicializará automáticamente **3 parcelas de prueba** y **5 sensores vinculados** si la base de datos se encuentra vacía.

*(Opcional)* También puedes iniciar todo el stack (incluyendo el backend compilado) usando Docker Compose:
```bash
docker-compose up --build
```

### 3. Ejecutar el Frontend (Vite)
Entra en la carpeta del frontend, instala las dependencias y arranca el servidor de desarrollo:
```bash
cd frontend
npm install
npm run dev
```
La aplicación web se abrirá en `http://localhost:3000`.

---

## 🔑 Credenciales de Acceso

Para acceder al sistema por primera vez a través del formulario de inicio de sesión, utiliza las siguientes credenciales de administrador (cargadas por defecto en el sistema):

* **Usuario / Correo**: `Admin@gmail.com`
* **Contraseña**: `Admin123`

---

## 📱 Sincronización y Empaquetado Móvil (Capacitor)

El frontend está listo para ser compilado y probado en dispositivos móviles Android. Para ello, realiza la preparación en la carpeta `frontend/`:

1. **Construir el proyecto web**:
   ```bash
   npm run build
   ```
2. **Sincronizar los archivos con Android**:
   ```bash
   npx cap sync android
   ```
3. **Abrir el proyecto en Android Studio**:
   ```bash
   npx cap open android
   ```
Desde Android Studio, puedes compilar la APK o instalar la aplicación directamente en un emulador o dispositivo físico. 

> [!TIP]
> **Ajustes de IP del Servidor:** En el pie de página de la vista de login o en la barra lateral del sistema ("Ajustes de IP"), puedes abrir un panel interactivo para cambiar la dirección IP del servidor backend a la IP local de tu máquina en la red local (ejemplo: `http://192.168.1.15:8080`), permitiendo que el celular físico interactúe con el backend real en lugar del entorno simulado (Mock Data).

---

## 📈 Resumen de Requerimientos y Casos de Uso

El proyecto da respuesta directa a un conjunto de requerimientos críticos de la agricultura inteligente:
* **Monitoreo en tiempo real**: Los sensores envían lecturas de forma simulada o manual que se actualizan dinámicamente sin refrescar la pantalla (WebSockets).
* **Estado de Salud Inteligente**: A partir de la humedad y el pH, el backend deduce automáticamente la salud del lote y emite alertas críticas (ejemplo: salud menor al 50% cambia el estado de la parcela a "Alerta").
* **Event Sourcing**: Permite la trazabilidad absoluta de cada lectura y evento de seguridad, accesible desde la vista de Análisis con filtrado por sensor, parcela e intervalos de tiempo.
* **Resiliencia de Conexión (Edge-Cloud)**: El Centro de Sincronización muestra el estado de red y garantiza que el sistema siga operando localmente si el enlace central se interrumpe.
