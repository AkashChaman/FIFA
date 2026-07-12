# Etihad Stadium Mock Data and Seating Mappings
# SVG coordinate space: viewBox "0 0 220 155"  (landscape, matches Etihad aspect ratio)
# Stadium center: cx=110, cy=77
# Elliptical geometry: rx (horizontal) > ry (vertical) because Etihad is wider than tall

# Gates and their default positions (SVG coordinates: viewBox 0 0 220 155)
GATES = {
    "Gate A": {
        "id": "Gate A",
        "name": "Gate A (North Stand)",
        "stand": "North",
        "x": 88,
        "y": 14,
        "alternative": "Gate B",
        "capacity": 100,
        "description": "Main entrance for North Stand. Fast access to Blocks 136-142."
    },
    "Gate B": {
        "id": "Gate B",
        "name": "Gate B (North Stand)",
        "stand": "North",
        "x": 132,
        "y": 14,
        "alternative": "Gate A",
        "capacity": 100,
        "description": "Alternative entrance for North-East. Fast access to Blocks 136-142."
    },
    "Gate C": {
        "id": "Gate C",
        "name": "Gate C (East Stand — Upper)",
        "stand": "East",
        "x": 197,
        "y": 58,
        "alternative": "Gate D",
        "capacity": 80,
        "description": "Entrance for East Stand (North side). Fast access to Blocks 101-105."
    },
    "Gate D": {
        "id": "Gate D",
        "name": "Gate D (East Stand — Lower)",
        "stand": "East",
        "x": 197,
        "y": 96,
        "alternative": "Gate C",
        "capacity": 80,
        "description": "Entrance for East Stand (South side). Fast access to Blocks 106-109."
    },
    "Gate E": {
        "id": "Gate E",
        "name": "Gate E (South Stand)",
        "stand": "South",
        "x": 110,
        "y": 143,
        "alternative": "Gate F",
        "capacity": 120,
        "description": "Main entrance for South Stand. Fast access to Blocks 114-120."
    },
    "Gate F": {
        "id": "Gate F",
        "name": "Gate F (West / Colin Bell Stand)",
        "stand": "West",
        "x": 23,
        "y": 77,
        "alternative": "Gate E",
        "capacity": 120,
        "description": "Main entrance for Colin Bell Stand (West). Fast access to Blocks 122-132."
    }
}

# Seating block mappings to stands and primary gates
BLOCKS = {}

# Helper to populate block mappings
def _populate_blocks():
    import math
    # SVG space: 220×155, center at (110, 77)
    # Elliptical radii per level (horizontal rx > vertical ry for landscape stadium)
    CX, CY = 110, 77

    def elliptic(angle_deg, lvl):
        rx = 52 + lvl * 16   # level 1→68, 2→84, 3→100
        ry = 36 + lvl * 11   # level 1→47, 2→58, 3→69
        rad = math.radians(angle_deg)
        return round(CX + rx * math.cos(rad), 1), round(CY + ry * math.sin(rad), 1)

    # East Stand: Blocks 101-109, 201-209, 301-309
    for lvl in [1, 2, 3]:
        for idx in range(1, 10):
            block_num = f"{lvl}0{idx}" if idx < 10 else f"{lvl}{idx}"
            gate = "Gate C" if idx <= 5 else "Gate D"
            angle_offset = -40 + (idx * 10)
            x, y = elliptic(angle_offset, lvl)
            BLOCKS[block_num] = {
                "block": block_num, "level": lvl, "stand": "East Stand",
                "primary_gate": gate, "x": x, "y": y
            }

    # South Stand: Blocks 114-120, 214-220, 314-320
    for lvl in [1, 2, 3]:
        for idx in range(14, 21):
            block_num = f"{lvl}{idx}"
            gate = "Gate E"
            angle_offset = 55 + ((idx - 14) * 11.6)
            x, y = elliptic(angle_offset, lvl)
            BLOCKS[block_num] = {
                "block": block_num, "level": lvl, "stand": "South Stand",
                "primary_gate": gate, "x": x, "y": y
            }

    # West Stand (Colin Bell Stand): Blocks 122-132, 222-232, 322-332
    for lvl in [1, 2, 3]:
        for idx in range(22, 33):
            block_num = f"{lvl}{idx}"
            gate = "Gate F"
            angle_offset = 135 + ((idx - 22) * 9)
            x, y = elliptic(angle_offset, lvl)
            BLOCKS[block_num] = {
                "block": block_num, "level": lvl, "stand": "West Stand",
                "primary_gate": gate, "x": x, "y": y
            }

    # North Stand: Blocks 136-142, 236-242, 336-342
    for lvl in [1, 2, 3]:
        for idx in range(36, 43):
            block_num = f"{lvl}{idx}"
            gate = "Gate A" if idx <= 39 else "Gate B"
            angle_offset = 230 + ((idx - 36) * 11)
            x, y = elliptic(angle_offset, lvl)
            BLOCKS[block_num] = {
                "block": block_num, "level": lvl, "stand": "North Stand",
                "primary_gate": gate, "x": x, "y": y
            }

_populate_blocks()

# Points of Interest (POIs) around the stadium
POIS = [
    # Food Stalls
    {"id": "food_north", "type": "Food Stall", "name": "North Grill", "x": 110, "y": 25, "description": "Burgers and hotdogs at North Stand."},
    {"id": "food_south", "type": "Food Stall", "name": "South Pizza", "x": 110, "y": 129, "description": "Pizza and snacks at South Stand."},
    {"id": "food_east", "type": "Food Stall", "name": "East Kiosk", "x": 185, "y": 77, "description": "Drinks and snacks at East Stand."},
    {"id": "food_west", "type": "Food Stall", "name": "West Cafe", "x": 35, "y": 77, "description": "Coffee and pastries at West Stand."},
    
    # Rehydration Points
    {"id": "water_ne", "type": "Rehydration Point", "name": "Water Station NE", "x": 160, "y": 35, "description": "Free drinking water fountain."},
    {"id": "water_sw", "type": "Rehydration Point", "name": "Water Station SW", "x": 60, "y": 119, "description": "Free drinking water fountain."},
    
    # Restrooms
    {"id": "wc_north", "type": "Restroom", "name": "Restroom North", "x": 90, "y": 25, "description": "Men's, Women's, and Accessible Restrooms."},
    {"id": "wc_south", "type": "Restroom", "name": "Restroom South", "x": 130, "y": 129, "description": "Men's, Women's, and Accessible Restrooms."},
    {"id": "wc_east", "type": "Restroom", "name": "Restroom East", "x": 185, "y": 95, "description": "Men's, Women's, and Accessible Restrooms."},
    {"id": "wc_west", "type": "Restroom", "name": "Restroom West", "x": 35, "y": 59, "description": "Men's, Women's, and Accessible Restrooms."}
]
