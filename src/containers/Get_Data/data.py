def get_aircraft_data():
    api_url = "https://opensky-network.org/api/states/all"
    api_key = "YOUR_API_KEY"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        data = response.json()["states"]
        aircraft_data = []
        for aircraft in data:
            aircraft_data.append({
                "icao24": aircraft[0],
                "callsign": aircraft[1],
                "origin_country": aircraft[2],
                "latitude": aircraft[6],
                "longitude": aircraft[5],
                "altitude": aircraft[7],
                "velocity": aircraft[9],
                "vertical_rate": aircraft[11]
            })
        return jsonify(aircraft_data)
    else:
        return jsonify([])