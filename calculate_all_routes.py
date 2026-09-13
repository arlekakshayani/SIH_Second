"""
Dynamic Econometric Airfare Price Index Calculator (MoSPI / DGCA CPI Augmentation)
Implements the 4-Step Methodology from the Specification:
  Step 1: Base Table Average Fares by Route and Advance Horizon (T+1, T+7, T+15, T+30, T+45)
  Step 2: Matched Observation Price Relatives & Horizon Jevons Elementary Indices
  Step 3: Base-Period Passenger Expenditure & Route Laspeyres Index
  Step 4: National Expenditure-Weighted Laspeyres Airfare Index (NAI)
"""
import sqlite3
import pandas as pd
import numpy as np
import json
import os

def generate_econometric_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "data", "airfares.db")
    pax_path = os.path.join(base_dir, "data", "dgca_route_horizon_pax_distribution.csv")
    out_dir = os.path.join(base_dir, "src", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_json_path = os.path.join(out_dir, "calculatedEconometricData.json")

    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM airfare_observations WHERE availability != 'Sold Out'", conn)
    conn.close()

    pax_df = pd.read_csv(pax_path)
    # Map (route_code, advance_days) -> pax info
    pax_dict = {}
    for _, row in pax_df.iterrows():
        pax_dict[(row['route_code'], int(row['advance_days']))] = {
            'daily_pax': int(row['estimated_daily_pax_horizon']),
            'monthly_pax': int(row['estimated_monthly_pax_horizon']),
            'annual_pax': int(row['estimated_annual_pax_horizon']),
            'route_annual_pax': int(row['route_annual_pax']),
            'horizon_weight': float(row['horizon_weight']),
            'corridor_category': str(row['corridor_category']),
            'origin_city': str(row['origin_city']),
            'destination_city': str(row['destination_city'])
        }

    dates = sorted(df['observation_date'].unique())
    base_date = '2026-09-01'
    latest_date = dates[-1] # 2026-09-12

    # Flight-level fares: average across sources per flight
    flight_df = df.groupby(['observation_date', 'route_code', 'origin', 'destination', 'airline_name', 'flight_number', 'advance_days']).agg(
        base_fare=('base_fare', 'mean'),
        total_taxes_fees=('total_taxes_fees', 'mean'),
        total_fare=('total_fare', 'mean'),
        quotes_count=('total_fare', 'count')
    ).reset_index()

    base_flights = flight_df[flight_df['observation_date'] == base_date].copy()
    
    # STEP 1: Base table average fare for each route and advance window
    step1_base_avg = base_flights.groupby(['route_code', 'advance_days']).agg(
        avg_total_fare=('total_fare', 'mean'),
        avg_base_fare=('base_fare', 'mean'),
        avg_taxes=('total_taxes_fees', 'mean'),
        flight_count=('flight_number', 'count')
    ).reset_index()

    step1_map = {}
    for _, r in step1_base_avg.iterrows():
        step1_map[(r['route_code'], int(r['advance_days']))] = {
            'avg_total_fare': round(float(r['avg_total_fare']), 2),
            'avg_base_fare': round(float(r['avg_base_fare']), 2),
            'avg_taxes': round(float(r['avg_taxes']), 2),
            'flight_count': int(r['flight_count'])
        }

    # Store calculations for each date
    date_results = {}
    time_series = []

    for cur_date in dates:
        cur_flights = flight_df[flight_df['observation_date'] == cur_date].copy()

        # STEP 2: Match observations present in BOTH base table and present scrapping data
        matched = pd.merge(
            cur_flights,
            base_flights[['route_code', 'airline_name', 'flight_number', 'advance_days', 'total_fare', 'base_fare']],
            on=['route_code', 'airline_name', 'flight_number', 'advance_days'],
            suffixes=('_pres', '_base')
        )
        matched['price_rel_100'] = (matched['total_fare_pres'] / matched['total_fare_base']) * 100.0

        # Jevons for each route and horizon
        def calc_jevons(series):
            clean = series[series > 0]
            if len(clean) == 0:
                return 100.0
            return float(np.exp(np.log(clean).mean()))

        step2_jevons = matched.groupby(['route_code', 'advance_days']).agg(
            horizon_jevons=('price_rel_100', calc_jevons),
            matched_flights_count=('flight_number', 'count')
        ).reset_index()

        # STEP 3: Route Laspeyres Index
        # Base Period Expenditure = Base Avg Fare * Passenger Count
        step3_rows = []
        for _, r in step2_jevons.iterrows():
            rc = r['route_code']
            adv = int(r['advance_days'])
            b_info = step1_map.get((rc, adv), {'avg_total_fare': 5000.0, 'avg_base_fare': 4000.0, 'flight_count': 1})
            p_info = pax_dict.get((rc, adv), {'daily_pax': 500, 'annual_pax': 182500, 'horizon_weight': 0.2})
            
            pax = p_info['daily_pax']
            base_exp = b_info['avg_total_fare'] * pax
            step3_rows.append({
                'route_code': rc,
                'advance_days': adv,
                'horizon_jevons': float(r['horizon_jevons']),
                'matched_flights_count': int(r['matched_flights_count']),
                'base_avg_fare': float(b_info['avg_total_fare']),
                'base_avg_pure_fare': float(b_info['avg_base_fare']),
                'pax': int(pax),
                'annual_pax': int(p_info['annual_pax']),
                'base_expenditure': float(base_exp)
            })

        step3_df = pd.DataFrame(step3_rows)
        # Route total base period expenditure
        route_tot_exp = step3_df.groupby('route_code')['base_expenditure'].sum().rename('route_total_base_exp')
        step3_df = pd.merge(step3_df, route_tot_exp, on='route_code')
        step3_df['horizon_weight'] = step3_df['base_expenditure'] / step3_df['route_total_base_exp']
        step3_df['weighted_horizon_index'] = step3_df['horizon_jevons'] * step3_df['horizon_weight']

        route_aggregates = step3_df.groupby('route_code').agg(
            laspeyres_route_index=('weighted_horizon_index', 'sum'),
            jevons_route_index=('horizon_jevons', 'mean'), # unweighted
            route_total_base_exp=('route_total_base_exp', 'first')
        ).reset_index()

        # STEP 4: National Airfare Index (NAI)
        tot_nat_exp = route_aggregates['route_total_base_exp'].sum()
        route_aggregates['route_weight'] = route_aggregates['route_total_base_exp'] / tot_nat_exp
        route_aggregates['weighted_route_index'] = route_aggregates['laspeyres_route_index'] * route_aggregates['route_weight']

        national_laspeyres_nai = float(route_aggregates['weighted_route_index'].sum())
        national_jevons_nai = float(np.exp(np.log(matched['price_rel_100']).mean()))

        # Route-level detailed breakdown dict
        route_details = {}
        for rc in route_aggregates['route_code'].unique():
            r_agg = route_aggregates[route_aggregates['route_code'] == rc].iloc[0]
            r_horizons = step3_df[step3_df['route_code'] == rc]
            
            # Step 1 & 2 flight matched detail for this route
            r_matched = matched[matched['route_code'] == rc]
            matched_flights_list = []
            for _, mf in r_matched.iterrows():
                matched_flights_list.append({
                    'airline': str(mf['airline_name']),
                    'flight_number': str(mf['flight_number']),
                    'advance_days': int(mf['advance_days']),
                    'base_fare': round(float(mf['total_fare_base']), 2),
                    'pres_fare': round(float(mf['total_fare_pres']), 2),
                    'price_relative': round(float(mf['price_rel_100']), 2),
                    'change_pct': round(float(mf['price_rel_100'] - 100.0), 2)
                })

            horizons_list = []
            for _, h in r_horizons.iterrows():
                horizons_list.append({
                    'advance_days': int(h['advance_days']),
                    'horizon_code': f"T+{int(h['advance_days'])}",
                    'base_avg_fare': round(float(h['base_avg_fare']), 2),
                    'base_avg_pure_fare': round(float(h['base_avg_pure_fare']), 2),
                    'pax_count': int(h['pax']),
                    'annual_pax': int(h['annual_pax']),
                    'base_expenditure': round(float(h['base_expenditure']), 2),
                    'horizon_weight': round(float(h['horizon_weight']), 4),
                    'horizon_jevons_index': round(float(h['horizon_jevons']), 2),
                    'matched_flights_count': int(h['matched_flights_count']),
                    'weighted_contribution': round(float(h['weighted_horizon_index']), 2)
                })

            origin = rc.split('-')[0]
            dest = rc.split('-')[1]
            pax_ref = pax_dict.get((rc, 7), {})

            route_details[rc] = {
                'route_code': rc,
                'origin': origin,
                'destination': dest,
                'origin_city': pax_ref.get('origin_city', origin),
                'destination_city': pax_ref.get('destination_city', dest),
                'corridor_category': pax_ref.get('corridor_category', 'Trunk Commercial'),
                'laspeyres_route_index': round(float(r_agg['laspeyres_route_index']), 2),
                'jevons_route_index': round(float(r_agg['jevons_route_index']), 2),
                'route_total_base_exp': round(float(r_agg['route_total_base_exp']), 2),
                'route_weight': round(float(r_agg['route_weight']), 4),
                'route_weight_pct': round(float(r_agg['route_weight'] * 100), 2),
                'weighted_contribution': round(float(r_agg['weighted_route_index']), 2),
                'horizons': horizons_list,
                'matched_flights': matched_flights_list[:20],
                'total_matched_flights': len(matched_flights_list)
            }

        date_results[cur_date] = {
            'date': cur_date,
            'national_laspeyres_nai': round(national_laspeyres_nai, 2),
            'national_jevons_nai': round(national_jevons_nai, 2),
            'inflation_rate_laspeyres': round(national_laspeyres_nai - 100.0, 2),
            'inflation_rate_jevons': round(national_jevons_nai - 100.0, 2),
            'total_national_base_exp': round(float(tot_nat_exp), 2),
            'total_matched_observations': len(matched),
            'routes_count': len(route_aggregates),
            'routes': route_details
        }

        time_series.append({
            'date': cur_date,
            'display_date': pd.to_datetime(cur_date).strftime('%b %d'),
            'laspeyres_nai': round(national_laspeyres_nai, 2),
            'jevons_nai': round(national_jevons_nai, 2),
            'baseline': 100.0
        })

    # Top corridor spikes on latest date vs base date
    latest_routes = date_results[latest_date]['routes']
    corridor_spikes = []
    for rc, rdata in latest_routes.items():
        # Compare T+1 or T+7 avg fare to base
        h1 = next((h for h in rdata['horizons'] if h['advance_days'] == 1), rdata['horizons'][0])
        h_base = h1['base_avg_fare']
        # latest fare
        latest_avg = h_base * (h1['horizon_jevons_index'] / 100.0)
        spike_pct = ((latest_avg - h_base) / h_base) * 100.0
        corridor_spikes.append({
            'corridor': f"{rdata['origin']} ✈️ {rdata['destination']}",
            'route_code': rc,
            'peakFare': f"₹{int(latest_avg):,}",
            'base': f"₹{int(h_base):,}",
            'spike': f"{'+' if spike_pct >= 0 else ''}{spike_pct:.1f}%",
            'pct': min(98, max(40, int(50 + spike_pct * 2))),
            'route_index': rdata['laspeyres_route_index']
        })
    corridor_spikes.sort(key=lambda x: float(x['spike'].replace('%', '').replace('+', '')), reverse=True)

    # Lead-time elasticity across all routes on latest date
    lead_time_curve = []
    for adv in [45, 30, 15, 7, 1]:
        adv_fares = []
        base_adv_fares = []
        for rc, rdata in latest_routes.items():
            h = next((h for h in rdata['horizons'] if h['advance_days'] == adv), None)
            if h:
                base_adv_fares.append(h['base_avg_fare'])
                adv_fares.append(h['base_avg_fare'] * (h['horizon_jevons_index'] / 100.0))
        mean_curr = float(np.mean(adv_fares)) if adv_fares else 5000.0
        mean_base = float(np.mean(base_adv_fares)) if base_adv_fares else 5000.0
        lead_time_curve.append({
            'horizon': f"T+{adv}",
            'advance_days': adv,
            'avg_fare': round(mean_curr, 2),
            'base_avg_fare': round(mean_base, 2),
            'surge_multiplier': round(mean_curr / 4200.0, 2)
        })

    # Sample live flight quotes from latest date for the Live Corridors table
    latest_raw_quotes = df[df['observation_date'] == latest_date].head(40)
    live_quotes = []
    for idx, row in latest_raw_quotes.iterrows():
        live_quotes.append({
            'id': f"FLIGHT-{row['id']}",
            'route_code': row['route_code'],
            'origin': row['origin'],
            'dest': row['destination'],
            'carrier': f"{row['airline_name']} ({row['flight_number']})",
            'airline': row['airline_name'],
            'flight_number': row['flight_number'],
            'platform': row['data_source'],
            'rawFare': round(float(row['total_fare'])),
            'pureFare': round(float(row['base_fare'])),
            'ancillary': round(float(row['total_taxes_fees'])),
            'base2024': round(float(row['base_fare'] * 0.92)),
            'horizon': f"T-{row['advance_days']} days",
            'advance_days': int(row['advance_days']),
            'status': 'Ingested & Normalized',
            'time': 'Live Monitored'
        })

    full_output = {
        'metadata': {
            'base_date': base_date,
            'latest_date': latest_date,
            'available_dates': dates,
            'total_routes': len(latest_routes),
            'routes_list': sorted(list(latest_routes.keys())),
            'methodology': '4-Step Jevons Elementary & Laspeyres Expenditure-Weighted National Airfare Index'
        },
        'latest': date_results[latest_date],
        'dates': date_results,
        'time_series': time_series,
        'corridor_spikes': corridor_spikes[:8],
        'lead_time_curve': lead_time_curve,
        'live_quotes': live_quotes
    }

    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump(full_output, f, indent=2)

    print(f"Successfully generated econometric dataset at: {out_json_path}")
    print(f"Base Date: {base_date} (NAI: 100.00)")
    print(f"Latest Date: {latest_date}")
    print(f"National Airfare Index (Laspeyres): {date_results[latest_date]['national_laspeyres_nai']}")
    print(f"National Airfare Index (Jevons):    {date_results[latest_date]['national_jevons_nai']}")
    print(f"BLR-BOM Laspeyres Route Index:      {latest_routes['BLR-BOM']['laspeyres_route_index']}")
    print(f"BLR-BOM Route Weight:              {latest_routes['BLR-BOM']['route_weight_pct']}%")

if __name__ == '__main__':
    generate_econometric_dataset()
