"""
Database persistence module for Airfare Observations using SQLAlchemy.
Defaults to local zero-configuration SQLite (airfares.db) and is fully compatible with PostgreSQL.
"""
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Date, DateTime, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pipeline.schema import AirfareObservation


Base = declarative_base()


class AirfareObservationModel(Base):
    """SQLAlchemy model for cleaned and raw airfare observations."""
    __tablename__ = "airfare_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observation_date = Column(String(10), nullable=False, index=True)
    observation_timestamp = Column(String(35), nullable=False)
    departure_date = Column(String(10), nullable=False, index=True)
    departure_time = Column(String(8), nullable=False)
    arrival_time = Column(String(8), nullable=False)
    duration_minutes = Column(Integer, default=120)

    origin = Column(String(3), nullable=False, index=True)
    destination = Column(String(3), nullable=False, index=True)
    route_code = Column(String(7), nullable=False, index=True)

    airline_code = Column(String(5), nullable=False, index=True)
    airline_name = Column(String(50), nullable=False)
    flight_number = Column(String(20), nullable=False)

    cabin = Column(String(20), default="Economy")
    fare_type = Column(String(50), default="Economy/basic")
    stops = Column(Integer, default=0)
    is_nonstop = Column(Boolean, default=True)

    # Price Components (in INR)
    base_fare = Column(Float, nullable=False)
    fuel_surcharge_yq = Column(Float, default=0.0)
    user_development_fee_udf = Column(Float, default=0.0)
    passenger_service_fee_psf = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    convenience_fee = Column(Float, default=0.0)
    total_taxes_fees = Column(Float, nullable=False)
    total_fare = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")

    advance_days = Column(Integer, nullable=False, index=True)
    data_source = Column(String(50), nullable=False, index=True)
    availability = Column(String(30), default="Available")
    is_sold_out = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_route_horizon", "route_code", "advance_days", "departure_date"),
        Index("idx_source_obs", "data_source", "observation_date"),
    )


class DatabaseManager:
    """Manages database connection, creation, insertion, and querying."""

    def __init__(self, db_url: Optional[str] = None):
        if db_url is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "airfares.db")
            db_url = f"sqlite:///{db_path}"

        self.db_url = db_url
        self.engine = create_engine(db_url, echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.init_db()

    def init_db(self):
        """Initializes tables and indexes."""
        Base.metadata.create_all(self.engine)

    def save_dataframe(self, df: pd.DataFrame) -> int:
        """Saves a Pandas DataFrame of observations to the database."""
        if df.empty:
            return 0
        df.to_sql("airfare_observations", self.engine, if_exists="append", index=False)
        return len(df)

    def save_observations(self, observations: List[AirfareObservation]) -> int:
        """Saves a list of AirfareObservation objects."""
        if not observations:
            return 0
        records = [obs.model_dump() for obs in observations]
        df = pd.DataFrame(records)
        return self.save_dataframe(df)

    def query_observations(
        self,
        route_code: Optional[str] = None,
        advance_days: Optional[int] = None,
        observation_date: Optional[str] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """Queries stored observations with optional filters."""
        query = "SELECT * FROM airfare_observations WHERE 1=1"
        params = {}
        if route_code:
            query += " AND route_code = :route_code"
            params["route_code"] = route_code
        if advance_days is not None:
            query += " AND advance_days = :advance_days"
            params["advance_days"] = advance_days
        if observation_date:
            query += " AND observation_date = :observation_date"
            params["observation_date"] = observation_date

        query += f" ORDER BY id DESC LIMIT {limit}"

        with self.engine.connect() as conn:
            return pd.read_sql_query(query, conn, params=params)

    def get_stats(self) -> Dict[str, Any]:
        """Returns row counts and metadata summary."""
        with self.engine.connect() as conn:
            total_rows = pd.read_sql_query("SELECT COUNT(*) as cnt FROM airfare_observations", conn).iloc[0]["cnt"]
            routes_count = pd.read_sql_query("SELECT COUNT(DISTINCT route_code) as cnt FROM airfare_observations", conn).iloc[0]["cnt"]
            sources_count = pd.read_sql_query("SELECT COUNT(DISTINCT data_source) as cnt FROM airfare_observations", conn).iloc[0]["cnt"]

        return {
            "total_observations": int(total_rows),
            "unique_routes": int(routes_count),
            "unique_sources": int(sources_count),
            "db_url": self.db_url
        }
