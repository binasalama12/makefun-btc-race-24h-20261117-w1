// Dip buyer with take-profit, stop-loss and time stop, for the bars-replay/v1
// protocol. One asset (CBBTC against USDC), long only, one position at a time.
//
// Idea: a slow exponential average of the close is the bot's idea of fair
// value. A close far enough under that line is read as a temporary
// dislocation, so the bot buys a fixed slice and then manages the trade off
// its own entry reference price alone: out at a fixed gain, out at a fixed
// loss, or out when the trade has had long enough to work.
//
// Costs drive the shape: every fill pays the 4 bps fee, 2 bps of modelled
// slippage and constant-product impact against the pool depth, which for a
// full-size order is the largest of the three. A fixed 800 USDC slice keeps
// the impact per trade moderate, and holding cash between dislocations keeps
// the number of round trips small.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

/** EMA span in bars: the fair-value reference line. */
const EMA_SPAN = 300;
/** Buy when the close is this fraction below the EMA. */
const DIP = 0.005; // 0.50%
/** Sell when the close reaches this fraction above the entry reference. */
const TAKE_PROFIT = 0.012; // 1.20%
/** Sell when the close falls this fraction below the entry reference. */
const STOP_LOSS = 0.009; // 0.90%
/** Sell after this many bars in the trade, whatever the price has done. */
const MAX_HOLD_BARS = 240;
/** Fixed buy size: 800 USDC in raw quote units (6 decimals). */
const SLICE = 800_000_000n;
/** Accept the modelled fill price wherever it lands; the strategy's edges
 *  are wide compared with a single bar's move, and a refused exit is worse. */
const MAX_SLIPPAGE_BPS = 10_000;

let ema: number | null = null;
let barsSeen = 0;
/** Close (in USDC) of the bar on which the open position's buy was decided. */
let entryRef: number | null = null;
/** The same, for a buy that has been sent but not yet seen in the account. */
let pendingRef: number | null = null;
let barsHeld = 0;

function stepEma(price: number): void {
  barsSeen += 1;
  if (ema === null) {
    ema = price;
  } else {
    const k = 2 / (EMA_SPAN + 1);
    ema += k * (price - ema);
  }
}

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    const symbol = state.hello.symbols[0]?.symbol;
    if (symbol === undefined) return [];
    const closeRaw = state.close(symbol);
    if (closeRaw === null) return [];
    const close = Number(closeRaw) / 1e8; // CBBTC price scale: 8 decimals
    stepEma(close);
    if (state.warmingUp) return [];

    const held = state.positions.get(symbol);
    const holding = held !== undefined && held.qty > 0n;

    if (holding) {
      if (entryRef === null) {
        entryRef = pendingRef ?? close;
        barsHeld = 0;
      }
      pendingRef = null;
      barsHeld += 1;
      const exit =
        close >= entryRef * (1 + TAKE_PROFIT) ||
        close <= entryRef * (1 - STOP_LOSS) ||
        barsHeld >= MAX_HOLD_BARS;
      if (exit) {
        return [{ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    entryRef = null;
    barsHeld = 0;
    if (barsSeen < EMA_SPAN || ema === null) return [];
    if (close < ema * (1 - DIP)) {
      let slice = SLICE;
      if (state.cash < slice) slice = state.cash;
      const room = state.weightRoom(symbol);
      if (room < slice) slice = room;
      if (slice <= 0n || slice < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      pendingRef = close;
      return [{ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
