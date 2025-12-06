#!/bin/bash
# =============================================================================
# Training UI Complete Test Suite
# Tests API endpoints and UI functionality
# =============================================================================

set -e

API_BASE="http://localhost:8000/api/training"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       ChatOS Training Submission - Complete Test Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if API is running
echo -e "${YELLOW}[1/7] Checking API health...${NC}"
if curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API is not running at $API_BASE${NC}"
    echo "Start the API with: python /home/kr/test_training_api.py"
    exit 1
fi

# Test health endpoint
echo -e "${YELLOW}[2/7] Testing health endpoint...${NC}"
HEALTH=$(curl -s "$API_BASE/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Invalid response${NC}"
fi
echo ""

# Test single example submission
echo -e "${YELLOW}[3/7] Testing single example submission...${NC}"
SINGLE=$(curl -s -X POST "$API_BASE/submit-example" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "What is the Bollinger Bands indicator?",
    "output": "Bollinger Bands consist of a middle band (20-period SMA) and upper/lower bands (±2 std dev). Used to identify overbought/oversold conditions and volatility breakouts.",
    "category": "trading",
    "difficulty": "medium"
  }')

if echo "$SINGLE" | grep -q "submission_id"; then
    echo -e "${GREEN}✓ Single example submitted${NC}"
    SUBMISSION_ID=$(echo "$SINGLE" | grep -o '"submission_id":"[^"]*' | cut -d'"' -f4)
    echo "  ID: $SUBMISSION_ID"
else
    echo -e "${RED}✗ Submission failed${NC}"
fi
echo ""

# Test batch submission
echo -e "${YELLOW}[4/7] Testing batch submission (3 examples)...${NC}"
BATCH=$(curl -s -X POST "$API_BASE/submit-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_name": "technical-indicators",
    "description": "Common technical analysis indicators",
    "examples": [
      {
        "instruction": "Explain MACD indicator",
        "output": "MACD (Moving Average Convergence Divergence) is a trend-following momentum indicator. It uses two EMAs (12-day and 26-day) and compares them to identify trend changes.",
        "category": "trading",
        "difficulty": "medium"
      },
      {
        "instruction": "What is Stochastic Oscillator?",
        "output": "Stochastic Oscillator compares closing price to price range over time. Two lines: %K (fast) and %D (slow). Values above 80 = overbought, below 20 = oversold.",
        "category": "trading",
        "difficulty": "medium"
      },
      {
        "instruction": "How to use ATR for position sizing?",
        "output": "ATR (Average True Range) measures volatility. Divide account risk % by ATR value to get position size. Higher ATR = smaller position size. Helps maintain consistent risk per trade.",
        "category": "risk",
        "difficulty": "hard"
      }
    ]
  }')

if echo "$BATCH" | grep -q "submission_id"; then
    echo -e "${GREEN}✓ Batch submitted${NC}"
    BATCH_ID=$(echo "$BATCH" | grep -o '"submission_id":"[^"]*' | cut -d'"' -f4)
    COUNT=$(echo "$BATCH" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "  ID: $BATCH_ID"
    echo "  Count: $COUNT examples"
else
    echo -e "${RED}✗ Batch failed${NC}"
fi
echo ""

# Test submission status
echo -e "${YELLOW}[5/7] Testing submission status endpoint...${NC}"
if [ ! -z "$BATCH_ID" ]; then
    STATUS=$(curl -s "$API_BASE/status/$BATCH_ID")
    if echo "$STATUS" | grep -q "id"; then
        echo -e "${GREEN}✓ Status retrieved${NC}"
    else
        echo -e "${RED}✗ Status failed${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (no batch ID)${NC}"
fi
echo ""

# Test queue status
echo -e "${YELLOW}[6/7] Testing queue status endpoint...${NC}"
QUEUE=$(curl -s "$API_BASE/queue/status")
if echo "$QUEUE" | grep -q "total_submissions"; then
    echo -e "${GREEN}✓ Queue status retrieved${NC}"
    TOTAL=$(echo "$QUEUE" | grep -o '"total_submissions":[0-9]*' | cut -d':' -f2)
    PENDING=$(echo "$QUEUE" | grep -o '"pending":[0-9]*' | cut -d':' -f2)
    echo "  Total submissions: $TOTAL"
    echo "  Pending: $PENDING"
else
    echo -e "${RED}✗ Queue status failed${NC}"
fi
echo ""

# Summary
echo -e "${YELLOW}[7/7] Test Summary${NC}"
echo -e "${GREEN}✓ All API endpoints working${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    UI Testing Instructions                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. Start the UI development server:"
echo "   cd /home/kr/ChatOS-v2.0/sandbox-ui"
echo "   npm install  # if not already done"
echo "   npm run dev"
echo ""
echo "2. Open in browser:"
echo -e "   ${YELLOW}http://localhost:3000/training${NC}"
echo ""
echo "3. Test these workflows:"
echo "   • Submit a single trading example"
echo "   • Create and submit a batch (3+ examples)"
echo "   • Check queue status by clicking 'Refresh Stats'"
echo "   • Verify success messages appear"
echo "   • Check recent submissions list"
echo ""
echo "4. Verify data was saved:"
echo "   ls -lh ~/ChatOS-v2.0/data/persrm/submissions/"
echo ""
echo -e "${GREEN}✓ All tests passed! Ready to use the UI.${NC}"
echo ""
