// The agent benchmark's published results, written by bench/summarize.mjs from the raw runs
// in bench/results/. Don't edit by hand: rerun the benchmark (bench/README.md).

type Metrics = { toolCalls: number; textRead: number; seconds: number; tokens: number }
type Approach = "browser" | "bridge"
type BenchmarkTask = {
  id: string
  name: string
  prompt: string
  runs: { approach: Approach; ok: boolean; metrics: Metrics }[]
  median: Record<Approach, Metrics>
  completed: Record<Approach, string>
}
type Benchmark = {
  date: string
  model: string
  headline: string
  summary: { label: string; value: string }[]
  tasks: BenchmarkTask[]
}

const benchmark: Benchmark | null = {
  "date": "2026-11-15",
  "model": "Claude Sonnet 5.5",
  "headline": "Across 3 tasks on UISet's kits, agents using the bridge made 40% fewer tool calls, read 79% less text and finished 40% sooner than agents using browser tools, and every run of both finished its task (medians of 3 runs each).",
  "summary": [
    {
      "label": "Tool calls",
      "value": "−40%"
    },
    {
      "label": "Text read",
      "value": "−79%"
    },
    {
      "label": "Time",
      "value": "−40%"
    }
  ],
  "tasks": [
    {
      "id": "settings",
      "name": "Project settings",
      "prompt": "Rename the project to Atlas, make it public, move it to Europe, turn on the weekly digest, and save the project.",
      "runs": [
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 10,
            "textRead": 3895,
            "seconds": 30.7,
            "tokens": 68921
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 10,
            "textRead": 3895,
            "seconds": 20.1,
            "tokens": 68930
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 10,
            "textRead": 3895,
            "seconds": 20.5,
            "tokens": 68916
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 2976,
            "seconds": 25.1,
            "tokens": 68397
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 2976,
            "seconds": 16.2,
            "tokens": 68399
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 3,
            "textRead": 1641,
            "seconds": 14.2,
            "tokens": 67666
          }
        }
      ],
      "median": {
        "browser": {
          "toolCalls": 10,
          "textRead": 3895,
          "seconds": 20.5,
          "tokens": 68921
        },
        "bridge": {
          "toolCalls": 6,
          "textRead": 2976,
          "seconds": 16.2,
          "tokens": 68397
        }
      },
      "completed": {
        "browser": "3 of 3",
        "bridge": "3 of 3"
      }
    },
    {
      "id": "grid",
      "name": "Data grid",
      "prompt": "In the Orders grid, show only the orders from Europe, sorted by amount from highest to lowest.",
      "runs": [
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 54343,
            "seconds": 29.3,
            "tokens": 73827
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 54322,
            "seconds": 17.9,
            "tokens": 74112
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 10,
            "textRead": 91183,
            "seconds": 24.8,
            "tokens": 74816
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 7,
            "textRead": 17348,
            "seconds": 24.7,
            "tokens": 72925
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 9700,
            "seconds": 15,
            "tokens": 72325
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 6,
            "textRead": 2470,
            "seconds": 13.5,
            "tokens": 68243
          }
        }
      ],
      "median": {
        "browser": {
          "toolCalls": 6,
          "textRead": 54343,
          "seconds": 24.8,
          "tokens": 74112
        },
        "bridge": {
          "toolCalls": 6,
          "textRead": 9700,
          "seconds": 15,
          "tokens": 72325
        }
      },
      "completed": {
        "browser": "3 of 3",
        "bridge": "3 of 3"
      }
    },
    {
      "id": "scheduler",
      "name": "Scheduler",
      "prompt": "Add a 30-minute event called Roadmap sync on Wednesday this week, starting at 10:00 AM.",
      "runs": [
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 10,
            "textRead": 15107,
            "seconds": 36.6,
            "tokens": 70429
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 14,
            "textRead": 21394,
            "seconds": 29.6,
            "tokens": 71547
          }
        },
        {
          "approach": "browser",
          "ok": true,
          "metrics": {
            "toolCalls": 11,
            "textRead": 17464,
            "seconds": 25.1,
            "tokens": 70538
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 3,
            "textRead": 3661,
            "seconds": 19.1,
            "tokens": 68799
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 3,
            "textRead": 3661,
            "seconds": 13.1,
            "tokens": 68794
          }
        },
        {
          "approach": "bridge",
          "ok": true,
          "metrics": {
            "toolCalls": 3,
            "textRead": 3661,
            "seconds": 11.6,
            "tokens": 68779
          }
        }
      ],
      "median": {
        "browser": {
          "toolCalls": 11,
          "textRead": 17464,
          "seconds": 29.6,
          "tokens": 70538
        },
        "bridge": {
          "toolCalls": 3,
          "textRead": 3661,
          "seconds": 13.1,
          "tokens": 68794
        }
      },
      "completed": {
        "browser": "3 of 3",
        "bridge": "3 of 3"
      }
    }
  ]
}

export { benchmark }
export type { Benchmark, BenchmarkTask, Metrics }
