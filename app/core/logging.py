from __future__ import annotations

import json
import logging
import sys
from typing import Any

try:
    import structlog  # type: ignore

except ModuleNotFoundError:
    structlog = None  # type: ignore


# ─────────────────────────────────────────────────────────────
# Logging Setup
# ─────────────────────────────────────────────────────────────

def configure_logging(
    level: str = "INFO",
) -> None:

    numeric_level = getattr(
        logging,
        level.upper(),
        logging.INFO,
    )

    logging.basicConfig(
        level=numeric_level,
        stream=sys.stdout,
        format=(
            "%(asctime)s "
            "%(levelname)s "
            "%(name)s "
            "%(message)s"
        ),
    )

    if structlog is None:
        return

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(
                fmt="iso",
                utc=True,
            ),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=(
            structlog.make_filtering_bound_logger(
                numeric_level
            )
        ),
        logger_factory=(
            structlog.PrintLoggerFactory()
        ),
        cache_logger_on_first_use=True,
    )


# ─────────────────────────────────────────────────────────────
# Stdlib JSON Fallback Logger
# ─────────────────────────────────────────────────────────────

class _StdlibJsonLogger:

    def __init__(self) -> None:
        self._logger = logging.getLogger(
            "app"
        )

    def _serialize(
        self,
        payload: dict[str, Any],
    ) -> str:

        if not payload:
            return ""

        return json.dumps(
            payload,
            default=str,
            ensure_ascii=False,
        )

    def info(
        self,
        event: str,
        **kwargs: Any,
    ) -> None:

        self._logger.info(
            "%s %s",
            event,
            self._serialize(kwargs),
        )

    def warning(
        self,
        event: str,
        **kwargs: Any,
    ) -> None:

        self._logger.warning(
            "%s %s",
            event,
            self._serialize(kwargs),
        )

    def error(
        self,
        event: str,
        **kwargs: Any,
    ) -> None:

        self._logger.error(
            "%s %s",
            event,
            self._serialize(kwargs),
        )

    def exception(
        self,
        event: str,
        **kwargs: Any,
    ) -> None:

        self._logger.exception(
            "%s %s",
            event,
            self._serialize(kwargs),
        )


# ─────────────────────────────────────────────────────────────
# App Logger
# ─────────────────────────────────────────────────────────────

logger = (
    structlog.get_logger()
    if structlog is not None
    else _StdlibJsonLogger()
)