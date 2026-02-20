#!/usr/bin/env python3
"""
Controller Mapping Tool for MEGAGAME 2026
==========================================
Walk through each game action and press the corresponding controller button.
Outputs a JSON mapping file that the game can load.

Supports: buttons, d-pad (hat), and analog stick axes.
"""

import pygame
import json
import sys
import time
import os

# Deadzone for analog sticks — ignore small drift
AXIS_DEADZONE = 0.5

# Colors
BLACK  = (0, 0, 0)
WHITE  = (255, 255, 255)
GRAY   = (100, 100, 100)
GREEN  = (0, 200, 80)
CYAN   = (0, 200, 220)
YELLOW = (220, 200, 0)
RED    = (200, 50, 50)
ORANGE = (220, 140, 0)


def drain_events():
    """Drain all pending events from the queue."""
    pygame.event.pump()
    pygame.event.get()


def read_axis_baseline(joystick):
    """
    Read current axis values as the 'resting' baseline.
    Many controllers (like 8BitDo) have triggers that rest at -1.0 instead of 0.0.
    """
    pygame.event.pump()
    pygame.event.get()
    baseline = {}
    for a in range(joystick.get_numaxes()):
        baseline[a] = joystick.get_axis(a)
    return baseline


def wait_for_release(joystick, axis_baseline=None):
    """Wait until all buttons/hats are released and axes return near baseline."""
    while True:
        pygame.event.pump()
        pygame.event.get()
        any_active = False
        for b in range(joystick.get_numbuttons()):
            if joystick.get_button(b):
                any_active = True
        for a in range(joystick.get_numaxes()):
            val = joystick.get_axis(a)
            rest = axis_baseline.get(a, 0.0) if axis_baseline else 0.0
            if abs(val - rest) > AXIS_DEADZONE:
                any_active = True
        for h in range(joystick.get_numhats()):
            hx, hy = joystick.get_hat(h)
            if hx != 0 or hy != 0:
                any_active = True
        if not any_active:
            return
        time.sleep(0.016)


def detect_any_input(joystick, axis_baseline=None, accept_buttons=True, accept_axes=False, accept_hats=False, timeout=30):
    """
    Wait for a single input event using BOTH event-based and polling detection.
    axis_baseline: dict of resting axis values (to ignore triggers resting at -1).
    Returns a dict describing what was pressed, or None on timeout/quit.
    """
    if axis_baseline is None:
        axis_baseline = {}
    drain_events()
    start = time.time()

    while time.time() - start < timeout:
        events = pygame.event.get()

        for event in events:
            if event.type == pygame.QUIT:
                return None
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                return None

            # Event-based button detection
            if accept_buttons and event.type == pygame.JOYBUTTONDOWN:
                print(f"  [event] JOYBUTTONDOWN button={event.button}")
                return {"type": "button", "index": event.button}

            # Event-based hat detection
            if accept_hats and event.type == pygame.JOYHATMOTION:
                hx, hy = event.value
                if hx != 0 or hy != 0:
                    print(f"  [event] JOYHATMOTION hat={event.hat} value={event.value}")
                    return {"type": "hat", "index": event.hat, "value": (hx, hy)}

            # Event-based axis detection (compare against baseline)
            if accept_axes and event.type == pygame.JOYAXISMOTION:
                rest = axis_baseline.get(event.axis, 0.0)
                if abs(event.value - rest) > AXIS_DEADZONE:
                    print(f"  [event] JOYAXISMOTION axis={event.axis} value={event.value:.3f} (rest={rest:.3f})")
                    return {"type": "axis", "index": event.axis, "direction": 1 if event.value > rest else -1}

        # Fallback: also poll state directly (some drivers need this)
        if accept_buttons:
            for b in range(joystick.get_numbuttons()):
                if joystick.get_button(b):
                    print(f"  [poll] button {b} pressed")
                    return {"type": "button", "index": b}

        if accept_hats:
            for h in range(joystick.get_numhats()):
                hx, hy = joystick.get_hat(h)
                if hx != 0 or hy != 0:
                    print(f"  [poll] hat {h} = ({hx},{hy})")
                    return {"type": "hat", "index": h, "value": (hx, hy)}

        if accept_axes:
            for a in range(joystick.get_numaxes()):
                val = joystick.get_axis(a)
                rest = axis_baseline.get(a, 0.0)
                if abs(val - rest) > AXIS_DEADZONE:
                    print(f"  [poll] axis {a} = {val:.3f} (rest={rest:.3f})")
                    return {"type": "axis", "index": a, "direction": 1 if val > rest else -1}

        time.sleep(0.016)

    return None


def draw_screen(screen, font, lines):
    """Draw multiple lines of colored text on screen."""
    screen.fill(BLACK)
    for i, (text, color) in enumerate(lines):
        surf = font.render(text, True, color)
        x = screen.get_width() // 2 - surf.get_width() // 2
        y = 20 + i * 32
        screen.blit(surf, (x, y))
    pygame.display.flip()


def map_button(joystick, axis_baseline, screen, font, action_name, step_num, total_steps):
    """Ask user to press a button for a given action. Returns button index or None."""
    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        (f"Step {step_num}/{total_steps}", YELLOW),
        ("", BLACK),
        (f"Press the {action_name} button", CYAN),
        ("", BLACK),
        ("[ESC to cancel]", RED),
    ])

    print(f"\n--- Waiting for {action_name} button ---")
    wait_for_release(joystick, axis_baseline)
    time.sleep(0.2)
    drain_events()

    result = detect_any_input(joystick, axis_baseline, accept_buttons=True, accept_axes=False, accept_hats=False)
    if result is None:
        return None

    btn = result["index"]
    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        (f"Step {step_num}/{total_steps}", YELLOW),
        ("", BLACK),
        (f"{action_name} = button {btn}", GREEN),
    ])
    wait_for_release(joystick, axis_baseline)
    time.sleep(0.5)

    return btn


def map_dpad(joystick, axis_baseline, screen, font, step_num, total_steps):
    """Detect the d-pad hat index."""
    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        (f"Step {step_num}/{total_steps}", YELLOW),
        ("", BLACK),
        ("Press any direction on the D-PAD", CYAN),
        ("", BLACK),
        ("[ESC to cancel]", RED),
    ])

    print(f"\n--- Waiting for D-PAD ---")
    wait_for_release(joystick, axis_baseline)
    time.sleep(0.2)
    drain_events()

    result = detect_any_input(joystick, axis_baseline, accept_buttons=False, accept_axes=False, accept_hats=True)
    if result is None:
        return None

    hat_idx = result["index"]
    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        (f"Step {step_num}/{total_steps}", YELLOW),
        ("", BLACK),
        (f"D-PAD = hat {hat_idx}", GREEN),
    ])
    wait_for_release(joystick, axis_baseline)
    time.sleep(0.5)

    return {"hat_index": hat_idx}


def map_analog(joystick, axis_baseline, screen, font, step_num, total_steps):
    """Detect analog stick X and Y axes."""
    axes = {}

    for dir_name, instruction in [("RIGHT", "Push stick RIGHT"), ("UP", "Push stick UP")]:
        draw_screen(screen, font, [
            ("MEGAGAME 2026 — Controller Setup", GRAY),
            (f"Step {step_num}/{total_steps} — Analog Stick", YELLOW),
            ("", BLACK),
            (instruction, CYAN),
            ("then release", GRAY),
            ("", BLACK),
            ("[ESC to cancel]", RED),
        ])

        print(f"\n--- Waiting for analog {dir_name} ---")
        wait_for_release(joystick, axis_baseline)
        time.sleep(0.2)
        drain_events()

        result = detect_any_input(joystick, axis_baseline, accept_buttons=False, accept_axes=True, accept_hats=False)
        if result is None:
            return None

        if dir_name == "RIGHT":
            axes["x_axis"] = result["index"]
            axes["x_invert"] = result["direction"] < 0
        else:
            axes["y_axis"] = result["index"]
            axes["y_invert"] = result["direction"] > 0  # Up is usually negative in SDL

        sign = "+" if result["direction"] > 0 else "-"
        draw_screen(screen, font, [
            ("MEGAGAME 2026 — Controller Setup", GRAY),
            (f"Step {step_num}/{total_steps} — Analog Stick", YELLOW),
            ("", BLACK),
            (f"{dir_name} = axis {result['index']} ({sign})", GREEN),
        ])
        wait_for_release(joystick, axis_baseline)
        time.sleep(0.5)

    return axes


def draw_summary(screen, font, mapping):
    """Draw the final mapping summary."""
    lines = [("Controller Mapping Complete!", GREEN), ("", BLACK)]

    for key, val in mapping.items():
        if key == "controller_name":
            lines.append((f"Controller: {val[:36]}", GRAY))
        elif isinstance(val, dict):
            if "hat_index" in val:
                lines.append((f"  {key}: D-pad (hat {val['hat_index']})", CYAN))
            elif "x_axis" in val:
                lines.append((f"  {key}: Stick (axes {val['x_axis']}, {val['y_axis']})", CYAN))
        else:
            lines.append((f"  {key}: button {val}", WHITE))

    lines.append(("", BLACK))
    lines.append(("Saved to tools/controller-map.json", YELLOW))
    lines.append(("[Press any button to close]", GRAY))

    draw_screen(screen, font, lines)


def main():
    pygame.init()
    pygame.joystick.init()

    screen = pygame.display.set_mode((520, 380))
    pygame.display.set_caption("MEGAGAME 2026 — Controller Setup")
    font = pygame.font.SysFont("monospace", 18)

    # Wait for controller
    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        ("", BLACK),
        ("Connect a controller...", CYAN),
        ("Waiting for gamepad input", GRAY),
    ])

    joystick = None
    while joystick is None:
        pygame.event.pump()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                pygame.quit()
                return

        pygame.joystick.quit()
        pygame.joystick.init()
        if pygame.joystick.get_count() > 0:
            joystick = pygame.joystick.Joystick(0)
            joystick.init()
        time.sleep(0.2)

    ctrl_name = joystick.get_name()
    n_buttons = joystick.get_numbuttons()
    n_axes = joystick.get_numaxes()
    n_hats = joystick.get_numhats()
    print(f"Found controller: {ctrl_name}")
    print(f"  Buttons: {n_buttons}, Axes: {n_axes}, Hats: {n_hats}")

    # Capture axis resting values BEFORE any input
    # (8BitDo triggers rest at -1.0 instead of 0.0)
    axis_baseline = read_axis_baseline(joystick)
    print(f"  Axis baseline: {', '.join(f'{k}={v:.3f}' for k, v in axis_baseline.items())}")

    draw_screen(screen, font, [
        ("MEGAGAME 2026 — Controller Setup", GRAY),
        ("", BLACK),
        (f"Found: {ctrl_name[:40]}", GREEN),
        (f"Buttons: {n_buttons}  Axes: {n_axes}  Hats: {n_hats}", GRAY),
        ("", BLACK),
        ("Starting in 2 seconds...", YELLOW),
    ])
    time.sleep(2)

    mapping = {"controller_name": ctrl_name}
    total_steps = 5

    # --- Step 1: Shoot ---
    btn = map_button(joystick, axis_baseline, screen, font, "SHOOT", 1, total_steps)
    if btn is None:
        pygame.quit()
        return
    mapping["shoot"] = btn

    # --- Step 2: Jump ---
    btn = map_button(joystick, axis_baseline, screen, font, "JUMP", 2, total_steps)
    if btn is None:
        pygame.quit()
        return
    mapping["jump"] = btn

    # --- Step 3: Dash ---
    btn = map_button(joystick, axis_baseline, screen, font, "DASH", 3, total_steps)
    if btn is None:
        pygame.quit()
        return
    mapping["dash"] = btn

    # --- Step 4: D-pad ---
    if n_hats > 0:
        dpad = map_dpad(joystick, axis_baseline, screen, font, 4, total_steps)
        if dpad is None:
            pygame.quit()
            return
        mapping["dpad"] = dpad
    else:
        print("No hats detected — skipping D-pad, will use axes only")
        draw_screen(screen, font, [
            ("No D-pad detected — skipping", YELLOW),
            ("Will use analog stick for movement", GRAY),
        ])
        time.sleep(1.5)

    # --- Step 5: Analog stick ---
    if n_axes >= 2:
        analog = map_analog(joystick, axis_baseline, screen, font, 5, total_steps)
        if analog is None:
            pygame.quit()
            return
        mapping["analog"] = analog
    else:
        print("Not enough axes for analog stick — skipping")
        draw_screen(screen, font, [
            ("No analog stick detected — skipping", YELLOW),
        ])
        time.sleep(1.5)

    # --- Save ---
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "controller-map.json")
    with open(out_path, "w") as f:
        json.dump(mapping, f, indent=2)
    print(f"\nMapping saved to {out_path}")
    print(json.dumps(mapping, indent=2))

    # --- Summary screen ---
    draw_summary(screen, font, mapping)

    waiting = True
    while waiting:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                waiting = False
            if event.type == pygame.KEYDOWN:
                waiting = False
            if event.type == pygame.JOYBUTTONDOWN:
                waiting = False
        time.sleep(0.016)

    pygame.quit()


if __name__ == "__main__":
    main()
