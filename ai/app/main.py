from __future__ import annotations

import asyncio
import hmac
import io
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

import torch
import uvicorn
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse

from .analysis_model import GarmentClassifier
from .config import Settings, get_settings
from .gpu_manager import GPUInferenceManager
from .image_model import OutfitImageGenerator
from .image_utils import InvalidImageError, prepare_image
from .recommend_model import OutfitRecommender, RecommendationValidationError
from .reference_image import ReferenceImageFetcher, ReferenceImageFetchError
from .schemas import (
    DailyLookImageRequest,
    DailyLookRecommendRequest,
    DailyLookRecommendResponse,
    GarmentAnalysisResponse,
    HealthResponse,
    ModelHealth,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class UTF8JSONResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"


@dataclass
class RuntimeState:
    status: str = "starting"


def _cuda_device_name() -> str | None:
    return torch.cuda.get_device_name(0) if torch.cuda.is_available() else None


def create_app(
    settings: Settings | None = None,
    recommender: OutfitRecommender | None = None,
    image_generator: OutfitImageGenerator | None = None,
    reference_fetcher: ReferenceImageFetcher | None = None,
    classifier: GarmentClassifier | None = None,
    *,
    preload_models: bool = True,
) -> FastAPI:
    """Construct an app with injectable models for GPU-free API tests."""
    app_settings = settings or get_settings()
    app_classifier = classifier or GarmentClassifier(app_settings)
    app_recommender = recommender or OutfitRecommender(app_settings)
    app_image_generator = image_generator or OutfitImageGenerator(app_settings)
    app_reference_fetcher = reference_fetcher or ReferenceImageFetcher(app_settings)
    runtime = RuntimeState(status="starting" if preload_models else "ready")
    gpu_manager = GPUInferenceManager()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if preload_models:
            errors: list[str] = []
            for name, model in (
                ("analysis", app_classifier),
                ("recommendation", app_recommender),
                ("image", app_image_generator),
            ):
                try:
                    await asyncio.to_thread(model.warm_up)
                except Exception:  # model errors must be diagnostic only in server logs
                    errors.append(name)
                    logger.exception("Startup preload failed: model=%s", name)
            runtime.status = "failed" if errors else "ready"
            if errors:
                logger.error("AI server is unavailable because preload failed: models=%s", ",".join(errors))
        try:
            yield
        finally:
            # Models intentionally remain resident for the process lifetime.
            pass

    app = FastAPI(
        title="MyCloset AI Server",
        version="1.0.0",
        description="Garment analysis, daily-look recommendation, and outfit image generation in one process.",
        default_response_class=UTF8JSONResponse,
        lifespan=lifespan,
    )
    app.state.settings = app_settings
    app.state.classifier = app_classifier
    app.state.recommender = app_recommender
    app.state.image_generator = app_image_generator
    app.state.reference_fetcher = app_reference_fetcher
    app.state.runtime = runtime
    app.state.gpu_manager = gpu_manager

    def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
        if app_settings.ai_api_key and not hmac.compare_digest(x_api_key or "", app_settings.ai_api_key):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid AI API key.")

    def require_ready() -> None:
        if runtime.status != "ready":
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI models are unavailable.")

    @app.get("/health", response_model=HealthResponse, response_model_exclude_none=True)
    async def health() -> HealthResponse:
        return HealthResponse(
            status=runtime.status,
            cudaAvailable=torch.cuda.is_available(),
            cudaDevice=_cuda_device_name(),
            analysisModel=ModelHealth(
                id=app_settings.analysis_model_id,
                loaded=app_classifier.is_loaded,
                loadIn4bit=app_settings.analysis_load_in_4bit,
            ),
            recommendModel=ModelHealth(
                id=app_settings.recommend_model_id,
                loaded=app_recommender.is_loaded,
                loadIn4bit=app_settings.recommend_load_in_4bit,
            ),
            imageModel=ModelHealth(
                id=app_settings.image_model_id,
                loaded=app_image_generator.is_loaded,
                preset=app_settings.image_model_preset,
                variant=app_settings.image_model_variant,
                width=app_settings.image_width,
                height=app_settings.image_height,
                steps=app_settings.image_steps,
                controlNetEnabled=getattr(
                    app_image_generator, "controlnet_loaded", app_settings.image_controlnet_enabled
                ),
                ipAdapterEnabled=getattr(
                    app_image_generator, "ip_adapter_loaded", app_settings.image_reference_enabled
                ),
            ),
        )

    @app.post(
        "/v1/garment-analysis",
        response_model=GarmentAnalysisResponse,
        dependencies=[Depends(require_api_key), Depends(require_ready)],
    )
    async def analyze_garment(image: UploadFile = File(...)) -> GarmentAnalysisResponse:
        if not (image.content_type or "").startswith("image/"):
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="An image file is required.")
        raw_bytes = await image.read()
        if not raw_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The image file is empty.")
        if len(raw_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Maximum image size is 15 MB."
            )

        try:
            prepared = prepare_image(raw_bytes, app_settings.analysis_max_side)
        except InvalidImageError as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

        try:
            attributes, processing_ms = await gpu_manager.run("analysis", lambda: app_classifier.analyze(prepared))
        except (RuntimeError, OSError) as error:
            logger.exception("Garment analysis inference failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Analysis model is unavailable."
            ) from error
        except Exception as error:
            logger.exception("Unexpected garment analysis failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error."
            ) from error

        return GarmentAnalysisResponse(
            model=app_settings.analysis_model_id,
            processingMs=processing_ms,
            attributes=attributes,
            requiresReview=bool(attributes.uncertainFields),
        )

    @app.post(
        "/v1/daily-look/recommend",
        response_model=DailyLookRecommendResponse,
        dependencies=[Depends(require_api_key), Depends(require_ready)],
    )
    async def recommend_daily_look(request_body: DailyLookRecommendRequest) -> DailyLookRecommendResponse:
        try:
            recommendations, processing_ms = await gpu_manager.run(
                "recommendation",
                lambda: app_recommender.recommend(
                    request_body.situation,
                    request_body.closet,
                    request_body.modelGender,
                    request_body.weather,
                ),
            )
        except RecommendationValidationError as error:
            logger.warning("No valid recommendation was produced: %s", error)
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
        except (RuntimeError, OSError) as error:
            logger.exception("Recommendation inference failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Recommendation model is unavailable."
            ) from error
        except Exception as error:
            logger.exception("Unexpected recommendation failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error."
            ) from error
        return DailyLookRecommendResponse(
            model=app_settings.recommend_model_id,
            processingMs=processing_ms,
            recommendations=recommendations[: app_settings.recommend_max_results],
        )

    @app.post(
        "/v1/daily-look/image",
        dependencies=[Depends(require_api_key), Depends(require_ready)],
    )
    async def generate_daily_look_image(request_body: DailyLookImageRequest) -> Response:
        try:
            reference = await asyncio.to_thread(app_reference_fetcher.fetch, request_body.items)
            reference_image = reference.image if reference is not None else None
        except ReferenceImageFetchError as error:
            logger.warning("Reference image was rejected: %s", error)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Reference image could not be retrieved.",
            ) from error

        try:
            image = await gpu_manager.run(
                "image",
                lambda: app_image_generator.generate(
                    request_body.items,
                    request_body.styleKeywords,
                    request_body.modelGender,
                    reference_image=reference_image,
                ),
            )
        except (RuntimeError, OSError) as error:
            logger.exception("Image generation inference failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Image model is unavailable."
            ) from error
        except Exception as error:
            logger.exception("Unexpected image generation failure")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error."
            ) from error
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return Response(content=buffer.getvalue(), media_type="image/png")

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, error: Exception) -> JSONResponse:
        logger.exception("Unhandled request failure: method=%s path=%s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error."})

    return app


app = create_app()


def configure_windows_selector_loop() -> None:
    """Match the existing Windows AI-server mitigation for reset socket logs."""
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def main() -> None:
    configure_windows_selector_loop()
    current_settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=current_settings.host,
        port=current_settings.port,
        log_level=current_settings.log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()
