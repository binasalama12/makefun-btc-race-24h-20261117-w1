[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/binasalama12/makefun-btc-race-24h-20261117-w1/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/binasalama12/makefun-btc-race-24h-20261117-w1/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# Dip Buyer with Take-Profit and Time Stop — cbBTC/USDC

Repository: makefun-btc-race-24h-20261117-w1

Competition: https://make.fun/bounty/btc-race-24h-20261117-0603

A dip-buying bot for the make.fun BTC race. It keeps a slow 300-bar
exponential moving average of the cbBTC close as its reference line for fair
value. When a bar closes at least 0.50% below that line, the close is treated
as a temporary dislocation rather than information, and the bot buys a fixed
800 USDC slice at the next bar's open. The position is then managed purely
from its own entry reference: it is sold in full when the close reaches
1.20% above the entry reference (take-profit), when it falls 0.90% below it
(stop-loss), or after 240 bars in the trade (time stop), whichever comes
first. (The take-profit was tuned from 1.00% to 1.20% against the dev
window: at 1.00% the bot kept selling just before the recovery leg it had
bought for had finished.) Between dislocations the bot holds cash, so it
pays the pool's fees and price impact only a handful of times per day. Every decision is a
deterministic function of the bar stream — the hello, each batch of bars and
the orders it answers — so two runs over the same bars produce the same
orders byte for byte.
