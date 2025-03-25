import asyncio
import aiohttp
import random
import time
import uuid
import pandas as pd
from pandas import DataFrame as df
from datetime import datetime
import re

base_url = 'http://localhost:8082/api/v1'
   

async def get_elo(session,player):
    async with session.get(f"{base_url}/elos/{player}") as response:
        return await response.json()

async def create_elo(session,player, elo):
    elo_data = {
        "player": player,
        "elo": elo
    }
    async with session.post(f"{base_url}/elos", json=elo_data) as response:
        return await response.json()

async def get_match(session,match_id):
    async with session.get(f"{base_url}/matches/{match_id}") as response:
        return await response.json()

async def update_match(session,match_id, duration, timeout, completed):
    match_data = {
        "duration": duration,
        "timeout": timeout,
        "completed": completed
    }
    async with session.put(f"{base_url}/matches/{match_id}", json=match_data) as response:
        return await response.json()
async def create_match(session,player_1, player_2):
    match_data = {
        "player_1": player_1,
        "player_2": player_2
    }
    async with session.post(f"{base_url}/matches", json=match_data) as response:
        return await response.json()

async def create_goal(session,match_id,player,duration):
    goal_data = {
        "match_id": match_id,
        "player": player,
        "duration": duration
    }
    async with session.post(f"{base_url}/goals", json=goal_data) as response:
        return await response.json()

def create_users(player_list):
    available_players = player_list['player_id'].tolist()
    if len(available_players) < 2:
        return str(uuid.uuid4()), str(uuid.uuid4())
    return random.sample(available_players, 2)

async def initialize_players(session):
    # Create initial DataFrame with 100 players
    players = [str(uuid.uuid4()) for _ in range(100)]
    player_list = pd.DataFrame({
        'player_id': players
    })
    
    # Create ELO entries in database for each player
    for player in players:
        await create_elo(session, player, 1000)
    
    # Save to parquet file
    player_list.to_parquet("player_list.parquet")
    return player_list

async def run_match(player_1, player_2):
    try:
        # Create a new session for each match to prevent resource contention
        async with aiohttp.ClientSession() as match_session:
            match = await create_match_with_retry(match_session, player_1, player_2)
            match_id = match.get('id') or match.get('match_id')
            if not match_id:
                print(f"Error: Invalid match response: {match}")
                return
            
            print(f"Match {match_id} started")
            goals_1 = 0
            goals_2 = 0
            match_seed = re.findall(r'\d+', match_id)
            match_rand= sum(int(digit) for digit in match_seed)
            random.seed(match_rand + time.time())
            delay = random.randint(1, 5)
            start_time = datetime.now()
            last_goal_time = start_time
            
            max_match_duration = 60  # Maximum match duration in seconds
            
            while (goals_1 != 3 and goals_2 != 3):
                current_time = datetime.now()
                current_duration = (current_time - start_time).total_seconds()
                time_since_last_goal = (current_time - last_goal_time).total_seconds()
                
                # Check for match timeout (no activity for too long)
                if current_duration > max_match_duration:
                    print(f"Match {match_id} exceeded maximum duration of {max_match_duration} seconds")
                    await update_match(match_session, match_id, int(current_duration), True, False)
                    break
                
                if time_since_last_goal > delay:
                    print(f"Time since last goal: {time_since_last_goal:.2f} seconds")
                    
                    # Random timeout simulation
                    if random.randint(0, 200) == 12:
                        print(f"Match {match_id} will timeout for 10 seconds")
                        await asyncio.sleep(10)  # This should not block other matches
                        elo_1 = await get_elo(match_session, player_1)
                        elo_2 = await get_elo(match_session, player_2)
                        await create_elo(match_session, player_1, elo_1["elo"] - 20)
                        await create_elo(match_session, player_2, elo_2["elo"] - 20)
                        current_duration = (datetime.now() - start_time).total_seconds()
                        await update_match(match_session, match_id, int(current_duration), True, False)
                        print(f"Match {match_id} timeout")
                        break
                    
                    # Score a goal
                    if (datetime.now().second % 2 == 0):
                        await create_goal(match_session, match["id"], player_1, int(current_duration))
                        print(f"Match {match['id']}: Goal for {player_1} at {int(current_duration)} seconds")
                        goals_1 += 1
                    else:
                        await create_goal(match_session, match["id"], player_2, int(current_duration))
                        print(f"Match {match['id']}: Goal for {player_2} at {int(current_duration)} seconds")
                        goals_2 += 1
                    
                    print(f"Match {match['id']} - Goals: {goals_1} - {goals_2}")
                    delay = random.randint(1, 5)  # Reset delay after scoring
                    last_goal_time = datetime.now()  # Reset the time after scoring
                
                await asyncio.sleep(0.01)  # Yield control to other tasks
            
            if (goals_1 == 3 or goals_2 == 3):
                print(f"Match {match_id} finished")
                final_duration = (datetime.now() - start_time).total_seconds()
                await update_match(match_session, match["id"], int(final_duration), False, True)
                match = await get_match(match_session, match["id"])
                elo_1 = await get_elo(match_session, player_1)
                elo_2 = await get_elo(match_session, player_2)
                if (goals_1 == 3):
                    await create_elo(match_session, player_1, elo_1["elo"] + 10)
                    await create_elo(match_session, player_2, elo_2["elo"] - 10)
                else:
                    await create_elo(match_session, player_1, elo_1["elo"] - 10)
                    await create_elo(match_session, player_2, elo_2["elo"] + 10)
                
                elo_1 = await get_elo(match_session, player_1)
                elo_2 = await get_elo(match_session, player_2)
                print(f"Final Elo: {elo_1['elo']} - {elo_2['elo']}")
    except Exception as e:
        print(f"Error in match between {player_1} and {player_2}: {str(e)}")

async def create_match_with_retry(session, player_1, player_2, max_retries=3):
    for attempt in range(max_retries):
        try:
            match = await create_match(session, player_1, player_2)
            if 'statusCode' in match and match['statusCode'] == 500:
                raise Exception(match['message'])
            return match
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(1)  # Exponential backoff

async def main():
    try:
        with open("player_list.parquet", "rb") as file:
            player_list = pd.read_parquet(file)
    except FileNotFoundError:
        async with aiohttp.ClientSession() as session:
            player_list = await initialize_players(session)
            print("Created 100 initial players")

    while True:
        # Create matches concurrently
        matches = []
        for i in range(10):  # Running 3 concurrent matches
            player_1, player_2 = create_users(player_list)
            print(f"Creating match {i+1}: {player_1} vs {player_2}")
            # Each match gets its own task
            matches.append(run_match(player_1, player_2))  # Pass None for session since each match creates its own
        
        # Wait for all matches to complete with a timeout
        try:
            await asyncio.wait_for(asyncio.gather(*matches), timeout=120)
        except asyncio.TimeoutError:
            print("Some matches timed out")
        
        # Save updated stats
        player_list.to_parquet("player_list.parquet")
        
        # Add delay between batches
        await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())
