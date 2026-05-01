"""
Wrapper para la API de WhatsApp de Meta.

Utilidades para subir templates y enviar mensajes.
"""

import requests
import time
import re
from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime

# Constants
WHATSAPP_API_VERSION = "v18.0"
META_GRAPH_API_BASE = "https://graph.facebook.com"
VARIABLE_PATTERN = re.compile(r'\$\{(\w+)\}')

class WhatsAppAPI:
    def __init__(self, access_token: str, phone_number_id: str, business_account_id: str):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.business_account_id = business_account_id
        self.base_url = f"{META_GRAPH_API_BASE}/{WHATSAPP_API_VERSION}"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        })

        # Configuración de reintentos
        self.max_retries = 3
        self.retry_delay = 2
        self.no_retry_codes = {131026, 131047, 132000, 132001, 132005, 132012, 132015, 132068, 132069}

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Tuple[bool, Dict[str, Any]]:
        url = f"{self.base_url}{endpoint}"

        for attempt in range(self.max_retries):
            try:
                response = self.session.request(method, url, **kwargs)
                data = response.json() if response.content else {}

                if response.status_code in (200, 201):
                    return True, data

                # Verificar si el error es reintentable
                error_code = data.get("error", {}).get("code", response.status_code)
                if error_code in self.no_retry_codes:
                    return False, data

                # Reintentar con backoff exponencial
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))

            except requests.exceptions.RequestException as e:
                if attempt == self.max_retries - 1:
                    return False, {"error": {"message": str(e)}}

        return False, {"error": {"message": "Max retries exceeded"}}

    def upload_template(self, template: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        # Normalizar nombre del template
        meta_name = self._normalize_name(template["name"])

        # Convertir body con variables
        converted_body, var_names = self._convert_body(template["body_md"])

        # Construir componentes
        components = [{
            "type": "BODY",
            "text": converted_body
        }]

        if var_names:
            components[0]["example"] = {
                "body_text": [self._build_examples(var_names)]
            }

        data = {
            "name": meta_name,
            "language": template.get("language", "es"),
            "category": template.get("category", "UTILITY"),
            "components": components
        }

        return self._make_request("POST", f"/{self.business_account_id}/message_templates", json=data)

    def check_template_status(self, template_name: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check the approval status of a template.

        Args:
            template_name: Template name

        Returns:
            Tuple of (success: bool, status_info: dict)
        """
        params = {"name": template_name}
        success, data = self._make_request("GET", f"/{self.business_account_id}/message_templates", params=params)

        if success and data.get("data"):
            template = data["data"][0]
            return True, {
                "id": template.get("id"),
                "name": template.get("name"),
                "status": template.get("status"),
                "category": template.get("category"),
                "language": template.get("language")
            }

        return False, data

    def send_message(self, to_phone: str, template_name: str, language: str, parameters: List[str]) -> Tuple[bool, Dict[str, Any]]:
        # Manejo del rate limit de Meta. Ojo con bajarle el delay o nos banean el número.
        components = []
        if parameters:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in parameters]
            })

        data = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": components
            }
        }

        success, response = self._make_request("POST", f"/{self.phone_number_id}/messages", json=data)

        if success and response.get("messages"):
            return True, {
                "message_id": response["messages"][0].get("id"),
                "status": "sent"
            }

        return False, response

    def _normalize_name(self, name: str) -> str:
        """Convert readable name to Meta-compatible snake_case."""
        import unicodedata
        s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
        s = s.lower()
        s = re.sub(r"[^a-z0-9]+", "_", s)
        s = s.strip("_")
        s = re.sub(r"_+", "_", s)
        return s[:512] if s else "template"

    def _convert_body(self, body_md: str) -> Tuple[str, List[str]]:
        """Convert template body with variables to Meta format."""
        var_names = []
        seen = set()
        for match in VARIABLE_PATTERN.finditer(body_md):
            vname = match.group(1)
            if vname not in seen:
                var_names.append(vname)
                seen.add(vname)

        converted = body_md
        for idx, vname in enumerate(var_names, start=1):
            converted = converted.replace(f"${{{vname}}}", f"{{{{{idx}}}}}")

        return converted, var_names

    def _build_examples(self, var_names: List[str]) -> List[str]:
        """Generate example values for template variables."""
        examples = {
            "NameCustomer": "Juan Pérez",
            "NameProduct": "Servicio Premium",
            "PriceProduct": "$150.000",
            "LastDateService": "15/01/2026",
            "Observation": "Sin novedades",
            "NumberOfFacture": "FV-12345"
        }
        return [examples.get(v, f"Example_{v}") for v in var_names]

    @staticmethod
    def sanitize_parameter(value: str) -> str:
        """
        Sanitize parameter values for Meta API.

        Removes line breaks and collapses whitespace.
        """
        if not value:
            return "—"
        clean = value.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")
        clean = re.sub(r" {2,}", " ", clean).strip()
        return clean or "—"

    @staticmethod
    def format_phone_number(phone: str) -> str:
        """
        Format Colombian phone number to E.164.

        Args:
            phone: Phone number string

        Returns:
            E.164 formatted number
        """
        digits = re.sub(r'\D', '', str(phone or ''))
        if len(digits) == 10 and digits.startswith('3'):
            return f"57{digits}"
        if len(digits) == 12 and digits.startswith('57'):
            return digits
        return digits</content>
<parameter name="filePath">c:\Users\mguel\Desktop\Trabajos varios programación\copias proyecto proautos\ALFBOT-NEXUS\Public_Alfbot-Nexus\utils\whatsapp_api_wrapper.py