"""
Sistema de logging centralizado para aplicaciones.

Sin logs, en producción estamos muertos. A las 3 AM cuando algo crashea,
este archivo es nuestra única salvación para entender qué pasó.

Estructurado:
- Múltiples niveles: DEBUG, INFO, WARN, ERROR, SUCCESS
- Timestamps automáticos, aplicación tagging, contexto
- Escritura a archivo + console simultáneamente
- Rotación básica para no llenar el disco con basura de hace 6 meses
- JSON parsing de data para ver exactamente qué metadatos llegaron

Usage:
    from logging_helper import setup_logging, log

    setup_logging("mi_app", "logs/mi_app.log")
    log("INFO", "App iniciada")
    log("ERROR", "Fallo en API", data={"status": 500})
    log("SUCCESS", "Operación completada")
"""

import os
import json
from datetime import datetime
from typing import Optional, Any, Dict

# Global configuration
_current_app_name = "app"
_log_file_path = None

def setup_logging(app_name: str, log_file_path: Optional[str] = None):
    """
    Setup logging configuration.

    Args:
        app_name: Application name for log entries
        log_file_path: Path to log file (optional)
    """
    global _current_app_name, _log_file_path
    _current_app_name = app_name
    _log_file_path = log_file_path

    # Create log directory if needed
    if log_file_path:
        log_dir = os.path.dirname(log_file_path)
        if log_dir and not os.path.exists(log_dir):
            try:
                os.makedirs(log_dir, exist_ok=True)
            except Exception:
                pass

def log(level: str, message: str, main: bool = False, data: Optional[Dict[str, Any]] = None):
    """
    Log a message with the specified level.

    Args:
        level: Log level (DEBUG, INFO, WARN, ERROR, SUCCESS)
        message: Log message
        main: Use simplified format for main application logs
        data: Optional additional data to include
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    app_label = _current_app_name.upper()

    if not main:
        plain = f"[{timestamp}][{app_label}][{level}] {message}"
    else:
        plain = f"[{timestamp}]{message}"

    if data is not None:
        try:
            details = json.dumps(data, ensure_ascii=False, indent=2)
            plain += f"\nDetails: {details}"
        except Exception:
            plain += f"\nDetails: {str(data)}"

    # Print to console
    print(plain)

    # Write to file if configured
    if _log_file_path:
        try:
            with open(_log_file_path, "a", encoding="utf-8") as f:
                f.write(plain + "\n")
        except Exception:
            # Fallback to console only
            pass

    return plain

def debug(message: str, data: Optional[Dict[str, Any]] = None):
    """Log a debug message."""
    return log("DEBUG", message, data=data)

def info(message: str, data: Optional[Dict[str, Any]] = None):
    """Log an info message."""
    return log("INFO", message, data=data)

def warn(message: str, data: Optional[Dict[str, Any]] = None):
    """Log a warning message."""
    return log("WARN", message, data=data)

def error(message: str, data: Optional[Dict[str, Any]] = None):
    """Log an error message."""
    return log("ERROR", message, data=data)

def success(message: str, data: Optional[Dict[str, Any]] = None):
    """Log a success message."""
    return log("SUCCESS", message, data=data)

def get_current_log_path() -> Optional[str]:
    """Get the current log file path."""
    return _log_file_path

def rotate_logs(max_size_mb: int = 10):
    """
    Basic log rotation - rename current log when it exceeds max size.

    Args:
        max_size_mb: Maximum log file size in MB
    """
    if not _log_file_path or not os.path.exists(_log_file_path):
        return

    max_size_bytes = max_size_mb * 1024 * 1024

    try:
        size = os.path.getsize(_log_file_path)
        if size > max_size_bytes:
            # Create backup
            backup_path = f"{_log_file_path}.old"
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(_log_file_path, backup_path)

            # Log rotation message to new file
            log("INFO", f"Log rotated (size: {size} bytes)")

    except Exception:
        pass

# Convenience functions for common patterns
def log_api_call(endpoint: str, method: str = "GET", status_code: Optional[int] = None,
                duration_ms: Optional[float] = None):
    """
    Log an API call.

    Args:
        endpoint: API endpoint
        method: HTTP method
        status_code: Response status code
        duration_ms: Request duration in milliseconds
    """
    message = f"API {method} {endpoint}"
    if status_code:
        message += f" - Status: {status_code}"
    if duration_ms:
        message += f" - Duration: {duration_ms:.2f}ms"

    if status_code and 200 <= status_code < 300:
        log("INFO", message)
    elif status_code and status_code >= 400:
        log("ERROR", message)
    else:
        log("DEBUG", message)

def log_operation(operation: str, status: str, details: Optional[Dict[str, Any]] = None):
    """
    Log a business operation.

    Args:
        operation: Operation name
        status: Operation status ("started", "completed", "failed")
        details: Additional operation details
    """
    message = f"Operation '{operation}' {status}"

    if status == "completed":
        log("SUCCESS", message, data=details)
    elif status == "failed":
        log("ERROR", message, data=details)
    else:
        log("INFO", message, data=details)

def log_performance(operation: str, duration_ms: float, metadata: Optional[Dict[str, Any]] = None):
    """
    Log performance metrics.

    Args:
        operation: Operation name
        duration_ms: Duration in milliseconds
        metadata: Additional metadata
    """
    data = {"duration_ms": duration_ms}
    if metadata:
        data.update(metadata)

    if duration_ms > 5000:  # More than 5 seconds
        log("WARN", f"Slow operation: {operation} ({duration_ms:.2f}ms)", data=data)
    else:
        log("DEBUG", f"Performance: {operation} ({duration_ms:.2f}ms)", data=data)</content>
<parameter name="filePath">c:\Users\mguel\Desktop\Trabajos varios programación\copias proyecto proautos\ALFBOT-NEXUS\Public_Alfbot-Nexus\core-helpers\logging_helper.py