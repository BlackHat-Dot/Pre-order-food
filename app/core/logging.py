from __future__ import annotations

import json
import logging
import sys
from typing import Any

try:
    import structlog  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - dev env without deps
    structlog = None  # type: ignore


def configure_logging(level: str = "INFO") -> None:
    numeric = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
        level=numeric,
    )

    if structlog is not None:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.processors.add_log_level,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(numeric),
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )


class _StdlibJsonLogger:
    def __init__(self) -> None:
        self._log = logging.getLogger("app")

    def info(self, event: str, **kwargs: Any) -> None:
        self._log.info("%s %s", event, json.dumps(kwargs, default=str) if kwargs else "")

    def warning(self, event: str, **kwargs: Any) -> None:
        self._log.warning("%s %s", event, json.dumps(kwargs, default=str) if kwargs else "")

    def error(self, event: str, **kwargs: Any) -> None:
        self._log.error("%s %s", event, json.dumps(kwargs, default=str) if kwargs else "")


logger = structlog.get_logger() if structlog is not None else _StdlibJsonLogger()

