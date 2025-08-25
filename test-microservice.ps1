$testPayload = @"
{
  "UserId": 1,
  "Url": "",
  "HtmlContent": "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Test</title></head><body><h1>Test</h1></body></html>",
  "Tool": "axe-core",
  "WcagVersion": "2.2",
  "WcagLevel": "AA",
  "Options": "{\"includeRaw\": false}"
}
"@

Write-Host "Testing Analysis Microservice..."
Write-Host "Payload: $testPayload"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8082/api/analysis" -Method Post -Body $testPayload -ContentType "application/json"
    Write-Host "SUCCESS: Response received"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
