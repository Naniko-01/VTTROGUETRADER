import { commonRoll, combatRoll, shipCombatRoll, forceFieldRoll, reportEmptyClip, consumeResourceRoll } from "./roll.js";

/**
 * Show a generic roll dialog.
 * @param {object} rollData
 */
export async function prepareCommonRoll(rollData) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/common-roll.html", rollData);
  let dialog = new Dialog({
    title: game.i18n.localize(rollData.name),
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          rollData.name = game.i18n.localize(rollData.name);
          rollData.baseTarget = parseInt(html.find("#target")[0].value, 10);
          rollData.rolledWith = html.find("[name=characteristic] :selected").text();
          rollData.modifier = html.find("#modifier")[0].value;
          rollData.isCombatTest = false;
          rollData.unnatural = rollData.characteristics?.find((char) => char.selected).unnatural ?? 0;
          await commonRoll(rollData);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }

    },
    default: "roll",
    close: () => {},
    render: html => {
      const sel = html.find("select[name=characteristic");
      const target = html.find("#target");
      sel.change(ev => {
        target.val(sel.val());
      });
    }
  }, {
    width: 200
  });
  dialog.render(true);
}

export async function prepareConsumeResourcesRoll(rollData, actorRef) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/colony-resource-burn.html", rollData);
  let dialog = new Dialog({
    title: game.i18n.localize(rollData.name),
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          const availableResource = html.find("#available-resource")[0].value;
          if (availableResource < rollData.requiredResources) {
            ui.notifications.error(`Not enough resources! You need resource with at least ${rollData.requiredResources} amount!`);
            dialog.render(true);
          } else {
            rollData.name = game.i18n.localize(rollData.name);
            const selectedResourceID = html.find("#selected-resource")[0].value;
            rollData.selectedResource = rollData.resources.find(resource => resource.id === selectedResourceID);
            rollData.rollFormula = html.find("#roll-formula")[0].value;
            rollData.conserveResources = html.find("#conserve-resource-toggle")[0].checked;
            rollData.burnResources = html.find("#burn-toggle")[0].checked;
            rollData.burnData.burnType = html.find("#burn-type")[0].value;
            await consumeResourceRoll(rollData);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }
    },
    default: "roll",
    close: () => {},
    render: html => {
      const burnToggle = html.find("#burn-toggle")[0];
      const conserveToggle = html.find("#conserve-resource-toggle")[0];
      const conserveWrapper = html.find("#conserve-wrapper")[0];
      const burnWrapper = html.find("#burn-wrapper")[0];
      const rollFormula = html.find("#roll-formula")[0];
      const selectedResource = html.find("#selected-resource")[0];
      const availableResource = html.find("#available-resource")[0];
      const burnTypeWrapper = html.find("#burn-type-wrapper")[0];

      // Function to update the roll formula based on the checkbox state
      const updateRollData = () => {
        if (burnToggle.checked) {
          rollFormula.value = rollData.burnedAmount;
        } else {
          rollFormula.value = rollData.consumedAmount;
        }
      };

      // Function to update visibility of conserve-wrapper based on selected resource
      const updateConserveWrapper = () => {
        const selectedOption = rollData.resources.find(resource => resource.id === selectedResource.value);
        if (selectedOption?.system.isOrganic && !burnToggle.checked) {
          conserveWrapper.style.display = "flex";
        } else {
          conserveWrapper.style.display = "none";
          conserveToggle.checked = false;
        }
        updateRollData(); // Ensure rollFormula is updated
      };

      // Function to update visibility of burn-wrapper based on conserve-toggle
      const onConserveToggle = () => {
        if (conserveToggle.checked) {
          burnWrapper.style.display = "none";
          burnTypeWrapper.style.display = "none";
          burnToggle.checked = false;
        } else {
          burnWrapper.style.display = "flex";
        }
        updateRollData(); // Ensure rollFormula is updated
      };

      // Function to update visibility of conserve-wrapper based on burn-toggle
      const onBurnToggle = () => {
        if (burnToggle.checked) {
          conserveWrapper.style.display = "none";
          burnTypeWrapper.style.display = "flex";
          conserveToggle.checked = false;
        } else {
          burnTypeWrapper.style.display = "none";
          updateConserveWrapper(); // Recheck conserve-wrapper visibility based on selected resource
        }
        updateRollData(); // Ensure rollFormula is updated
      };

      // Function to update the available resource based on the selected resource
      const onSelectResource = () => {
        const selectedOption = rollData.resources.find(resource => resource.id === selectedResource.value);
        availableResource.value = selectedOption ? selectedOption.system.amount : 0;
        updateConserveWrapper(); // Ensure conserve-wrapper visibility is updated
      };
      // Add event listeners
      selectedResource.addEventListener("change", onSelectResource);
      conserveToggle.addEventListener("change", onConserveToggle);
      burnToggle.addEventListener("change", onBurnToggle);

      // Initial invocation to set visibility and roll formula based on initial state
      onSelectResource();
      onBurnToggle();
      onConserveToggle();
      updateRollData();
    }
  }, {
    width: 210,
  });
  dialog.render(true);
}

/**
 * Show a combat roll dialog.
 * @param {object} rollData
 * @param {RogueTraderActor} actorRef
 */
export async function prepareCombatRoll(rollData, actorRef) {
    const html = await renderTemplate("systems/rogue-trader/template/dialog/combat-roll.html", rollData);
    let dialog = new Dialog({
        title: rollData.name,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async (html) => {
                    rollData.name = game.i18n.localize(rollData.name);
                    rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                    rollData.modifier = html.find("#modifier")[0]?.value;
                    const range = html.find("#range")[0];
                    if (typeof range !== "undefined" && range !== null) {
                        rollData.range = range.value;
                        rollData.rangeText = range.options[range.selectedIndex].text;
                    }
                    const attackType = html.find("#attackType")[0];
                    rollData.attackType = { 
                      name : attackType?.value,
                      text : attackType?.options[attackType.selectedIndex].text,
                      modifier : 0
                    };
                    const aim = html.find("#aim")[0]
                    rollData.aim = {
                      val : aim?.value,
                      isAiming : aim?.value !== "0",
                      text : aim?.options[aim.selectedIndex].text
                    };
                    rollData.damageFormula = html.find("#damageFormula")[0].value.replace(' ', '');
                    rollData.damageType = html.find("#damageType")[0].value;
                    rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
                    rollData.penetrationFormula = html.find("#penetration")[0].value;
                    rollData.isCombatTest = true;
                    if (rollData.isRange && rollData.clip.max > 0) {
                        const ammoUseMultiplier = rollData.weaponTraits.storm ? 2 : 1;
                        const weapon = game.actors.get(rollData.ownerId)?.items?.get(rollData.itemId);
                        if(weapon) {
                          switch(rollData.attackType.name) {
                              case 'standard':
                              case 'called_shot': {
                                  if (rollData.clip.value < 1 * ammoUseMultiplier) {
                                      return reportEmptyClip(rollData);
                                  } else {
                                      rollData.clip.value -= 1 * ammoUseMultiplier;                                        
                                      await weapon.update({"system.clip.value" : rollData.clip.value})
                                  }
                                  break;
                              }
                              case 'semi_auto': {
                                  if (rollData.clip.value < rollData.rateOfFire.burst * ammoUseMultiplier) {
                                      return reportEmptyClip(rollData);
                                  } else {
                                      rollData.clip.value -= rollData.rateOfFire.burst * ammoUseMultiplier;
                                      await weapon.update({"system.clip.value" : rollData.clip.value})
                                  }
                                  break;
                              }
                              case 'full_auto': {
                                  if (rollData.clip.value < rollData.rateOfFire.full * ammoUseMultiplier) {
                                      return reportEmptyClip(rollData);
                                  } else {
                                      rollData.clip.value -= rollData.rateOfFire.full * ammoUseMultiplier;
                                      await weapon.update({"system.clip.value" : rollData.clip.value})
                                  }
                                  break;
                              }
                              default: {
                                  if (rollData.clip.value < 1 * ammoUseMultiplier) {
                                    return reportEmptyClip(rollData);
                                  } else {
                                      rollData.clip.value -= 1 * ammoUseMultiplier;                                        
                                      await weapon.update({"system.clip.value" : rollData.clip.value})
                                  }
                                  break;
                              }
                          }
                        }
                    }
                    await combatRoll(rollData);
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("BUTTON.CANCEL"),
                callback: () => {},
            },
        },
        default: "roll",
        close: () => {},
    }, {width: 200});
    dialog.render(true);
}

/**
 * Show a force field roll dialog.
 * @param {object} rollData
 * @param {RogueTraderActor} actorRef
 */
export async function prepareForceFieldRoll(rollData, actorRef) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/forceField-roll.html", rollData);
  let dialog = new Dialog({
    title: rollData.name,
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async (html) => {
          rollData.name = game.i18n.localize(rollData.name);
          rollData.protectionRating = parseInt(html.find("#target")[0]?.value, 10);
          rollData.overloadChance = parseInt(html.find("#overload")[0]?.value, 10);
          await forceFieldRoll(rollData);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {},
      },
    },
  }, {width: 200});
  dialog.render(true);
}

/**
 * Show a combat roll dialog.
 * @param {object} rollData
 * @param {RogueTraderActor} actorRef
 */
export async function prepareShipCombatRoll(rollData, actorRef) {
  rollData.ignoreArmor |= rollData.weaponType === "Lance";
  const html = await renderTemplate("systems/rogue-trader/template/dialog/ship-combat-roll.html", rollData);
  let dialog = new Dialog({
      title: rollData.name,
      content: html,
      buttons: {
          roll: {
              icon: '<i class="fas fa-check"></i>',
              label: game.i18n.localize("BUTTON.ROLL"),
              callback: async (html) => {
                  rollData.name = game.i18n.localize(rollData.name);
                  rollData.baseTarget = parseInt(html.find("#target")[0]?.value, 10);
                  rollData.modifier = html.find("#modifier")[0]?.value;
                  rollData.performer = html.find("#performer")[0]?.value;
                  const range = html.find("#range")[0];
                  if (typeof range !== "undefined" && range !== null) {
                      rollData.range = range.value;
                      rollData.rangeText = range.options[range.selectedIndex].text;
                  }
                  const attackType = [];
                  rollData.attackType = { 
                    name : rollData.weaponType,
                    text : rollData.weaponType,
                    modifier : 0
                  };
                  rollData.damageFormula = html.find("#damageFormula")[0].value.replace(' ', '');
                  rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
                  rollData.isCombatTest = true;
                  rollData.actorRef = actorRef
                  await shipCombatRoll(rollData);
              },
          },
          cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: game.i18n.localize("BUTTON.CANCEL"),
              callback: () => {},
          },
      },
      default: "roll",
      close: () => {},
      render: html => {
        const sel = html.find("#performer");
        const target = html.find("#target");
        sel.change(ev => {
          if (sel.val() === "crew") {
            target.val(actorRef.crewSkillValue);
          } else {
            target.val(game.actors.get(sel.val()).characteristics.ballisticSkill.total);
          }
        });
      }
  }, {width: 200});
  dialog.render(true);
}

/**
 * Show a psychic power roll dialog.
 * @param {object} rollData
 */
export async function preparePsychicPowerRoll(rollData) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/psychic-power-roll.html", rollData);
  console.log(rollData);
  let dialog = new Dialog({
    title: rollData.name,
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          rollData.name = game.i18n.localize(rollData.name);
          rollData.baseTarget = parseInt(html.find("#target")[0].value, 10);
          rollData.modifier = html.find("#modifier")[0].value;
          rollData.psy.psyStrength = html.find("#psyStrength")[0].value;
          rollData.psy.push = parseInt(html.find("#pushValue")[0]?.value, 10);
          rollData.psy.disciplineMastery = html.find("#disciplineMastery")[0].value;
          rollData.psy.value = getRollPsyRating(rollData);
          rollData.psy.warpConduit = html.find("#warpConduit")[0].checked;
          rollData.damageFormula = html.find("#damageFormula")[0].value;
          rollData.damageType = html.find("#damageType")[0].value;
          rollData.damageBonus = parseInt(html.find("#damageBonus")[0].value, 10);
          rollData.penetrationFormula = html.find("#penetration")[0].value;
          rollData.rateOfFire = { burst: rollData.psy.value, full: rollData.psy.value };
          const attackType = html.find("#attackType")[0];
          rollData.attackType.name = attackType.value;
          rollData.attackType.text = attackType.options[attackType.selectedIndex].text;
          rollData.psy.useModifier = true;
          rollData.isCombatTest = true;
          await combatRoll(rollData);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }
    },
    default: "roll",
    close: () => {}
  }, {width: 200});
  console.log(dialog);
  dialog.render(true);
}

export function getRollPsyRating(rollData) {  
  // Initialize Psy Rating variable
  let psyRating = 0;

  // Determine Psy Rating based on selected Psy Strength and caster's Psy Rating
  switch (rollData.psy.psyStrength) {
      case "fettered":
          // Fettered Psy Rating is the caster's Psy Rating divided by 2, rounded up
          psyRating = Math.ceil(rollData.psy.rating / 2);
          if (rollData.psy.disciplineMastery) {
            psyRating += 1;
          }
          break;
      case "unfettered":
          // Unfettered Psy Rating is the caster's Psy Rating
          psyRating = rollData.psy.rating;
          break;
      case "push":
          // If Psy Strength is push, get the value from the input
          psyRating = rollData.psy.rating + rollData.psy.push;
          break;
      default:
          // Default to 0 if no valid Psy Strength is selected
          psyRating = 0;
          break;
  }

  return psyRating;
}

export async function showAddCharacteristicModifierDialog(itemSheet, modifierType) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/add-characteristic-modifier.html", {
    modifierType: modifierType
  });

  let dialog = new Dialog({
    title: game.i18n.localize("DIALOG.NEW_MODIFIER"),
    content: html,
    buttons: {
      add: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ADD"),
        callback: html => {
          const attributeName = html.find("#attribute-name")[0].value.trim();
          console.log(attributeName)
          const modifierValue = parseInt(html.find("#modifier-char-value")[0].value, 10);
          const unnaturalValue = parseInt(html.find("#modifier-unnatural-value")[0].value, 10);
          const optionElement = html.find(`option[id='modifier-option-${attributeName}']`);
          console.log(optionElement);
          const optionLabel = optionElement.data('option-label');
          console.log(optionLabel);
          const modifierData = {
            id: attributeName,
            label: optionLabel,
            characteristicModifier: modifierValue,
            unnaturalModifier: unnaturalValue,
          }
          if (attributeName && !isNaN(modifierValue)) {
            itemSheet.addModifier(modifierType, attributeName, modifierData);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }
    },
    default: "add",
    close: () => {}
  }, {
    width: 400
  });

  dialog.render(true);
}

export async function showAddSkillModifierDialog(itemSheet, modifierType){
  const html = await renderTemplate("systems/rogue-trader/template/dialog/add-skill-modifier.html", {
    modifierType: modifierType
  });

  let dialog = new Dialog({
    title: game.i18n.localize("DIALOG.NEW_MODIFIER"),
    content: html,
    buttons: {
      add: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ADD"),
        callback: html => {
          const attributeName = html.find("#attribute-name")[0].value.trim();
          const modifierValue = parseInt(html.find("#modifier-skill-value")[0].value, 10);
          const optionElement = html.find(`option[id='modifier-option-${attributeName}']`);
          console.log('foo');
          console.log(optionElement);
          const optionLabel = optionElement.data('option-label');
          const modifierData = {
            id: attributeName,
            label: optionLabel,
            skillModifier: modifierValue,
          }
          if (attributeName && !isNaN(modifierValue)) {
            itemSheet.addModifier(modifierType, attributeName, modifierData);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("BUTTON.CANCEL"),
        callback: () => {}
      }
    },
    default: "add",
    close: () => {}
  }, {
    width: 400
  });

  dialog.render(true);
}