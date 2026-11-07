# Rebuilds the planner's Help popup (`help.body.html` in src/js/strings.js)
# from help-guide.md. The notation is described at the top of help-guide.md.
# Then build.ps1 (or a reload through serve.ps1) puts it in the page.
#
#   powershell -ExecutionPolicy Bypass -File build-help.ps1
#
# Refuses to write anything if the Markdown holds a [NOTE: …] (those are
# requests to raise, not text to publish) or if strings.js's markers
# aren't found exactly once.
param(
  [string]$Guide = "$PSScriptRoot\help-guide.md",
  [string]$App   = "$PSScriptRoot\src\js\strings.js"
)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$md = [IO.File]::ReadAllText($Guide, $enc) -replace "`r`n", "`n"

# Drop the title and the editing notes: everything before the first section.
$first = $md.IndexOf("`n## ")
if($first -lt 0){ throw "No '## ' sections found in $Guide" }
$md = $md.Substring($first + 1)

$notes = [regex]::Matches($md, '\[NOTE:[^\]]*\]')
if($notes.Count){ "Found notes to raise; nothing written:"; $notes | ForEach-Object { "  " + $_.Value }; exit 2 }

function Inline([string]$s){
  $s = $s.Replace('&','&amp;').Replace('<','&lt;').Replace('>','&gt;')
  # Colour swatches.
  $s = [regex]::Replace($s, '\{(#[0-9a-fA-F]{3,6}) to (#[0-9a-fA-F]{3,6})\}\s?', '<span class="swatch" style="background:linear-gradient(90deg,$1,$2)"></span>')
  $s = [regex]::Replace($s, '\{dot (#[0-9a-fA-F]{3,6})\}\s?', '<span class="swatch dot" style="background:$1"></span>')
  $s = [regex]::Replace($s, '\{(#[0-9a-fA-F]{3,6}) border (#[0-9a-fA-F]{3,6})\}\s?', '<span class="swatch" style="background:$1;border-color:$2"></span>')
  $s = [regex]::Replace($s, '\{(#[0-9a-fA-F]{3,6})\}\s?', '<span class="swatch" style="background:$1"></span>')
  # Keys and bold.
  $s = [regex]::Replace($s, '\[([^\[\]]{1,12})\]', '<kbd>$1</kbd>')
  $s = [regex]::Replace($s, '\*\*(.+?)\*\*', '<strong>$1</strong>')
  # Numbers keep their units: 248 mm, 250 x 250 (× is the times sign;
  # written as an escape because Windows PowerShell reads this file as ANSI).
  $s = [regex]::Replace($s, '(\d) (mm|×)', '$1&nbsp;$2')
  $s = [regex]::Replace($s, '(×) (\d)', '$1&nbsp;$2')
  return $s.Trim()
}
function Cells([string]$line){
  $c = $line.Trim()
  if($c.StartsWith('|')){ $c = $c.Substring(1) }
  if($c.EndsWith('|')){ $c = $c.Substring(0, $c.Length-1) }
  return $c.Split('|') | ForEach-Object { $_.Trim() }
}

$sections = @()
$current = $null
$block = New-Object System.Collections.Generic.List[string]
function Flush-Block {
  if(-not $script:block.Count -or -not $script:current){ $script:block.Clear(); return }
  $lines = @($script:block)
  $out = $script:current.Html
  if($lines.Count -eq 1 -and $lines[0].Trim() -match '^\{button ([\w-]+) (.+)\}$'){
    # A button that opens another window (HELP_OPENS in katoplanner.html).
    $out.Add("        <p><button type=`"button`" class=`"hdrbtn`" data-help-open=`"$($Matches[1])`">$(Inline $Matches[2])</button></p>")
  } elseif($lines[0].TrimStart().StartsWith('|')){
    foreach($l in ($lines | Select-Object -Skip 2)){        # header and |---| rows
      $c = @(Cells $l)
      $out.Add("        <div class=`"help-row`"><span class=`"keys`">$(Inline $c[0])</span><span class=`"desc`">$(Inline ($c[1..($c.Count-1)] -join ' | '))</span></div>")
    }
  } elseif($lines[0] -match '^\d+\.\s'){
    $out.Add('        <ol>')
    foreach($l in $lines){ $out.Add("          <li>$(Inline ($l -replace '^\d+\.\s+',''))</li>") }
    $out.Add('        </ol>')
  } elseif($lines[0] -match '^[-*]\s'){
    $out.Add('        <ul>')
    foreach($l in $lines){ $out.Add("          <li>$(Inline ($l -replace '^[-*]\s+',''))</li>") }
    $out.Add('        </ul>')
  } else {
    $out.Add("        <p>$(Inline ($lines -join ' '))</p>")
  }
  $script:block.Clear()
}
foreach($line in $md.Split("`n")){
  if($line -match '^##\s+(.+?)\s*(\{#([\w-]+)\})?\s*$'){
    Flush-Block
    $title = $Matches[1]
    $id = if($Matches[3]){ $Matches[3] } else { 'help-' + (($title.ToLower() -replace '[^a-z0-9]+','-').Trim('-')) }
    $current = [pscustomobject]@{ Title=$title; Id=$id; Html=(New-Object System.Collections.Generic.List[string]) }
    $sections += $current
  } elseif($line.Trim() -eq ''){
    Flush-Block
  } else {
    $block.Add($line)
  }
}
Flush-Block

$ids = $sections | ForEach-Object Id
$dupes = $ids | Group-Object | Where-Object Count -gt 1
if($dupes){ throw "Duplicate section ids: $($dupes.Name -join ', ')" }

$html = New-Object System.Collections.Generic.List[string]
$html.Add("    'help.body.html': ``<div class=`"help-layout`">")
$html.Add('      <nav class="help-nav" aria-label="Guide sections">')
foreach($s in $sections){ $html.Add("        <a href=`"#$($s.Id)`">$(Inline $s.Title)</a>") }
$html.Add('      </nav>')
$html.Add('      <div class="help-content">')
foreach($s in $sections){
  $html.Add('')
  $html.Add("      <section id=`"$($s.Id)`">")
  $html.Add("        <h3>$(Inline $s.Title)</h3>")
  $s.Html | ForEach-Object { $html.Add($_) }
  $html.Add('      </section>')
}
$html.Add('')
$html.Add('      </div>')
$html.Add('    </div>`,')
$html.Add('')
$body = ($html -join "`n") + "`n"
if($body.Contains('${') -or ($body.Split('`').Count - 1) -ne 2){ throw 'The guide contains a backtick or ${, which would break the string' }

$appText = [IO.File]::ReadAllText($App, $enc)   # (PowerShell names ignore case: not $app)
$start = "    'help.body.html':"; $end = "    'dialog.cancel':"
$s1 = $appText.IndexOf($start); $e1 = $appText.IndexOf($end)
if($s1 -lt 0 -or $e1 -lt $s1 -or $appText.IndexOf($start, $s1+1) -ge 0 -or $appText.IndexOf($end, $e1+1) -ge 0){ throw 'help.body.html markers not found exactly once; nothing written' }
$appText = $appText.Substring(0, $s1) + $body + $appText.Substring($e1)
[IO.File]::WriteAllText($App, $appText, $enc)
"Rebuilt Help: $($sections.Count) sections, $(($html | Where-Object { $_ -match 'help-row' }).Count) control rows."
