import os
import requests
import json
import csv
from datetime import datetime
from dotenv import load_dotenv


def main():
    # Load .env variables
    load_dotenv()  # reads .env from current directory

    strapi_password = os.getenv("STRAPIPW")
    strapi_name = os.getenv("STRAPIID")
    strapi_url = os.getenv("STRAPIURL")

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

    # Process and format GPU classes for export
    gpu_classes_data = []
    for uuid, gpu in published_gpu_classes.items():
        # Preprocess vram_gb value
        vram_gb = gpu.get("vram_gb")
        if vram_gb is None:
            name = gpu.get("name", "")
            if "(" in name and "GB" in name:
                try:
                    vram_gb = int(name.split("(")[-1].split("GB")[0].strip())
                except Exception:
                    vram_gb = None

        gpu_data = {
            "gpu_class_id": uuid,
            "batch_price": gpu.get("batchPrice"),
            "low_price": gpu.get("lowPrice"),
            "medium_price": gpu.get("mediumPrice"),
            "high_price": gpu.get("highPrice"),
            "gpu_type": gpu.get("gpuClassType"),
            "gpu_class_name": gpu.get("name"),
            "vram_gb": vram_gb,
        }
        gpu_classes_data.append(gpu_data)

    # Write to CSV file for pgAdmin import
    csv_filename = "gpu_classes.csv"
    with open(csv_filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)

        for gpu_data in gpu_classes_data:
            writer.writerow(
                [
                    gpu_data["gpu_class_id"],
                    gpu_data["batch_price"],
                    gpu_data["low_price"],
                    gpu_data["medium_price"],
                    gpu_data["high_price"],
                    gpu_data["gpu_type"],
                    gpu_data["gpu_class_name"],
                    gpu_data["vram_gb"],
                ]
            )

    print(f"✅ Exported {len(gpu_classes_data)} GPU classes to {csv_filename}")
    print(f"📊 Source: {strapi_url}")
    print(f"🕒 Export time: {datetime.now().isoformat()}")
    print(f"\\nFor pgAdmin import:")
    print(f"  Table: gpu_classes")
    print(
        f"  Columns: gpu_class_id, batch_price, low_price, medium_price, high_price, gpu_type, gpu_class_name, vram_gb"
    )
    print(f"  File: {csv_filename}")


if __name__ == "__main__":
    main()
