# travel-guide

Create a practical travel guide from a natural-language trip intent and optional structured `trip` parameters.

## User-facing prompt

```text
$ultracode 帮我为第一次去京都的两位成人做 3 天旅游攻略，节奏轻松一点，包含雨天方案
```

## Optional Params

```json
{
  "trip": {
    "destination": "Kyoto, Japan",
    "durationDays": 3,
    "season": "spring",
    "travelers": "two adults visiting for the first time",
    "pace": "relaxed",
    "constraints": ["include rainy-day alternatives"]
  }
}
```

The runner writes the user's natural-language request into both `goal` and `intent`, then merges structured params over `param.template.json`.
