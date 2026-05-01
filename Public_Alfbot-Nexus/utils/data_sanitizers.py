"""
Utilidades para sanitizar datos de Excel y APIs.
"""

import re
import unicodedata
from typing import Optional, List, Tuple, Any, Iterable
from datetime import datetime

def normalize_text(text: str, preserve_case: bool = False) -> str:
    # Sanitización ruda de Excel. La gente mete cualquier formato aquí, así que forzamos la limpieza.
    if not text:
        return ""

    # Convert to string and strip
    s = str(text).strip()

    # Remove accents
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")

    # Convert case
    if not preserve_case:
        s = s.lower()

    # Replace spaces and special chars with single space
    s = re.sub(r"[^a-zA-Z0-9\s]", " ", s)

    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s).strip()

    return s

def format_phone_number(phone: str, country_code: str = "57") -> str:
    if not phone:
        return ""

    # Extract digits only
    digits = re.sub(r'\D', '', str(phone))

    # Handle Colombian numbers
    if country_code == "57":
        if len(digits) == 10 and digits.startswith('3'):
            return f"57{digits}"
        elif len(digits) == 12 and digits.startswith('57'):
            return digits

    # Generic E.164 formatting
    if len(digits) >= 10:
        return f"{country_code}{digits[-10:]}"

    return digits

def validate_email(email: str) -> bool:
    """
    Validate email address format.

    Args:
        email: Email address string

    Returns:
        True if valid email format, False otherwise

    Examples:
        >>> validate_email("user@example.com")
        True
        >>> validate_email("invalid-email")
        False
    """
    if not email or not isinstance(email, str):
        return False

    email = email.strip()

    # Basic regex for email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    return bool(re.match(pattern, email))

def format_price(amount: Any, currency: str = "$", locale: str = "es_CO") -> str:
    """
    Format numeric amount as currency string.

    Args:
        amount: Numeric amount (int, float, or string)
        currency: Currency symbol
        locale: Locale for formatting (affects thousands separator)

    Returns:
        Formatted price string

    Examples:
        >>> format_price(150000)
        '$150.000'
        >>> format_price("1234.56")
        '$1.235'
    """
    try:
        # Convert to float
        num = float(str(amount).replace(",", "").replace("$", "").strip())

        if locale == "es_CO":
            # Colombian format: $150.000
            return f"{currency}{num:,.0f}".replace(",", ".")
        else:
            # Standard format: $150,000
            return f"{currency}{num:,.0f}"

    except (ValueError, TypeError):
        return str(amount) if amount else ""

def sanitize_api_parameter(value: str) -> str:
    """
    Sanitize parameter values for API calls.

    Removes line breaks, collapses whitespace, and handles empty values.

    Args:
        value: Parameter value to sanitize

    Returns:
        Sanitized parameter string

    Examples:
        >>> sanitize_api_parameter("Hello\nWorld")
        'Hello World'
        >>> sanitize_api_parameter("")
        '—'
    """
    if not value:
        return "—"

    # Convert to string
    clean = str(value)

    # Replace any line break variant with space
    clean = clean.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")

    # Collapse multiple spaces
    clean = re.sub(r" {2,}", " ", clean).strip()

    return clean or "—"

def detect_header_row(data: List[List[str]], max_scan_rows: int = 100) -> int:
    # Detección automática de headers en Excel. Los usuarios ponen cualquier cosa, así que buscamos patrones comunes.
    if not data:
        return 0

    scan_rows = min(max_scan_rows, len(data))
    best_score = 0
    best_row = 0

    header_keywords = [
        "name", "nombre", "id", "identificación", "email", "teléfono",
        "fecha", "date", "estado", "status", "total", "cantidad"
    ]

    for row_idx in range(scan_rows):
        row = data[row_idx]
        score = 0
        text_cells = 0
        numeric_cells = 0

        for cell in row:
            cell_str = str(cell).strip().lower()

            if not cell_str or cell_str in ("nan", "none", "nat"):
                continue

            # Check for pure numbers
            if re.match(r'^[-+]?[\d.,]+%?$', cell_str.replace(" ", "")):
                numeric_cells += 1
            else:
                text_cells += 1

            # Check for header keywords
            for keyword in header_keywords:
                if keyword in cell_str:
                    score += 2
                    break

        # Prefer rows with more text cells than numeric
        if text_cells > numeric_cells:
            score += text_cells

        # Penalize rows that are mostly numbers
        if numeric_cells > text_cells:
            score -= 5

        if score > best_score:
            best_score = score
            best_row = row_idx

    return best_row

def normalize_column_name(name: str) -> str:
    """
    Normalize column name for consistent matching.

    Args:
        name: Column name to normalize

    Returns:
        Normalized column name

    Examples:
        >>> normalize_column_name("Nombre Cliente")
        'nombre cliente'
        >>> normalize_column_name("Teléfono Móvil")
        'telefono movil'
    """
    if not name:
        return ""

    # Convert to string
    s = str(name).strip().lower()

    # Remove accents
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")

    # Replace non-alphanumeric with space
    s = re.sub(r"[^a-z0-9]+", " ", s)

    # Collapse spaces
    s = re.sub(r"\s+", " ", s).strip()

    return s

def find_column_by_name(columns: List[str], candidates: List[str], fuzzy: bool = True) -> Optional[str]:
    """
    Find a column by name from a list of candidates.

    Args:
        columns: List of available column names
        candidates: List of possible column names to match
        fuzzy: If True, use fuzzy matching

    Returns:
        Matching column name or None

    Examples:
        >>> columns = ["Nombre Cliente", "Teléfono", "Email"]
        >>> find_column_by_name(columns, ["nombre", "name"])
        'Nombre Cliente'
    """
    if not columns or not candidates:
        return None

    # Create normalized mapping
    norm_map = {normalize_column_name(col): col for col in columns}
    cand_norm = [normalize_column_name(c) for c in candidates]

    # Exact match first
    for norm_cand in cand_norm:
        if norm_cand in norm_map:
            return norm_map[norm_cand]

    if not fuzzy:
        return None

    # Fuzzy matching
    for orig_col, norm_col in norm_map.items():
        for norm_cand in cand_norm:
            if norm_cand in norm_col or norm_col in norm_cand:
                return orig_col

    return None

def format_date(value: Any, output_format: str = "%d/%m/%Y") -> str:
    """
    Format date value to string.

    Handles various input formats and converts to specified output format.

    Args:
        value: Date value (datetime, string, etc.)
        output_format: Output format string

    Returns:
        Formatted date string

    Examples:
        >>> format_date("2026-01-15")
        '15/01/2026'
        >>> format_date(datetime(2026, 1, 15))
        '15/01/2026'
    """
    if not value:
        return ""

    try:
        if isinstance(value, datetime):
            return value.strftime(output_format)

        if isinstance(value, str):
            # Try common date formats
            formats = [
                "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S",
                "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"
            ]

            for fmt in formats:
                try:
                    dt = datetime.strptime(value[:19], fmt)
                    return dt.strftime(output_format)
                except ValueError:
                    continue

        return str(value)

    except Exception:
        return str(value) if value else ""

def is_pure_number(text: str) -> bool:
    """
    Check if text represents a pure number.

    Args:
        text: Text to check

    Returns:
        True if text is a number, False otherwise

    Examples:
        >>> is_pure_number("123.45")
        True
        >>> is_pure_number("ABC")
        False
    """
    if not text or not isinstance(text, str):
        return False

    s = text.strip()
    if not s or s.lower() in ("nan", "none", "nat"):
        return False

    # Remove currency symbols and spaces
    s = re.sub(r'[\$€£¥\s]', '', s)

    # Check if remaining is numeric
    return bool(re.fullmatch(r'[-+]?[\d.,]+%?', s) and re.search(r'\d', s))</content>
<parameter name="filePath">c:\Users\mguel\Desktop\Trabajos varios programación\copias proyecto proautos\ALFBOT-NEXUS\Public_Alfbot-Nexus\utils\data_sanitizers.py