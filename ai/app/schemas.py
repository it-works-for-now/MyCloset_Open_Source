from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class Category(StrEnum):
    TOP = "TOP"
    BOTTOM = "BOTTOM"
    OUTER = "OUTER"
    DRESS = "DRESS"
    SHOES = "SHOES"
    BAG = "BAG"
    ACCESSORY = "ACCESSORY"


class Pattern(StrEnum):
    SOLID = "SOLID"
    STRIPE = "STRIPE"
    CHECK = "CHECK"
    GRAPHIC = "GRAPHIC"
    FLORAL = "FLORAL"
    OTHER = "OTHER"


class Color(StrEnum):
    BLACK = "BLACK"
    WHITE = "WHITE"
    GRAY = "GRAY"
    NAVY = "NAVY"
    BLUE = "BLUE"
    RED = "RED"
    GREEN = "GREEN"
    BROWN = "BROWN"
    BEIGE = "BEIGE"
    YELLOW = "YELLOW"
    PINK = "PINK"
    PURPLE = "PURPLE"
    ORANGE = "ORANGE"
    ETC = "ETC"


class Season(StrEnum):
    SPRING = "SPRING"
    SUMMER = "SUMMER"
    FALL = "FALL"
    WINTER = "WINTER"


class StyleTag(StrEnum):
    CASUAL = "CASUAL"
    MINIMAL = "MINIMAL"
    STREET = "STREET"
    FORMAL = "FORMAL"
    SPORTY = "SPORTY"


class ModelGender(StrEnum):
    MALE = "male"
    FEMALE = "female"


class GarmentAttributes(BaseModel):
    """Clothing attributes the vision model extracts from a single photo."""

    category: Category | None = None
    subcategory: str | None = None
    colors: list[Color] = Field(default_factory=list, max_length=3)
    pattern: Pattern | None = None
    seasons: list[Season] = Field(default_factory=list, max_length=4)
    styleTags: list[StyleTag] = Field(default_factory=list, max_length=5)
    warmthLevel: int | None = Field(default=None, ge=1, le=5)
    memo: str = ""
    uncertainFields: list[str] = Field(default_factory=list)


class GarmentAnalysisResponse(BaseModel):
    model: str
    processingMs: int
    attributes: GarmentAttributes
    requiresReview: bool


class ClosetItem(BaseModel):
    clothesId: int
    category: Category
    subcategory: str | None = Field(default=None, max_length=80)
    colors: list[Color] = Field(default_factory=list, max_length=3)
    pattern: Pattern | None = None
    seasons: list[Season] = Field(default_factory=list, max_length=4)
    styleTags: list[StyleTag] = Field(default_factory=list, max_length=5)
    warmthLevel: int | None = Field(default=None, ge=1, le=5)


class Weather(BaseModel):
    """Optional weather snapshot supplied by the Backend for daily-look recommendations."""

    temp: float | None = Field(default=None, ge=-100, le=100)
    condition: str | None = Field(default=None, max_length=120)
    tempMin: float | None = Field(default=None, ge=-100, le=100)
    tempMax: float | None = Field(default=None, ge=-100, le=100)


class DailyLookRecommendRequest(BaseModel):
    situation: str = Field(min_length=1, max_length=500)
    closet: list[ClosetItem] = Field(min_length=1, max_length=500)
    weather: Weather | None = None
    modelGender: ModelGender


OUTFIT_SLOTS = (
    "hat",
    "accessoryTop",
    "top",
    "outer",
    "bottom",
    "accessoryBottom",
    "shoes",
    "accessoryShoes",
)


class OutfitSlots(BaseModel):
    hat: int | None = None
    accessoryTop: int | None = None
    top: int | None = None
    outer: int | None = None
    bottom: int | None = None
    accessoryBottom: int | None = None
    shoes: int | None = None
    accessoryShoes: int | None = None


class OutfitRecommendation(BaseModel):
    title: str = Field(min_length=2, max_length=30)
    slots: OutfitSlots
    reason: str = Field(min_length=1, max_length=800)
    styleKeywords: list[str] = Field(min_length=1, max_length=4)


class DailyLookRecommendResponse(BaseModel):
    model: str
    processingMs: int = Field(ge=0)
    recommendations: list[OutfitRecommendation] = Field(min_length=1, max_length=3)


class ImageItem(BaseModel):
    slot: str = Field(min_length=1, max_length=32)
    category: Category
    subcategory: str | None = Field(default=None, max_length=80)
    colors: list[Color] = Field(default_factory=list, max_length=3)
    imageUrl: str | None = Field(default=None, max_length=2048)
    pattern: Pattern | None = None


class DailyLookImageRequest(BaseModel):
    items: list[ImageItem] = Field(min_length=1, max_length=8)
    styleKeywords: list[str] = Field(default_factory=list, max_length=4)
    modelGender: ModelGender


class ModelHealth(BaseModel):
    id: str
    loaded: bool
    preset: str | None = None
    variant: str | None = None
    loadIn4bit: bool | None = None
    width: int | None = None
    height: int | None = None
    steps: int | None = None
    controlNetEnabled: bool | None = None
    ipAdapterEnabled: bool | None = None


class HealthResponse(BaseModel):
    status: str
    cudaAvailable: bool
    cudaDevice: str | None = None
    analysisModel: ModelHealth
    recommendModel: ModelHealth
    imageModel: ModelHealth
