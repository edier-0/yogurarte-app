# Spec 010 — Auditoría Dinámica de Presentaciones en Fase B y Alerta Proactiva de Fidelización
Estado: aprobada

## Contexto y objetivo
Actualmente, el sistema YogurArte maneja un catálogo flexible de presentaciones comerciales (500 ml, 1 L, 2 L y futuras extensiones). Sin embargo:
1. En la auditoría de producción, existen vestigios donde los balances se calculan o visualizan bajo la presunción rígida de envases de 1 L y 2 L. Las entregas reales, ventas comerciales y salidas de producto terminado ocurren exclusivamente a nivel de fracciones envasadas (**Fase B**), mientras que el Lote Madre (**Fase A**) representa únicamente la fermentación y balance de base láctea a granel.
2. El programa de fidelización 10+1 permite redimir litros de premio a $0 COP con salidas de inventario asociadas a fracciones envasadas. Actualmente, la opción de canje vive únicamente dentro del módulo CRM, lo que provoca que en la operación diaria de toma de pedidos comerciales pase desapercibida la disponibilidad de premios acumulados de los clientes.

El objetivo de esta especificación es:
- Garantizar que la auditoría de Fracciones Envasadas (Fase B) opere de forma 100% dinámica sobre cualquier presentación comercial actual o futura.
- Identificar y desglosar de forma visible y diferenciada las botellas entregadas por concepto de fidelización 10+1 en la auditoría de la fracción envasada.
- Mantener la auditoría del Lote Madre (Fase A) estrictamente enfocada en el balance lácteo a granel, libre de mezclas con botellas comerciales.
- Integrar una alerta proactiva y no intrusiva en el formulario de creación de pedidos que notifique si el cliente tiene premios disponibles y brinde acceso directo para redimirlo en CRM sin perder el pedido en curso.

## Usuarios
- **Operador de Ventas / Despachador**: Registra comandas en mostrador y a domicilio. Requiere ser alertado al seleccionar un cliente si este tiene litros gratis por fidelización para ofrecérselos y redimirlos con facilidad.
- **Administrador / Jefe de Producción**: Supervisa el rendimiento, costeo y salidas de producto terminado. Requiere auditar con precisión las unidades producidas, vendidas y premiadas por cada presentación de la fracción envasada.

## Historias de usuario
- **HU-1**: Como operador de ventas, quiero que al seleccionar un cliente frecuente en el formulario de pedidos el sistema me avise de forma inmediata si tiene litros gratis acumulados y me dé un botón directo para redimir el premio en CRM, para no dejar pasar el beneficio del cliente.
- **HU-2**: Como administrador, quiero que la auditoría de la fracción envasada (Fase B) liste dinámicamente cualquier presentación registrada (500 ml, 1 L, 2 L o formatos futuros), para contar con métricas exactas de unidades producidas, vendidas y disponibles sin depender de columnas fijas.
- **HU-3**: Como administrador, quiero que en la auditoría de la fracción envasada las botellas entregadas por fidelización 10+1 se identifiquen con una etiqueta y sección clara de premios comerciales a $0 COP, para no confundirlas con mermas de producción ni retiros de socios.
- **HU-4**: Como jefe de producción, quiero que la auditoría del Lote Madre (Fase A) refleje fielmente el volumen lácteo crudo, el yogur base obtenido y los litros transferidos a envasado, evitando confusiones con inventarios de producto terminado.

## Definiciones
- **Fracción Envasada (Fase B)**: Lote de producto terminado envasado (`BatchPackaging`), donde se asignan presentaciones comerciales, se consumen envases/etiquetas y se asocian las ventas y entregas.
- **Lote Madre (Fase A)**: Tina de fermentación (`ProductionBatch`), fuente de base láctea a granel.
- **Presentación Dinámica**: Formato de venta con capacidad en litros, envase asignado y precio unitario definido en el catálogo o fracción.
- **Premio de Fidelización 10+1**: Entrega de hasta 1.0 Litro de yogur en presentaciones permitidas (1L o 2 de 500ml) a $0 COP (`PREMIO_FIDELIZACION`), otorgado tras acumular 10 botellas equivalentes pagadas y entregadas.

## Requisitos funcionales (EARS)
- **RF-1**: CUANDO el operador seleccione un cliente en el formulario de creación de pedidos (`OrderModal`), EL SISTEMA debe evaluar reactivamente si dicho cliente cuenta con premios de fidelización disponibles (`rewardsAvailable > 0`).
- **RF-2**: SI el cliente seleccionado posee al menos un premio de fidelización disponible, ENTONCES EL SISTEMA debe desplegar un banner o distintivo visual no bloqueante indicando el número de premios listos para reclamar y un botón de acción rápida para redimir.
- **RF-3**: CUANDO el operador presione la acción rápida de redimir desde la comanda, EL SISTEMA debe abrir el diálogo de redención de fidelización preseleccionando al cliente activo, permitiendo registrar la entrega y retornar al pedido sin reiniciar los ítems ya ingresados.
- **RF-4**: CUANDO se consulte la auditoría y balance de una fracción envasada en Fase B (`PackagingSummaryModal`), EL SISTEMA debe calcular y renderizar dinámicamente la tabla de presentaciones agrupando unidades producidas, vendidas, retiradas y saldo libre para cada formato registrado en la fracción, sin asumir ni limitar a envases fijos de 1L o 2L.
- **RF-5**: CUANDO una fracción envasada posea salidas por motivo `PREMIO_FIDELIZACION`, EL SISTEMA en la auditoría de Fase B debe exhibir un indicador y desglose específico de botellas entregadas por fidelización a $0 COP, distinguiéndolas explícitamente de mermas técnicas y consumos de socios.
- **RF-6**: CUANDO se calculen los indicadores financieros y de rentabilidad de la fracción envasada, EL SISTEMA debe ponderar las ventas, precios por litro y costos unitarios considerando las capacidades dinámicas de cada presentación participante.
- **RF-7**: EL SISTEMA debe asegurar que la auditoría general del Lote Madre (Fase A) mantenga su alcance exclusivo en el balance de leche inoculada, yogur base producido y litros transferidos a Fase B, sin desplegar desgloses rígidos de botellas terminadas.

## Requisitos no funcionales
- **RNF-1 (Usabilidad y Fluidez)**: La alerta de fidelización en pedidos debe ser informativa y ágil; en ningún caso debe impedir o forzar el guardado del pedido comercial si el cliente opta por no redimir su beneficio en esa oportunidad.
- **RNF-2 (Rendimiento)**: La verificación del estado de fidelización del cliente al seleccionarlo en la comanda no debe introducir retrasos perceptibles en la interfaz de usuario.
- **RNF-3 (Compatibilidad)**: La auditoría dinámica debe procesar correctamente tanto las fracciones envasadas modernas con matriz de contenedores como las fracciones legacy (`bottles1L` / `bottles2L`) sin inconsistencias de cálculo ni errores en tiempo de ejecución.

## Casos límite
- Cliente nuevo o sin botellas suficientes para premio: el formulario de pedido no muestra alertas ni distintivos de fidelización.
- Cliente con múltiples premios acumulados (ej. 2 o 3 premios): el distintivo debe reflejar la cantidad total de premios disponibles.
- Fracción con presentaciones poco comunes (ej. 250 ml o 3 L): la tabla de auditoría debe calcular la capacidad exacta, costo por litro y margen sin truncar el formato visual.
- Fracción sin ningún premio de fidelización entregado: la sección de auditoría correspondiente debe mostrar 0 unidades entregadas sin alterar los totales.

## Fuera de alcance
- Reestructuración de la base de datos física (migraciones DDL de Prisma).
- Modificación del algoritmo matemático de acumulación proporcional de litros ($\sum \text{litros} / 1.0$).
- Eliminación o reubicación de la pestaña de Fidelización en el módulo de CRM.

## Criterios de finalización
- El formulario de toma de pedidos alerta proactivamente si el cliente tiene premios de fidelización y provee acceso directo al canje.
- La auditoría de fracción envasada (Fase B) lista todas las presentaciones registradas de forma dinámica y exacta.
- La auditoría de Fase B detalla y rotula visiblemente las botellas entregadas por fidelización a $0 COP.
- La auditoría de Fase A se mantiene limpia y dedicada exclusivamente a la base láctea a granel.
- Suite de pruebas de integración y tipado ejecutándose en verde sin regresiones.

## Dudas abiertas
*No hay dudas abiertas; los requisitos fueron aclarados y confirmados durante la fase de entrevista.*
