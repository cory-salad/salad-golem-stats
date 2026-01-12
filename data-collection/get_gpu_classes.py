import os
import requests
import json
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

    # Create export structure compatible with import_gpu_classes.py
    export_data = {
        "export_metadata": {
            "timestamp": datetime.now().isoformat(),
            "source_database": f"Strapi CMS ({strapi_url})",
            "record_count": len(gpu_classes_data),
            "export_type": "gpu_classes",
            "schema": {
                "table_name": "gpu_classes",
                "columns": [
                    {"name": "gpu_class_id", "type": "TEXT", "nullable": False},
                    {
                        "name": "batch_price",
                        "type": "DOUBLE PRECISION",
                        "nullable": True,
                    },
                    {"name": "low_price", "type": "DOUBLE PRECISION", "nullable": True},
                    {
                        "name": "medium_price",
                        "type": "DOUBLE PRECISION",
                        "nullable": True,
                    },
                    {
                        "name": "high_price",
                        "type": "DOUBLE PRECISION",
                        "nullable": True,
                    },
                    {"name": "gpu_type", "type": "TEXT", "nullable": True},
                    {"name": "gpu_class_name", "type": "TEXT", "nullable": False},
                    {"name": "vram_gb", "type": "INTEGER", "nullable": True},
                ],
            },
        },
        "data": gpu_classes_data,
    }

    # Write to JSON file
    output_file = "gpu_classes_export.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Exported {len(gpu_classes_data)} GPU classes to {output_file}")
    print(f"📊 Source: {strapi_url}")
    print(f"🕒 Export time: {export_data['export_metadata']['timestamp']}")
    print(f"\nTo import into database, run:")
    print(f"  python import_gpu_classes.py {output_file}")


if __name__ == "__main__":
    main()
