import asyncio
import aiohttp
import random
import json
import time
import math
import uuid
from datetime import datetime

class GameSimulation:
    def __init__(self, base_url='http://localhost:8082/api/v1'):
        self.base_url = base_url
        self.users = []
        self.active_matches = set()
        self.max_concurrent_matches = 10  # Reduced from 5
        self.default_elo = 1000
        self.elo_cache = {}  # Cache to store player ELO ratings
        self.retry_delays = {}  # Track endpoints that need backoff

    async def rate_limited_request(self, session, method, url, **kwargs):
        endpoint_key = f"{method}:{url.split('?')[0]}"  # Strip query params for endpoint key
        
        # Check if we need to wait before hitting this endpoint
        if endpoint_key in self.retry_delays:
            wait_until = self.retry_delays[endpoint_key]
            now = time.time()
            if now < wait_until:
                wait_time = wait_until - now
                print(f"Rate limit cooldown for {endpoint_key}, waiting {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
                del self.retry_delays[endpoint_key]
        
        # Add organic delay between 0.1 and 0.7 seconds
        await asyncio.sleep(random.uniform(0.1, 0.7))
        
        try:
            async with getattr(session, method)(url, **kwargs) as response:
                # Handle rate limiting
                if response.status == 429:
                    retry_after = 60  # Default retry after 60s
                    try:
                        error_text = await response.text()
                        # Try to extract retry time from message
                        if "retry in" in error_text:
                            parts = error_text.split("retry in")
                            if len(parts) > 1:
                                seconds_part = parts[1].strip().split(" ")[0]
                                retry_after = int(seconds_part)
                    except:
                        pass
                    
                    # Add jitter to avoid thundering herd
                    retry_after = retry_after + random.uniform(0, 5)
                    self.retry_delays[endpoint_key] = time.time() + retry_after
                    print(f"Rate limited on {endpoint_key}. Backing off for {retry_after:.1f}s")
                
                # Ensure we have a response content type for debugging
                content_type = response.headers.get('Content-Type', 'unknown')
                if response.status >= 400:
                    print(f"Response error: status={response.status}, content-type={content_type}")
                
                try:
                    response_json = await response.json()
                    print(f"Response JSON: {json.dumps(response_json, indent=2)}")
                except:
                    response_text = await response.text()
                    print(f"Response text: {response_text}")
                
                return response
        except aiohttp.ClientError as e:
            print(f"Network error in {method} request to {url}: {str(e)} ({type(e).__name__})")
            # Add small backoff on connection errors
            self.retry_delays[endpoint_key] = time.time() + random.uniform(2, 5)
            raise
        except Exception as e:
            print(f"Unexpected error in {method} request to {url}: {str(e)} ({type(e).__name__})")
            self.retry_delays[endpoint_key] = time.time() + random.uniform(2, 5)
            raise

    async def create_user(self, session):
        # Generate proper UUID instead of simple string
        u_id = str(uuid.uuid4())
        pseudo = f"player_{random.randint(1000, 9999)}"
        return {"u_id": u_id, "pseudo": pseudo}

    async def get_player_elo(self, session, player_id):
        if player_id in self.elo_cache:
            return self.elo_cache[player_id]
        
        try:
            response = await self.rate_limited_request(
                session, 
                "get", 
                f'{self.base_url}/elos/?player={player_id}'
            )
            
            if response.status == 200:
                elos = await response.json()
                if elos and len(elos) > 0:
                    # Get the most recent ELO
                    elo = elos[0]['elo']
                    self.elo_cache[player_id] = elo
                    return elo
            return self.default_elo  # Return default if no ELO found
        except Exception as e:
            print(f"Error getting player ELO: {str(e)}")
            return self.default_elo

    async def update_player_elo(self, session, player_id, new_elo):
        elo_data = {
            'player': player_id,
            'elo': new_elo
        }
        try:
            response = await self.rate_limited_request(
                session,
                "post",
                f'{self.base_url}/elos/',
                json=elo_data,
                headers={'Accept': 'application/json'}
            )
            
            if response.status == 201:
                self.elo_cache[player_id] = new_elo  # Update cache
                print(f"Updated ELO for player {player_id}: {new_elo}")
                return True
            print(f"Error updating ELO (status {response.status}): {await response.text()}")
            return False
        except Exception as e:
            print(f"Network error while updating ELO: {str(e)}")
            return False

    async def create_match(self, session, player1, player2):
        match_data = {
            'player_1': player1['u_id'],
            'player_2': player2['u_id'],
        }
        try:
            response = await self.rate_limited_request(
                session,
                "post",
                f'{self.base_url}/matches/',
                json=match_data
            )
            
            if response.status in (200, 201):
                try:
                    match = await response.json()
                    print(f"Created match: {match['id']} between {player1['pseudo']} and {player2['pseudo']}")
                    return match
                except Exception as e:
                    # The request was successful but JSON parsing failed
                    print(f"Warning: Match created with status {response.status}, but couldn't parse response: {str(e)}")
                    response_text = await response.text()
                    print(f"Response content: {response_text[:200]}...")
                    
                    # Try to extract ID from text if possible
                    if 'id' in response_text:
                        try:
                            # Simple extraction attempt - might need refinement
                            import re
                            id_match = re.search(r'"id"\s*:\s*"([^"]+)"', response_text)
                            if id_match:
                                match_id = id_match.group(1)
                                return {"id": match_id}
                        except:
                            pass
                    
                    return None
            else:
                print(f"Error creating match (status {response.status}): {await response.text()}")
                return None
        except aiohttp.ClientError as e:
            print(f"Network error creating match: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error creating match: {str(e)}")
            return None

    async def create_goal(self, session, match_id, player_id, duration):
        # Make sure all parameters are valid
        if not match_id or not player_id:
            print(f"Invalid goal parameters: match_id={match_id}, player_id={player_id}, duration={duration}")
            return False
            
        # Format duration as integer and ensure it's at least 1
        try:
            duration = max(1, int(duration))  # Changed from 0 to 1 as minimum
        except (ValueError, TypeError):
            duration = 1  # Changed from 0 to 1 as default
            
        goal_data = {
            'match_id': match_id,
            'player': player_id,
            'duration': duration
        }
        
        try:
            # Ensure we're using the exact same format and headers as test.sh
            response = await self.rate_limited_request(
                session,
                "post",
                f'{self.base_url}/goals',  # Remove trailing slash to match test.sh
                json=goal_data,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            )
            
            if response.status == 201:
                print(f"Created goal for player {player_id} in match {match_id} at {duration}s")
                return True
            
            # Enhanced error logging
            print(f"Error creating goal (status {response.status}):")
            print(f"Request data: {json.dumps(goal_data, indent=2)}")
            try:
                error_content = await response.text()
                print(f"Response: {error_content}")
            except:
                print("Could not read response content")
            
            return False
        except Exception as e:
            print(f"Network error while creating goal: {str(e)} ({type(e).__name__})")
            print(f"Request data: {json.dumps(goal_data, indent=2)}")
            return False

    async def update_match(self, session, match_id, completed=False, duration=None, timeout=False):
        update_data = {
            'completed': completed,
            'duration': duration,
            'timeout': timeout
        }
        try:
            response = await self.rate_limited_request(
                session,
                "put",
                f'{self.base_url}/matches/{match_id}',
                json=update_data,
                headers={'Accept': 'application/json'}
            )
            
            if response.status == 200:
                print(f"Updated match {match_id}: completed={completed}, timeout={timeout}")
                return True
            print(f"Error updating match (status {response.status}): {await response.text()}")
            return False
        except Exception as e:
            print(f"Network error while updating match: {str(e)}")
            return False

    async def calculate_new_elo(self, winner_elo, loser_elo):
        # Simplified ELO calculation
        k_factor = 32
        expected_win = 1 / (1 + 10**((loser_elo - winner_elo) / 400))
        winner_new_elo = round(winner_elo + k_factor * (1 - expected_win))
        loser_new_elo = round(loser_elo + k_factor * (0 - (1 - expected_win)))
        return winner_new_elo, loser_new_elo


    async def simulate_match(self, session, match, player1, player2):
        if not match:
            print("Invalid match object, skipping simulation")
            return
        
        match_id = match.get('id')
        if not match_id:
            print(f"Match ID not found in match object: {match}")
            return

        self.active_matches.add(match_id)
        start_time = time.time()
        
        # Track scores
        scores = {player1['u_id']: 0, player2['u_id']: 0}
        
        # Decide if this match will timeout (10% chance)
        will_timeout = random.random() < 0.1
        max_duration = random.randint(60, 180)  # 1-3 minutes
        
        # More organic simulation - not all matches have the same pace
        goal_frequency = random.uniform(5, 15)  # Time between goal attempts
        
        try:
            # Simulate match progress until someone scores 3 goals or match times out
            while max(scores.values()) < 3:
                current_duration = int(time.time() - start_time)
                
                # Check for timeout
                if will_timeout and current_duration >= max_duration:
                    print(f"Match {match_id} timed out after {current_duration} seconds")
                    await self.update_match(session, match_id, completed=False, duration=current_duration, timeout=True)
                    break
                
                # Use weighted randomness for scoring
                # Better players (with higher scores) have slightly better chance to score
                p1_weight = 1.0 + (scores[player1['u_id']] * 0.1)
                p2_weight = 1.0 + (scores[player2['u_id']] * 0.1)
                
                # Normalize weights
                total_weight = p1_weight + p2_weight
                p1_prob = p1_weight / total_weight
                
                # Determine which player scores
                scoring_player = player1 if random.random() < p1_prob else player2
                
                # Create a goal
                goal_duration = max(1, current_duration)  # Ensure goal_duration is at least 1
                success = await self.create_goal(session, match_id, scoring_player['u_id'], goal_duration)
                
                if success:
                    scores[scoring_player['u_id']] += 1
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Score update - {player1['pseudo']}: {scores[player1['u_id']]}, {player2['pseudo']}: {scores[player2['u_id']]}")
                
                # Add variable delay between goals - more organic pacing
                # More variation in match durations
                await asyncio.sleep(random.uniform(goal_frequency * 0.7, goal_frequency * 1.3))
            
            # Match completed naturally (someone scored 3 goals)
            if max(scores.values()) >= 3:
                match_duration = int(time.time() - start_time)
                await self.update_match(session, match_id, completed=True, duration=match_duration, timeout=False)
                
                # Determine winner and loser
                winner_id = player1['u_id'] if scores[player1['u_id']] > scores[player2['u_id']] else player2['u_id']
                loser_id = player2['u_id'] if winner_id == player1['u_id'] else player1['u_id']
                
                # Get current ELO ratings
                winner_elo = await self.get_player_elo(session, winner_id)
                loser_elo = await self.get_player_elo(session, loser_id)
                
                # Calculate new ELO ratings
                new_winner_elo, new_loser_elo = await self.calculate_new_elo(winner_elo, loser_elo)
                
                # Update ELO ratings
                await self.update_player_elo(session, winner_id, new_winner_elo)
                await self.update_player_elo(session, loser_id, new_loser_elo)
                
                print(f"Match {match_id} completed. Winner: {winner_id}, New ELO: {new_winner_elo}")
        except Exception as e:
            print(f"Error during match simulation: {str(e)}")
        finally:
            if match_id in self.active_matches:
                self.active_matches.remove(match_id)

    async def run_forever(self, num_users=10, matches_per_batch=8):  # Reduced from 15
        while True:  # Infinite loop
            async with aiohttp.ClientSession() as session:
                try:
                    # Create users if we don't have enough
                    if len(self.users) < num_users:
                        print("Creating users...")
                        create_user_tasks = [self.create_user(session) 
                                          for _ in range(num_users - len(self.users))]
                        new_users = [user for user in await asyncio.gather(*create_user_tasks) if user]
                        self.users.extend(new_users)
                        print(f"Total users: {len(self.users)}")
                    
                    # Create and simulate matches more organically
                    print("Starting match simulations...")
                    match_tasks = []
                    
                    # Create matches at a more natural pace
                    while len(match_tasks) < matches_per_batch:
                        # Start new matches if under max concurrent limit
                        while len(self.active_matches) < self.max_concurrent_matches and len(match_tasks) < matches_per_batch:
                            # Select players with some consideration for avoiding recent pairings
                            if len(self.users) >= 2:
                                player1, player2 = random.sample(self.users, 2)
                                match = await self.create_match(session, player1, player2)
                                if match:
                                    task = asyncio.create_task(self.simulate_match(session, match, player1, player2))
                                    match_tasks.append(task)
                                    # Organic delay between match creation
                                    await asyncio.sleep(random.uniform(1, 3))
                                else:
                                    # If match creation failed, wait longer
                                    await asyncio.sleep(random.uniform(3, 5))
                            else:
                                await asyncio.sleep(1)
                                break
                        
                        # More organic waiting between checking for available slots
                        await asyncio.sleep(random.uniform(0.5, 1.5))
                        
                        # Break early if we've been trying for too long
                        if len(match_tasks) > 0 and random.random() < 0.2:
                            break
                    
                    # Wait for all matches in this batch to complete
                    if match_tasks:
                        await asyncio.gather(*match_tasks)
                        print(f"Completed batch of {len(match_tasks)} matches")
                    
                    # Add a variable delay between batches - more organic
                    delay = random.uniform(1, 2)
                    print(f"Waiting {delay:.1f}s before starting next batch")
                    await asyncio.sleep(delay)
                except Exception as e:
                    print(f"Error in simulation loop: {str(e)}")
                    # Cancel any remaining tasks before closing the session
                    for task in match_tasks:
                        if not task.done():
                            task.cancel()
                    try:
                        await asyncio.gather(*match_tasks, return_exceptions=True)
                    except:
                        pass
                    print("Waiting 10 seconds before retrying...")
                    await asyncio.sleep(10)

async def main():
    while True:  # Retry forever if the simulation fails
        try:
            simulator = GameSimulation()
            await simulator.run_forever()
        except Exception as e:
            print(f"Fatal error in main loop: {str(e)}")
            print("Restarting simulation in 30 seconds...")
            await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(main())
