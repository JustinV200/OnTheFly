param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("audit", "build", "integrate", "hard")]
    [string]$Mode,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$Task
)

$ErrorActionPreference = "Stop"
$Repo = $PSScriptRoot

switch ($Mode) {
    "audit" {
        $Model = "gpt-5.6-luna"
        $Reasoning = "low"
        $Sandbox = "read-only"

        $Instructions = @"
This is a read-only inspection task.
Do not modify files.
Search only what is needed.
Keep the answer concise.
"@
    }

    "build" {
        $Model = "gpt-5.6-terra"
        $Reasoning = "medium"
        $Sandbox = "workspace-write"

        $Instructions = @"
Implement only the assigned task.
Do not start another roadmap item.
Prefer the smallest complete patch.
Run targeted tests.
Do not commit or push.
"@
    }

    "integrate" {
        $Model = "gpt-5.6-sol"
        $Reasoning = "medium"
        $Sandbox = "workspace-write"

        $Instructions = @"
Inspect the relevant end-to-end path.
Fix only concrete integration problems.
Do not redesign unrelated code.
Run relevant tests.
Do not commit or push.
"@
    }

    "hard" {
        $Model = "gpt-6-astra"
        $Reasoning = "medium"
        $Sandbox = "workspace-write"

        $Instructions = @"
Use this mode only for a genuinely difficult or ambiguous problem.
Diagnose before editing.
Make the narrowest safe fix.
Run relevant tests.
Do not commit or push.
"@
    }
}

$Prompt = @"
Read AGENTS.md first.

$Instructions

TASK:
$Task

At completion report only:
1. What you found or changed
2. Tests/results
3. Files changed
4. Any blocker
"@

Write-Host ""
Write-Host "Mode:      $Mode"
Write-Host "Model:     $Model"
Write-Host "Reasoning: $Reasoning"
Write-Host "Sandbox:   $Sandbox"
Write-Host ""

codex exec `
    --cd $Repo `
    --model $Model `
    --sandbox $Sandbox `
    --config "model_reasoning_effort=`"$Reasoning`"" `
    --config 'web_search="disabled"' `
    $Prompt

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}