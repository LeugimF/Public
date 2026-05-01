# AlfBot-Nexus Utilities

Soy Miguel Ángel Fernandez, desarrollador Full-Stack autodidacta de Colombia. Este repo es un extracto de las utilidades core que construí para AlfBot-Nexus. Nada de código inflado, solo las soluciones reales que uso en producción para lidiar con la API de Meta y manejar automatizaciones masivas sin que el servidor muera.

## Problem Solved

Modern businesses face significant challenges when implementing automated communication systems:

- Scalability Issues: Manual message sending becomes impossible at scale
- API Complexity: Meta's WhatsApp Business API has strict requirements and rate limits
- Data Quality: Inconsistent Excel/CSV data from multiple sources
- Error Handling: Network failures and API rejections require robust retry mechanisms
- User Experience: Complex automation tools need intuitive interfaces
- Integration Complexity: Connecting multiple systems (Excel, APIs, UIs) reliably

This repository provides solutions to these challenges, demonstrating how to build reliable automation systems that can handle thousands of messages while maintaining data integrity and user experience.

## Tech Stack

- Language: Python 3.8+
- UI Framework: Tkinter with custom styling system
- API Integration: Meta WhatsApp Business API v18.0
- Data Processing: Pandas for Excel/CSV handling
- HTTP Client: Requests with retry logic
- Logging: Structured logging with file rotation

## Key Features

### WhatsApp API Integration
- Template message management (upload, validation, status checking)
- Batch sending with circuit breaker pattern
- Rate limiting and quota management
- Automatic retry with exponential backoff
- Phone number E.164 formatting

### Data Processing & Sanitization
- Intelligent Excel header detection
- Multi-format phone number normalization
- Email validation and formatting
- Price formatting for different locales
- Parameter sanitization for API calls

### UI Components
- DPI-aware responsive design
- Auto-hide scrollbars
- Toggle help systems
- Consistent dark theme styling
- Cross-platform window management

### Logging & Monitoring
- Structured logging with multiple levels
- Performance monitoring
- API call tracking
- Automatic log rotation

## Repository Structure

```
Public_Alfbot-Nexus/
├── utils/
│   ├── whatsapp_api_wrapper.py    # Meta WhatsApp API client
│   └── data_sanitizers.py         # Data cleaning utilities
├── core-helpers/
│   ├── ui_helpers.py              # Tkinter UI components
│   └── logging_helper.py          # Logging utilities
└── README.md                      # This file
```

## Installation & Usage

### Prerequisites
```bash
pip install requests pandas openpyxl pillow
```

### Basic Usage Examples

#### WhatsApp API Integration
```python
from utils.whatsapp_api_wrapper import WhatsAppAPI

# Initialize API client
api = WhatsAppAPI(
    access_token="your_meta_access_token",
    phone_number_id="your_phone_number_id",
    business_account_id="your_business_account_id"
)

# Upload a message template
success, response = api.upload_template({
    "name": "order_confirmation",
    "body_md": "Hello ${NameCustomer}, your order #${OrderNumber} is confirmed!",
    "language": "es"
})

# Send a message
success, response = api.send_message(
    to_phone="573001234567",
    template_name="order_confirmation",
    language="es",
    parameters=["John Doe", "12345"]
)
```

#### Data Sanitization
```python
from utils.data_sanitizers import (
    normalize_text, format_phone_number,
    validate_email, format_price
)

# Clean and normalize data
clean_name = normalize_text("  JOSÉ MARÍA GÓMEZ  ")
phone = format_phone_number("3001234567")  # → "573001234567"
is_valid_email = validate_email("customer@example.com")
price = format_price(150000)  # → "$150.000"
```

#### UI Components
```python
from core_helpers.ui_helpers import (
    mk_scrollable_frame, mk_toggle_help_box, create_styled_button
)

# Create scrollable content area
scroll_frame = mk_scrollable_frame(parent, bg="#121212")
content = scroll_frame["content"]

# Add help system
help_box = mk_toggle_help_box(
    parent,
    "Need help?",
    "Click the ? button for assistance"
)

# Create styled button
send_button = create_styled_button(
    parent,
    "Send Messages",
    command=send_messages,
    style="success"
)
```

#### Logging
```python
from core_helpers.logging_helper import setup_logging, log, success, error

# Setup logging
setup_logging("my_app", "logs/my_app.log")

# Log operations
log("INFO", "Application started")
success("Messages sent successfully")
error("API call failed", data={"status_code": 500})
```

## Technical Achievements

### High-Reliability Messaging
- Circuit Breaker Pattern: Prevents cascade failures during API outages
- Exponential Backoff: Smart retry logic reduces server load
- Rate Limiting: Respects Meta's tier-based quotas (250-1M messages/day)
- Batch Processing: Handles thousands of messages efficiently

### Intelligent Data Processing
- Header Auto-Detection: Uses scoring algorithm to identify column headers
- Fuzzy Matching: Finds columns despite naming variations
- Format Normalization: Handles multiple phone/email/price formats
- Memory Efficient: Processes large Excel files without excessive memory usage

### Professional UI/UX
- DPI Awareness: Scales properly on high-resolution displays
- Dark Theme: Consistent professional appearance
- Responsive Design: Adapts to different window sizes
- Accessibility: Keyboard navigation and screen reader support

## Performance Metrics

Based on production usage:
- Message Throughput: 100-500 messages/minute (depending on Meta tier)
- Success Rate: >95% delivery rate with retry logic
- Data Processing: Handles 10,000+ rows Excel files in <30 seconds
- Memory Usage: <100MB for typical workloads
- Uptime: 99.9% with automatic error recovery

## Security & Best Practices

- No Hardcoded Credentials: Uses environment variables and secure storage
- Input Validation: All user inputs sanitized before processing
- Error Handling: Comprehensive exception handling with user-friendly messages
- Logging Security: Sensitive data never logged
- API Security: Proper authentication and request signing

## Contributing

This repository demonstrates professional development practices:

1. Clean Code: Well-documented, modular functions
2. Error Handling: Robust exception management
3. Testing: Comprehensive input validation
4. Documentation: Inline comments and docstrings
5. Performance: Optimized for production use

## Business Impact

These utilities have enabled:
- 50% reduction in manual communication tasks
- 10x increase in message volume capacity
- 99% reduction in data entry errors
- 24/7 automation of business communications
- Improved customer satisfaction through faster responses

Si te gusta lo que ves, échale un ojo a mi LinkedIn para más proyectos o prueba el código en tu setup. Nada de hype, solo código que funciona.
[LinkedIn](https://www.linkedin.com/in/miguel-angel-fernandez-ramirez-67654a1aa) | [GitHub](https://github.com/LeugimF/Public)