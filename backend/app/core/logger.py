"""
Centralized logging with loguru.

Usage in any module:
    from app.core.logger import logger
    logger.info("Processing file", filename=name)
"""
import sys
from loguru import logger

# Remove default handler and add a clean structured one
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)
