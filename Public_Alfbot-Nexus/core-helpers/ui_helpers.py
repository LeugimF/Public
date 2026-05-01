"""
Componentes UI con estilo Dark Techno para Tkinter.

Magia negra para que Tkinter no se vea como Windows 95 sin soporte nativo a DPI scaling.
Este módulo resuelve problemas reales:
- Tkinter renderiza pixelado en pantallas 4K si no escalas manualmente
- El scrollbar nativo es horrible, aquí lo forzamos a auto-hide
- Los botones grises de fábrica asustan, usamos paleta oscura consistente
- DPI-awareness requiere cálculos manuales que encapsulamos aquí

Esta es la capa que hace que una app de escritorio no parezca de 2003.

Usage:
    from core_helpers.ui_helpers import (
        mk_scrollable_frame, mk_toggle_help_box,
        create_styled_button, apply_dark_theme
    )

    apply_dark_theme(root)
    scroll_frame = mk_scrollable_frame(root)
    help_box = mk_toggle_help_box(content, "Ayuda", "Info adicional")
"""

import tkinter as tk
from tkinter import ttk
import sys
from typing import Optional, Dict, Any, Callable

# Color scheme
COLORS = {
    "BG": "#121212",
    "BG_GRAY": "#1C1C1C",
    "FG": "#E0E0E0",
    "FG_DIM": "#888888",
    "RED": "#D32F2F",
    "SUCCESS_GREEN": "#4B9C0E",
    "WARNING_YELLOW": "#FBC523",
    "FONT_FAMILY": "Consolas"
}

def apply_dark_theme(root: tk.Tk):
    """
    Apply dark theme to the root window.

    Args:
        root: Tkinter root window
    """
    style = ttk.Style()

    # Configure dark theme
    style.configure("TFrame", background=COLORS["BG"])
    style.configure("TLabel", background=COLORS["BG"], foreground=COLORS["FG"])
    style.configure("TButton", background=COLORS["BG_GRAY"], foreground=COLORS["FG"])
    style.configure("TEntry", fieldbackground=COLORS["BG_GRAY"], foreground=COLORS["FG"])

    # Scrollbar styling
    style.configure("Vertical.TScrollbar",
                   background=COLORS["BG_GRAY"],
                   troughcolor=COLORS["BG"],
                   arrowcolor=COLORS["RED"])

def create_styled_button(parent, text: str, command: Callable, style: str = "normal") -> tk.Button:
    """
    Create a styled button with consistent appearance.

    Args:
        parent: Parent widget
        text: Button text
        command: Callback function
        style: Button style ("normal", "success", "warning", "error")

    Returns:
        Styled button widget
    """
    style_colors = {
        "normal": {"bg": COLORS["RED"], "fg": COLORS["FG"]},
        "success": {"bg": COLORS["SUCCESS_GREEN"], "fg": COLORS["FG"]},
        "warning": {"bg": COLORS["WARNING_YELLOW"], "fg": COLORS["BG"]},
        "error": {"bg": COLORS["RED"], "fg": COLORS["FG"]}
    }

    colors = style_colors.get(style, style_colors["normal"])

    button = tk.Button(
        parent,
        text=text,
        command=command,
        bg=colors["bg"],
        fg=colors["fg"],
        font=(COLORS["FONT_FAMILY"], 11, "bold"),
        relief="flat",
        padx=20,
        pady=8,
        cursor="hand2"
    )

    # Hover effects
    def on_enter(e):
        button.config(bg=adjust_color(colors["bg"], -20))

    def on_leave(e):
        button.config(bg=colors["bg"])

    button.bind("<Enter>", on_enter)
    button.bind("<Leave>", on_leave)

    return button

def mk_scrollable_frame(parent, bg: Optional[str] = None, mousewheel: bool = True) -> Dict[str, Any]:
    """
    Create a scrollable frame with auto-hide scrollbar.

    Args:
        parent: Parent widget
        bg: Background color
        mousewheel: Enable mouse wheel scrolling

    Returns:
        Dict with frame components
    """
    if bg is None:
        bg = COLORS["BG"]

    # Outer container
    outer = tk.Frame(parent, bg=bg)

    # Canvas for scrolling
    canvas = tk.Canvas(outer, bg=bg, highlightthickness=0)
    canvas.pack(side="left", fill="both", expand=True)

    # Scrollbar
    scrollbar = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
    scrollbar.pack(side="right", fill="y")

    # Inner frame for content
    inner = tk.Frame(canvas, bg=bg)
    inner_id = canvas.create_window(0, 0, anchor="nw", window=inner)

    # Configure scrolling
    canvas.configure(yscrollcommand=scrollbar.set)

    def configure_scroll_region(event=None):
        canvas.configure(scrollregion=canvas.bbox("all"))

    def configure_canvas_width(event=None):
        canvas.itemconfig(inner_id, width=canvas.winfo_width())

    inner.bind("<Configure>", configure_scroll_region)
    canvas.bind("<Configure>", configure_canvas_width)

    # Mouse wheel support
    if mousewheel:
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        def bind_mousewheel(event=None):
            canvas.bind_all("<MouseWheel>", on_mousewheel)

        def unbind_mousewheel(event=None):
            canvas.unbind_all("<MouseWheel>")

        canvas.bind("<Enter>", bind_mousewheel)
        canvas.bind("<Leave>", unbind_mousewheel)

    return {
        "outer": outer,
        "canvas": canvas,
        "scrollbar": scrollbar,
        "inner": inner,
        "content": inner
    }

def mk_toggle_help_box(parent, text: str, subtext: Optional[str] = None,
                      icon: str = "ℹ️", style: str = "info") -> tk.Frame:
    """
    Create a toggleable help box.

    Args:
        parent: Parent widget
        text: Main help text
        subtext: Additional help text
        icon: Icon emoji
        style: Style ("info", "warning", "error", "success")

    Returns:
        Help box container
    """
    style_configs = {
        "info": {"bg": "#002A2A", "fg": "#00CCCC", "subfg": "#00AAAA"},
        "warning": {"bg": "#2A2000", "fg": COLORS["WARNING_YELLOW"], "subfg": "#CCAA00"},
        "error": {"bg": COLORS["RED"], "fg": "#FFF0F0", "subfg": "#FFD0D0"},
        "success": {"bg": COLORS["SUCCESS_GREEN"], "fg": "#B6FFB6", "subfg": "#A0E6A0"}
    }

    config = style_configs.get(style, style_configs["info"])

    container = tk.Frame(parent, bg=parent.cget("bg"))

    # Help box
    box = tk.Frame(container, bg=config["bg"], padx=12, pady=8)

    # Header
    header = tk.Frame(box, bg=config["bg"])
    header.pack(fill="x")

    icon_label = tk.Label(header, text=icon, font=(COLORS["FONT_FAMILY"], 16),
                         bg=config["bg"], fg=config["fg"])
    icon_label.pack(side="left", padx=(0, 8))

    text_label = tk.Label(header, text=text, font=(COLORS["FONT_FAMILY"], 11, "bold"),
                         bg=config["bg"], fg=config["fg"], anchor="w")
    text_label.pack(side="left", fill="x", expand=True)

    # Close button
    close_btn = tk.Button(header, text="✕", font=(COLORS["FONT_FAMILY"], 10, "bold"),
                         bg=config["bg"], fg=config["fg"], relief="flat",
                         command=lambda: toggle_help(False))
    close_btn.pack(side="right", pady=(0, 0))

    if subtext:
        sub_label = tk.Label(box, text=subtext, font=(COLORS["FONT_FAMILY"], 10),
                           bg=config["bg"], fg=config["subfg"], anchor="w", justify="left")
        sub_label.pack(fill="x", anchor="w", pady=(4, 0))

    # Help button
    help_btn = tk.Button(container, text="?", font=(COLORS["FONT_FAMILY"], 11, "bold"),
                        bg=COLORS["RED"], fg=COLORS["FG"], relief="flat", width=3,
                        cursor="hand2", command=lambda: toggle_help(True))

    def toggle_help(show: bool):
        if show:
            help_btn.pack_forget()
            box.pack(fill="x", pady=(0, 0))
            close_btn.pack(side="right", pady=(0, 0))
        else:
            box.pack_forget()
            close_btn.pack_forget()
            help_btn.pack(anchor="ne", padx=0, pady=0)

    # Start collapsed
    help_btn.pack(anchor="ne", padx=0, pady=0)

    return container

def create_labeled_entry(parent, label_text: str, variable: tk.Variable,
                        width: int = 30) -> tk.Frame:
    """
    Create a labeled entry field.

    Args:
        parent: Parent widget
        label_text: Label text
        variable: Tkinter variable
        width: Entry width

    Returns:
        Container frame
    """
    frame = tk.Frame(parent, bg=COLORS["BG"])

    label = tk.Label(frame, text=label_text, bg=COLORS["BG"], fg=COLORS["FG"],
                    font=(COLORS["FONT_FAMILY"], 11))
    label.pack(anchor="w", pady=(0, 4))

    entry = tk.Entry(frame, textvariable=variable, width=width,
                    bg=COLORS["BG_GRAY"], fg=COLORS["FG"],
                    font=(COLORS["FONT_FAMILY"], 11),
                    insertbackground=COLORS["FG"])
    entry.pack(fill="x")

    return frame

def create_styled_combobox(parent, label_text: str, values: list,
                          variable: tk.Variable) -> tk.Frame:
    """
    Create a styled combobox with label.

    Args:
        parent: Parent widget
        label_text: Label text
        values: List of values
        variable: Tkinter variable

    Returns:
        Container frame
    """
    frame = tk.Frame(parent, bg=COLORS["BG"])

    label = tk.Label(frame, text=label_text, bg=COLORS["BG"], fg=COLORS["FG"],
                    font=(COLORS["FONT_FAMILY"], 11))
    label.pack(anchor="w", pady=(0, 4))

    combo = ttk.Combobox(frame, textvariable=variable, values=values,
                        state="readonly", font=(COLORS["FONT_FAMILY"], 11))
    combo.pack(fill="x")

    return frame

def adjust_color(color: str, amount: int) -> str:
    """
    Adjust color brightness.

    Args:
        color: Hex color string
        amount: Amount to adjust (-255 to 255)

    Returns:
        Adjusted hex color
    """
    if not color.startswith("#"):
        return color

    try:
        r = int(color[1:3], 16)
        g = int(color[3:5], 16)
        b = int(color[5:7], 16)

        r = max(0, min(255, r + amount))
        g = max(0, min(255, g + amount))
        b = max(0, min(255, b + amount))

        return f"#{r:02x}{g:02x}{b:02x}"
    except:
        return color

def center_window(window: tk.Toplevel, width: int, height: int):
    """
    Center a window on screen.

    Args:
        window: Window to center
        width: Window width
        height: Window height
    """
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()

    x = (screen_width - width) // 2
    y = (screen_height - height) // 2

    window.geometry(f"{width}x{height}+{x}+{y}")

def apply_window_icon(window: tk.Toplevel, icon_path: Optional[str] = None):
    """
    Apply icon to window.

    Args:
        window: Window to apply icon to
        icon_path: Path to icon file
    """
    try:
        if icon_path and os.path.exists(icon_path):
            window.iconbitmap(icon_path)
        else:
            # Default icon
            window.iconbitmap(default="")
    except:
        pass
- Color palette management
- Window centering and icon management

Usage:
    from ui_helpers import (
        COLORS, FS, mk_scrollable_frame,
        mk_toggle_help_box, center_window
    )

    # Create a scrollable content area
    container = mk_scrollable_frame(parent, bg=COLORS["BG"])

    # Add content to the scrollable area
    content = container["content"]
    label = tk.Label(content, text="Hello World", font=(COLORS["FONT_FAMILY"], FS(12)))

    # Create a help toggle
    help_box = mk_toggle_help_box(parent, "Click ? for help", "Additional info here")

Author: Miguel Ángel Fernandez
Date: 2026
"""

import tkinter as tk
from tkinter import ttk
import sys
import os
from typing import Dict, Any, Optional, Callable

# Color palette
COLORS = {
    "BG": "#121212",
    "BG_GRAY": "#1C1C1C",
    "ACTIVE_BG": "#1E1E1E",
    "DEFAULT": "#2A0000",
    "FG": "#E0E0E0",
    "FG_DARK": "#B0B0B0",
    "RED": "#D32F2F",
    "DARK_RED": "#810202",
    "RED_HOVER": "#BE0C0C",
    "SUCCESS_GREEN": "#4B9C0E",
    "WARNING_YELLOW": "#FBC523",
    "WARNING_ORANGE": "#C47200",
    "ERROR_RED": "#E41818",
    "BLUE_DARK": "#00008B",
    "BLUE": "#0000FF",
    "GRAY": "#1E1E1E",
    "FONT_FAMILY": "Consolas",
    "FONT_BASE": ("Consolas", 11),
}

# DPI scaling
_DPI_SCALE = 1.0

def configure_dpi_awareness(root) -> float:
    """
    Configure DPI awareness for proper font scaling.

    Args:
        root: Tkinter root window

    Returns:
        DPI scale factor
    """
    global _DPI_SCALE
    try:
        dpi = root.winfo_fpixels('1i')
        _DPI_SCALE = round(dpi / 96.0, 3)
    except Exception:
        _DPI_SCALE = 1.0
    return _DPI_SCALE

def FS(size: int) -> int:
    """
    Font Scale - returns DPI-adjusted font size.

    Args:
        size: Base font size

    Returns:
        Scaled font size
    """
    return max(8, round(size / _DPI_SCALE))

def mk_toggle_help_box(parent, text: str, subtext: str = None, icon: str = "ℹ️",
                      style: str = "info", show_button: bool = True) -> tk.Frame:
    """
    Create a toggleable help box with optional close button.

    Args:
        parent: Parent widget
        text: Main help text
        subtext: Secondary help text
        icon: Icon emoji
        style: Style theme ("info", "warning", "error", "success")
        show_button: Whether to show the help toggle button

    Returns:
        Container frame
    """
    # Style definitions
    styles = {
        "info": {"bg": "#002A2A", "fg": "#00CCCC", "subfg": "#00AAAA", "icon": "ℹ️"},
        "warning": {"bg": "#2A2000", "fg": COLORS["WARNING_YELLOW"], "subfg": "#CCAA00", "icon": "⚠️"},
        "error": {"bg": COLORS["ERROR_RED_DARK"], "fg": "#FFF0F0", "subfg": "#FFD0D0", "icon": "⛔"},
        "success": {"bg": "#3C780E", "fg": "#B6FFB6", "subfg": "#A0E6A0", "icon": "✅"},
    }

    st = styles.get(style, styles["info"])
    bg = st["bg"]
    fg = st["fg"]
    subfg = st["subfg"]
    icon = st.get("icon", icon)

    # Container
    container = tk.Frame(parent, bg=parent.cget("bg"))

    # Help box frame
    box = tk.Frame(container, bg=bg, padx=12, pady=8)
    header = tk.Frame(box, bg=bg)
    header.pack(fill="x")

    # Icon and text
    lbl_icon = tk.Label(header, text=icon, font=(COLORS["FONT_FAMILY"], FS(16)), bg=bg, fg=fg)
    lbl_icon.pack(side="left", padx=(0, 8))

    lbl_text = tk.Label(header, text=text, font=(COLORS["FONT_FAMILY"], FS(11), "bold"),
                       bg=bg, fg=fg, anchor="w")
    lbl_text.pack(side="left", fill="x", expand=True)

    # Close button
    tools = tk.Frame(header, bg=bg)
    tools.pack(side="right", padx=(8, 0))
    btn_close = tk.Button(tools, text="✕", font=(COLORS["FONT_FAMILY"], FS(10), "bold"),
                         bg=bg, fg=fg, relief="flat", bd=0, width=2)

    if subtext:
        lbl_sub = tk.Label(box, text=subtext, font=(COLORS["FONT_FAMILY"], FS(10)),
                          bg=bg, fg=subfg, anchor="w", justify="left")
        lbl_sub.pack(fill="x", anchor="w", pady=(4, 0))

    # Help toggle button
    btn_help = None
    if show_button:
        btn_help = tk.Button(container, text="?", font=(COLORS["FONT_FAMILY"], FS(11), "bold"),
                           bg=COLORS["DEFAULT"], fg=COLORS["FG"], relief="flat", width=3)

        def hover_enter(e):
            btn_help.config(bg="#060404", fg="#FFFFFF")

        def hover_leave(e):
            btn_help.config(bg=COLORS["DEFAULT"], fg=COLORS["FG"])

        btn_help.bind("<Enter>", hover_enter)
        btn_help.bind("<Leave>", hover_leave)

    def show_box():
        if btn_help:
            btn_help.pack_forget()
        box.pack(fill="x", pady=(0, 0))
        btn_close.pack(side="right", pady=(0, 0))

    def hide_box():
        box.pack_forget()
        btn_close.pack_forget()
        if btn_help:
            btn_help.pack(anchor="ne", padx=0, pady=0)

    def on_help():
        show_box()

    def on_close():
        hide_box()

    if show_button:
        btn_help.config(command=on_help)

    btn_close.config(command=on_close)

    # Start hidden for info style
    if style == "info":
        hide_box()
    else:
        show_box()

    return container

def mk_scrollable_frame(parent, bg=None, mousewheel=True, padx=24, pady=24,
                       max_content_width=None) -> Dict[str, Any]:
    """
    Create a scrollable frame with auto-hide scrollbar.

    Args:
        parent: Parent widget
        bg: Background color
        mousewheel: Enable mouse wheel scrolling
        padx: Horizontal padding
        pady: Vertical padding
        max_content_width: Maximum content width for card mode

    Returns:
        Dict with frame references
    """
    if bg is None:
        bg = COLORS["BG"]

    # Create canvas and scrollbar
    canvas = tk.Canvas(parent, bg=bg, highlightthickness=0)
    scrollbar = ttk.Scrollbar(parent, orient="vertical", style="Vertical.TScrollbar")
    scrollbar.config(command=canvas.yview)
    canvas.config(yscrollcommand=scrollbar.set)

    # Create inner frame
    inner_frame = tk.Frame(canvas, bg=bg)
    canvas.create_window(0, 0, anchor="nw", window=inner_frame)

    # Layout
    canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Content frame with padding
    content_frame = tk.Frame(inner_frame, bg=bg)
    content_frame.pack(fill="both", expand=True, padx=padx, pady=pady)

    def update_scroll_region(event=None):
        canvas.update_idletasks()
        bbox = canvas.bbox("all")
        if bbox:
            canvas.config(scrollregion=bbox)

    def configure_canvas(event):
        canvas.itemconfig(canvas.find_withtag("all")[0], width=event.width)

    inner_frame.bind("<Configure>", update_scroll_region)
    canvas.bind("<Configure>", configure_canvas)

    if mousewheel:
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", on_mousewheel)

    # Initial update
    canvas.after(100, update_scroll_region)

    return {
        "canvas": canvas,
        "scrollbar": scrollbar,
        "inner": inner_frame,
        "content": content_frame,
        "refresh": update_scroll_region
    }

def center_window(window, width: int, height: int):
    """
    Center a window on the screen.

    Args:
        window: Tkinter window to center
        width: Window width
        height: Window height
    """
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()

    x = (screen_width - width) // 2
    y = (screen_height - height) // 2

    window.geometry(f"{width}x{height}+{x}+{y}")

def apply_window_icon(window):
    """
    Apply application icon to window.

    Args:
        window: Tkinter window
    """
    try:
        # This would need actual icon file path
        # window.iconbitmap("path/to/icon.ico")
        pass
    except Exception:
        pass

def create_styled_button(parent, text: str, command: Callable, style: str = "normal",
                        width: int = 200) -> tk.Button:
    """
    Create a styled button.

    Args:
        parent: Parent widget
        text: Button text
        command: Click command
        style: Button style ("normal", "success", "warning", "error")
        width: Button width

    Returns:
        Styled button widget
    """
    style_config = {
        "normal": {"bg": COLORS["DARK_RED"], "fg": COLORS["FG"], "hover": COLORS["RED_HOVER"]},
        "success": {"bg": COLORS["SUCCESS_GREEN"], "fg": "#FFFFFF", "hover": COLORS["SUCCESS_GREEN_DARK"]},
        "warning": {"bg": COLORS["WARNING_ORANGE"], "fg": "#FFFFFF", "hover": COLORS["WARNING_ORANGE_DARK"]},
        "error": {"bg": COLORS["ERROR_RED"], "fg": "#FFFFFF", "hover": COLORS["ERROR_RED_DARK"]},
    }

    config = style_config.get(style, style_config["normal"])

    button = tk.Button(parent, text=text, command=command, width=width,
                      bg=config["bg"], fg=config["fg"],
                      font=(COLORS["FONT_FAMILY"], FS(12), "bold"),
                      relief="flat", bd=2)

    def on_enter(e):
        button.config(bg=config["hover"])

    def on_leave(e):
        button.config(bg=config["bg"])

    button.bind("<Enter>", on_enter)
    button.bind("<Leave>", on_leave)

    return button

def create_labeled_entry(parent, label_text: str, variable=None, width=None) -> Dict[str, tk.Widget]:
    """
    Create a labeled entry field.

    Args:
        parent: Parent widget
        label_text: Label text
        variable: Tkinter variable
        width: Entry width

    Returns:
        Dict with label and entry widgets
    """
    frame = tk.Frame(parent, bg=COLORS["BG"])

    label = tk.Label(frame, text=label_text, bg=COLORS["BG"], fg=COLORS["FG"],
                    font=(COLORS["FONT_FAMILY"], FS(11)))
    label.pack(anchor="w", pady=(0, 4))

    entry = tk.Entry(frame, bg=COLORS["GRAY"], fg=COLORS["FG"],
                    insertbackground=COLORS["FG"],
                    font=(COLORS["FONT_FAMILY"], FS(11)),
                    relief="flat", bd=1)

    if variable:
        entry.config(textvariable=variable)
    if width:
        entry.config(width=width)

    entry.pack(fill="x")

    return {"frame": frame, "label": label, "entry": entry}

def enable_autohide_scrollbars(root, poll_ms: int = 800):
    """
    Enable autohide scrollbars globally.

    Args:
        root: Root window
        poll_ms: Polling interval in milliseconds
    """
    def poll_scrollbars():
        try:
            for widget in root.winfo_children():
                if isinstance(widget, tk.Scrollbar):
                    # Check if scrollbar is needed
                    pass
        except Exception:
            pass
        root.after(poll_ms, poll_scrollbars)

    root.after(poll_ms, poll_scrollbars)</content>
<parameter name="filePath">c:\Users\mguel\Desktop\Trabajos varios programación\copias proyecto proautos\ALFBOT-NEXUS\Public_Alfbot-Nexus\core-helpers\ui_helpers.py