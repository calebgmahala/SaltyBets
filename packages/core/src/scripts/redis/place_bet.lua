-- Place bet script
-- KEYS[1] = betKey
-- KEYS[2] = totalKey
-- ARGV[1] = amount
-- ARGV[2] = fighterColor

-- Get current values
local bet = redis.call('HGETALL', KEYS[1])
local total = tonumber(redis.call('GET', KEYS[2]) or '0')

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
local newTotal = total + tonumber(ARGV[1])

-- Update all values
redis.call('HSET', KEYS[1], 'amount', newBetAmount, 'color', ARGV[2])
redis.call('SET', KEYS[2], newTotal)

return {ok = true} 