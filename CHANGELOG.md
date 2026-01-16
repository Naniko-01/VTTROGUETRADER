# CHANGELOG

## 0.1.0

- Initial push of Rogue Trader based off of Dark Heresy 2E 4.1.2
- Renamed files and text from dark heresy to rogue trader
- Add weapon compendium pack
- Update packs in JSON to refere to 'type' instead of 'entity'
- Update System JSON 'author' to 'authors'

## 0.1.1

- Change acolyte to explorer
- Remove Influence characteristic
- Update skill calculations to reflect Rogue Trader with half of base stat for untrained
- Update skills to only have untrained (half stats), trained (+0), expert (+10), and veteran (+20)
- Fixed notes in items not updating and setup textEnrich for all note sections

## 0.1.2

- Update biography section to reflect rogue trader
- Added Rank as a calculated field based on experience spent
- Set starting xp to 5000 current and 4500 spent 

## 1.0.0

- Add ships as an item
- Update armour to inlcude other as a type
- Update skills to reflect RT
- Remove localization jsons for non english

## 1.0.1

- Fix NPC not launching (Issue #2)
- Added missing skills (Issue #3)
- Localized specialized skills

## 1.0.2

- Adjust attack action bonuses for rate of fire to reflect Rogue Trader

## 1.0.3

- Adjust Degrees of Success/Failure to reflect Rogue Trader calculations instead of Dark Heresy
- Fixed issue with hull name not saving for ship items

## 1.1.0

- Ship sheet refactoring by @LRemplakowski
- Ships are now actors instead of items. If updating from a previous version, this will wipe out any ships you had as items. 

## 1.1.1

- Corrected display of crew tab in ships to display for English
- Updated crew tab for ships to allow any crew spot to have an actor added
- Updated roll dialog for ship attacks to not include location
- Updated attack rolls for macrobatteries and lances to calculate hits on degrees of success correctly

## 1.1.2

- Hotfix from dependabot
- Changed max version to 11 after testing 12 and finding that no dice rolls work