# Match Cívico — Documentación del Sistema

Bienvenido a la documentación técnica oficial de **Match Cívico**, plataforma desarrollada para el Hackathon INE 2024 con arquitectura monorepo desacoplada (**Package by Feature**), backend en **Go (Chi) + SQLite** y frontend en **React Native (Expo)** unificado para Web y Móvil (Android/iOS).

---

## 📚 Índice de Documentación

1. [**Arquitectura del Sistema (`architecture.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/architecture.md)
   - Filosofía arquitectónica: *Package by Feature* vs capas horizontales.
   - Diagrama de componentes y flujo de datos.
   - Monorepo y desacople de módulos.
   - Regla de aislamiento de fallos.

2. [**Modelo de Base de Datos y Datos INE (`database.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/database.md)
   - Diagrama Entidad-Relación y convención de prefijos por módulo.
   - Diccionario de datos exhaustivo de las 6 tablas SQLite.
   - Origen, limpieza y carga de los datasets censales y de candidaturas 2024.
   - Script de regeneración de base de datos.

3. [**Referencia de la API REST (`api_reference.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/api_reference.md)
   - Convenciones de comunicación y respuestas estandarizadas JSON.
   - Endpoints del Módulo de Candidatos (Luis).
   - Endpoints del Módulo de Votantes y Estadísticas (Ezequiel).
   - Endpoints del Módulo de Sistema y Auditoría (Juan).
   - Ejemplos prácticos con `curl`.

4. [**Guía de Desarrollo Frontend Móvil y Web (`frontend_guide.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/frontend_guide.md)
   - Configuración de Expo SDK 57 (React Native Web + Mobile).
   - Estructura de carpetas por feature (`api`, `components`, `hooks`, `screens`).
   - Componentes UI compartidos y sistema de diseño.
   - Resolución de red multiplataforma (Web vs Android Emulator vs Dispositivo físico).

5. [**Protocolo Git y Flujo de Trabajo en Paralelo (`workflow_git.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/workflow_git.md)
   - Matriz de responsabilidades y ramas protegidas.
   - Protocolo anti-conflictos de fusión.
   - Archivos de acceso restringido / una sola edición.
   - Guía para Juan (fusión y resolución de conflictos).

6. [**Guía de Auditoría QA, UI/UX y Pentesting (`qa_pentesting.md`)**](file:///home/anon/uni/cua9/movil/hackathon/docs/qa_pentesting.md)
   - Guía especializada para Aleksey.
   - Matriz de pruebas de seguridad y pentesting básico (inyección SQL, CORS, validación).
   - Criterios de auditoría UI/UX y accesibilidad móvil.
   - Casos de prueba recomendados para cada módulo.

7. [**Etiquetado de propuestas y árbol de decisión (`etiquetado_candidatos.md`)**](etiquetado_candidatos.md)
   - Taxonomía de ejes, enfoques y concreción del módulo de Luis.
   - Pesos en `candidatos_etiquetas` y cómo se calculan.
   - Cómo correr Decider en local y el script de etiquetado.
