import sys
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
import requests
import time
import json
import csv
from pathlib import Path

min_sel_ver_num = 2003009

path_to_mongo = os.path.join(os.sep, "mnt", "c", "Users", "CoryRieth", 'salad-platform', 'workloads', 'node-counter')
path_to_source = os.path.join(os.sep, "mnt", "c", "Users", "CoryRieth", 'salad-platform-tools')

# Add path_to_workloads to sys.path so Python can find mongo.py there
if path_to_mongo not in sys.path:
    sys.path.insert(0, path_to_mongo)
if path_to_source not in sys.path:
    sys.path.insert(0, path_to_source)

from mongo import get_database

##################
# GET DATA
##################

date_cutoff = (datetime.now(timezone.utc) - timedelta(days=1)).strftime(
    "%Y-%m-%dT%H:%M:%S.%fZ"
)

min_download = 10  # in Mbps

node_query = {
    "updated_at": {"$gt": {"DateTime": date_cutoff}},
    "sel_ver_num": {"$gte": min_sel_ver_num},
    "container_ready": True,
    "os_arch": "x64",
    "$or": [
        {
            "ip": {"$gt": {"ndm_download": min_download}},
        },
        {"is_datacenter": True},
    ],
}

node_projection = {
    "node_id": 1,
    "cpu_cores": 1,
    "wsl_memory": 1,
    "available_disk": 1,
    "gpus.card_name": 1,
    "gpus.vram": 1,
    "ncw_status": 1,
    "ncw_detail": 1,
    "ip.country_code": 1,
    "ip.city": 1,
    "ip.ndm_download": 1,
    "ip.ndm_upload": 1,
    "ip.ip_address": 1,
    "is_running": 1,
    "instances.workload_id": 1,
    "instances.last_instance_state": 1,
}

workload_query = {}

workload_projection = {
    "replica_count": 1,
    "min_disk": 1,
    "min_cpu": 1,
    "min_ram": 1,
    "instances.status": 1,
}

db = get_database()
collection = db["nodes"]
node_results = collection.find(node_query, node_projection)
collection = db["workloads"]
workload_results = collection.find(workload_query, workload_projection)

node_list = list(node_results)

##################
### PROCESS DATA
##################
# Count by highest VRAM NVIDIA GPU (first if tie)
gpu_counter = Counter()
vram_counter = Counter()
for node in node_list:
    gpus = node.get('gpus', [])
    if not gpus:
        continue
    # Filter NVIDIA GPUs only
    nvidia_gpus = [gpu for gpu in gpus if gpu and 'NVIDIA' in str(gpu.get('card_name', '')).upper()]
    if not nvidia_gpus:
        continue
    # Find GPU with highest VRAM
    best_gpu = max(nvidia_gpus, key=lambda gpu: gpu.get('vram', 0))
    gpu_name = best_gpu.get('card_name', 'Unknown')
    gpu_vram = best_gpu.get('vram', 0)
    gpu_counter[gpu_name] += 1
    vram_counter[gpu_vram] += 1

# Sum up available_disk, wsl_memory, cpu_cores
total_disk = 0
total_memory = 0
total_cores = 0
for node in node_list:
    total_disk += node.get('available_disk', 0) or 0
    total_memory += node.get('wsl_memory', 0) or 0
    total_cores += node.get('cpu_cores', 0) or 0

# Sum workload resources for running instances
total_replica_count = 0
total_min_disk = 0
total_min_cpu = 0
total_min_ram = 0
for workload in workload_results:
    instances = workload.get('instances', [])
    # If any instance is running, include this workload
    is_running = False
    if isinstance(instances, list):
        for inst in instances:
            if isinstance(inst, dict) and inst.get('status', '').lower() == 'running':
                is_running = True
                break
    elif isinstance(instances, dict):
        if instances.get('status', '').lower() == 'running':
            is_running = True
    if is_running:
        total_replica_count += workload.get('replica_count', 0) or 0
        total_min_disk += workload.get('min_disk', 0) or 0
        total_min_cpu += workload.get('min_cpu', 0) or 0
        total_min_ram += workload.get('min_ram', 0) or 0

# City and country counts
city_counter = Counter()
country_counter = Counter()
for node in node_list:
    city = node.get('ip', {}).get('city', None)
    country = node.get('ip', {}).get('country_code', None)
    if city:
        city_counter[city] += 1
    if country:
        country_counter[country] += 1

# Process to lat / long
# Geocode cache file
GEOCODE_CITY_CACHE_PATH = Path('./data/city_geocode_cache.json')
if GEOCODE_CITY_CACHE_PATH.exists():
    with open(GEOCODE_CITY_CACHE_PATH, 'r', encoding='utf-8') as f:
        geocode_city_cache = json.load(f)
else:
    geocode_city_cache = {}

GEOCODE_COUNTRY_CACHE_PATH = Path('./data/country_geocode_cache.json')
if GEOCODE_COUNTRY_CACHE_PATH.exists():
    with open(GEOCODE_COUNTRY_CACHE_PATH, 'r', encoding='utf-8') as f:
        geocode_country_cache = json.load(f)
else:
    geocode_country_cache = {}

def geocode_city(city_name):
    if city_name in geocode_city_cache:
        return geocode_city_cache[city_name]
    if city_name == 'N/A' or not city_name:
        return None
    # Use OpenStreetMap Nominatim API
    url = f'https://nominatim.openstreetmap.org/search?city={city_name}&format=json&limit=1'
    try:
        resp = requests.get(url, headers={'User-Agent': 'SaladCloudStats/1.0'})
        if resp.status_code == 200:
            data = resp.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                geocode_city_cache[city_name] = {'lat': lat, 'lon': lon}
                time.sleep(.5)  # Be polite to API
                return geocode_city_cache[city_name]
    except Exception as e:
        print(f'Geocoding error for {city_name}: {e}')
    geocode_city_cache[city_name] = None
    return None

def geocode_country_code(country_code):
    if country_code in geocode_country_cache:
        return geocode_country_cache[country_code]
    if country_code == 'N/A' or not country_code:
        return None
    # Use OpenStreetMap Nominatim API
    url = f'https://nominatim.openstreetmap.org/search?country={country_code}&format=json&limit=1'
    try:
        resp = requests.get(url, headers={'User-Agent': 'SaladCloudStats/1.0'})
        if resp.status_code == 200:
            data = resp.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                geocode_country_cache[country_code] = {'lat': lat, 'lon': lon}
                time.sleep(.5)  # Be polite to API
                return geocode_country_cache[country_code]
    except Exception as e:
        print(f'Geocoding error for {country_code}: {e}')
    geocode_country_cache[country_code] = None
    return None


# Prepare output with geocoding
output_rows_city = []
total_cities = len(city_counter)
print(f"Geocoding {total_cities} cities...")
for idx, (city, count) in enumerate(city_counter.items(), 1):
    print(f"[{idx}/{total_cities}] Geocoding: {city}")
    geo = geocode_city(city)
    if geo:
        output_rows_city.append({'city': city, 'count': count, 'lat': geo['lat'], 'lon': geo['lon']})
    else:
        output_rows_city.append({'city': city, 'count': count, 'lat': '', 'lon': ''})
print("City geocoding complete.")

output_rows_country = []
total_countries = len(country_counter)
print(f"Geocoding {total_countries} countries...")
for idx, (country, count) in enumerate(country_counter.items(), 1):
    print(f"[{idx}/{total_countries}] Geocoding: {country}")
    geo = geocode_country_code(country)
    if geo:
        output_rows_country.append({'country': country, 'count': count, 'lat': geo['lat'], 'lon': geo['lon']})
    else:
        output_rows_country.append({'country': country, 'count': count, 'lat': '', 'lon': ''})
print("Country geocoding complete.")

# Update geocode caches
with open(  GEOCODE_CITY_CACHE_PATH, 'w', encoding='utf-8') as f:
    json.dump(geocode_city_cache, f, ensure_ascii=False, indent=2)

with open(  GEOCODE_COUNTRY_CACHE_PATH, 'w', encoding='utf-8') as f:
    json.dump(geocode_country_cache, f, ensure_ascii=False, indent=2)

################################
# SAVE PROCESSED DATA
################################

# Write CSV with lat/lon
with open('./data/node_count_by_city.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['city', 'count', 'lat', 'lon'])
    writer.writeheader()
    for row in output_rows_city:
        writer.writerow(row)

# Save node count by country_code to a CSV file
with open("node_count_by_country.csv", "w", newline='', encoding="utf-8") as f_country:
    writer = csv.DictWriter(f_country, fieldnames=['country', 'count', 'lat', 'lon'])
    writer.writeheader()
for row in output_rows_country:
        writer.writerow(row)


# combine into a line with datetime collected
print(f"Total replica_count (running workloads): {total_replica_count}")
print(f"Total min_disk (running workloads): {total_min_disk}")
print(f"Total min_cpu (running workloads): {total_min_cpu}")
print(f"Total min_ram (running workloads): {total_min_ram}")



gpu_counter[gpu_name] += 1
total_disk += node.get('available_disk', 0) or 0
total_memory += node.get('wsl_memory', 0) or 0
total_cores += node.get('cpu_cores', 0) or 0

gpu_counter[gpu_name] += 1
vram_counter[gpu_vram] += 1


# from mixpanel 
# need all nodes 

