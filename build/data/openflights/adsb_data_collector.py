import os
import requests
import time
import logging
import json

class ADSBDataCollector:
    def __init__(self, folder_path):
        self.folder_path = folder_path
        self.file_path = os.path.join(folder_path, "data_adsb.json")
        self.logger = self.setup_logger()
        self.flight_data = {}

    def setup_logger(self):
        logger = logging.getLogger("ADSBDataCollector")
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        log_file = os.path.join(self.folder_path, "log_data.log")
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        return logger

    def collect_data_periodically(self, interval):
        while True:
            data = self.fetch_adsb_data()
            self.save_to_json(data)
            self.logger.info("Data ADS-B telah dikonversi ke dalam format JSON (data_adsb.json).")
            time.sleep(interval)

    def fetch_adsb_data(self):
        url = "https://opensky-network.org/api/states/all"
        headers = {"Accept": "application/json"}

        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data["states"]
        else:
            self.logger.error("Gagal mengambil data dari OpenSky API")
            return []

    def save_to_json(self, data):
        if len(data) > 0:
            for entry in data:
                icao24 = entry[0]
                latitude = entry[6]
                longitude = entry[5]

                if latitude is not None and longitude is not None:
                    if icao24 in self.flight_data:
                        self.flight_data[icao24].append([longitude, latitude])
                    else:
                        self.flight_data[icao24] = [[longitude, latitude]]

            json_data = {"flights": list(self.flight_data.values())}

            with open(self.file_path, "w") as jsonfile:
                json.dump(json_data, jsonfile, indent=4)
            
            self.logger.info("Data ADS-B telah dikonversi ke dalam format JSON (data_adsb.json).")
        else:
            self.logger.info("Tidak ada data ADS-B yang tersimpan")


folder_path = "public/data/openflights"
os.makedirs(folder_path, exist_ok=True)
collector = ADSBDataCollector(folder_path)
collector.collect_data_periodically(20)  # Mengumpulkan data setiap 20 detik