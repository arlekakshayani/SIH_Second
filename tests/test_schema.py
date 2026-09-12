"""
Unit tests for Pydantic schema validation.
"""
import pytest
from pydantic import ValidationError
from pipeline.schema import SearchTask, AirfareObservation


def test_search_task_valid():
    task = SearchTask(
        origin="del",
        destination="bom",
        departure_date="2026-09-18",
        advance_days=7,
        observation_date="2026-09-11",
        observation_timestamp="2026-09-11T12:00:00Z"
    )
    assert task.origin == "DEL"
    assert task.destination == "BOM"
    assert task.advance_days == 7


def test_search_task_same_origin_destination_fails():
    with pytest.raises(ValidationError):
        SearchTask(
            origin="DEL",
            destination="DEL",
            departure_date="2026-09-18",
            advance_days=7,
            observation_date="2026-09-11",
            observation_timestamp="2026-09-11T12:00:00Z"
        )


def test_airfare_observation_tax_reconciliation():
    obs = AirfareObservation(
        observation_date="2026-09-11",
        observation_timestamp="2026-09-11T12:00:00Z",
        departure_date="2026-09-18",
        departure_time="08:20",
        arrival_time="10:35",
        duration_minutes=135,
        origin="DEL",
        destination="BOM",
        route_code="DEL-BOM",
        airline_code="6E",
        airline_name="IndiGo",
        flight_number="6E-205",
        base_fare=4000.0,
        total_taxes_fees=900.0,
        total_fare=4900.0,
        advance_days=7,
        data_source="MakeMyTrip"
    )
    assert obs.total_fare == 4900.0
    assert obs.base_fare == 4000.0
    assert obs.total_taxes_fees == 900.0
    assert obs.is_nonstop is True
