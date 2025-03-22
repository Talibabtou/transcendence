#!/usr/bin/env python3
import requests
import json
from tabulate import tabulate
from typing import List, Dict, Any, Set

# Configuration
API_BASE_URL = "http://localhost:8082/api/v1"  # Adjust this to your actual API base URL
MATCHES_ENDPOINT = f"{API_BASE_URL}/matches"
PLAYER_STATS_ENDPOINT = f"{API_BASE_URL}/matches/stats"

def get_all_matches() -> List[Dict[str, Any]]:
    """Fetch all matches from the API."""
    try:
        response = requests.get(MATCHES_ENDPOINT)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching matches: {e}")
        return []

def extract_unique_player_ids(matches: List[Dict[str, Any]]) -> Set[str]:
    """Extract unique player IDs from the list of matches."""
    player_ids = set()
    for match in matches:
        player_ids.add(match.get("player_1"))
        player_ids.add(match.get("player_2"))
    # Remove None values if any
    return {player_id for player_id in player_ids if player_id}

def get_player_stats(player_id: str) -> Dict[str, Any]:
    """Fetch statistics for a specific player."""
    try:
        response = requests.get(f"{PLAYER_STATS_ENDPOINT}/{player_id}")
        response.raise_for_status()
        print(response.json())
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching stats for player {player_id}: {e}")
        return {}

def print_player_summary(player_id: str, stats: Dict[str, Any]) -> None:
    """Print a summary of player statistics."""
    if not stats:
        print(f"No statistics available for player {player_id}")
        return

    summary = stats.get("summary", {})
    goal_stats = stats.get("goal_stats", {})
    elo_history = stats.get("elo_history", [])
    
    current_elo = elo_history[-1].get("elo", "N/A") if elo_history else "N/A"
    
    print(f"\n===== Player ID: {player_id} =====")
    print(f"Current ELO: {current_elo}")
    
    # Match summary table
    summary_data = [
        ["Total Matches", summary.get("total_matches", 0)],
        ["Completed Matches", summary.get("completed_matches", 0)],
        ["Victories", summary.get("victories", 0)],
        ["Win Ratio", f"{summary.get('win_ratio', 0):.2%}"]
    ]
    print("\nMatch Summary:")
    print(tabulate(summary_data, tablefmt="simple"))
    
    # Goal stats table
    goal_data = [
        ["Total Goals", goal_stats.get("total_goals", 0)],
        ["Fastest Goal (seconds)", goal_stats.get("fastest_goal_duration", "N/A")],
        ["Average Goal Time (seconds)", 
         f"{goal_stats.get('average_goal_duration', 0):.2f}" if goal_stats.get("average_goal_duration") else "N/A"]
    ]
    print("\nGoal Statistics:")
    print(tabulate(goal_data, tablefmt="simple"))
    
    # ELO history summary (just first and last if available)
    if elo_history:
        print("\nELO History:")
        first_elo = elo_history[0]
        last_elo = elo_history[-1]
        elo_data = [
            ["Initial", first_elo.get("match_date", "N/A"), first_elo.get("elo", "N/A")],
            ["Current", last_elo.get("match_date", "N/A"), last_elo.get("elo", "N/A")]
        ]
        print(tabulate(elo_data, headers=["", "Date", "ELO"], tablefmt="simple"))
    
    print("\n" + "="*30)

def main():
    print("Fetching match data...")
    matches = get_all_matches()
    
    if not matches:
        print("No matches found. Exiting.")
        return
    
    print(f"Found {len(matches)} matches.")
    player_ids = extract_unique_player_ids(matches)
    print(f"Found {len(player_ids)} unique players.")
    
    for player_id in player_ids:
        print(f"Fetching statistics for player {player_id}...")
        stats = get_player_stats(player_id)
        print_player_summary(player_id, stats)

if __name__ == "__main__":
    main()
