import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

PROJECT_NAME = "AlfBot-Arboria"
MARKER_FILENAME = ".alfbot_install_marker"


def get_system_base_dir() -> str:
    """Return the base folder for user data on Windows.

    Falls back to home if neither LOCALAPPDATA nor APPDATA exists.
    """
    return os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or os.path.expanduser("~")


def get_marker_dir() -> str:
    return os.path.join(get_system_base_dir(), PROJECT_NAME)


def get_marker_path() -> str:
    return os.path.join(get_marker_dir(), MARKER_FILENAME)


def read_install_path() -> Optional[str]:
    """Read the saved install path from the master marker file."""
    marker_path = get_marker_path()
    try:
        if os.path.isfile(marker_path):
            with open(marker_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                install_path = data.get("install_path")
                if isinstance(install_path, str):
                    return install_path
    except Exception:
        pass
    return None


def write_install_path(install_path: str, mode: str = "production", version: str = "1.0.0") -> bool:
    """Persist the effective install path and metadata to a marker file."""
    marker_dir = get_marker_dir()
    marker_path = get_marker_path()
    try:
        os.makedirs(marker_dir, exist_ok=True)
        data: Dict[str, Any] = {
            "install_path": os.path.abspath(install_path),
            "installed_at": datetime.now().isoformat(),
            "version": version,
            "mode": mode,
        }
        with open(marker_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def delete_install_marker() -> bool:
    """Remove the master marker file if it exists."""
    try:
        path = get_marker_path()
        if os.path.isfile(path):
            os.remove(path)
        return True
    except Exception:
        return False


def read_marker_data() -> Dict[str, Any]:
    """Return the raw marker contents, or an empty dict if invalid."""
    marker_path = get_marker_path()
    try:
        if os.path.isfile(marker_path):
            with open(marker_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}
