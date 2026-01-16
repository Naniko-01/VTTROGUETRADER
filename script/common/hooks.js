import { RogueTraderActor } from "./actor.js";
import { RogueTraderItem } from "./item.js";
import { ExplorerSheet } from "../sheet/actor/explorer.js";
import { ColonySheet } from "../sheet/actor/colony.js";
import { NpcSheet } from "../sheet/actor/npc.js";
import { WeaponSheet } from "../sheet/weapon.js";
import { AmmunitionSheet } from "../sheet/ammunition.js";
import { WeaponModificationSheet } from "../sheet/weapon-modification.js";
import { ArmourSheet } from "../sheet/armour.js";
import { ForceFieldSheet } from "../sheet/force-field.js";
import { CyberneticSheet } from "../sheet/cybernetic.js";
import { DrugSheet } from "../sheet/drug.js";
import { GearSheet } from "../sheet/gear.js";
import { ToolSheet } from "../sheet/tool.js";
import { CriticalInjurySheet } from "../sheet/critical-injury.js";
import { MalignancySheet } from "../sheet/malignancy.js";
import { MentalDisorderSheet } from "../sheet/mental-disorder.js";
import { MutationSheet } from "../sheet/mutation.js";
import { NavigatorSheet } from "../sheet/navigator.js";
import { PsychicPowerSheet } from "../sheet/psychic-power.js";
import { TalentSheet } from "../sheet/talent.js";
import { SpecialAbilitySheet } from "../sheet/special-ability.js";
import { TraitSheet } from "../sheet/trait.js";
import { AptitudeSheet } from "../sheet/aptitude.js";
import { ShipSheet} from "../sheet/actor/ship.js";
import { ShipWeaponSheet } from "../sheet/shipWeapon.js";
import { ShipComponentSheet } from "../sheet/shipComponent.js";
import { PlanetaryResourceSheet } from "../sheet/planetaryResource.js";
import { ColonyUpgradeSheet } from "../sheet/colonyUpgrade.js";
import { ColonyEventSheet } from "../sheet/colonyEvent.js";
import { initializeHandlebars } from "./handlebars.js";
import { migrateWorld } from "./migration.js";
import { prepareCommonRoll, prepareCombatRoll, preparePsychicPowerRoll, showAddCharacteristicModifierDialog } from "./dialog.js";
import { commonRoll, combatRoll } from "./roll.js";
import RtMacroUtil from "./macro.js";

// Import Helpers
import * as chat from "./chat.js";

Hooks.once("init", () => {
  CONFIG.Combat.initiative = { formula: "@initiative.base + @initiative.bonus", decimals: 0 };
  console.log(CONFIG);
  CONFIG.Actor.documentClass = RogueTraderActor;
  CONFIG.Item.documentClass = RogueTraderItem;
  CONFIG.fontDefinitions["Caslon Antique"] = {editor: true, fonts: []};
  game.rogueTrader = {
    testInit: {
      prepareCommonRoll,
      prepareCombatRoll,
      preparePsychicPowerRoll,
      showAddCharacteristicModifierDialog,
    },
    tests:{
      commonRoll,
      combatRoll
    }
  };
  game.macro = RtMacroUtil; 
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("rogue-trader", ExplorerSheet, { types: ["explorer"], makeDefault: true });
  Actors.registerSheet("rogue-trader", NpcSheet, { types: ["npc"], makeDefault: true });
  Actors.registerSheet("rogue-trader", ShipSheet, {types: ["ship"], makeDefault: true});
  Actors.registerSheet("rogue-trader", ColonySheet, { types: ["colony"], makeDefault: true})
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("rogue-trader", WeaponSheet, { types: ["weapon"], makeDefault: true });
  Items.registerSheet("rogue-trader", AmmunitionSheet, { types: ["ammunition"], makeDefault: true });
  Items.registerSheet("rogue-trader", WeaponModificationSheet, { types: ["weaponModification"], makeDefault: true });
  Items.registerSheet("rogue-trader", ArmourSheet, { types: ["armour"], makeDefault: true });
  Items.registerSheet("rogue-trader", ForceFieldSheet, { types: ["forceField"], makeDefault: true });
  Items.registerSheet("rogue-trader", CyberneticSheet, { types: ["cybernetic"], makeDefault: true });
  Items.registerSheet("rogue-trader", DrugSheet, { types: ["drug"], makeDefault: true });
  Items.registerSheet("rogue-trader", GearSheet, { types: ["gear"], makeDefault: true });
  Items.registerSheet("rogue-trader", ToolSheet, { types: ["tool"], makeDefault: true });
  Items.registerSheet("rogue-trader", CriticalInjurySheet, { types: ["criticalInjury"], makeDefault: true });
  Items.registerSheet("rogue-trader", MalignancySheet, { types: ["malignancy"], makeDefault: true });
  Items.registerSheet("rogue-trader", MentalDisorderSheet, { types: ["mentalDisorder"], makeDefault: true });
  Items.registerSheet("rogue-trader", MutationSheet, { types: ["mutation"], makeDefault: true });
  Items.registerSheet("rogue-trader", NavigatorSheet, { types: ["navigator"], makeDefault: true });
  Items.registerSheet("rogue-trader", PsychicPowerSheet, { types: ["psychicPower"], makeDefault: true });
  Items.registerSheet("rogue-trader", TalentSheet, { types: ["talent"], makeDefault: true });
  Items.registerSheet("rogue-trader", SpecialAbilitySheet, { types: ["specialAbility"], makeDefault: true });
  Items.registerSheet("rogue-trader", TraitSheet, { types: ["trait"], makeDefault: true });
  Items.registerSheet("rogue-trader", AptitudeSheet, { types: ["aptitude"], makeDefault: true });
  Items.registerSheet("rogue-trader", ShipWeaponSheet, { types: ["shipWeapon"], makeDefault: true });
  Items.registerSheet("rogue-trader", ShipComponentSheet, { types: ["shipComponent"], makeDefault: true });
  Items.registerSheet("rogue-trader", PlanetaryResourceSheet, { types: ["planetaryResource"], makeDefault: true });
  Items.registerSheet("rogue-trader", ColonyUpgradeSheet, {types: ["colonyUpgrade"], makeDefault: true});
  Items.registerSheet("rogue-trader", ColonyEventSheet, {types: ["colonyEvent"], makeDefault: true});
  initializeHandlebars();
  registerSettings();
});

Hooks.once("ready", () => {
  migrateWorld();
  CONFIG.ChatMessage.documentClass.prototype.getRollData = function() {
      return this.getFlag("rogue-trader", "rollData") 
  }
});


/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
Hooks.on("getChatLogEntryContext", chat.showRolls);
/**
 * Create a macro when dropping an entity on the hotbar
 * Item      - open roll dialog for item
 */
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type == "Item" || data.type == "Actor")
  {
      RtMacroUtil.createMacro(data, slot)
      return false
  }
});

function registerSettings() {
  registerWorldVersion();
  registerColonyGrowthModifier();
  registerColonyCalamityTable();
  registerColonyFortuneTable();
}

function registerWorldVersion() {
  game.settings.register("rogue-trader", "worldSchemaVersion", {
    name: "World Version",
    hint: "Used to automatically upgrade worlds data when the system is upgraded.",
    scope: "world",
    config: true,
    default: 0,
    type: Number
  });
}

function registerColonyGrowthModifier() {
  game.settings.register("rogue-trader", "colonyGrowthModifier", {
    name: "Colony Growth Modifier",
    hint: "Adjusts growth point requirements for colony to increase in size.",
    scope: "world",
    config: true,
    default: 0,
    type: Number
  });
}

function registerColonyCalamityTable() {
  game.settings.register("rogue-trader", "colonyCalamity", {
    name: "Colony Calamity Table",
    hint: "Used by colony sheet to handle Calamity events.",
    scope: "world",
    config: true,
    default: "",
    type: String
  });
}

function registerColonyFortuneTable() {
  game.settings.register("rogue-trader", "colonyFortune", {
    name: "Colony Fortune Table",
    hint: "Used by colony sheet to handle Fortune events.",
    scope: "world",
    config: true,
    default: "",
    type: String
  });
}