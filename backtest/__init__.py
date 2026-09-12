"""
Backtest package for generating and evaluating 30-day historical airfare trajectories
against DGCA domestic monthly average fare statistics.
"""
from .generator import HistoricalDataGenerator

__all__ = ["HistoricalDataGenerator"]
