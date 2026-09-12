"""
Schema definitions for Airfare Observations, Raw Quotes, and Ingestion Tasks.
Uses Pydantic v2 for data validation, type checking, and serialization.
"""
from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator


class SearchTask(BaseModel):
    """Represents a single query target in the 25 routes x 5 horizons matrix."""
    origin: str = Field(min_length=3, max_length=3, description="IATA 3-letter origin airport code")
    destination: str = Field(min_length=3, max_length=3, description="IATA 3-letter destination airport code")
    departure_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target flight departure date (YYYY-MM-DD)")
    advance_days: int = Field(ge=1, le=90, description="Lead time horizon in days (e.g., 1, 7, 15, 30, 45)")
    observation_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date of price collection (YYYY-MM-DD)")
    observation_timestamp: str = Field(description="Exact ISO 8601 observation timestamp with time")

    @field_validator("origin", "destination")
    @classmethod
    def enforce_uppercase(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_different_airports(self) -> "SearchTask":
        if self.origin == self.destination:
            raise ValueError(f"Origin and destination cannot be identical: {self.origin}")
        return self


class RawFlightQuote(BaseModel):
    """Raw unnormalized quote extracted directly from an OTA or airline endpoint."""
    source_ota: str
    airline_code: str
    airline_name: Optional[str] = None
    flight_number: str
    origin: str
    destination: str
    departure_datetime: str
    arrival_datetime: Optional[str] = None
    departure_time: str
    arrival_time: str
    duration_mins: Optional[int] = 120
    is_nonstop: bool = True
    stops_count: int = 0
    cabin_class: str = "Economy"
    fare_tier: str = "Economy/basic"
    base_fare: float
    taxes_and_fees: float
    total_fare: float
    fuel_surcharge_yq: Optional[float] = 0.0
    user_development_fee_udf: Optional[float] = 0.0
    passenger_service_fee_psf: Optional[float] = 0.0
    gst: Optional[float] = 0.0
    convenience_fee: Optional[float] = 0.0
    advance_days: int
    seats_available: Optional[int] = 9
    is_sold_out: bool = False


class AirfareObservation(BaseModel):
    """
    Standardized, canonical airfare observation model for CPI index calculation.
    Enforces decomposition between base fare, statutory levies, and dynamic markups.
    """
    observation_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    observation_timestamp: str
    departure_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    departure_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    arrival_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    duration_minutes: int = Field(ge=20, le=720, default=120)

    origin: str = Field(min_length=3, max_length=3)
    destination: str = Field(min_length=3, max_length=3)
    route_code: str = Field(pattern=r"^[A-Z]{3}-[A-Z]{3}$")

    airline_code: str = Field(min_length=2, max_length=3)
    airline_name: str
    flight_number: str

    cabin: str = Field(default="Economy")
    fare_type: str = Field(default="Economy/basic")
    stops: int = Field(ge=0, le=4, default=0)
    is_nonstop: bool = Field(default=True)

    # Price Breakdown (INR)
    base_fare: float = Field(ge=0.0)
    fuel_surcharge_yq: float = Field(ge=0.0, default=0.0)
    user_development_fee_udf: float = Field(ge=0.0, default=0.0)
    passenger_service_fee_psf: float = Field(ge=0.0, default=0.0)
    gst: float = Field(ge=0.0, default=0.0)
    convenience_fee: float = Field(ge=0.0, default=0.0)
    total_taxes_fees: float = Field(ge=0.0)
    total_fare: float = Field(gt=0.0)
    currency: str = Field(default="INR")

    advance_days: int = Field(ge=1, le=90)
    data_source: str = Field(description="OTA name or Airline Portal benchmark")
    availability: Literal["Available", "Few Seats Left", "Sold Out"] = "Available"

    @field_validator("origin", "destination")
    @classmethod
    def clean_iata(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_route_and_prices(self) -> "AirfareObservation":
        expected_route = f"{self.origin}-{self.destination}"
        if self.route_code != expected_route:
            self.route_code = expected_route

        # Total fare must equal base fare + total taxes/fees within 1.0 INR rounding allowance
        computed_sum = self.base_fare + self.total_taxes_fees
        if abs(computed_sum - self.total_fare) > 1.0:
            # Reconcile taxes if inconsistent
            self.total_taxes_fees = round(max(0.0, self.total_fare - self.base_fare), 2)

        return self
