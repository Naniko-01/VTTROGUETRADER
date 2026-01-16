export const initializeHandlebars = () => {
  registerHandlebarsHelpers();
  preloadHandlebarsTemplates();
};

/**
 * Define a set of template paths to pre-load. Pre-loaded templates are compiled and cached for fast access when
 * rendering. These paths will also be available as Handlebars partials by using the file name.
 * @returns {Promise}
 */
function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/rogue-trader/template/sheet/actor/explorer.html",
    "systems/rogue-trader/template/sheet/actor/npc.html",
    "systems/rogue-trader/template/sheet/actor/limited-sheet.html",
    "systems/rogue-trader/template/sheet/actor/ship.html",
    "systems/rogue-trader/template/sheet/actor/colony.html",

    "systems/rogue-trader/template/sheet/actor/tab/abilities.html",
    "systems/rogue-trader/template/sheet/actor/tab/combat.html",
    "systems/rogue-trader/template/sheet/actor/tab/gear.html",
    "systems/rogue-trader/template/sheet/actor/tab/notes.html",
    "systems/rogue-trader/template/sheet/actor/tab/npc-notes.html",
    "systems/rogue-trader/template/sheet/actor/tab/npc-stats.html",
    "systems/rogue-trader/template/sheet/actor/tab/progression.html",
    "systems/rogue-trader/template/sheet/actor/tab/psychic-powers.html",
    "systems/rogue-trader/template/sheet/actor/tab/stats.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-complications.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-combat.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-crew.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-essential.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-supplemental.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-data.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-notes.html",
    "systems/rogue-trader/template/sheet/actor/tab/ship-weapons.html",
    "systems/rogue-trader/template/sheet/actor/tab/colony-core.html",
    "systems/rogue-trader/template/sheet/actor/tab/colony-upgrades.html",
    "systems/rogue-trader/template/sheet/actor/tab/colony-notes.html",

    "systems/rogue-trader/template/sheet/mental-disorder.html",
    "systems/rogue-trader/template/sheet/aptitude.html",
    "systems/rogue-trader/template/sheet/malignancy.html",
    "systems/rogue-trader/template/sheet/mutation.html",
    "systems/rogue-trader/template/sheet/talent.html",
    "systems/rogue-trader/template/sheet/trait.html",
    "systems/rogue-trader/template/sheet/special-ability.html",
    "systems/rogue-trader/template/sheet/psychic-power.html",
    "systems/rogue-trader/template/sheet/critical-injury.html",
    "systems/rogue-trader/template/sheet/weapon.html",
    "systems/rogue-trader/template/sheet/armour.html",
    "systems/rogue-trader/template/sheet/gear.html",
    "systems/rogue-trader/template/sheet/drug.html",
    "systems/rogue-trader/template/sheet/tool.html",
    "systems/rogue-trader/template/sheet/cybernetic.html",
    "systems/rogue-trader/template/sheet/weapon-modification.html",
    "systems/rogue-trader/template/sheet/ammunition.html",
    "systems/rogue-trader/template/sheet/force-field.html",
    "systems/rogue-trader/template/sheet/characteristics/information.html",
    "systems/rogue-trader/template/sheet/characteristics/left.html",
    "systems/rogue-trader/template/sheet/characteristics/name.html",
    "systems/rogue-trader/template/sheet/characteristics/right.html",
    "systems/rogue-trader/template/sheet/characteristics/total.html",
    "systems/rogue-trader/template/chat/item.html",
    "systems/rogue-trader/template/chat/roll.html",
    "systems/rogue-trader/template/chat/critical.html",
    "systems/rogue-trader/template/chat/colony-growth.html",
    "systems/rogue-trader/template/chat/colony-no-event.html",
    "systems/rogue-trader/template/dialog/common-roll.html",
    "systems/rogue-trader/template/dialog/combat-roll.html",
    "systems/rogue-trader/template/dialog/add-characteristic-modifier.html",
    "systems/rogue-trader/template/dialog/add-skill-modifier.html",
    "systems/rogue-trader/template/dialog/psychic-power-roll.html",
    "systems/rogue-trader/template/sheet/shipWeapon.html",
    "systems/rogue-trader/template/sheet/shipComponent.html",
    "systems/rogue-trader/template/sheet/utility/modifiers.html"
  ];
  return loadTemplates(templatePaths);
}

/**
 * Add custom Handlerbars helpers.
 */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper("removeMarkup", function(text) {
    const markup = /<(.*?)>/gi;
    return text.replace(markup, "");
  });

  Handlebars.registerHelper("enrich", function(string) {
    return TextEditor.enrichHTML(string, {async: false});
  });

  Handlebars.registerHelper("damageTypeLong", function(damageType) {
    damageType = (damageType || "i").toLowerCase();
    switch (damageType) {
      case "e":
        return game.i18n.localize("DAMAGE_TYPE.ENERGY");
      case "i":
        return game.i18n.localize("DAMAGE_TYPE.IMPACT");
      case "r":
        return game.i18n.localize("DAMAGE_TYPE.RENDING");
      case "x":
        return game.i18n.localize("DAMAGE_TYPE.EXPLOSIVE");
      default:
        return game.i18n.localize("DAMAGE_TYPE.IMPACT");
    }
  });


  Handlebars.registerHelper("damageTypeShort", function(damageType) {
    switch (damageType) {
      case "energy":
        return game.i18n.localize("DAMAGE_TYPE.ENERGY_SHORT");
      case "impact":
        return game.i18n.localize("DAMAGE_TYPE.IMPACT_SHORT");
      case "rending":
        return game.i18n.localize("DAMAGE_TYPE.RENDING_SHORT");
      case "explosive":
        return game.i18n.localize("DAMAGE_TYPE.EXPLOSIVE_SHORT");
      default:
        return game.i18n.localize("DAMAGE_TYPE.IMPACT_SHORT");
    }
  });

  Handlebars.registerHelper('log', function(context) {
    console.log(context);
  });

  Handlebars.registerHelper('getCharacteristics', function() {
    const characteristics = {
      weaponSkill: "CHARACTERISTIC.WEAPON_SKILL",
      ballisticSkill: "CHARACTERISTIC.BALLISTIC_SKILL",
      strength: "CHARACTERISTIC.STRENGTH",
      toughness: "CHARACTERISTIC.TOUGHNESS",
      agility: "CHARACTERISTIC.AGILITY",
      intelligence: "CHARACTERISTIC.INTELLIGENCE",
      perception: "CHARACTERISTIC.PERCEPTION",
      willpower: "CHARACTERISTIC.WILLPOWER",
      fellowship: "CHARACTERISTIC.FELLOWSHIP"
    };
    return characteristics;
  });

  Handlebars.registerHelper('getSkills', function() {
    const actorSchema = game.system.model.Actor;
    // console.log(actorSchema);
    const advSkillRegex = /^adv/;
    const skillSchema = actorSchema.explorer.skills;
    const skills = {};
  
    for (const entry in skillSchema) {
      if (skillSchema.hasOwnProperty(entry)) {
        const entryObject = skillSchema[entry];
        if (entryObject.isSpecialist) {
          const specialities = skillSchema[entry].specialities;
          for (const specialty in specialities) {
            if (specialities.hasOwnProperty(specialty)) {
              if (advSkillRegex.test(entry))
                skills[`${entry}:${specialty}`] = specialities[specialty].label;
              else
                skills[`${entry}:${specialty}`] = `${entryObject.label} ${specialities[specialty].label}`;
            }
          }
        } else {
          skills[entry] = skillSchema[entry].label;
        }
      }
    }

    const sortedKeys = Object.keys(skills).sort((a, b) => {
      return skills[a].localeCompare(skills[b]);
    });
    
    const result = {};
    sortedKeys.forEach(function(key) { 
      result[key] = skills[key];
    });
    
    return result;
  });

  Handlebars.registerHelper('localizeMultiple', function(text) {
    const parts = text.split(' '); // Split the string by spaces
    const localizedParts = parts.map(part => game.i18n.localize(part)); // Localize each part
    const result = localizedParts.join(': '); // Join the localized parts with spaces
    return result;
  });

  Handlebars.registerHelper('getShipRangeBrackets', function(range) {
    let rangeValue = parseInt(range);
    let short = Math.floor(rangeValue / 2);
    let long = rangeValue * 2;
    return `${short}/${rangeValue}/${long}`;
  });

  Handlebars.registerHelper('getExplorerRangeBrackets', function(range) {
    let rangeValue = parseInt(range);
    if (rangeValue <= 0)
      return 0;
    let short = Math.floor(rangeValue / 2);
    let pointBlank = Math.min(short - 1, 2);
    let long = rangeValue * 2;
    let extreme = rangeValue * 3;
    let maximal = rangeValue * 5;
    return `${pointBlank}/${short}/${long}/${extreme}/${maximal}`;
  });

  Handlebars.registerHelper('localizeShipSide', function(side) {
    let result = "";
    let localizer = game.i18n;
    switch (side) {
      case "port": {
        result = localizer.localize("SHIP.SIDE.PORT");
        break;
      }
      case "star": {
        result = localizer.localize("SHIP.SIDE.STARBOARD");
        break;
      }
      case "dorsal": {
        result = localizer.localize("SHIP.SIDE.DORSAL");
        break;
      }
      case "prow": {
        result = localizer.localize("SHIP.SIDE.PROW");
        break;
      }
      case "keel": {
        result = localizer.localize("SHIP.SIDE.KEEL");
        break;
      }
    }
    return result;
  });

  Handlebars.registerHelper('localizeColonySize', function(colonySize) {
    let result = "";
    let localizer = game.i18n;
    switch (colonySize) {
      case 0:
        result = localizer.localize("COLONY.SIZE.GHOST_TOWN");
        break;
      case 1:
        result = localizer.localize("COLONY.SIZE.SETTLEMENT");
        break;
      case 2:
        result = localizer.localize("COLONY.SIZE.OUTPOST");
        break;
      case 3:
        result = localizer.localize("COLONY.SIZE.FREEHOLD");
        break;
      case 4:
        result = localizer.localize("COLONY.SIZE.DEMESNE");
        break;
      case 5:
        result = localizer.localize("COLONY.SIZE.HOLDING");
        break;
      case 6:
        result = localizer.localize("COLONY.SIZE.DOMINION");
        break;
      case 7:
        result = localizer.localize("COLONY.SIZE.TERRITORY");
        break;
      case 8:
        result = localizer.localize("COLONY.SIZE.CITY");
        break;
      case 9:
        result = localizer.localize("COLONY.SIZE.METROPOLIS");
        break;
      case 10:
        result = localizer.localize("COLONY.SIZE.HIVE");
        break;
      default:
        result = localizer.localize("COLONY.SIZE.HIVE");
        break;
    }
    return result;
  });

  Handlebars.registerHelper('localizeColonyType', function(colonyType) {
    let result = "";
    let i18n = game.i18n;
    switch (colonyType) {
      case "research":
        result = i18n.localize("COLONY.TYPE.RESEARCH");
        break;
      case "mining":
        result = i18n.localize("COLONY.TYPE.MINING");
        break;
      case "ecclesiastical":
        result = i18n.localize("COLONY.TYPE.ECCLESIASTICAL");
        break;
      case "agricultural":
        result = i18n.localize("COLONY.TYPE.AGRICULTURAL");
        break;
      case "pleasure":
        result = i18n.localize("COLONY.TYPE.PLEASURE");
        break;
      case "war":
        result = i18n.localize("COLONY.TYPE.WAR");
        break;
      default:
        result = "Unknown Colony Type";
        break;
    }
    return result;
  });

  Handlebars.registerHelper('localizeBurnType', function(burnType) {
    let result = "";
    let i18n = game.i18n;
    switch (burnType) {
      case "profitFactor":
        result = i18n.localize("COLONY.CHAT.BURN_TYPE.PROFIT");
        break;
      case "growthPoints":
        result = i18n.localize("COLONY.CHAT.BURN_TYPE.GROWTH");
        break;
      default:
        result = "INVALID BURN TYPE!";
        break;
    }
    return result;
  });
}

