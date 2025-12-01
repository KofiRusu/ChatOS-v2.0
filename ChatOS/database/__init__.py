"""
ChatOS Learning Loop Database

PostgreSQL-based database for organizing, storing, and processing
training data from multiple sources with active learning capabilities.
"""

from ChatOS.database.connection import (
    get_engine,
    get_session,
    init_database,
    DatabaseSession,
)
from ChatOS.database.models import (
    DataSource,
    TrainingExample,
    KnowledgeDomain,
    CoverageAnalysis,
    ScrapeTarget,
    ScrapeResult,
    ActiveLearningTask,
    TrainingRun,
)

__all__ = [
    # Connection
    "get_engine",
    "get_session",
    "init_database",
    "DatabaseSession",
    # Models
    "DataSource",
    "TrainingExample",
    "KnowledgeDomain",
    "CoverageAnalysis",
    "ScrapeTarget",
    "ScrapeResult",
    "ActiveLearningTask",
    "TrainingRun",
]

