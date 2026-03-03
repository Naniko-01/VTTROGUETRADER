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

          // Получаем выбранный ключ характеристики
          const selectedKey = html.find("[name=characteristic]").val();
          if (selectedKey) {
            const actor = game.actors.get(rollData.ownerId);
            if (actor && typeof actor.getCharacteristicMultiplier === 'function') {
              rollData.unnatural = actor.getCharacteristicMultiplier(selectedKey);
            } else {
              rollData.unnatural = 0;
            }
          } else {
            rollData.unnatural = 0;
          }

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
      const sel = html.find("select[name=characteristic]");
      const target = html.find("#target");
      sel.change(ev => {
        const selected = sel.find('option:selected');
        target.val(selected.data('target'));
      });
    }
  }, {
    width: 220
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
                    
                    // Вычисляем hitMargin и maxAdditionalHit на основе типа атаки
                    _computeRateOfFireForDialog(rollData);
                    
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
                    const movedCheckbox = html.find("#moved")[0];
                    rollData.moved = movedCheckbox ? movedCheckbox.checked : false;
                    rollData.isCombatTest = true;
                                        // Обработка множественных атак (swift/lightning)
                    if (rollData.attackType.name === "swift" || rollData.attackType.name === "lightning") {
                        const numAttacks = rollData.attackType.name === "swift" ? 2 : 3;
                        // Списание патронов для множественной атаки
                        if (rollData.isRange && rollData.clip.max > 0) {
                            const ammoUseMultiplier = rollData.weaponTraits?.storm ? 2 : 1;
                            const weapon = game.actors.get(rollData.ownerId)?.items?.get(rollData.itemId);
                            if (rollData.clip.value < numAttacks * ammoUseMultiplier) {
                                return reportEmptyClip(rollData);
                            } else {
                                rollData.clip.value -= numAttacks * ammoUseMultiplier;
                                await weapon.update({"system.clip.value": rollData.clip.value});
                            }
                        }
                        // Выполняем отдельные броски стандартной атаки
                        for (let i = 0; i < numAttacks; i++) {
                            // Создаём копию данных для этой атаки
                            const attackData = {
                                ...rollData, // поверхностное копирование
                                attackType: { 
                                    name: "standard", 
                                    text: game.i18n.localize("ATTACK_TYPE.STANDARD"),
                                    modifier: 0,
                                    hitMargin: 0
                                },
                                skipAmmoCheck: true,
                                isMultiplePart: true,
                                partIndex: i,
                                totalParts: numAttacks,
                            };
                            // Удаляем поля, которые могут быть специфичны для предыдущего броска
                            delete attackData.result;
                            delete attackData.isSuccess;
                            delete attackData.dos;
                            delete attackData.dof;
                            delete attackData.damages;
                            delete attackData.rollObject;
                            // Вызываем обычный combatRoll
                            await combatRoll(attackData);
                        }
                        return; // Завершаем обработку, чтобы не вызывать combatRoll ещё раз
                    }
                    // Проверка патронов
                    if (rollData.isRange && rollData.clip.max > 0) {
                        const ammoUseMultiplier = rollData.weaponTraits?.storm ? 2 : 1;
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
 * Вычисляет hitMargin и maxAdditionalHit для диалога
 */
function _computeRateOfFireForDialog(rollData) {
  rollData.maxAdditionalHit = 0;

  switch (rollData.attackType.name) {
    case "standard":
      rollData.attackType.modifier = 10;
      rollData.attackType.hitMargin = 0;
      break;
    case "bolt":
    case "blast":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 0;
      break;

    case "semi_auto":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 2;
      rollData.maxAdditionalHit = rollData.rateOfFire?.burst - 1 || 0;
      break;

    case "swift":
    case "barrage":
    rollData.attackType.modifier = 0;
    rollData.attackType.hitMargin = 0; // было 2
    rollData.maxAdditionalHit = 0;
    break;

    case "full_auto":
      rollData.attackType.modifier = -10;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire?.full - 1 || 0;
      break;

 case "lightning":
    rollData.attackType.modifier = 0; // было -10
    rollData.attackType.hitMargin = 0; // было 1
    rollData.maxAdditionalHit = 0;
    break;

    case "storm":
      rollData.attackType.modifier = 0;
      rollData.attackType.hitMargin = 1;
      rollData.maxAdditionalHit = rollData.rateOfFire?.full - 1 || 0;
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
      rollData.attackType.hitMargin = rollData.dosPerHit ?? 1;
      rollData.maxAdditionalHit = rollData.weaponStrength - 1;
      break;
    case "Lance":
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
  // Получаем актора и предмет
  const actor = game.actors.get(rollData.ownerId);
  const item = actor.items.get(rollData.itemId);

  // Получаем выбранный тип теста из предмета
  const focusTest = item.system.focuspowertest;

  let baseTarget = 0;
  let testName = "";

  switch (focusTest) {
    case "willpower":
      baseTarget = actor.system.characteristics.willpower.total;
      testName = game.i18n.localize("CHARACTERISTIC.WILLPOWER");
      break;
    case "psyniscience":
      // Псайникия — специализация навыка advPer
      if (actor.system.skills?.advPer?.specialities?.psyniscience) {
        baseTarget = actor.system.skills.advPer.specialities.psyniscience.total;
      } else {
        // Если навыка нет, используем половину Perception
        baseTarget = Math.floor(actor.system.characteristics.perception.total / 2);
      }
      testName = game.i18n.localize("SKILL.PSYNISCIENCE");
      break;
    case "awarness":
      if (actor.system.skills?.awareness) {
        baseTarget = actor.system.skills.awareness.total;
      } else {
        baseTarget = Math.floor(actor.system.characteristics.perception.total / 2);
      }
      testName = game.i18n.localize("SKILL.AWARENESS");
      break;
    case "corruption":
      baseTarget = actor.system.corruption;
      testName = game.i18n.localize("CORRUPTION.HEADER");
      break;
    default:
      baseTarget = actor.system.characteristics.willpower.total;
      testName = game.i18n.localize("CHARACTERISTIC.WILLPOWER");
  }

  // Передаём baseTarget в rollData
  rollData.baseTarget = baseTarget;
  rollData.testName = testName;

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
          rollData.psy.disciplineMastery = html.find("#disciplineMastery")[0].checked;
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
          
          // Для пси-сил сразу бросаем урон, как в старой версии
          rollData.skipSeparateDamage = false; // Это заставит бросать урон сразу
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

/**
 * Show a navigator power roll dialog.
 * @param {object} rollData
 */

export async function prepareNavigatorRoll(rollData) {
  // Проверяем, выбран ли nan тест
  if (rollData.navigatorTest === 'nan') {
    // Автоматический успех, отправляем сообщение без диалога
    await _sendNavigatorAutoSuccessToChat(rollData);
    return;
  }
  
  // Получаем актора и предмет навигатора
  const actor = game.actors.get(rollData.ownerId);
  const item = actor.items.get(rollData.itemId);
  
  // Определяем базовую цель на основе выбранного теста
  let baseTarget = 0;
  let testName = '';
  
  switch (rollData.navigatorTest) {
    case 'willpower':
      baseTarget = actor.system.characteristics.willpower.total;
      testName = game.i18n.localize("TITLE.NAVI_WP");
      break;
    case 'perception':
      baseTarget = actor.system.characteristics.perception.total;
      testName = game.i18n.localize("TITLE.NAVI_PER");
      break;
    default:
      baseTarget = actor.system.characteristics.willpower.total;
      testName = game.i18n.localize("TITLE.NAVI_WP");
  }
  
  // Добавляем difficulty к модификатору
  const difficulty = rollData.navigatorDifficulty || 0;
  
  // Извлекаем HTML содержимое из редакторов
  let descriptionNovice = "";
  let descriptionAdept = "";
  let descriptionMaster = "";
  
  if (item.system.descriptionNovice) {
    descriptionNovice = await TextEditor.enrichHTML(item.system.descriptionNovice, {async: true});
  }
  if (item.system.descriptionAdept) {
    descriptionAdept = await TextEditor.enrichHTML(item.system.descriptionAdept, {async: true});
  }
  if (item.system.descriptionMaster) {
    descriptionMaster = await TextEditor.enrichHTML(item.system.descriptionMaster, {async: true});
  }
  
  // Определяем модификатор на основе уровня владения
  const skillLevelModifiers = {
    novice: 0,
    adept: 10,
    master: 20
  };
  
  const skillLevel = rollData.skillLevel || "novice";
  const skillLevelModifier = skillLevelModifiers[skillLevel] || 0;
  
  // Локализованное отображение уровня
  const skillLevelDisplay = {
    novice: game.i18n.localize("TITLE.NOVICE"),
    adept: game.i18n.localize("TITLE.ADEPT"),
    master: game.i18n.localize("TITLE.MASTER")
  }[skillLevel] || skillLevel;
  
  // Рассчитываем итоговую цель
  const initialModifier = rollData.modifier || 0;
  const totalModifier = initialModifier + difficulty; // Добавляем difficulty к модификатору
  const finalTarget = baseTarget + skillLevelModifier + totalModifier;
  
  const html = await renderTemplate("systems/rogue-trader/template/dialog/navigator-roll.html", {
    ...rollData,
    baseTarget: baseTarget,
    testName: testName,
    skillLevelDisplay: skillLevelDisplay,
    skillLevelModifier: skillLevelModifier,
    difficulty: difficulty, // Передаем difficulty отдельно
    modifier: initialModifier, // Только ручной модификатор
    finalTarget: finalTarget,
    descriptionNovice: descriptionNovice,
    descriptionAdept: descriptionAdept,
    descriptionMaster: descriptionMaster,
    system: {
      chat: {
        skillLevel: skillLevel
      }
    }
  });
  
  let dialog = new Dialog({
    title: rollData.name,
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          // Получаем значения из формы
          const finalTargetValue = parseInt(html.find('#finalTarget').val(), 10);
          const manualModifier = parseInt(html.find('#modifier').val(), 10);
          const difficultyValue = parseInt(html.find('#difficulty').val(), 10);
          const skillLevelModifierValue = parseInt(html.find('#skillLevelModifier').val(), 10);
          const baseTargetValue = parseInt(html.find('#target').val(), 10);
          const selectedSkillLevel = html.find('select[name="system.сhat.skillLevel"]').val();
          
          // Получаем описания из скрытых полей
          const descriptionNoviceValue = html.find('#descriptionNovice').val();
          const descriptionAdeptValue = html.find('#descriptionAdept').val();
          const descriptionMasterValue = html.find('#descriptionMaster').val();
          
          // Определяем описание в зависимости от выбранного уровня
          let navigatorDescription = "";
          switch(selectedSkillLevel) {
            case 'novice':
              navigatorDescription = descriptionNoviceValue;
              break;
            case 'adept':
              navigatorDescription = descriptionAdeptValue;
              break;
            case 'master':
              navigatorDescription = descriptionMasterValue;
              break;
          }
          
          // Создаем данные для броска
          const finalRollData = {
            name: rollData.name,
            baseTarget: baseTargetValue,
            modifier: manualModifier + difficultyValue, // Добавляем difficulty к модификатору
            ownerId: rollData.ownerId,
            itemId: rollData.itemId,
            isCombatTest: false,
            unnatural: rollData.unnatural || 0,
            
            // Специальные данные для навигатора
            skillLevelDisplay: skillLevelDisplay,
            skillLevelModifier: skillLevelModifierValue,
            skillLevel: selectedSkillLevel,
            descriptionNovice: descriptionNoviceValue,
            descriptionAdept: descriptionAdeptValue,
            descriptionMaster: descriptionMasterValue,
            navigatorDescription: navigatorDescription,
            isNavigatorRoll: true,
            navigatorTest: rollData.navigatorTest,
            navigatorDifficulty: difficultyValue,
            
            // Расчетная итоговая цель
            calculatedTarget: finalTargetValue
          };
          
          await navigatorCommonRoll(finalRollData);
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
      // Получаем элементы DOM
      const baseTargetInput = html.find('#target');
      const skillLevelModifierInput = html.find('#skillLevelModifier');
      const difficultyInput = html.find('#difficulty');
      const modifierInput = html.find('#modifier');
      const finalTargetInput = html.find('#finalTarget');
      
      // Функция для расчета итоговой цели
      const calculateFinalTarget = () => {
        const baseTarget = parseInt(baseTargetInput.val()) || 0;
        const skillLevelModifier = parseInt(skillLevelModifierInput.val()) || 0;
        const difficulty = parseInt(difficultyInput.val()) || 0;
        const modifier = parseInt(modifierInput.val()) || 0;
        
        // Итоговая цель = базовая цель + скрытый бонус + difficulty + модификатор
        const finalTarget = baseTarget + skillLevelModifier + difficulty + modifier;
        finalTargetInput.val(finalTarget);
      };
      
      // Назначаем обработчик события input на поле модификатора
      modifierInput.on('input', calculateFinalTarget);
      
      // Инициализируем расчет при первом рендере
      calculateFinalTarget();
    }
  }, { width: 210 });
  
  dialog.render(true);
}

/**
 * Отправка сообщения об автоматическом успехе для nan теста
 */
async function _sendNavigatorAutoSuccessToChat(rollData) {
  // Получаем актора и предмет
  const actor = game.actors.get(rollData.ownerId);
  const item = actor.items.get(rollData.itemId);
  
  // Определяем описание в зависимости от уровня навыка
  let description = "";
  const skillLevel = rollData.skillLevel || "novice";
  
  switch(skillLevel) {
    case 'novice':
      description = item.system.descriptionNovice ? 
        await TextEditor.enrichHTML(item.system.descriptionNovice, {async: true}) : "";
      break;
    case 'adept':
      description = item.system.descriptionAdept ? 
        await TextEditor.enrichHTML(item.system.descriptionAdept, {async: true}) : "";
      break;
    case 'master':
      description = item.system.descriptionMaster ? 
        await TextEditor.enrichHTML(item.system.descriptionMaster, {async: true}) : "";
      break;
  }
  
  const skillLevelDisplay = {
    novice: game.i18n.localize("TITLE.NOVICE"),
    adept: game.i18n.localize("TITLE.ADEPT"),
    master: game.i18n.localize("TITLE.MASTER")
  }[skillLevel] || skillLevel;
  
  const navigatorTestDisplay = game.i18n.localize("TITLE.NAVI_NAN");
  
  let speaker = ChatMessage.getSpeaker();
  let chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    rollMode: game.settings.get("core", "rollMode"),
    speaker: speaker,
    flags: {
      "rogue-trader.rollData": {
        isNavigatorAutoSuccess: true,
        name: rollData.name,
        skillLevelDisplay: skillLevelDisplay,
        navigatorTest: navigatorTestDisplay,
        navigatorDescription: description
      }
    }
  };
  
  // Рендерим HTML через шаблон
  const html = await renderTemplate("systems/rogue-trader/template/chat/roll.html", {
    name: rollData.name,
    isNavigatorAutoSuccess: true,
    skillLevelDisplay: skillLevelDisplay,
    navigatorDescription: description,
    ownerId: rollData.ownerId,
    itemId: rollData.itemId
  });
  
  chatData.content = html;
  
  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }
  
  ChatMessage.create(chatData);
}

export async function navigatorCommonRoll(rollData) {
  // Вычисляем цель и делаем бросок
  const finalTarget = rollData.calculatedTarget || (rollData.baseTarget + rollData.skillLevelModifier + rollData.modifier);
  
  // Бросаем d100
  let r = new Roll("1d100");
  r.evaluate({ async: false });
  
  const result = r.total;
  const isSuccess = result <= finalTarget;
  
  // Вычисляем степени успеха/провала
  let dos = 0;
  let dof = 0;
  
  if (isSuccess) {
    dos = Math.floor((finalTarget - result) / 10);
    if (rollData.unnatural) {
      dos += Math.ceil(rollData.unnatural / 2);
    }
  } else {
    dof = Math.floor((result - finalTarget) / 10);
  }
  
  // Подготавливаем данные для отправки в чат
  const chatRollData = {
    name: rollData.name,
    target: finalTarget,
    result: result,
    isSuccess: isSuccess,
    dos: dos,
    dof: dof,
    showDoS: true,
    modifier: rollData.originalModifier || 0,
    
    // Данные навигатора
    isNavigatorRoll: true,
    skillLevelDisplay: rollData.skillLevelDisplay,
    skillLevelModifier: rollData.skillLevelModifier,
    skillLevel: rollData.skillLevel,
    navigatorDescription: rollData.navigatorDescription || '',
    
    // Для рендеринга
    rollObject: r,
    render: await r.render(),
    
    // ID для связи с актором/предметом
    ownerId: rollData.ownerId,
    itemId: rollData.itemId,
    
    // Сохраняем оригинальные цели для отображения
    originalBaseTarget: rollData.originalBaseTarget || rollData.baseTarget,
    originalModifier: rollData.originalModifier || rollData.modifier
  };
  
  // Отправляем в чат
  await _sendNavigatorToChat(chatRollData);
}

/**
 * Отправка сообщения навигатора в чат
 * @param {object} rollData 
 */
async function _sendNavigatorToChat(rollData) {
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
  
  if (speaker.token) {
    rollData.tokenId = speaker.token;
  }

  if (rollData.rollObject) {
    rollData.render = await rollData.rollObject.render();
    chatData.roll = rollData.rollObject;
  } else {
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

export async function showAddSkillModifierDialog(itemSheet, modifierType) {
  const actor = itemSheet.actor;
  const skillOptions = [];
  const basicSkills = []; // Только базовые навыки (без специализаций)
  const specialities = []; // Только специализации
  let hasCustomSpecialities = false;
  
  for (const [skillKey, skill] of Object.entries(actor.system.skills || {})) {
    // Локализуем основной навык для использования в качестве parentName
    const parentName = game.i18n.localize(skill.label) || skill.label || skillKey;
    
    // Добавляем основной навык ТОЛЬКО если у него нет специализаций
    if (!skill.isSpecialist) {
      basicSkills.push({
        value: skillKey,
        label: skill.label, // Ключ локализации
        type: 'skill'
      });
    }
    
    // Добавляем специализации, если они есть
    if (skill.isSpecialist && skill.specialities) {
      for (const [specKey, spec] of Object.entries(skill.specialities)) {
        const isCustom = spec.isCustom || specKey.startsWith('custom_');
        
        if (isCustom) hasCustomSpecialities = true;
        
        const fullKey = `${skillKey}:${specKey}`;
        
        specialities.push({
          value: fullKey,
          label: spec.label || specKey, // Ключ локализации или кастомный текст
          parentName: parentName, // Добавляем локализованное имя родителя
          type: 'speciality',
          isCustom: isCustom
        });
      }
    }
  }
  
  // Объединяем все опции для передачи в шаблон
  const allSkillOptions = [...basicSkills, ...specialities];
  
  const html = await renderTemplate("systems/rogue-trader/template/dialog/add-skill-modifier.html", {
    modifierType: modifierType,
    skillOptions: allSkillOptions,
    basicSkills: basicSkills, // Отдельно передаем базовые навыки для проверки
    hasSkills: allSkillOptions.length > 0,
    hasBasicSkills: basicSkills.length > 0, // Новый флаг: есть ли базовые навыки
    hasSpecialities: specialities.length > 0, // Новый флаг: есть ли специализации
    hasCustomSpecialities: hasCustomSpecialities
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
          
          if (attributeName && !isNaN(modifierValue)) {
            // Находим выбранную опцию
            const selectedOption = html.find("#attribute-name option:selected");
            const optionLabel = selectedOption.data('option-label') || attributeName;
            
            const modifierData = {
              id: attributeName,
              label: optionLabel, // Используем полное имя с родителем
              skillModifier: modifierValue,
            };
            
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