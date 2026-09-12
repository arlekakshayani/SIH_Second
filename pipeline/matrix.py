"""
Matrix Generator for Top 25 Directional Domestic Routes and 5 Advance Horizons.
Generates systematic search tasks for ethical, scheduled ingestion.
"""
import json
import os
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Optional
from .schema import SearchTask


class RouteMatrixGenerator:
    """Manages the 25-route x 5-horizon query matrix based on DGCA traffic data."""

    def __init__(self, routes_config_path: Optional[str] = None, weights_config_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        if routes_config_path is None:
            routes_config_path = os.path.join(base_dir, "config", "routes.json")
        if weights_config_path is None:
            weights_config_path = os.path.join(base_dir, "config", "weights.json")

        with open(routes_config_path, "r", encoding="utf-8") as f:
            self.routes_data = json.load(f)

        with open(weights_config_path, "r", encoding="utf-8") as f:
            self.weights_data = json.load(f)

        self.routes = self.routes_data["routes"]
        self.route_weights = self.weights_data["route_weights"]
        self.horizon_weights = self.weights_data["horizon_weights"]
        self.default_horizons = [1, 7, 15, 30, 45]

    def get_route_list(self) -> List[Dict]:
        """Returns the list of 25 directional routes with metadata."""
        return self.routes

    def get_route_weight(self, route_code: str) -> float:
        """Returns the DGCA annual passenger volume weight Wr for a directional route."""
        return self.route_weights.get(route_code, 0.0)

    def get_horizon_weight(self, horizon_days: int) -> float:
        """Returns the purchasing distribution weight Wh for an advance booking horizon."""
        key = f"T{horizon_days}"
        horizon_info = self.horizon_weights.get(key)
        if horizon_info:
            return horizon_info["weight"]
        return 0.20  # Fallback uniform

    def generate_tasks(
        self,
        base_date: Optional[date] = None,
        horizons: Optional[List[int]] = None,
        route_filter: Optional[List[str]] = None
    ) -> List[SearchTask]:
        """
        Generates the exhaustive matrix of search tasks.
        By default: 25 routes x 5 horizons = 125 query cells per run.
        """
        if base_date is None:
            base_date = date.today()

        if horizons is None:
            horizons = self.default_horizons

        now_iso = datetime.now(timezone.utc).isoformat()
        obs_date_str = base_date.isoformat()

        tasks: List[SearchTask] = []
        for route_info in self.routes:
            route_code = route_info["route_code"]
            if route_filter and route_code not in route_filter:
                continue

            origin = route_info["origin"]
            destination = route_info["destination"]

            for h in horizons:
                dep_date = base_date + timedelta(days=h)
                task = SearchTask(
                    origin=origin,
                    destination=destination,
                    departure_date=dep_date.isoformat(),
                    advance_days=h,
                    observation_date=obs_date_str,
                    observation_timestamp=now_iso
                )
                tasks.append(task)

        return tasks
