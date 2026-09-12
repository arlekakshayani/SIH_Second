"""
Index calculation package for computing the Real-Time Airfare Price Index (APIx)
using elementary Jevons price relatives and DGCA passenger-weighted Laspeyres aggregation.
"""
from .jevons import AirfareIndexCalculator

__all__ = ["AirfareIndexCalculator"]
