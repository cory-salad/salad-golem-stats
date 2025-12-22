import os
from collections import Counter
from datetime import datetime, timedelta, timezone
import requests
import time
import json
import csv
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
import psycopg2


def main():
    # Load .env variables
    load_dotenv()  # reads .env from current directory

    conn = psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432)),
    )

    mongo_user = os.getenv("MONGOUSER")
    mongo_password = os.getenv("MONGOPASS")
    mongo_name = os.getenv("DBNAME")
    mongo_url = os.getenv("MONGO_URL")

    strapi_password = os.getenv("STRAPIPW")
    strapi_name = os.getenv("STRAPIID")
    strapi_url = os.getenv("STRAPIURL")

    min_sel_ver_num = int(os.getenv("MIN_SEL"))

    def get_database(dbname=mongo_name):

        CONNECTION_STRING = f"mongodb+srv://{mongo_user}:{mongo_password}@{mongo_url}/"
        # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
        client = MongoClient(CONNECTION_STRING)

        return client[dbname]

    ##################
    # GET DATA
    ##################
    ts = (datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    date_cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime(
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
        "gpu": 1,
        "min_ram": 1,
        "instances.status": 1,
    }

    db = get_database()
    collection = db["nodes"]
    node_results = collection.find(node_query, node_projection)
    collection = db["workloads"]
    workload_results = collection.find(workload_query, workload_projection)

    node_list = list(node_results)

    def getStrapiJwt():
        response = requests.post(
            strapi_url + "/auth/local",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            json={"identifier": strapi_name, "password": strapi_password},
        )
        response.raise_for_status()

        jsonResponse = response.json()
        return jsonResponse["jwt"]

    strapiJwt = getStrapiJwt()

    def getGpuClasses():
        response = requests.get(
            strapi_url + "/gpu-classes",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "Bearer " + strapiJwt,
            },
        )
        jsonResponse = response.json()
        output = {}
        for j in jsonResponse:
            output[j["uuid"]] = j
        return output

    published_gpu_classes = getGpuClasses()

    ##################
    ### PROCESS DATA
    ##################

    # Count by highest VRAM NVIDIA GPU (first if tie)
    gpu_counter = Counter()
    vram_counter = Counter()
    for node in node_list:
        gpus = node.get("gpus", [])
        if not gpus:
            continue
        # Filter NVIDIA GPUs only
        nvidia_gpus = [
            gpu
            for gpu in gpus
            if gpu and "NVIDIA" in str(gpu.get("card_name", "")).upper()
        ]
        if not nvidia_gpus:
            continue
        # Find GPU with highest VRAM
        best_gpu = max(nvidia_gpus, key=lambda gpu: gpu.get("vram", 0))
        gpu_name = f"{best_gpu.get('card_name', 'Unknown')} {best_gpu.get('vram', 0)}GB"
        gpu_vram = best_gpu.get("vram", 0)
        gpu_counter[gpu_name] += 1
        vram_counter[gpu_vram] += 1

    total_nodes = len(node_list)
    # Sum up available_disk, wsl_memory, cpu_cores
    total_disk = 0
    total_memory = 0
    total_cores = 0
    for node in node_list:
        total_disk += (node.get("available_disk", 0) or 0) / (1024**3)
        total_memory += (node.get("wsl_memory", 0) or 0) / (1024**3)
        total_cores += node.get("cpu_cores", 0) or 0

    # Sum workload resources for running instances
    running_gpu_counter = Counter()
    running_vram_counter = Counter()
    running_replica_count = 0
    running_min_disk = 0
    running_min_cpu = 0
    running_min_ram = 0
    for workload in workload_results:
        instances = workload.get("instances", [])
        # If any instance is running, include this workload
        is_running = False
        if isinstance(instances, list):
            for inst in instances:
                if (
                    isinstance(inst, dict)
                    and inst.get("status", "").lower() == "running"
                ):
                    is_running = True
                    gpu_class_id = inst.get("gpu_class_id")
                    if gpu_class_id:

                        gpu_class = published_gpu_classes.get(gpu_class_id)
                        if gpu_class:
                            gpu_name = gpu_class.get("name", "Unknown")
                            gpu_vram = gpu_class.get("vram", 0)
                            running_gpu_counter[gpu_name] += 1
                            running_vram_counter[gpu_vram] += 1
        elif isinstance(instances, dict):
            if instances.get("status", "").lower() == "running":
                is_running = True
                gpu_class_id = instances.get("gpu_class_id")
                if gpu_class_id:
                    gpu_class = published_gpu_classes.get(gpu_class_id)
                    if gpu_class:
                        gpu_name = gpu_class.get("name", "Unknown")
                        gpu_vram = gpu_class.get("vram", 0)
                        running_gpu_counter[gpu_name] += 1
                        running_vram_counter[gpu_vram] += 1
        if is_running:
            running_replica_count += workload.get("replica_count", 0) or 0
            running_min_disk += (workload.get("min_disk", 0) or 0) / (1024**3)
            running_min_cpu += (workload.get("min_cpu", 0) or 0) / 1000
            running_min_ram += (workload.get("min_ram", 0) or 0) / (1024**1)

    ################################
    # SAVE PROCESSED DATA
    ################################

    ######################
    # to database
    ######################

    metrics = {
        "total_nodes": total_nodes,
        "running_replica_count": running_replica_count,
        "running_min_disk": running_min_disk,
        "running_min_cpu": running_min_cpu,
        "running_min_ram": running_min_ram,
        "total_disk": total_disk,
        "total_memory": total_memory,
        "total_cores": total_cores,
    }

    with conn:
        with conn.cursor() as cur:
            for metric_name, value in metrics.items():
                cur.execute(
                    """
                    INSERT INTO metrics_scalar (ts, metric_name, value)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (ts, metric_name) DO UPDATE
                    SET value = EXCLUDED.value
                    """,
                    (ts, metric_name, value),
                )

    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO gpu_snapshots (ts, counts_by_name, running_by_name, counts_by_vram, running_by_vram)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (ts) DO UPDATE
                SET counts_by_name = EXCLUDED.counts_by_name,
                    running_by_name = EXCLUDED.running_by_name,
                    counts_by_vram = EXCLUDED.counts_by_vram,
                    running_by_vram = EXCLUDED.running_by_vram
                """,
                (
                    ts,
                    json.dumps(gpu_counter),
                    json.dumps(running_gpu_counter),
                    json.dumps(vram_counter),
                    json.dumps(running_vram_counter),
                ),
            )

    print(f"Total nodes: {total_nodes}")


if __name__ == "__main__":

    main()
