# Parse Trimble Components Sheet text -> JSON + trimble-components-catalog.js
param(
  [string]$InputPath = "..\data\sources\trimble-components-sheet-2026-rev-e.txt",
  [string]$JsonPath = "..\data\trimble-components-catalog.json",
  [string]$JsPath = "..\data\trimble-components-catalog.js"
)

function Is-PartNumber([string]$p) {
  if (-not $p) { return $false }
  if ($p.Length -gt 45) { return $false }
  if ($p -match '^(Software|Optical|Submersible|Display|Controllers|Base|Rover|Trimble|Includes|Minimum|Requires|NOTE|A|B|C|D|E|F|G|H|I|J|K|L|M)$') { return $false }
  if ($p -match '\d') { return $true }
  if ($p -match '^(SCS900|SITEWORKS|TDL|CON-|GW-|MAR-|HH-|TSV-|SPS|SX12|TABV)') { return $true }
  return $false
}

function Get-Category([string]$section, [string]$desc, [string]$part) {
  $s = $section.ToLower()
  $d = $desc.ToLower()
  $p = $part.ToUpper()
  if ($s -match 'software' -or $p -match '^SCS900|^SITEWORKS|^TSV-' -or $d -match 'license|subscription|starter edition|integration module|option -|licensing') { return 'software' }
  if ($d -match '^kit -|^kit-|kit-install|kit - install' -or $p -match '^160005|^160015|^132563') { return 'kit' }
  if ($s -match 'data collector' -or $p -match '^TSC|^TDC|^T70|^114050') { return 'display' }
  if ($s -match 'display mount' -or $d -match 'td\d{3}|touch display|field tablet') { return 'display' }
  if ($s -match 'gnss|ms receiver' -or $d -match 'receiver|smart antenna|gnss|ms9') { return 'gnss' }
  if ($s -match 'coil cable' -or $d -match '^cable -|^cable,|extender cable|adapter cable' -or $p -match '^1504|^58957|^150878') { return 'cabling' }
  if ($d -match 'harness') { return 'harness' }
  if ($s -match 'bracket|mounting|poles|tripod|prism' -or $d -match 'bracket|mount|tripod|mast mount') { return 'bracket' }
  if ($s -match 'radio|tdl' -or $d -match 'radio|modem|tdl\d|snr\d|snm94') { return 'radio' }
  if ($d -match 'sensor|tracer|laser receiver|valve module|aa510|vm510|gs5|sonic|lr410|st400') { return 'sensor' }
  if ($d -match '^fru -' -or $p -match '^520435|^100435|^200435') { return 'fru' }
  if ($d -match 'install') { return 'install' }
  return 'misc'
}

$text = Get-Content $InputPath -Raw -Encoding UTF8
$lines = $text -split "`n" | ForEach-Object { $_.Trim() }
$partRe = '^(?:[A-Z]{2,}[\w\-]*|[\d]{3,}[\w\-]*)$'
$skipRe = '^(https?://|#|----|Rev |Trimble Components|Always verify|This document|Click HERE|\d+$|\[|•|\\-|SPS \(Site|Trimble Earthworks|Trimble Roadworks|Trimble Groundworks|Trimble Marine)'

$entries = @()
$section = "General"
$i = 0

while ($i -lt $lines.Count) {
  $line = $lines[$i]
  if ($line -match '^#\s*(.+)$') {
    $section = $Matches[1].Trim()
    $i++
    continue
  }
  if (-not $line -or $line -match $skipRe) {
    $i++
    continue
  }
  if ($line -match $partRe -and (Is-PartNumber $line)) {
    $part = $line
    $descParts = @()
    $j = $i + 1
    while ($j -lt $lines.Count) {
      $next = $lines[$j]
      if (-not $next) {
        $j++
        if ($descParts.Count -gt 0) { break }
        continue
      }
      if ($next -match '^#' -or $next -match '^-----' -or ((Is-PartNumber $next) -and $next -match $partRe)) {
        break
      }
      if ($next -match $skipRe) {
        $j++
        continue
      }
      $descParts += $next
      $j++
      if ($descParts.Count -ge 2) { break }
    }
    $desc = ($descParts -join " ").Trim() -replace '\s+', ' '
    if ($desc.Length -gt 2 -and $desc -notmatch '&#9;') {
      $cat = Get-Category $section $desc $part
      $entries += [ordered]@{
        part = $part
        description = $desc
        section = $section
        category = $cat
      }
    }
    $i = if ($j -gt $i + 1) { $j } else { $i + 1 }
    continue
  }
  $i++
}

$seen = @{}
$unique = @()
foreach ($e in $entries) {
  $key = $e.part.ToUpper()
  if ($seen.ContainsKey($key)) { continue }
  $seen[$key] = $true
  $unique += $e
}

$unique | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $JsonPath

$js = @"
/* Trimble Components Sheet Rev E (July 2026) — parsed catalog for grouping/BOM lookup. */
(function () {
  "use strict";
  window.TRIMBLE_COMPONENTS_CATALOG = {
    source: "Trimble Components Sheet_2026 Rev E",
    sourceId: "1sXZFnvv8vgkTg5xXq4pIEapB_tjpgKWFb2M7AqN2Wqg",
    entryCount: $($unique.Count),
    entries: 
"@

$jsonCompact = ($unique | ConvertTo-Json -Compress -Depth 4)
$js += $jsonCompact
$js += @"

  };
})();
"@

$js | Out-File -Encoding utf8 $JsPath
Write-Host "Entries:" $unique.Count
Write-Host "Software:" ($unique | Where-Object { $_.category -eq 'software' }).Count
