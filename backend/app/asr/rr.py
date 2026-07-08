"""Respiratory-rate estimation from a breathing signal.

The phone samples a value per video frame (e.g. the mean brightness/motion of the
chest region while the child breathes) and sends the time series here. We detrend
it and run autocorrelation to find the dominant period inside the plausible
paediatric breathing band, converting that to breaths per minute.

Pure signal processing (no ML model, no external deps) so it runs anywhere,
including as an on-device fallback. It is an *assistive estimate*: the deterministic
IMCI engine still expects the clinician to confirm the count.
"""

from typing import List

# Plausible paediatric respiratory band (breaths/min).
RR_MIN = 15
RR_MAX = 90


def _detrend(xs: List[float]) -> List[float]:
    n = len(xs)
    mean = sum(xs) / n
    return [x - mean for x in xs]


def estimate_rr(samples: List[float], fps: float) -> dict:
    """Estimate breaths/min from a per-frame breathing signal."""
    n = len(samples)
    if fps <= 0 or n < int(fps * 4):  # need ~4s of signal
        return {"ok": False, "rr": None, "confidence": 0.0,
                "reason": "Not enough signal — hold steady for at least ~15 seconds."}

    x = _detrend([float(s) for s in samples])
    energy = sum(v * v for v in x)
    if energy <= 1e-9:
        return {"ok": False, "rr": None, "confidence": 0.0,
                "reason": "Signal too flat — reframe on the chest and keep still."}

    # Search integer lags corresponding to the RR band.
    lag_min = max(1, int(round(fps * 60.0 / RR_MAX)))
    lag_max = min(n - 1, int(round(fps * 60.0 / RR_MIN)))
    if lag_max <= lag_min:
        return {"ok": False, "rr": None, "confidence": 0.0, "reason": "Recording too short."}

    best_lag, best_corr = 0, 0.0
    for lag in range(lag_min, lag_max + 1):
        corr = sum(x[i] * x[i + lag] for i in range(n - lag))
        norm = corr / energy  # normalized autocorrelation (0..1 for a strong period)
        if norm > best_corr:
            best_corr, best_lag = norm, lag

    if best_lag == 0 or best_corr < 0.15:
        return {"ok": False, "rr": None, "confidence": round(best_corr, 2),
                "reason": "No clear breathing rhythm detected — try again."}

    rr = 60.0 * fps / best_lag
    return {
        "ok": True,
        "rr": int(round(rr)),
        "confidence": round(min(best_corr, 1.0), 2),
        "method": "autocorrelation",
        "note": "Assistive estimate — confirm by counting for one minute.",
    }
