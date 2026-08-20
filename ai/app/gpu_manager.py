from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import TypeVar

from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)
Result = TypeVar("Result")


class GPUInferenceManager:
    """Serializes all GPU inference so the two resident models do not contend."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()

    async def run(self, model_name: str, operation: Callable[[], Result]) -> Result:
        async with self._lock:
            started = time.perf_counter()
            try:
                return await run_in_threadpool(operation)
            finally:
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                logger.info("GPU inference finished: model=%s processing_ms=%s", model_name, elapsed_ms)
