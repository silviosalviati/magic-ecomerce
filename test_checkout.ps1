$baseUrl = "https://magic-ecomerce-api-731025483706.us-central1.run.app"
Write-Host "Fetching products..."
$products = Invoke-RestMethod -Uri "$baseUrl/products"

$targetProduct = $null
$targetVariant = $null

foreach ($p in $products) {
    if ($null -ne $p.variants -and $p.variants.Count -gt 0 -and $p.basePrice -gt 0) {
        $targetProduct = $p
        $targetVariant = $p.variants[0]
        break
    }
}

if ($null -eq $targetProduct) {
    Write-Error "No suitable product found."
    exit 1
}

Write-Host "Found product: $($targetProduct.name) with variant ID: $($targetVariant.id)"

$payload = @{
    name = "Teste Checkout"
    email = "silviosalviati@gmail.com"
    cpf = "39053344705"
    items = @(
        @{
            variantId = $targetVariant.id
            quantity = 1
            priceAtPurchase = [double]$targetProduct.basePrice
        }
    )
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10
Write-Host "Sending POST to /checkout..."

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/checkout" -Method Post -Body $jsonPayload -ContentType "application/json" -ErrorAction Stop
    $statusCode = $response.StatusCode
    $body = $response.Content
} catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
    } else {
        $statusCode = "Error"
        $body = $_.Exception.Message
    }
}

Write-Host "HTTP Status: $statusCode"
Write-Host "Response Body (first 500 chars):"
Write-Host ($body.Substring(0, [Math]::Min(500, $body.Length)))

$hasPixQrCode = $body.Contains("pixQrCode")
$hasPixCopyPaste = $body.Contains("pixCopyPaste")

Write-Host "`nContains pixQrCode: $hasPixQrCode"
Write-Host "Contains pixCopyPaste: $hasPixCopyPaste"
