-- Cancel bet script
-- KEYS[1] = betKey
-- ARGV[1] = amount

-- Get current values
local bet = redis.call('HGETALL', KEYS[1])

-- Validate bet exists
if #bet == 0 then
  return {err = 'NO_BET'}
end

-- Get current bet amount and color
local currentBetAmount = 0
local fighterColor = nil
for i = 1, #bet, 2 do
  if bet[i] == 'amount' then
    currentBetAmount = tonumber(bet[i+1])
  elseif bet[i] == 'color' then
    fighterColor = bet[i+1]
  end
end

-- Validate amount
if currentBetAmount < tonumber(ARGV[1]) then
  return {err = 'INSUFFICIENT_BET'}
end

-- Calculate new values
local newBetAmount = currentBetAmount - tonumber(ARGV[1])

-- Update or delete bet
if newBetAmount == 0 then
  redis.call('DEL', KEYS[1])
else
  redis.call('HSET', KEYS[1], 'amount', newBetAmount)
end

-- Update total
local totalKey = 'bet:active:total:' .. fighterColor
redis.call('INCRBYFLOAT', totalKey, -tonumber(ARGV[1]))

return {ok = true} 