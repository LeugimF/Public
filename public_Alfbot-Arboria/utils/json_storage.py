import json
import os
from typing import Any, Dict


def safe_makedirs(path: str) -> None:
    """Make directories if they do not exist, ignore failures."""
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        pass


def read_json(path: str) -> Dict[str, Any]:
    """Read JSON from disk and return a dictionary.

    Returns an empty dict if the file is missing or the content is invalid.
    """
    try:
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def write_json(path: str, data: Any) -> bool:
    """Write a Python object as JSON, creating parent folders when needed."""
    try:
        safe_makedirs(os.path.dirname(path))
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data or {}, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False
