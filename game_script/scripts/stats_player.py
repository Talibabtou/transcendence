#!/usr/bin/env python3
import pandas as pd
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8082/api/v1"
PLAYER_ID = "850a6549-240f-4b3e-84c8-3eaa32ebbfd2"
PLAYER_STATS_ENDPOINT = f"{API_BASE_URL}/matches/stats"

def get_first_player_stats():
    try:
        # Read the parquet file
        df = pd.read_parquet('player_list.parquet')
        
        # Get the first player ID
        if len(df) == 0:
            print("No players found in the parquet file")
            return
        
        first_player_id = df.iloc[0].player_id  # Assuming player_id is the index
        
        # Make the API request
        response = requests.get(f"{PLAYER_STATS_ENDPOINT}/{PLAYER_ID}")
        response.raise_for_status()
        
        # Print the raw JSON response
        print(json.dumps(response.json(), indent=2))
        with open('player_stats.json', 'w') as f:
            json.dump(response.json(), f, indent=2)
        
    except FileNotFoundError:
        print("player_list.parquet file not found")
    except pd.errors.EmptyDataError:
        print("The parquet file is empty")
    except requests.RequestException as e:
        print(f"API request failed: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    get_first_player_stats()