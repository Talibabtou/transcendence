import asyncio
import aiohttp
import random
import json
from datetime import timedelta
import time

class GameSimulation:
    def __init__(self, base_url='http://backend:8000/api'):
        self.base_url = base_url
        self.users = []
        self.active_matches = set()
        self.max_concurrent_matches = 5
        self.chat_messages = [
            "Good game!",
            "Nice shot!",
            "Well played!",
            "That was close!",
            "Having fun!",
            "Great match!",
            "You're really good!",
            "Lucky shot!",
            "Let's play again sometime!",
            "GG!"
        ]

    async def create_user(self, session):
        random_number = random.randint(100000, 999999)
        user_data = {
            'pseudo': f'player_{random_number}',
            'email': f'player_{random_number}@example.com',
        }
        async with session.post(f'{self.base_url}/users/', json=user_data) as response:
            if response.status in (200, 201):
                user = await response.json()
                print(f"Created user: {user['pseudo']}")
                return user
            return None

    async def create_match(self, session, player1, player2):
        match_data = {
            'player_1': player1['u_id'],
            'player_2': player2['u_id'],
        }
        async with session.post(f'{self.base_url}/matches/', json=match_data) as response:
            if response.status in (200, 201):
                match = await response.json()
                print(f"Created match: {match['m_id']} between {player1['pseudo']} and {player2['pseudo']}")
                return match
            print(f"Error creating match: {await response.text()}")  # Add error logging
            return None

    async def update_score(self, session, match_id, player_id, score):
        score_data = {
            'player_id': player_id,
            'player_score': score
        }
        try:
            async with session.put(
                f'{self.base_url}/matches/{match_id}/score/', 
                json=score_data,
                headers={'Accept': 'application/json'}  # Request JSON response
            ) as response:
                if response.status == 200:
                    print(f"Updated score for player {player_id} in match {match_id}: {score}")
                    return True
                error_text = await response.text()
                try:
                    error_json = await response.json()
                    error_message = error_json.get('error', error_text)
                except:
                    error_message = error_text
                print(f"Error updating score (status {response.status}): {error_message}")
                return False
        except Exception as e:
            print(f"Network error while updating score: {str(e)}")
            return False

    async def send_chat_message(self, session, match_id, player):
        message = random.choice(self.chat_messages)
        websocket_url = f'ws://backend:8000/ws/chat/{match_id}/'
        async with session.ws_connect(websocket_url) as ws:
            await ws.send_json({
                'message': message,
                'sender': player['pseudo']
            })
            print(f"Chat message sent in match {match_id} by {player['pseudo']}: {message}")

    async def simulate_match(self, session, match, player1, player2):
        if not match:
            print("Invalid match object, skipping simulation")
            return
        
        match_id = match.get('m_id')
        if not match_id:
            print("Match ID not found in match object")
            return

        self.active_matches.add(match_id)
        try:
            # Simulate match progress with multiple score updates
            for _ in range(random.randint(3, 7)):
                await asyncio.sleep(random.uniform(5, 8))
                # Update player 1 score
                score1 = random.randint(0, 11)
                success1 = await self.update_score(session, match_id, player1['u_id'], score1)
                if not success1:
                    print(f"Failed to update score for player {player1['pseudo']}")
                
                # Update player 2 score
                score2 = random.randint(0, 11)
                success2 = await self.update_score(session, match_id, player2['u_id'], score2)
                if not success2:
                    print(f"Failed to update score for player {player2['pseudo']}")
                
                # Randomly send chat messages
                if random.random() < 0.3:  # 30% chance to send a message
                    player = random.choice([player1, player2])
                    try:
                        await self.send_chat_message(session, match_id, player)
                    except Exception as e:
                        print(f"Error sending chat message: {str(e)}")
        except Exception as e:
            print(f"Error during match simulation: {str(e)}")
        finally:
            self.active_matches.remove(match_id)

    async def run_forever(self, num_users=10, matches_per_batch=15):
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
                    # Create and simulate matches
                    print("Starting match simulations...")
                    match_tasks = []
                    while len(match_tasks) < matches_per_batch:
                        # Start new matches if under max concurrent limit
                        while len(self.active_matches) < self.max_concurrent_matches and len(match_tasks) < matches_per_batch:
                            player1, player2 = random.sample(self.users, 2)
                            match = await self.create_match(session, player1, player2)
                            if match:
                                task = asyncio.create_task(self.simulate_match(session, match, player1, player2))
                                match_tasks.append(task)
                        # Wait for any match to complete
                        await asyncio.sleep(0.3)
                    # Wait for all matches in this batch to complete
                    await asyncio.gather(*match_tasks)
                    print(f"Completed batch of {matches_per_batch} matches")
                    # Add a delay between batches
                    await asyncio.sleep(5)  # 5 seconds between batches
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
