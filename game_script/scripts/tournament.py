import asyncio
import aiohttp
import random
import uuid
import itertools
import json
import os

base_url = 'http://localhost:8082/api/v1'

async def create_match(session, player_1, player_2, tournament_id):
    match_data = {
        "player_1": player_1,
        "player_2": player_2,
        "tournament_id": tournament_id
    }
    async with session.post(f"{base_url}/matches", json=match_data) as response:
        response.raise_for_status()
        return await response.json()

async def create_goal(session, match_id, player, duration):
    goal_data = {
        "match_id": match_id,
        "player": player,
        "duration": duration # Assuming duration is per goal or a placeholder
    }
    async with session.post(f"{base_url}/goals", json=goal_data) as response:
        response.raise_for_status()
        return await response.json()

async def get_tournament_final(session, tournament_id):
    print(f"Getting final results for tournament {tournament_id}")
    async with session.get(f"{base_url}/tournaments/{tournament_id}/final") as response:
        response.raise_for_status()
        return await response.json()

async def main():
    # Construct the path relative to the script's location
    script_dir = os.path.dirname(__file__)
    json_file_path = os.path.join(script_dir, 'match_results.json')

    try:
        with open(json_file_path, 'r') as f:
            match_results = json.load(f)
    except FileNotFoundError:
        print(f"Error: {json_file_path} not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {json_file_path}.")
        return

    async with aiohttp.ClientSession() as session:
        tournament_id = str(uuid.uuid4())
        print(f"Starting tournament with ID: {tournament_id}")

        for match_data in match_results:
            player_1 = match_data['player_1']
            player_2 = match_data['player_2']
            goals_player_1 = match_data['goals_player_1']
            goals_player_2 = match_data['goals_player_2']
            # Assuming duration in JSON is the value to pass per goal
            duration_player_1 = match_data['duration_player_1']
            duration_player_2 = match_data['duration_player_2']

            # Create the match
            try:
                match_info = await create_match(session, player_1, player_2, tournament_id)
                match_id = match_info['id']

                # Determine winner and loser
                if goals_player_1 > goals_player_2:
                    winner = player_1
                    loser = player_2
                    winner_goals = goals_player_1
                    loser_goals = goals_player_2
                    winner_duration = duration_player_1
                    loser_duration = duration_player_2
                else:
                    winner = player_2
                    loser = player_1
                    winner_goals = goals_player_2
                    loser_goals = goals_player_1
                    winner_duration = duration_player_2
                    loser_duration = duration_player_1

                # Create goals for the loser
                for _ in range(loser_goals):
                    await create_goal(session, match_id, loser, loser_duration)

                # Create goals for the winner
                for _ in range(winner_goals):
                    await create_goal(session, match_id, winner, winner_duration)

            except aiohttp.ClientResponseError as e:
                # print(f"Error processing match {player_1} vs {player_2}: {e.status} - {e.message}")
                # Decide if you want to stop or continue with the next match
                continue
            except Exception as e:
                 print(f"An unexpected error occurred during match processing: {e}")
                 continue # Continue with the next match

        # Get final tournament results after processing all matches
        try:
            final_results = await get_tournament_final(session, tournament_id)
            print("\nTournament Final Results:")
            print(json.dumps(final_results, indent=2))
        except aiohttp.ClientResponseError as e:
             print(f"Error getting final tournament results: {e.status} - {e.message}")
        except Exception as e:
             print(f"An unexpected error occurred while getting final results: {e}")


if __name__ == "__main__":
    asyncio.run(main())
