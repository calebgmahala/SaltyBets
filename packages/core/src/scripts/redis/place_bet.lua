-- Place bet script
-- KEYS[1] = balanceKey
-- KEYS[2] = betKey
-- KEYS[3] = totalKey
-- ARGV[1] = amount
-- ARGV[2] = fighterColor

-- Get current values
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local bet = redis.call('HGETALL', KEYS[2])
local total = tonumber(redis.call('GET', KEYS[3]) or '0')

-- Validate balance
if balance < tonumber(ARGV[1]) then
  return {err = 'INSUFFICIENT_BALANCE'}
end

-- Calculate new values
local currentBetAmount = 0
if #bet > 0 then
  for i = 1, #bet, 2 do
    if bet[i] == 'amount' then
      currentBetAmount = tonumber(bet[i+1])
      break
    end
  end
end

local newBetAmount = currentBetAmount + tonumber(ARGV[1])
local newBalance = balance - tonumber(ARGV[1])
local newTotal = total + tonumber(ARGV[1])

-- Update all values
redis.call('SET', KEYS[1], newBalance)
redis.call('HSET', KEYS[2], 'amount', newBetAmount, 'color', ARGV[2])
redis.call('SET', KEYS[3], newTotal)

return {ok = true} 