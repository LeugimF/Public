# AlfBot-Nexus Public Utilities

Soy Miguel Angel Fernandez. Este repo es un extracto de las utilidades core que construí para AlfBot-Nexus. Nada de código inflado, solo soluciones reales para automatizar browser tasks, manejar JSON local y mantener rutas de instalación limpias en un entorno Windows.

## What this repo is for

I extracted a small set of reusable helpers from the AlfBot desktop automation and packaging flow.

- `json_storage.py`: robust local JSON read/write for config, cache, and task state.
- `install_marker.py`: safe install marker management for AppData-based desktop installs.
- `playwright_manager.py`: clean Playwright browser lifecycle handling and offline browser path support.

## Problem solved

This set of utilities is meant to reduce two common failures in automation systems:

- brittle local storage: shared state stored as JSON files that can easily break when a file is missing or malformed.
- fragile browser launch: Playwright automation is useful, but only if the process starts/stops cleanly and can use bundled browser assets.

## Tech stack

- Python 3
- Playwright sync API
- JSON file handling
- Windows AppData / install marker patterns

## How to use

1. Install dependencies:
   ```bash
   pip install playwright
   python -m playwright install chromium
   ```

2. Use the JSON helper:
   ```python
   from json_storage import read_json, write_json

   config = read_json("config/settings.json")
   config["last_run"] = "2026-05-01"
   write_json("config/settings.json", config)
   ```

3. Start Playwright once in a script:
   ```python
   from playwright_manager import PlaywrightBrowserManager, init_playwright_browsers_path

   init_playwright_browsers_path("ms-playwright")
   manager = PlaywrightBrowserManager(downloads_dir="downloads", headless=False)
   browser, context, page = manager.start()
   page.goto("https://example.com")
   manager.stop()
   ```

## Notes

- I did not include any private API keys, tokens, or client secrets.
- The current inspected source did not show direct Meta API integration.
- If you want to productize these modules, add a small wrapper around the browser manager and keep environment values as placeholders.

## Cierre

Este repositorio es un primer extracto. Si quieres revisar el flujo completo o adaptar la estructura a un portfolio público, lo dejo listo para que se use como muestra técnica.
