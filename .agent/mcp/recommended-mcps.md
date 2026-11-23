# Catálogo y Guía de Configuración de MCPs — agent-core

El **Model Context Protocol (MCP)** es el estándar abierto que permite a los agentes de IA conectarse de forma segura y estandarizada con herramientas externas, APIs del sistema operativo, navegadores e infraestructura.

En el ecosistema `agent-core`, los servidores MCP potencian la automatización del ciclo Spec-Driven Development (SDD), la consulta autoritativa de documentación y la validación visual de interfaces, operando bajo dos principios innegociables:
1. **Tolerancia Cero a Credenciales Hardcodeadas (DevSecOps)**: Ningún token ni clave API se almacena en el repositorio; se inyectan dinámicamente mediante variables de entorno del sistema.
2. **Degradación Elegante (Fallback Graceful)**: Si un servidor MCP no está instalado, autenticado o disponible (ej. trabajo offline), el arnés recurre automáticamente a comandos de consola nativos o enlaces asistidos sin romper el flujo de trabajo.

---

## 1. Catálogo de Servidores MCP Recomendados

### A. GitHub MCP (`@modelcontextprotocol/server-github`)
- **Propósito**: Gestión integral de control de versiones y colaboración en GitHub.
- **Casos de Uso en `agent-core`**:
  - Creación y apertura automatizada de Pull Requests en el workflow `/review-and-pr`.
  - Inspección de issues, branches remotas y revisiones de código.
- **Herramientas Clave**:
  - `create_pull_request`: Abre un PR con título, cuerpo y ramas base/head.
  - `get_pull_request`: Consulta el estado y checks de CI de un PR.
  - `create_issue` / `get_issue`: Vinculación con requerimientos y tickets.
- **Requisitos de Autenticación**:
  - Requiere un Personal Access Token (PAT) de GitHub con permisos de `repo`.
  - Variable de entorno estándar: `GITHUB_PERSONAL_ACCESS_TOKEN` o `GITHUB_TOKEN`.

---

### B. Context7 MCP (`context7-mcp` o servidor Context7)
- **Propósito**: Consulta de documentación oficial indexada y actualizada en tiempo real para frameworks, librerías y APIs.
- **Casos de Uso en `agent-core`**:
  - Fundamento técnico de la skill `source-driven-development`: anclar las decisiones de implementación y firmas de funciones en fuentes autoritativas, eliminando alucinaciones por obsolescencia del conocimiento base del LLM.
- **Herramientas Clave**:
  - `resolve-library-id`: Resuelve el identificador oficial de una librería o framework.
  - `query-docs`: Realiza búsquedas semánticas y extrae fragmentos exactos de documentación oficial.
- **Requisitos de Autenticación**:
  - Generalmente no requiere autenticación obligatoria para librerías públicas (o admite API key opcional según el proveedor).

---

### C. Chrome DevTools MCP (`chrome-devtools-mcp`)
- **Propósito**: Inspección, automatización y depuración interactiva de aplicaciones web en un navegador real a través de Chrome DevTools Protocol.
- **Casos de Uso en `agent-core`**:
  - Empleado por `@reviewer` en `[MODO: VALIDACION_IMPLEMENTACION]` durante la Fase 5 para validar requerimientos de interfaz de usuario (UI), capturar errores en la consola de JavaScript y auditar accesibilidad.
- **Herramientas Clave**:
  - `puppeteer_navigate`: Navega a la URL local de desarrollo (`DEV_SERVER_URL`).
  - `puppeteer_screenshot`: Captura evidencias visuales del estado de la interfaz.
  - `puppeteer_evaluate`: Evalúa expresiones en la consola del navegador y captura excepciones no controladas.
- **Requisitos de Autenticación**:
  - No requiere credenciales externas; opera localmente contra una instancia de Chromium o Chrome instalada en la máquina.

---

## 2. Esquemas de Configuración por Agente

### 1. Configuración para OpenCode (`opencode.json`)
Ubicación en el proyecto: `opencode.json` (en la raíz) o `.opencode/opencode.json`.

```json
{
  "$schema": "https://opencode.ai/schema/opencode.json",
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

---

### 2. Configuración para Claude Code y Claude Desktop
- **Claude Desktop**: `claude_desktop_config.json` (en `%APPDATA%\Claude\` en Windows o `~/.config/Claude/` en Linux/macOS).
- **Claude Code**: Configurable mediante `claude mcp add` o en su archivo de configuración global.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

---

### 3. Configuración para Antigravity
En Antigravity, los servidores MCP se configuran a nivel de usuario o espacio de trabajo en `<appDataDir>/mcp/<serverName>` o mediante el registro de plugins:

- Servidor `github`: Proporciona herramientas nativas para gestión de repositorios y PRs.
- Servidor `context7`: Proporciona `resolve-library-id` y `query-docs`.
- Servidor `chrome-devtools`: Proporciona automatización y diagnóstico web con Puppeteer.

---

### 4. Configuración para Cursor / Windsurf
Ubicación: `.cursor/mcp.json` o en los ajustes globales de la aplicación:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

---

## 3. Política Estricta de DevSecOps (Cero Secretos)

1. **Prohibición Total de Hardcoding**:
   - Queda terminantemente prohibido escribir cadenas de tokens (`ghp_...`, `github_pat_...`) en archivos de configuración rastreados por Git.
   - Todo archivo de configuración debe utilizar la sintaxis de interpolación de variables de entorno del entorno correspondiente (`{env:VAR}`, `${VAR}` o `${env:VAR}`).
2. **Gestión de Entornos Locales**:
   - En entornos de desarrollo local, las variables de entorno se definen en el perfil del sistema operativo (`.bashrc`, `.zshrc`, variables de usuario en Windows) o en un archivo local no rastreado (`.env`).
   - El archivo `.gitignore` del proyecto debe contener obligatoriamente:
     ```text
     .env
     .env.local
     .env.*.local
     *.key
     *.pem
     ```

---

## 4. Matriz de Degradación Elegante y Fallback

Cuando un agente intenta utilizar una funcionalidad respaldada por MCP y el servidor no está configurado, offline o no responde, debe aplicar la siguiente estrategia en cascada:

| Servidor MCP | Nivel 1 (Ideal / MCP) | Nivel 2 (Fallback CLI) | Nivel 3 (Fallback Manual Asistido) |
| :--- | :--- | :--- | :--- |
| **GitHub** | Invoca `create_pull_request` de GitHub MCP. | Ejecuta GitHub CLI si está instalado (`gh pr create --base <base> --head <head> ...`). | Genera e imprime en chat la URL directa de comparación de GitHub: `https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1`. |
| **Context7** | Consulta `query-docs` con el identificador de la librería. | Inspecciona definiciones locales en archivos de tipos (`.d.ts`), `node_modules` o lockfiles del proyecto. | Emplea búsqueda web autoritativa (`search_web`) citando explícitamente la documentación oficial del framework. |
| **Chrome DevTools** | Inspecciona consola y DOM mediante Chrome DevTools MCP en `DEV_SERVER_URL`. | Si el proyecto carece de frontend (API, CLI, librerías), omite la prueba de navegador y valida 100% mediante suite (`TEST_COMMAND`), linters y diff. | Si hay frontend pero no hay DevTools disponible, valida mediante pruebas de integración/componente locales (ej. JSDOM, Vitest con Testing Library) y diff. |

---

## 5. Protocolo de Verificación Previa para Subagentes

Antes de intentar invocar una herramienta MCP en un workflow:
1. **Comprobar Disponibilidad**: El agente evalúa si la herramienta MCP está expuesta en su contexto de ejecución.
2. **Comprobar Requisitos Previos**:
   - Para **GitHub MCP**: Verificar que la variable de entorno `GITHUB_PERSONAL_ACCESS_TOKEN` o `GITHUB_TOKEN` esté poblada si se requiere autenticación.
   - Para **Chrome DevTools MCP**: Verificar pasivamente si `DEV_SERVER_URL` responde antes de navegar. Si no responde, solicitar al usuario levantar el servidor local con `START_DEV_COMMAND`.
3. **Activación Transparente de Fallback**: Si la llamada a MCP falla o no está disponible, el agente anuncia la degradación en una sola línea clara y continúa la ejecución sin bloquear al usuario:
   > *"GitHub MCP no disponible en este entorno; procediendo a la apertura asistida mediante enlace web directo..."*
