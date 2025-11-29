"""
ChatOS Training Module

This module provides integration between ChatOS and Unsloth for
fine-tuning local LLMs on conversation data.

Components:
- data_pipeline: Convert ChatOS logs to Unsloth training format
- job_spec: Training job specifications
- unsloth_runner: Spawn and manage Unsloth training processes
- job_store: CRUD operations for training jobs
- monitor: Read training metrics and status
"""

from .data_pipeline import (
    load_raw_conversations,
    filter_for_training,
    to_unsloth_jsonl,
    generate_training_dataset,
)

__all__ = [
    "load_raw_conversations",
    "filter_for_training",
    "to_unsloth_jsonl",
    "generate_training_dataset",
]

