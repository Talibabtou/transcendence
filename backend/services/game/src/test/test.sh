#!/bin/bash

# API Testing Script for Game Service
# This script tests all endpoints in a logical sequence

# Base URL - change this to match your environment
BASE_URL="http://localhost:8082/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Function to save response and extract ID
save_response() {
  response=$1
  echo "$response" > temp.json
  id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "$id"
}

# Store IDs for later use
PLAYER1_ID="00000000-0000-0000-0000-000000000001"
PLAYER2_ID="00000000-0000-0000-0000-000000000002"
MATCH_ID=""
GOAL_ID=""
ELO_ID=""

# ===== MATCH ENDPOINTS =====
print_header "TESTING MATCH ENDPOINTS"

# Create a match
echo -e "${GREEN}Creating a new match...${NC}"
response=$(curl -s -X POST "$BASE_URL/matches" \
  -H "Content-Type: application/json" \
  -d "{
    \"player_1\": \"$PLAYER1_ID\",
    \"player_2\": \"$PLAYER2_ID\"
  }")
echo "$response" | json_pp
MATCH_ID=$(save_response "$response")
echo -e "Created match with ID: $MATCH_ID"

# Get all matches
echo -e "\n${GREEN}Getting all matches...${NC}"
curl -s -X GET "$BASE_URL/matches" | json_pp

# Get matches with filter
echo -e "\n${GREEN}Getting matches for player 1...${NC}"
curl -s -X GET "$BASE_URL/matches?player_id=$PLAYER1_ID" | json_pp

# Get specific match
echo -e "\n${GREEN}Getting match details for $MATCH_ID...${NC}"
curl -s -X GET "$BASE_URL/matches/$MATCH_ID" | json_pp

# ===== GOAL ENDPOINTS =====
print_header "TESTING GOAL ENDPOINTS"

# Create goals for the match
echo -e "${GREEN}Creating a goal for player 1...${NC}"
response=$(curl -s -X POST "$BASE_URL/goals" \
  -H "Content-Type: application/json" \
  -d "{
    \"match_id\": \"$MATCH_ID\",
    \"player\": \"$PLAYER1_ID\",
    \"duration\": 30
  }")
echo "$response" | json_pp
GOAL1_ID=$(save_response "$response")

echo -e "\n${GREEN}Creating another goal for player 1...${NC}"
curl -s -X POST "$BASE_URL/goals" \
  -H "Content-Type: application/json" \
  -d "{
    \"match_id\": \"$MATCH_ID\",
    \"player\": \"$PLAYER1_ID\",
    \"duration\": 45
  }" | json_pp

echo -e "\n${GREEN}Creating a goal for player 2...${NC}"
curl -s -X POST "$BASE_URL/goals" \
  -H "Content-Type: application/json" \
  -d "{
    \"match_id\": \"$MATCH_ID\",
    \"player\": \"$PLAYER2_ID\",
    \"duration\": 60
  }" | json_pp

# Get all goals
echo -e "\n${GREEN}Getting all goals...${NC}"
curl -s -X GET "$BASE_URL/goals" | json_pp

# Get goals with filter
echo -e "\n${GREEN}Getting goals for match $MATCH_ID...${NC}"
curl -s -X GET "$BASE_URL/goals?match_id=$MATCH_ID" | json_pp

# Get specific goal
echo -e "\n${GREEN}Getting goal details for $GOAL1_ID...${NC}"
curl -s -X GET "$BASE_URL/goals/$GOAL1_ID" | json_pp

# ===== ELO ENDPOINTS =====
print_header "TESTING ELO ENDPOINTS"

# Create ELO entries
echo "MATCH_ID: $MATCH_ID"
echo "PLAYER1_ID: $PLAYER1_ID"
echo "PLAYER2_ID: $PLAYER2_ID"
echo -e "${GREEN}Creating ELO entry for player 1...${NC}"
response=$(curl -s -X POST "$BASE_URL/elos" \
  -H "Content-Type: application/json" \
  -d "{
    \"player\": \"$PLAYER1_ID\",
    \"elo\": 1200
  }")
echo "$response" | json_pp
ELO1_ID=$(save_response "$response")

echo -e "\n${GREEN}Creating ELO entry for player 2...${NC}"
curl -s -X POST "$BASE_URL/elos" \
  -H "Content-Type: application/json" \
  -d "{
    \"player\": \"$PLAYER2_ID\",
    \"elo\": 1150
  }" | json_pp

# Get all ELO entries
echo -e "\n${GREEN}Getting all ELO entries...${NC}"
curl -s -X GET "$BASE_URL/elos" | json_pp

# Get ELO entries with filter
echo -e "\n${GREEN}Getting ELO entries for player 1...${NC}"
curl -s -X GET "$BASE_URL/elos?player_id=$PLAYER1_ID" | json_pp

# Get specific ELO entry
echo -e "\n${GREEN}Getting ELO details for $ELO1_ID...${NC}"
curl -s -X GET "$BASE_URL/elos/$ELO1_ID" | json_pp

# ===== COMPLETE THE MATCH =====
print_header "COMPLETING THE MATCH"

# Update match to complete it
echo -e "${GREEN}Completing the match...${NC}"
curl -s -X PUT "$BASE_URL/matches/$MATCH_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"completed\": true,
    \"duration\": 120,
    \"timeout\": false
  }" | json_pp

# ===== MATCH STATS AND TIMELINE =====
print_header "TESTING MATCH STATS AND TIMELINE"

# Get match timeline
echo -e "${GREEN}Getting match timeline...${NC}"
curl -s -X GET "$BASE_URL/matches/$MATCH_ID/stats" | json_pp

# Get player stats
echo -e "\n${GREEN}Getting stats for player 1...${NC}"
curl -s -X GET "$BASE_URL/matches/stats/$PLAYER1_ID" | json_pp

echo -e "\n${GREEN}Getting stats for player 2...${NC}"
curl -s -X GET "$BASE_URL/matches/stats/$PLAYER2_ID" | json_pp

# Clean up temporary files
rm -f temp.json

print_header "API TESTING COMPLETE"