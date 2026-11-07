# Builds the planner from src/ into one HTML file.
#
#   powershell -ExecutionPolicy Bypass -File build.ps1            # katoplanner.html
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Release   # dist/index.html
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Check     # type-check only
#
# src/planner.html is the page; each line of it reading `@include <path>` is
# replaced by that file (relative to src/), so the order of those lines is the
# order the code runs in. The result, katoplanner.html, is the readable
# planner with every comment: it is generated, so edit src/, never it.
# serve.ps1 runs this before serving it, so reloading the preview shows an edit.
#
# -Release builds what is published: the Help is rebuilt first (so a
# [NOTE: ...] in help-guide.md stops it), and the script is wrapped in one
# function, so the planner's names stay out of the page's global scope. Only
# window.__planner (src/js/test-hook.js) is left there, for the test suites.
# The script and the CSS are then minified with esbuild (fetched into tools/
# on first use). The markup is left as written.
#
# -Check (and every -Release, first) type-checks the scripts with TypeScript's
# tsc, fetched into tools/ like esbuild: the source stays plain JavaScript,
# checked as it is, with JSDoc types where inference falls short. The files
# go to tsc in their run order, as one script, so they see each other as the
# page does. The settings are lenient (not strict); src/types.d.ts declares
# what JSDoc can't. Any error stops the build.
#
# src/catalog/ is the catalogue as data: each file holds only
# `const NAME = <value>;` statements whose values are plain literals (objects,
# arrays, strings, numbers, true/false/null), with comments. A number may be
# written as arithmetic on numbers (`curveR:718-12.5`), to show where it comes
# from. No code, no references to other names, so the data can be read,
# checked or replaced without running the planner.
#
# Refuses to write anything if an included file is missing, included twice,
# if a .js or .css file under src/ isn't included at all, or if a catalogue
# file holds anything but data.
param(
  [string]$Out,
  [switch]$Release,
  [switch]$Check
)
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$src = Join-Path $PSScriptRoot 'src'
if(-not $Out){ $Out = if($Release){ "$PSScriptRoot\dist\index.html" } else { "$PSScriptRoot\katoplanner.html" } }

if($Release){
  & "$PSScriptRoot\build-help.ps1" | Out-Host
  if($LASTEXITCODE){ throw "build: the Help build stopped the release (exit $LASTEXITCODE)" }
}

# The build tools, pinned: each is fetched once into tools/ (git-ignored) from
# npm's registry and checked against the checksum npm publishes for it. Both
# are single programs, so nothing else is installed and Node isn't needed.
$tools = @{
  esbuild = @{ dir = 'esbuild-0.28.2'; exe = 'esbuild.exe'
    url = 'https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.28.2.tgz'
    sha512 = '5ebpxr3nWMzrL/rnUI755Jkuee0bHL/Gq0WTF9lvcpv73wAp5eu8MfBUgWK9bhWvZjj7yX8etf/8tI8Ney695g==' }
  tsc = @{ dir = 'typescript-7.0.2'; exe = 'lib\tsc.exe'
    url = 'https://registry.npmjs.org/@typescript/typescript-win32-x64/-/typescript-win32-x64-7.0.2.tgz'
    sha512 = '0BQ3HkAHHlKLSp1qRvf3SUhGpGsDuhB/jgFw75guyqbxJqEaS0Cw/VFO8i2nHglJUzQCRtMMR/IBAKE3ETMC4g==' }
}
function Get-Tool([string]$name){
  $t = $tools[$name]
  $dir = Join-Path $PSScriptRoot "tools\$($t.dir)"
  $exe = Join-Path $dir $t.exe
  if(Test-Path $exe){ return $exe }
  $dl = Join-Path $PSScriptRoot 'tools\_download'
  [void][IO.Directory]::CreateDirectory($dl)
  $tgz = Join-Path $dl ([IO.Path]::GetFileName($t.url))
  "Fetching $name from $($t.url)" | Out-Host
  Invoke-WebRequest -UseBasicParsing -Uri $t.url -OutFile $tgz
  $sha = [IO.File]::OpenRead($tgz)
  try { $hash = [Convert]::ToBase64String([Security.Cryptography.SHA512]::Create().ComputeHash($sha)) } finally { $sha.Close() }
  if($hash -ne $t.sha512){ Remove-Item $tgz; throw "build: $name download doesn't match its published checksum; nothing kept" }
  [void][IO.Directory]::CreateDirectory($dir)
  # Windows' own tar by path: Git's tar, if first on PATH, reads D: as a host.
  & (Join-Path $env:SystemRoot 'System32\tar.exe') -xzf $tgz -C $dir --strip-components=1
  if($LASTEXITCODE -or -not (Test-Path $exe)){ throw "build: couldn't unpack $name" }
  return $exe
}

# Minifies $text (loader 'js' or 'css') with esbuild. Through files, not a
# pipe: Windows PowerShell would re-encode piped text and lose non-ASCII.
function Minify([string]$text, [string]$loader){
  $esbuild = Get-Tool 'esbuild'
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("planner-build-" + [Guid]::NewGuid())
  [void][IO.Directory]::CreateDirectory($tmp)
  try {
    $in = Join-Path $tmp "in.$loader"; $out = Join-Path $tmp "out.$loader"
    [IO.File]::WriteAllText($in, $text, $enc)
    & $esbuild $in --minify --charset=utf8 --legal-comments=none --log-level=warning "--outfile=$out"
    if($LASTEXITCODE){ throw "build: esbuild failed on the $loader" }
    return [IO.File]::ReadAllText($out, $enc)
  } finally { Remove-Item -Recurse -Force $tmp }
}

# The released script: the planner's scripts, in order, inside one function,
# minified. Comments go, and the names inside the function are shortened.
function Release-Script([string]$js){
  $min = Minify ("(()=>{`n" + $js + "})();`n") 'js'
  if($min -match '(?i)</script'){ throw 'build: the minified script contains </script, which would end it early' }
  return $min
}

function Read-Text([string]$path){ return [IO.File]::ReadAllText($path, $enc) }

# Throws unless $text is only `const NAME = <literal>;` statements. Without
# names, calls or templates, a value can only be a literal, its numbers
# perhaps written as arithmetic.
function Assert-Data([string]$rel, [string]$text){
  $tokens = [regex]::Matches($text,
    '(?s)//[^\n]*|/\*.*?\*/|''(?:\\.|[^''\\\n])*''|"(?:\\.|[^"\\\n])*"|-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|[A-Za-z_$][\w$]*|\s+|.')
  $t = @($tokens | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch '^(\s+|//.*|/\*[\s\S]*)$' })
  $state = 'start'
  for($i = 0; $i -lt $t.Count; $i++){
    $tok = $t[$i]; $next = if($i + 1 -lt $t.Count){ $t[$i + 1] } else { '' }
    $bad = "build: $rel is catalogue data, but has '$tok' near token $i (only plain values are allowed)"
    switch($state){
      'start' { if($tok -ne 'const'){ throw $bad }; $state = 'name' }
      'name'  { if($tok -notmatch '^[A-Za-z_$][\w$]*$' -or $next -ne '='){ throw $bad }; $i++; $state = 'value' }
      'value' {
        if($tok -eq ';'){ $state = 'start' }
        elseif($tok -match '^[A-Za-z_$][\w$]*$'){
          if($next -ne ':' -and ($tok -notin 'true','false','null' -or $next -eq '(')){ throw $bad }
        }
        elseif($tok -notmatch '^(''|"|-?\d)' -and $tok -notin '[',']','{','}',':',',','(',')','+','-','*','/'){ throw $bad }
      }
    }
  }
  if($state -ne 'start'){ throw "build: $rel ends inside a statement" }
}

$template = (Read-Text (Join-Path $src 'planner.html')).Split("`n")
$sb = New-Object System.Text.StringBuilder
$used = @{}
$scripts = New-Object System.Collections.Generic.List[string]   # in run order, for tsc
$js = New-Object System.Text.StringBuilder   # -Release: the script, gathered
for($i = 0; $i -lt $template.Count; $i++){
  $line = $template[$i]
  if($js.Length -and $line -notmatch '^@include '){
    [void]$sb.Append((Release-Script $js.ToString())); [void]$js.Clear()
  }
  if($line -match '^@include (\S+)$'){
    $rel = $Matches[1]
    $file = Join-Path $src $rel
    if(-not (Test-Path $file -PathType Leaf)){ throw "build: $rel is included but doesn't exist" }
    if($used[$rel]){ throw "build: $rel is included twice" }
    $used[$rel] = $true
    $text = Read-Text $file
    if(-not $text.EndsWith("`n")){ throw "build: $rel must end with a newline" }
    if($rel.StartsWith('catalog/')){ Assert-Data $rel $text }
    if($rel.EndsWith('.js')){ $scripts.Add($file) }
    if($Release -and $rel.EndsWith('.js')){ [void]$js.Append($text) }
    elseif($Release -and $rel.EndsWith('.css')){
      $css = Minify $text 'css'
      if($css -match '(?i)</style'){ throw "build: minified $rel contains </style" }
      [void]$sb.Append($css)
    }
    else { [void]$sb.Append($text) }
  } else {
    [void]$sb.Append($line)
    if($i -lt $template.Count - 1){ [void]$sb.Append("`n") }
  }
}

$all = Get-ChildItem $src -Recurse -File -Include *.js, *.css | ForEach-Object {
  $_.FullName.Substring($src.Length + 1).Replace('\', '/')
}
$unused = @($all | Where-Object { -not $used[$_] })
if($unused.Count){ throw "build: not included in src/planner.html: $($unused -join ', ')" }

if($Check -or $Release){
  $tsc = Get-Tool 'tsc'
  $result = & $tsc --noEmit --allowJs --checkJs --strict false --target es2023 `
    --lib 'es2023,dom,dom.iterable' --skipLibCheck --pretty false (Join-Path $src 'types.d.ts') $scripts
  if($LASTEXITCODE){
    $result | Out-Host
    throw "build: the type-check found errors; nothing written"
  }
  "Type-check: no errors in $($scripts.Count) scripts." | Out-Host
  if($Check -and -not $Release){ return }
}

$Out = [IO.Path]::GetFullPath($Out)
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Out))
[IO.File]::WriteAllText($Out, $sb.ToString(), $enc)
"Built $([IO.Path]::GetFileName($Out)) from $($used.Count) files."
