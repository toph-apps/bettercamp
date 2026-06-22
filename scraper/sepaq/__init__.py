"""Sépaq scraper package.

Pipeline order:

    seed -> establishment -> sector -> site -> enrich -> upsert

Each module is independently testable. Entry point: `python -m sepaq`.
"""
