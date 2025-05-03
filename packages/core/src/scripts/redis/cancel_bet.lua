-- Cancel bet script
-- KEYS[1] = balanceKey
-- KEYS[2] = betKey
-- ARGV[1] = amount

-- Get current values
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local bet = redis.call('HGETALL', KEYS[2])

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
local newBalance = balance + tonumber(ARGV[1])

-- Update balance
redis.call('SET', KEYS[1], newBalance)

-- Update or delete bet
if newBetAmount == 0 then
  redis.call('DEL', KEYS[2])
else
  redis.call('HSET', KEYS[2], 'amount', newBetAmount)
end

-- Update total
local totalKey = 'bet:active:total:' .. fighterColor
redis.call('INCRBYFLOAT', totalKey, -tonumber(ARGV[1]))

return {ok = true} 