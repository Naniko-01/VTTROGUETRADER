New-Item -Path '.\release\RogueTrader-FoundryVTT-master' -ItemType Directory

Copy-Item -Path ".\asset" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\css" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\lang" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\logo" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\packs" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\script" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-Item -Path ".\template" -Destination ".\release\RogueTrader-FoundryVTT-master" -Recurse
Copy-item -Path ".\CONTRIBUTING.md" -Destination ".\release\RogueTrader-FoundryVTT-master"
Copy-item -Path ".\README.md" -Destination ".\release\RogueTrader-FoundryVTT-master"
Copy-item -Path ".\LICENSE" -Destination ".\release\RogueTrader-FoundryVTT-master"
Copy-item -Path ".\system.json" -Destination ".\release\RogueTrader-FoundryVTT-master"
Copy-item -Path ".\template.json" -Destination ".\release\RogueTrader-FoundryVTT-master"

$compress = @{
	Path = ".\release\*"
	CompressionLevel = "Optimal"
	DestinationPath = ".\rogue-trader.zip"
}
Compress-Archive @compress

Remove-Item '.\release' -Recurse