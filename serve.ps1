param(
  [int]$Port = 8787
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-JsonBytes {
  param(
    [Parameter(Mandatory = $true)]
    $Object
  )

  $json = $Object | ConvertTo-Json -Depth 100
  return [System.Text.Encoding]::UTF8.GetBytes($json)
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory = $true)]
    $Payload,
    [int]$StatusCode = 200
  )

  $bytes = Get-JsonBytes -Object $Payload
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Get-ContentType {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".css" { return "text/css; charset=utf-8" }
    ".html" { return "text/html; charset=utf-8" }
    ".ico" { return "image/x-icon" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".png" { return "image/png" }
    ".svg" { return "image/svg+xml; charset=utf-8" }
    default { return "application/octet-stream" }
  }
}

function Write-FileResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.HttpListenerResponse]$Response,
    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )

  if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
    Write-JsonResponse -Response $Response -Payload @{ error = "Not found" } -StatusCode 404
    return
  }

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $Response.StatusCode = 200
  $Response.ContentType = Get-ContentType -Path $FilePath
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Get-IsoMinutesAgo {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Minutes
  )

  return [DateTime]::UtcNow.AddMinutes(-$Minutes).ToString("o")
}

function Get-WindowObject {
  $end = [DateTime]::UtcNow
  $start = $end.AddHours(-6)

  return @{
    label = "6h"
    start = $start.ToString("o")
    end = $end.ToString("o")
  }
}

function Get-MetricCards {
  return @(
    @{
      key = "signal_velocity"
      label = "Signal Velocity"
      value = 78
      display = "78 / 100"
      unit = "score"
      delta_vs_prior_window = 6
      delta_direction = "up"
      status = "elevated"
      sparkline = @(62, 64, 67, 72, 71, 78)
      explain_path = "/api/explain/metric/signal_velocity?window=6h"
    },
    @{
      key = "volatility_index"
      label = "Volatility Index"
      value = 0.64
      display = "0.64"
      unit = "ratio"
      delta_vs_prior_window = 0.08
      delta_direction = "up"
      status = "elevated"
      sparkline = @(0.42, 0.45, 0.48, 0.59, 0.61, 0.64)
      explain_path = "/api/explain/metric/volatility_index?window=6h"
    },
    @{
      key = "source_diversity"
      label = "Source Diversity"
      value = 12
      display = "12 feeds"
      unit = "count"
      delta_vs_prior_window = 2
      delta_direction = "up"
      status = "healthy"
      sparkline = @(9, 9, 10, 11, 11, 12)
      explain_path = "/api/explain/metric/source_diversity?window=6h"
    },
    @{
      key = "correction_rate"
      label = "Correction Rate"
      value = 0.09
      display = "9%"
      unit = "percent"
      delta_vs_prior_window = -0.03
      delta_direction = "down"
      status = "improving"
      sparkline = @(0.16, 0.15, 0.13, 0.12, 0.11, 0.09)
      explain_path = "/api/explain/metric/correction_rate?window=6h"
    },
    @{
      key = "cross_source_coherence"
      label = "Cross-Source Coherence"
      value = 0.57
      display = "0.57"
      unit = "ratio"
      delta_vs_prior_window = 0.05
      delta_direction = "up"
      status = "mixed"
      sparkline = @(0.41, 0.43, 0.46, 0.49, 0.53, 0.57)
      explain_path = "/api/explain/metric/cross_source_coherence?window=6h"
    },
    @{
      key = "uncertainty_index"
      label = "Uncertainty Index"
      value = 0.38
      display = "0.38"
      unit = "ratio"
      delta_vs_prior_window = -0.04
      delta_direction = "down"
      status = "moderate"
      sparkline = @(0.52, 0.49, 0.47, 0.44, 0.41, 0.38)
      explain_path = "/api/explain/metric/uncertainty_index?window=6h"
    }
  )
}

function Get-EventItems {
  return @(
    @{
      event_id = "evt_001"
      cluster_id = "cl_lev_2201"
      observed_at = Get-IsoMinutesAgo -Minutes 14
      region = "Levant"
      category = "security"
      summary = "Multiple outlets report temporary airspace restrictions while the operating status is clarified."
      severity = "high"
      confidence = 0.62
      source_count = 4
      confirmation_state = "emerging"
      correction_state = "none"
      detail_path = "/api/events?window=6h&event_id=evt_001"
    },
    @{
      event_id = "evt_002"
      cluster_id = "cl_gulf_9911"
      observed_at = Get-IsoMinutesAgo -Minutes 42
      region = "Gulf"
      category = "diplomacy"
      summary = "Foreign ministry statement confirms technical talks are scheduled later this week."
      severity = "medium"
      confidence = 0.81
      source_count = 3
      confirmation_state = "confirmed_multi_source"
      correction_state = "none"
      detail_path = "/api/events?window=6h&event_id=evt_002"
    },
    @{
      event_id = "evt_003"
      cluster_id = "cl_eu_3410"
      observed_at = Get-IsoMinutesAgo -Minutes 63
      region = "Central Europe"
      category = "infrastructure"
      summary = "Rail operator reports a regional signaling disruption with rolling service recovery."
      severity = "medium"
      confidence = 0.76
      source_count = 5
      confirmation_state = "confirmed_multi_source"
      correction_state = "clarified"
      detail_path = "/api/events?window=6h&event_id=evt_003"
    },
    @{
      event_id = "evt_004"
      cluster_id = "cl_pac_1204"
      observed_at = Get-IsoMinutesAgo -Minutes 91
      region = "Western Pacific"
      category = "maritime"
      summary = "Port authority warns of short-term congestion after weather-driven berth delays."
      severity = "low"
      confidence = 0.68
      source_count = 2
      confirmation_state = "single_source"
      correction_state = "none"
      detail_path = "/api/events?window=6h&event_id=evt_004"
    },
    @{
      event_id = "evt_005"
      cluster_id = "cl_na_5531"
      observed_at = Get-IsoMinutesAgo -Minutes 135
      region = "North America"
      category = "cyber"
      summary = "A managed service provider issues an advisory for elevated credential stuffing activity."
      severity = "high"
      confidence = 0.74
      source_count = 6
      confirmation_state = "confirmed_multi_source"
      correction_state = "none"
      detail_path = "/api/events?window=6h&event_id=evt_005"
    }
  )
}

function Get-CompositionItems {
  return @(
    @{
      key = "security"
      label = "Security incidents"
      count = 34
      cluster_count = 34
      share = 0.34
      display = "34%"
      event_path = "/api/events?window=6h&category=security"
    },
    @{
      key = "diplomacy"
      label = "Diplomatic updates"
      count = 29
      cluster_count = 29
      share = 0.29
      display = "29%"
      event_path = "/api/events?window=6h&category=diplomacy"
    },
    @{
      key = "infrastructure"
      label = "Infrastructure disruptions"
      count = 18
      cluster_count = 18
      share = 0.18
      display = "18%"
      event_path = "/api/events?window=6h&category=infrastructure"
    },
    @{
      key = "cyber"
      label = "Cyber advisories"
      count = 19
      cluster_count = 19
      share = 0.19
      display = "19%"
      event_path = "/api/events?window=6h&category=cyber"
    }
  )
}

function Get-DashboardFixture {
  $window = Get-WindowObject

  return @{
    meta = @{
      api_version = "1.0.0"
      generated_at = $window.end
      window = $window
      refresh_seconds = 300
      mode = "situational_awareness"
      predictive = $false
      timezone = "UTC"
    }
    banner = @{
      title = "Live Signals Overlay"
      subtitle = "Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow."
      disclaimer = "Non-predictive use only. This dashboard summarizes observed signals in the active window. It does not forecast outcomes or assign future probabilities."
    }
    metrics = @{
      cards = Get-MetricCards
    }
    composition = @{
      title = "Signal Composition"
      basis = "event_clusters"
      items = Get-CompositionItems
    }
    recent_events = @{
      title = "Recent Event Tape"
      sort = "observed_at_desc"
      items = Get-EventItems
    }
    notes = @{
      title = "Volatility Notes"
      items = @(
        "Volatility remains elevated due to dense update clustering in security and cyber lanes.",
        "Coherence improved after infrastructure clarifications reduced disagreement.",
        "This view is descriptive only and does not provide directional forecasts."
      )
    }
    method_snapshot = @{
      title = "Method Snapshot"
      items = @(
        "Time window: rolling 6 hours.",
        "Clusters are counted instead of individual headlines.",
        "Confidence scores represent evidence quality, not future certainty."
      )
    }
    system_status = @{
      ingestion = "healthy"
      notes = @()
    }
  }
}

function Get-HistoryFixture {
  return @{
    series = @{
      signal_velocity = @{
        baseline_24h_avg = 66
        baseline_7d_avg = 61
        points = @(62, 64, 67, 72, 71, 78)
      }
      volatility_index = @{
        baseline_24h_avg = 0.47
        baseline_7d_avg = 0.41
        points = @(0.42, 0.45, 0.48, 0.59, 0.61, 0.64)
      }
      source_diversity = @{
        baseline_24h_avg = 11
        baseline_7d_avg = 10
        points = @(9, 9, 10, 11, 11, 12)
      }
      correction_rate = @{
        baseline_24h_avg = 0.12
        baseline_7d_avg = 0.15
        points = @(0.16, 0.15, 0.13, 0.12, 0.11, 0.09)
      }
      cross_source_coherence = @{
        baseline_24h_avg = 0.49
        baseline_7d_avg = 0.45
        points = @(0.41, 0.43, 0.46, 0.49, 0.53, 0.57)
      }
      uncertainty_index = @{
        baseline_24h_avg = 0.44
        baseline_7d_avg = 0.49
        points = @(0.52, 0.49, 0.47, 0.44, 0.41, 0.38)
      }
    }
  }
}

function Get-ExplainPayload {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  $map = @{
    signal_velocity = @{
      label = "Signal Velocity"
      definition = "Weighted cluster activity score for the active window."
      drivers = @(
        @{
          cluster_id = "cl_lev_2201"
          headline = "Airspace restrictions under clarification"
          contribution = 0.1
        },
        @{
          cluster_id = "cl_na_5531"
          headline = "Credential activity advisory expands source participation"
          contribution = 0.07
        }
      )
      caveats = @(
        "Signal velocity describes observed throughput only.",
        "Velocity should not be interpreted as forecast direction."
      )
    }
    volatility_index = @{
      label = "Volatility Index"
      definition = "Measures dispersion across event intensity and correction cadence."
      drivers = @(
        @{
          cluster_id = "cl_lev_2201"
          headline = "Rapid update clustering is widening short-window variance"
          contribution = 0.08
        }
      )
      caveats = @("Volatility rises with update density, not just event severity.")
    }
    source_diversity = @{
      label = "Source Diversity"
      definition = "Counts distinct contributing feeds participating in qualified clusters."
      drivers = @(
        @{
          cluster_id = "cl_na_5531"
          headline = "Security advisory spread across provider, wire, and analyst feeds"
          contribution = 2
        }
      )
      caveats = @("More feeds improve breadth but do not guarantee correctness.")
    }
    correction_rate = @{
      label = "Correction Rate"
      definition = "Tracks how often the active window required clarifications or reversals."
      drivers = @(
        @{
          cluster_id = "cl_eu_3410"
          headline = "Transit operator clarified the original outage scope"
          contribution = 0.03
        }
      )
      caveats = @("A low correction rate does not imply high certainty by itself.")
    }
    cross_source_coherence = @{
      label = "Cross-Source Coherence"
      definition = "Estimates agreement across independent sources for the same cluster."
      drivers = @(
        @{
          cluster_id = "cl_gulf_9911"
          headline = "Diplomatic reporting aligned across official and media feeds"
          contribution = 0.06
        }
      )
      caveats = @("Coherence can fall when feeds are delayed rather than contradictory.")
    }
    uncertainty_index = @{
      label = "Uncertainty Index"
      definition = "Composite view of missing details, conflicting specifics, and source lag."
      drivers = @(
        @{
          cluster_id = "cl_lev_2201"
          headline = "Airspace notice still lacks final duration details"
          contribution = 0.05
        }
      )
      caveats = @("Lower uncertainty is still descriptive and not predictive.")
    }
  }

  if ($map.ContainsKey($Key)) {
    return $map[$Key]
  }

  return $map.signal_velocity
}

function Resolve-StaticPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RequestPath
  )

  $relativePath = if ($RequestPath -eq "/") { "index.html" } else { $RequestPath.TrimStart("/") }
  $candidate = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath $relativePath))
  if (-not $candidate.StartsWith($PSScriptRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Blocked path traversal."
  }

  return $candidate
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Live Signals app available at http://localhost:$Port/"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
      switch -Regex ($request.Url.AbsolutePath) {
        "^/api/health$" {
          Write-JsonResponse -Response $response -Payload @{ ok = $true; service = "live-signals-app" }
          continue
        }
        "^/api/dashboard$" {
          Write-JsonResponse -Response $response -Payload (Get-DashboardFixture)
          continue
        }
        "^/api/metrics/history$" {
          Write-JsonResponse -Response $response -Payload (Get-HistoryFixture)
          continue
        }
        "^/api/composition$" {
          $dashboard = Get-DashboardFixture
          Write-JsonResponse -Response $response -Payload @{
            title = $dashboard.composition.title
            items = $dashboard.composition.items
          }
          continue
        }
        "^/api/events$" {
          $dashboard = Get-DashboardFixture
          $category = $request.QueryString["category"]
          $items = if ([string]::IsNullOrWhiteSpace($category)) {
            $dashboard.recent_events.items
          } else {
            @($dashboard.recent_events.items | Where-Object { $_.category -eq $category })
          }
          Write-JsonResponse -Response $response -Payload @{
            title = $dashboard.recent_events.title
            items = $items
          }
          continue
        }
        "^/api/explain/metric/" {
          $key = ($request.Url.AbsolutePath -split "/")[-1]
          Write-JsonResponse -Response $response -Payload (Get-ExplainPayload -Key $key)
          continue
        }
        default {
          $path = Resolve-StaticPath -RequestPath $request.Url.AbsolutePath
          Write-FileResponse -Response $response -FilePath $path
          continue
        }
      }
    } catch {
      if ($response.OutputStream.CanWrite) {
        Write-JsonResponse -Response $response -Payload @{ error = $_.Exception.Message } -StatusCode 500
      }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
