"""Translate API enum codes into compact English image-prompt descriptors."""

from .schemas import Category, Color, Pattern

SUBCATEGORY_LABELS: dict[str, str] = {
    "TSHIRT": "t-shirt",
    "SHIRT": "shirt",
    "BLOUSE": "blouse",
    "KNIT": "knit sweater",
    "HOODIE": "hoodie",
    "SWEATSHIRT": "sweatshirt",
    "JEANS": "jeans",
    "SLACKS": "slacks",
    "PANTS": "pants",
    "SHORTS": "shorts",
    "SKIRT": "skirt",
    "LEGGINGS": "leggings",
    "JACKET": "jacket",
    "CARDIGAN": "cardigan",
    "BLAZER": "blazer",
    "COAT": "coat",
    "PADDING": "padded jacket",
    "VEST": "vest",
    "DRESS": "dress",
    "JUMPSUIT": "jumpsuit",
    "SNEAKERS": "sneakers",
    "LOAFERS": "loafers",
    "BOOTS": "boots",
    "SANDALS": "sandals",
    "HEELS": "heels",
    "FLATS": "flats",
    "BACKPACK": "backpack",
    "TOTE": "tote bag",
    "SHOULDER": "shoulder bag",
    "CROSSBODY": "crossbody bag",
    "HAT": "hat",
    "BELT": "belt",
    "SCARF": "scarf",
    "JEWELRY": "jewelry",
    "ETC": "accessory",
}

CATEGORY_LABELS: dict[Category, str] = {
    Category.TOP: "top",
    Category.BOTTOM: "bottom",
    Category.OUTER: "outer jacket",
    Category.DRESS: "dress",
    Category.SHOES: "shoes",
    Category.BAG: "bag",
    Category.ACCESSORY: "accessory",
}

COLOR_LABELS: dict[Color, str] = {
    Color.BLACK: "black",
    Color.WHITE: "white",
    Color.GRAY: "gray",
    Color.NAVY: "navy",
    Color.BLUE: "blue",
    Color.RED: "red",
    Color.GREEN: "green",
    Color.BROWN: "brown",
    Color.BEIGE: "beige",
    Color.YELLOW: "yellow",
    Color.PINK: "pink",
    Color.PURPLE: "purple",
    Color.ORANGE: "orange",
    Color.ETC: "",
}


PATTERN_LABELS: dict[Pattern, str] = {
    Pattern.SOLID: "solid-color",
    Pattern.STRIPE: "striped",
    Pattern.CHECK: "checked",
    Pattern.GRAPHIC: "graphic-print",
    Pattern.FLORAL: "floral-print",
    Pattern.OTHER: "patterned",
}


def describe_item(
    category: Category,
    subcategory: str | None,
    colors: list[Color],
    pattern: Pattern | None = None,
) -> str:
    noun = SUBCATEGORY_LABELS.get((subcategory or "").upper()) or CATEGORY_LABELS[category]
    color_names = [COLOR_LABELS[color] for color in colors if COLOR_LABELS[color]]
    color = " and ".join(color_names)
    pattern_label = PATTERN_LABELS.get(pattern, "")
    return " ".join(part for part in (color, pattern_label, noun) if part)
