/**
 * Roll a generic roll, and post the result to chat.
 * @param {object} rollData
 */
export async function commonRoll(rollData) {
  await _computeTarget(rollData);
  await _rollTarget(rollData);
  await _sendToChat(rollData);
}

export async function rollColonyEvents(rollData) {
  let roll = new Roll("1d10", {});
  roll.evaluate({ async: false });
  if (roll.total >= rollData.positiveEventTarget) {
    await _rollTableWithID(game.settings.get("rogue-trader", "colonyFortune"));
  } else if (roll.total <= rollData.negativeEventTarget) {
    await _rollTableWithID(game.settings.get("rogue-trader", "colonyCalamity"));
  } else {
    await _sendNoEventToChat();
  }
}

async function _rollTableWithID(tableID) {
  let colonyTable = game.tables.get(tableID);
  if (colonyTable) {
    await colonyTable.draw(); // Perform the roll
  } else {
    console.error(`Table with ID ${tableID} not found.`);
  }
}

export async function rollColonyGrowth(rollData) {
  await _sendGrowthToChat(rollData);  
}

export async function consumeResourceRoll(rollData) {
  const resource = rollData.selectedResource;
  rollData.preRollResourceAmount = rollData.selectedResource.system.amount;
  let consumeRoll = new Roll(rollData.rollFormula, {});
  consumeRoll.evaluate({ async: false });
  rollData.consumeRollObject = consumeRoll;
  rollData.conservationModifier = 0;
  if (rollData.conserveResources) {
    let conserveRoll = new Roll("1d10 + 2", {});
    conserveRoll.evaluate({ async: false });
    rollData.conservationModifier = conserveRoll.total;
    rollData.conserveRollObject = conserveRoll;
  }
  const resourceAdjustment = Math.max(0, consumeRoll.total - rollData.conservationModifier);
  rollData.consumedResourceAmount = resourceAdjustment;
  if (rollData.burnResources) {
    switch (rollData.burnData.burnType) {
      case "profitFactor":
        rollData.burnData.generated =  1 + Math.floor(resourceAdjustment / 50);
        break;
      case "growthPoints":
        rollData.burnData.generated = Math.ceil(resourceAdjustment / 5);
        break;
    }
  }
  let adjustedResourceValue = Math.max(resource.system.amount - resourceAdjustment, 0);
  resource.update({
    "system.amount": adjustedResourceValue
  });
  rollData.actor.update({
    "system.stats.conservativeLastTick": rollData.conserveResources
  });
  await _sendResourceBurnToChat(rollData);
}

/**
 * Roll a combat roll, and post the result to chat.
 * @param {object} rollData
 */
export async function combatRoll(rollData) {
  if (rollData.weaponTraits.skipAttackRoll) {
    rollData.result = 5; // Attacks that skip the hit roll always hit body; 05 reversed 50 = body
    // Устанавливаем необходимые данные для отображения в чате
    rollData.target = rollData.baseTarget; // Добавляем target
    rollData.showDoS = false; // Скрываем степень успеха
    rollData.isSuccess = true; // Устанавливаем успех
    rollData.dos = 0; // Степень успеха
    rollData.dof = 0; // Степень провала
    
    await _rollDamage(rollData);
    // Without a To Hit Roll we need a substitute otherwise foundry can't render the message
    rollData.rollObject = rollData.damages[0].damageRoll;
    
    // Устанавливаем флаг, что это бросок атаки
    rollData.isCombatTest = true;
  } else {
    await _computeTarget(rollData);
    await _rollTarget(rollData);
    if (rollData.isSuccess) {
      await _rollDamage(rollData);
    }
  }
  await _sendToChat(rollData);
}

/**
 * Roll a force field roll, and post the result to chat.
 * @param {object} rollData
 */
export async function forceFieldRoll(rollData) {
  await _rollForceField(rollData);
  await _sendToChat(rollData);
}

export async function shipCombatRoll(rollData) {
  await _computeTarget(rollData);
  await _rollTarget(rollData);
  if (rollData.isSuccess) {
    await _rollShipDamage(rollData);
  }
  await _sendToChat(rollData);
}

async function _rollShipDamage(rollData) {
  let formula = "0";
  rollData.damages = [];
  if (rollData.damageFormula) {
    formula = rollData.damageFormula;
    formula = `${formula}+${rollData.damageBonus}`;
    formula = _replaceSymbols(formula, rollData);
  }
  let penetration = 0;
  if (rollData.attackType.name === "Lance") {
    penetration = game.i18n.localize("CHAT.PENETRATION_IGNORE_ARMOR");
  }
  rollData.salvoTotal = 0;
  let isMacrobattery = rollData.attackType.name === "Macrobattery";
  rollData.showTotalDamage = isMacrobattery;
  rollData.isCritical = rollData.dos >= rollData.critRating;
  rollData.hidePenetration = isMacrobattery;
  let firstHit = await _computeShipDamage(formula, penetration, rollData);
  if (isMacrobattery)
    rollData.salvoTotal += firstHit.total;
  if (firstHit.total !== 0) {
    const firstLocation = "None";
    firstHit.location = firstLocation;
    firstHit.hasLocation = false
    rollData.damages.push(firstHit);
    if (rollData.attackType?.hitMargin > 0) {
      let maxAdditionalHit = Math.floor((rollData.dos) / rollData.attackType.hitMargin);
      if (typeof rollData.maxAdditionalHit !== "undefined" && maxAdditionalHit > rollData.maxAdditionalHit) {
        maxAdditionalHit = rollData.maxAdditionalHit;
      }
      rollData.numberOfHit = maxAdditionalHit + 1;
      for (let i = 0; i < maxAdditionalHit; i++) {
        let additionalHit = await _computeShipDamage(formula, penetration, rollData);
        additionalHit.location = "None";
        rollData.damages.push(additionalHit);
        if (isMacrobattery)
          rollData.salvoTotal += additionalHit.total;
      }
    } else {
      rollData.numberOfHit = 1;
    }
    let minDamage = rollData.damages.reduce(
      (min, damage) => min.minDice < damage.minDice ? min : damage, rollData.damages[0]
    );
    if (minDamage.minDice < rollData.dos) {
      minDamage.total += (rollData.dos - minDamage.minDice);
    }
  }
}

/**
 * Post an "empty clip, need to reload" message to chat.
 * @param {object} rollData
 */
export async function reportEmptyClip(rollData) {
  await _emptyClipToChat(rollData);
}

/**
 * Compute the target value, including all +/-modifiers, for a roll.
 * @param {object} rollData
 */
async function _computeTarget(rollData) {
  const range = (rollData.range) ? rollData.range : "0";
  let attackType = 0;
  if (typeof rollData.attackType !== "undefined" && rollData.attackType != null) {
    _computeRateOfFire(rollData);
    attackType = rollData.attackType.modifier;
  }
  let psyModifier = 0;
  if (typeof rollData.psy !== "undefined" && typeof rollData.psy.useModifier !== "undefined" && rollData.psy.useModifier) {
    if (rollData.psy.psyStrength === "push" && rollData.psy.warpConduit) {
      rollData.psy.value += 1;
    }
    psyModifier = rollData.psy.value * 5;
  }
  if (rollData.weaponTraits?.scatter && range > 0) {
    rollData.modifier += 10;
  }
  let aim = rollData.aim?.val ? rollData.aim.val : 0;
  const formula = `0 + ${rollData.modifier} + ${aim} + ${range} + ${attackType} + ${psyModifier}`;
  let r = new Roll(formula, {});
  r.evaluate({ async: false });
  if (r.total > 60) {
    rollData.target = rollData.baseTarget + 60;
  } else if (r.total < -60) {
    rollData.target = rollData.baseTarget + -60;
  } else {
    rollData.target = rollData.baseTarget + r.total;
  }
  rollData.rollObject = r;
}

async function _rollForceField(rollData) {
  let r = new Roll("1d100", {});
  r.evaluate({async: false});
  rollData.result = r.total;
  rollData.rollObject = r;
  rollData.showDoS = false;
  rollData.isSuccess = rollData.result <= rollData.protectionRating;
  rollData.isOverload = rollData.result <= rollData.overloadChance;
}

/**
 * Roll a d100 against a target, and apply the result to the rollData.
 * @param {object} rollData
 */
async function _rollTarget(rollData) {
  let r = new Roll("1d100", {});
  r.evaluate({ async: false });
  rollData.showDoS = true;
  rollData.result = r.total;
  rollData.rollObject = r;
  rollData.isSuccess = rollData.result <= rollData.target;
  if (rollData.isSuccess) {
    rollData.dof = 0;
    rollData.dos = _getDegree(rollData.target, rollData.result) + _getUnnaturalDoS(rollData.unnatural);
  } else {
    rollData.dos = 0;
    rollData.dof = _getDegree(rollData.result, rollData.target);
  }
  if (typeof rollData.psy !== "undefined") _computePsychicPhenomena(rollData);
}

function _getUnnaturalDoS(unnatural)
{
  if (unnatural)
    return Math.ceil(unnatural / 2);
  else 
    return 0;
}

/**
 * Handle rolling and collecting parts of a combat damage roll.
 * @param {object} rollData
 */
async function _rollDamage(rollData) {
  let formula = "0";
  rollData.damages = [];
  if (rollData.damageFormula) {
    formula = rollData.damageFormula;
    if (rollData.weaponTraits?.scatter) {
      formula = _appendScatter(formula, rollData.range);
    }
    if (rollData.weaponTraits?.tearing) {
      formula = _appendTearing(formula);
    }
    if (rollData.weaponTraits?.proven) {
      formula = _appendNumberedDiceModifier(formula, "min", rollData.weaponTraits.proven);
    }
    if (rollData.weaponTraits?.primitive) {
      formula = _appendNumberedDiceModifier(formula, "max", rollData.weaponTraits.primitive);
    }

    formula = `${formula}+${rollData.damageBonus}`;
    formula = _replaceSymbols(formula, rollData);
  }
  let penetration = _rollPenetration(rollData);
  let firstHit = await _computeDamage(formula, penetration, rollData);
  if (firstHit.total !== 0) {
    const firstLocation = _getLocation(rollData.result);
    firstHit.location = firstLocation;
    firstHit.hasLocation = true
    rollData.damages.push(firstHit);
    if (rollData.attackType?.hitMargin > 0) {
      let maxAdditionalHit = Math.floor((rollData.dos) / rollData.attackType.hitMargin);
      if (rollData.weaponTraits.storm) {
        maxAdditionalHit *= 2;
        maxAdditionalHit += 1;
      }
      if (typeof rollData.maxAdditionalHit !== "undefined" && maxAdditionalHit > rollData.maxAdditionalHit) {
        maxAdditionalHit = rollData.maxAdditionalHit;
      }
      rollData.numberOfHit = maxAdditionalHit + 1;
      for (let i = 0; i < maxAdditionalHit; i++) {
        let additionalHit = await _generateNextHit(formula, penetration, rollData, firstLocation, i);
        rollData.damages.push(additionalHit);
      }
    } else {
      rollData.numberOfHit = 1;
    }
    let minDamage = rollData.damages.reduce(
      (min, damage) => min.minDice < damage.minDice ? min : damage, rollData.damages[0]
    );
    if (minDamage.minDice < rollData.dos) {
      minDamage.total += (rollData.dos - minDamage.minDice);
    }
  }
}

async function _generateNextHit(damageFormula, armorPen, rollData, firstHitLocation, hitIndex) {
  let hitResult = await _computeDamage(damageFormula, armorPen, rollData);
  hitResult.location = _getAdditionalLocation(firstHitLocation, hitIndex);
  hitResult.hasLocation = true;
  return hitResult;
}

/**
 * Roll and compute damage.
 * @param {number} penetration
 * @param {object} rollData
 * @returns {object}
 */
async function _computeDamage(damageFormula, penetration, rollData) {
  let weaponTraits = rollData.weaponTraits;
  let r = new Roll(damageFormula);
  let dos = rollData.dos;
  let isAiming = rollData.aim?.isAiming;
  r.evaluate({ async: false });
  let damage = {
    total: r.total,
    righteousFury: 0,
    dices: [],
    penetration: penetration,
    dos: rollData.dos,
    formula: damageFormula,
    replaced: false,
    damageRender: await r.render()
  };

  if (weaponTraits?.accurate && isAiming) {
    let numDice = ~~((dos - 1) / 2); //-1 because each degree after the first counts
    if (numDice >= 1) {
      if (numDice > 2) numDice = 2;
      let ar = new Roll(`${numDice}d10`);
      ar.evaluate({ async: false });
      damage.total += ar.total;
      ar.terms.flatMap(term => term.results).forEach(async die => {
        if (die.active && die.result < dos) damage.dices.push(die.result);
        if (die.active && (typeof damage.minDice === "undefined" || die.result < damage.minDice)) damage.minDice = die.result;
      });
      damage.accurateRender = await ar.render();
    }
  }

  // Without a To Hit we a roll to associate the chat message with
  if (weaponTraits?.skipAttackRoll) {
    damage.damageRoll = r;
  }

  r.terms.forEach(term => {
    if (typeof term === "object" && term !== null) {
      let rfFace = weaponTraits?.rfFace ? weaponTraits?.rfFace : term.faces; // Without the Vengeful weapon trait rfFace is undefined
      term.results?.forEach(async result => {
        let dieResult = result.count ? result.count : result.result; // Result.count = actual value if modified by term
        if (result.active && dieResult >= rfFace) damage.righteousFury = _rollRighteousFury(rfFace, rollData);
        if (result.active && dieResult < dos) damage.dices.push(dieResult);
        if (result.active && (typeof damage.minDice === "undefined" || dieResult < damage.minDice)) damage.minDice = dieResult;
      });
    }
  });
  return damage;
}

/**
 * Roll and compute ship damage.
 * @param {number} penetration
 * @param {object} rollData
 * @returns {object}
 */
async function _computeShipDamage(damageFormula, penetration, rollData, weaponTraits) {
  let r = new Roll(damageFormula);
  r.evaluate({ async: false });
  let damage = {
    total: r.total,
    righteousFury: 0,
    dices: [],
    penetration: penetration,
    hidePenetration: rollData.hidePenetration,
    dos: rollData.dos,
    formula: damageFormula,
    replaced: false,
    damageRender: await r.render()
  };

  // Without a To Hit we a roll to associate the chat message with
  if (weaponTraits?.skipAttackRoll) {
    damage.damageRoll = r;
  }

  r.terms.forEach(term => {
    if (typeof term === "object" && term !== null) {
      let rfFace = weaponTraits?.rfFace ? weaponTraits?.rfFace : term.faces; // Without the Vengeful weapon trait rfFace is undefined
      term.results?.forEach(async result => {
        let dieResult = result.count ? result.count : result.result; // Result.count = actual value if modified by term
        // if (result.active && dieResult >= rfFace) damage.righteousFury = _rollRighteousFury();
        if (result.active && dieResult < rollData.dos) 
          damage.dices.push(dieResult);
        if (result.active && (typeof damage.minDice === "undefined" || dieResult < damage.minDice)) 
          damage.minDice = dieResult;
      });
    }
  });
  return damage;
}

/**
 * Evaluate final penetration, by leveraging the dice roll API.
 * @param {object} rollData
 * @returns {number}
 */
function _rollPenetration(rollData) {
  let penetration = (rollData.penetrationFormula) ? _replaceSymbols(rollData.penetrationFormula, rollData) : "0";
  let multiplier = 1;

  if (penetration.includes("(")) // Legacy Support
  {
    if (rollData.dos >= 3) {
      let rsValue = penetration.match(/\(\d+\)/gi); // Get Razorsharp Value
      penetration = penetration.replace(/\d+.*\(\d+\)/gi, rsValue); // Replace construct BaseValue(RazorsharpValue) with the extracted data
    }

  } else if (rollData.weaponTraits?.razorSharp) {
    if (rollData.dos >= 3) {
      multiplier = 2;
    }
  }
  if (rollData.weaponTraits?.melta && rollData.range > 0) {
    multiplier = 2;
  }
  let r = new Roll(penetration.toString());
  r.evaluate({ async: false });
  return r.total * multiplier;
}

/**
 * Roll a Righteous Fury dice, and return the value.
 * @returns {number}
 */
function _rollRighteousFury(face, rollData) {
  let confirmRoll = new Roll("1d100", {});
  confirmRoll.evaluate({ async: false });
  if (confirmRoll.total >= rollData.target) {
    let r = new Roll(`1d10x>${face}`);
    r.evaluate({ async: false });
    return r.total;
  }
  else {
    return 0;
  }
}

/**
 * Check for psychic phenomena (i.e, the user rolled two matching numbers, etc.), and add the result to the rollData.
 * @param {object} rollData
 */
function _computePsychicPhenomena(rollData) {
  rollData.psy.hasPhenomena = rollData.psy.psyStrength === "push" ? !_isDouble(rollData.result) : _isDouble(rollData.result) && rollData.psy.psyStrength != "fettered";
}

/**
 * Check if a number (d100 roll) has two matching digits.
 * @param {number} number
 * @returns {boolean}
 */
function _isDouble(number) {
  if (number === 100) {
    return true;
  } else {
    const digit = number % 10;
    return number - digit === digit * 10;
  }
}

/**
 * Calculate modifiers/etc. from RoF type, and add them to the rollData.
 * @param {object} rollData
 */
function _computeRateOfFire(rollData) {
  rollData.maxAdditionalHit = 0;

  switch (rollData.attackType.name) {
    case "standard":
      rollData.attackType.modifier = 10;
      break;
    case "bolt":
    case "blast":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 0;
      break;

    case "semi_auto":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 2;
      rollData.maxAdditionalHit = rollData.rateOfFire.burst - 1;
      break;

    case "swift":
    case "barrage":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 2;
      rollData.maxAdditionalHit = rollData.rateOfFire.burst - 1;
      break;

    case "full_auto":
      rollData.attackType.modifier = -10;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire.full - 1;
      break;

    case "lightning":
      rollData.attackType.modifier = -10;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire.full - 1;
      break;

    case "storm":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire.full - 1;
      break;

    case "called_shot":
      rollData.attackType.modifier = -20;
      rollData.attackType.hitMargin = 0;
      break;

    case "charge":
      rollData.attackType.modifier = 20;
      rollData.attackType.hitMargin = 0;
      break;

    case "allOut":
      rollData.attackType.modifier = 30;
      rollData.attackType.hitMargin = 0;
      break;
    
    case "Macrobattery":
      // rollData.attackType.modifier = 10;
      rollData.attackType.hitMargin = rollData.dosPerHit ?? 1;
      rollData.maxAdditionalHit = rollData.weaponStrength - 1;
      break;
    case "Lance":
      // rollData.attackType.modifier = 20;
      rollData.attackType.hitMargin = rollData.dosPerHit ?? 3;
      rollData.maxAdditionalHit = rollData.weaponStrength - 1;
      break;

    default:
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 0;
      break;
  }
}

/**
 * Get the hit location from a WS/BS roll.
 * @param {number} result
 * @returns {string}
 */
function _getLocation(result) {
  const toReverse = result < 10 ? `0${result}` : result.toString();
  const locationTarget = parseInt(toReverse.split("").reverse().join(""));
  if (locationTarget <= 10) {
    return "ARMOUR.HEAD";
  } else if (locationTarget <= 20) {
    return "ARMOUR.RIGHT_ARM";
  } else if (locationTarget <= 30) {
    return "ARMOUR.LEFT_ARM";
  } else if (locationTarget <= 70) {
    return "ARMOUR.BODY";
  } else if (locationTarget <= 85) {
    return "ARMOUR.RIGHT_LEG";
  } else if (locationTarget <= 100) {
    return "ARMOUR.LEFT_LEG";
  } else {
    return "ARMOUR.BODY";
  }
}

const hitTable = {
  "ARMOUR.HEAD": ["ARMOUR.HEAD", "ARMOUR.RIGHT_ARM", "ARMOUR.BODY", "ARMOUR.LEFT_ARM", "ARMOUR.BODY"],
  "ARMOUR.RIGHT_ARM": ["ARMOUR.RIGHT_ARM", "ARMOUR.BODY", "ARMOUR.HEAD", "ARMOUR.BODY", "ARMOUR.RIGHT_ARM"],
  "ARMOUR.LEFT_ARM": ["ARMOUR.LEFT_ARM", "ARMOUR.BODY", "ARMOUR.HEAD", "ARMOUR.BODY", "ARMOUR.LEFT_ARM"],
  "ARMOUR.BODY": ["ARMOUR.BODY", "ARMOUR.RIGHT_ARM", "ARMOUR.HEAD", "ARMOUR.LEFT_ARM", "ARMOUR.BODY"],
  "ARMOUR.RIGHT_LEG": ["ARMOUR.RIGHT_LEG", "ARMOUR.BODY", "ARMOUR.RIGHT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY"],
  "ARMOUR.LEFT_LEG": ["ARMOUR.LEFT_LEG", "ARMOUR.BODY", "ARMOUR.LEFT_ARM", "ARMOUR.HEAD", "ARMOUR.BODY"]
};

/**
 * Get successive hit locations for an attack which scored multiple hits.
 * @param {string} firstLocation
 * @param {number} hitIndex
 * @returns {string}
 */
function _getAdditionalLocation(firstLocation, hitIndex) {
  const hitProgression = hitTable[firstLocation];
  const maxHitIndex = hitProgression.length - 1;
  return hitIndex > maxHitIndex ? hitProgression[maxHitIndex] : hitProgression[hitIndex];
}


/**
 * Get degrees of success/failure from a target and a roll.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function _getDegree(a, b) {
  return Math.floor((a - b) / 10);
}
/**
 * Replaces all Symbols in the given Formula with their Respective Values
 * The Symbols consist of Attribute Boni and Psyrating
 * @param {*} formula
 * @param {*} rollData
 * @returns {string}
 */
function _replaceSymbols(formula, rollData) {
  if (rollData.psy) {
    formula = formula.replaceAll(/PR/gi, rollData.psy.value);
  }
  if (rollData?.attributeBoni) {
    for (let boni of rollData.attributeBoni) {
      formula = formula.replaceAll(boni.regex, boni.value);
    }
  }
  return formula;
}

/**
 * Add a special weapon modifier value to a roll formula.
 * @param {string} formula
 * @param {string} modifier
 * @param {number} value
 * @returns {string}
 */
function _appendNumberedDiceModifier(formula, modifier, value) {
  let diceRegex = /\d+d\d+/;
  if (!formula.includes(modifier)) {
    let match = formula.match(diceRegex);
    if (match) {
      let dice = match[0];
      dice += `${modifier}${value}`;
      formula = formula.replace(diceRegex, dice);
    }
  }
  return formula;
}

/**
 * Add the "tearing" special weapon modifier to a roll formula.
 * @param {string} formula
 * @returns {string}
 */
function _appendTearing(formula) {
  let diceRegex = /\d+d\d+/;
  if (!formula.match(/dl|kh/gi, formula)) { // Already has drop lowest or keep highest
    let match = formula.match(/\d+/g, formula);
    let numDice = parseInt(match[0]) + 1;
    let faces = parseInt(match[1]);
    let diceTerm = `${numDice}d${faces}dl`;
    formula = formula.replace(diceRegex, diceTerm);
  }
  return formula;
}

function _appendScatter(formula, range) {
  if (range >= 30) {
    formula = formula + "+2";
  }
  else if (range < 0) {
    formula = formula + "-3";
  }
  return formula;
}

/**
 * Post a roll to chat.
 * @param {object} rollData
 */
async function _sendToChat(rollData) {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": rollData
    }
  };
  
  if(speaker.token) {
    rollData.tokenId = speaker.token;
  }

  if (rollData.rollObject) {
    rollData.render = await rollData.rollObject.render();
    chatData.roll = rollData.rollObject;
  } else {
    // Если нет rollObject, создаем пустой для отображения
    rollData.render = "";
  }

  const html = await renderTemplate("systems/rogue-trader/template/chat/roll.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }

  ChatMessage.create(chatData);
}

async function _sendResourceBurnToChat(rollData) {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": rollData
    }
  };
  if(speaker.token) {
    rollData.tokenId = speaker.token;
  }
  console.log(rollData);
  if (rollData.conserveResources) {
    const consumeRender = await rollData.consumeRollObject.render();
    const conserveRender = await rollData.conserveRollObject.render();
    rollData.renders = [consumeRender, conserveRender];
    chatData.rolls = [rollData.consumeRollObject, rollData.conserveRollObject];
  } else {
    const consumeRender = await rollData.consumeRollObject.render();
    rollData.renders = [consumeRender];
    chatData.rolls = [rollData.consumeRollObject];
  }

  const html = await renderTemplate("systems/rogue-trader/template/chat/consume-resources.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }

  ChatMessage.create(chatData);
}

async function _sendNoEventToChat() {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker
  };
  const html = await renderTemplate("systems/rogue-trader/template/chat/colony-no-event.html");
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }
  ChatMessage.create(chatData);
}

async function _sendGrowthToChat(rollData) {
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": rollData
    }
  };

  const html = await renderTemplate("systems/rogue-trader/template/chat/colony-growth.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }
  ChatMessage.create(chatData);
}

/**
 * Post a "you need to reload" message to chat.
 * @param {object} rollData
 */
async function _emptyClipToChat(rollData) {
  let chatData = {
    user: game.user.id,
    content: `
          <div class="rogue-trader chat roll">
              <div class="background border">
                  <p><strong>Reload! Out of Ammo!</strong></p>
              </div>
          </div>
        `
  };
  ChatMessage.create(chatData);
}
