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

7. [**Uso de los datos del INE (`uso_datos_ine.md`)**](uso_datos_ine.md)
   - Fuentes: Conteos Censales 2024 y Conóceles.
   - Columnas conservadas, agregaciones y la fórmula de participación que usa el código.
   - Diferencia con la fórmula del manual DECEyEC y con lo que pide la convocatoria 2026.

8. [**Etiquetado y match por boleta (`etiquetado_candidatos.md`)**](etiquetado_candidatos.md)
   - Etiquetas por propuesta, incluida la de género, y similitud dentro de la boleta.
   - Cómo elige la siguiente tarjeta y qué muestra el resultado.
   - Medición del simulador y cómo correr Decider.

9. [**Plan del match (`plan_match_candidatos.md`)**](plan_match_candidatos.md)
   - Por qué el recorrido anterior no llegaba a una candidatura y cómo se reemplazó.
   - Orden de trabajo y resultado medido.

10. [**Las tres boletas (`plan_tres_boletas.md`)**](plan_tres_boletas.md)
    - Diputación, senado y presidencia en un solo resultado, sin preguntar cuál boleta.
