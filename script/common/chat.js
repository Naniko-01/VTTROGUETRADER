import { commonRoll, combatRoll, rollDamage } from "./roll.js";

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {Array} options       The Array of Context Menu options
 *
 * @returns {Array}              The extended options Array including new context choices
 */
export const addChatMessageContextOptions = function(html, options) {
  let canApply = li => {
    const message = game.messages.get(li.data("messageId"));
    return message.getRollData()?.isCombatTest && message.isContentVisible && canvas.tokens.controlled.length;
  };
  options.push(
    {
      name: game.i18n.localize("CHAT.CONTEXT.APPLY_DAMAGE"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li)
    }
  );
  
  let canReroll = li => {
      const message = game.messages.get(li.data("messageId"));
      let actor = game.actors.get(message.getRollData()?.ownerId);
      return message.isRoll && message.isContentVisible && actor?.fate?.value > 0;
  };
  
  options.push(
      {
          name: game.i18n.localize("CHAT.CONTEXT.REROLL"),
          icon: '<i class="fa-solid fa-repeat"></i>',
          condition: canReroll,
          callback: li => {
              const message = game.messages.get(li.data("messageId"));              
              rerollTest(message.getRollData());
          } 
      }
  )
  return options;
};
/**
 * Обработчик для кнопки броска уклонения
 */
async function onInvokeTest(event) {
  event.preventDefault();
  const li = $(event.currentTarget).closest(".chat-message");
  const message = game.messages.get(li.data("messageId"));
  const rollData = message.getFlag("rogue-trader", "rollData");
  
  if (rollData) {
    // Получаем актора для уклонения
    const actor = await _getEvadingActor();
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("CHAT.NO_ACTOR_FOR_EVASION") || "Нет актора для уклонения");
      return;
    }
    
    // Создаем данные для уклонения
    const evasionData = await createEvasionData(actor, rollData);
    // Вызываем диалог уклонения
    await prepareEvasionRoll(evasionData);
  }
}

/**
 * Получаем актора для уклонения
 */
async function _getEvadingActor() {
  // Проверяем выбранные токены
  if (canvas.tokens.controlled.length > 0) {
    return canvas.tokens.controlled[0].actor;
  }
  
  // Иначе пытаемся получить из текущего чата
  const speaker = ChatMessage.getSpeaker();
  if (speaker.actor) {
    return game.actors.get(speaker.actor);
  }
  
  // Если всё еще нет, пытаемся получить актора из rollData атаки
  return null;
}

/**
 * Создает данные для броска уклонения
 */
async function createEvasionData(actor, attackRollData) {
  // Получаем характеристики актора
  // В Rogue Trader характеристики обычно в actor.system.characteristics
  const characteristics = actor.system.characteristics || {};
  const skills = actor.system.skills || {};
  
  // Вычисляем значения для каждого типа уклонения
  // Dodge (Уворот) - используется Agility (Ловкость)
  const dodgeBase = skills.dodge?.total || 0;
  // Parry (Парирование) - используется Weapon Skill (Навык владения оружием)
  const parryBase = characteristics.weaponSkill?.total || 0;
  // Deny The Witch (Отрицание ведьм) - используется Willpower (Сила воли)
  const denyBase = characteristics.willpower?.total || 0;
  
  // Итоговые цели
  const dodgeTarget = dodgeBase;
  const parryTarget = parryBase;
  const denyTarget = denyBase;
  
  // Создаем данные для уклонения
  const evasionData = {
    name: game.i18n.localize("CHAT.EVASION"),
    ownerId: actor.id,
    actorName: actor.name,
    
    // Навыки уклонения с базовыми значениями
    dodge: {
      label: game.i18n.localize("SKILL.DODGE"),
      base: dodgeBase,
      bonus: 0,
      target: dodgeTarget
    },
    parry: {
      label: game.i18n.localize("SKILL.PARRY"),
      base: parryBase,
      bonus: 0,
      target: parryTarget
    },
    deny: {
      label: game.i18n.localize("CHAT.DENY_THE_WITCH"),
      base: denyBase,
      bonus: 0,
      target: denyTarget
    },
    
    // Данные атаки для расчета
    attackData: attackRollData,
    
    // Изначально выбран dodge
    selectedEvasion: "dodge",
    modifier: 0,
    finalTarget: dodgeTarget
  };
  
  return evasionData;
}

/**
 * Подготовка и показ диалога уклонения
 */
async function prepareEvasionRoll(evasionData) {
  const html = await renderTemplate("systems/rogue-trader/template/dialog/evasion-roll.html", evasionData);
  
  let dialog = new Dialog({
    title: game.i18n.localize("DIALOG.EVASION"),
    content: html,
    buttons: {
      roll: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("BUTTON.ROLL"),
        callback: async html => {
          // Получаем значения из формы
          const selectedEvasion = html.find('#evasionType')[0].value;
          const modifier = parseInt(html.find('#modifier')[0].value, 10) || 0;
          const finalTarget = parseInt(html.find('#finalTarget')[0].value, 10);
          
          // Получаем базовую цель для выбранного типа
          let baseTarget = 0;
          switch(selectedEvasion) {
            case 'dodge':
              baseTarget = evasionData.dodge.target;
              break;
            case 'parry':
              baseTarget = evasionData.parry.target;
              break;
            case 'deny':
              baseTarget = evasionData.deny.target;
              break;
          }
          
          // Обновляем данные
          evasionData.selectedEvasion = selectedEvasion;
          evasionData.modifier = modifier;
          evasionData.baseTarget = baseTarget;
          evasionData.finalTarget = finalTarget;
          
          // Выполняем бросок уклонения
          await evasionRoll(evasionData);
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
      // Функция для обновления значений при изменении выбора
      const updateEvasionValues = () => {
        const evasionType = html.find('#evasionType')[0].value;
        const baseValueSpan = html.find('#baseValue');
        const baseTargetSpan = html.find('#baseTarget');
        const modifierInput = html.find('#modifier')[0];
        const finalTargetInput = html.find('#finalTarget')[0];
        
        let baseValue = 0;
        let baseTarget = 0;
        
        // Устанавливаем значения в зависимости от выбранного типа
        switch(evasionType) {
          case 'dodge':
            baseValue = evasionData.dodge.base;
            baseTarget = evasionData.dodge.target;
            break;
          case 'parry':
            baseValue = evasionData.parry.base;
            baseTarget = evasionData.parry.target;
            break;
          case 'deny':
            baseValue = evasionData.deny.base;
            baseTarget = evasionData.deny.target;
            break;
        }
        
        // Обновляем отображение
        baseValueSpan.text(baseValue);
        baseTargetSpan.text(baseTarget);
        
        // Рассчитываем итоговую цель
        const modifier = parseInt(modifierInput.value) || 0;
        finalTargetInput.value = baseTarget + modifier;
      };
      
      // Назначаем обработчики событий
      html.find('#evasionType').on('change', updateEvasionValues);
      html.find('#modifier').on('input', updateEvasionValues);
      
      // Инициализируем значения при открытии
      updateEvasionValues();
    }
  }, { width: 200 });
  
  dialog.render(true);
}

/**
 * Функция броска уклонения
 */
async function evasionRoll(rollData) {
  // Бросаем d100
  let r = new Roll("1d100");
  r.evaluate({ async: false });
  
  const result = r.total;
  const isSuccess = result <= rollData.finalTarget;
  
  // Вычисляем степени успеха/провала
  let dos = 0;
  let dof = 0;
  
  if (isSuccess) {
    dos = Math.floor((rollData.finalTarget - result) / 10);
    // Добавляем Unnatural Degrees of Success если есть
    if (rollData.unnatural) {
      dos += Math.ceil(rollData.unnatural / 2);
    }
  } else {
    dof = Math.floor((result - rollData.finalTarget) / 10);
  }
  
  // Сравниваем с атакой (если это уклонение от атаки)
  let attackDos = rollData.attackData?.dos || 0;
  let remainingHits = Math.max(0, attackDos - dos);
  
  // Подготавливаем данные для чата
  const chatRollData = {
    name: rollData.name,
    target: rollData.finalTarget,
    result: result,
    isSuccess: isSuccess,
    dos: dos,
    dof: dof,
    showDoS: true,
    modifier: rollData.modifier || 0,
    baseTarget: rollData.baseTarget || 0,
    
    // Данные об уклонении
    isEvasion: true,
    evasionType: rollData.selectedEvasion,
    evasionLabel: rollData[rollData.selectedEvasion]?.label || rollData.selectedEvasion,
    
    // Сравнение с атакой (если есть данные атаки)
    attackDos: attackDos,
    remainingHits: remainingHits,
    wasAttackSuccessful: attackDos > 0,
    
    // Для рендеринга
    rollObject: r,
    render: await r.render(),
    
    // ID для связи
    ownerId: rollData.ownerId,
    actorName: rollData.actorName,
    
    // Сохраняем данные для возможного переброса
    evasionData: rollData
  };
  
  // Отправляем в чат
  await _sendEvasionToChat(chatRollData);
}

/**
 * Отправка сообщения уклонения в чат
 */
async function _sendEvasionToChat(rollData) {
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

  const html = await renderTemplate("systems/rogue-trader/template/chat/evasion.html", rollData);
  chatData.content = html;

  if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
    chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  } else if (chatData.rollMode === "selfroll") {
    chatData.whisper = [game.user];
  }

  ChatMessage.create(chatData);
}
/**
 * Обработчик для кнопки броска урона
 */
async function onInvokeDamage(event) {
  event.preventDefault();
  const li = $(event.currentTarget).closest(".chat-message");
  const message = game.messages.get(li.data("messageId"));
  const rollData = message.getFlag("rogue-trader", "rollData");
  if (rollData) {
    // Проверяем, есть ли формула урона
    if (rollData.damageFormula && rollData.isSuccess) {
      // Важно: получаем свежие данные об акторе
      if (rollData.ownerId) {
        const actor = game.actors.get(rollData.ownerId);
        if (actor) {
          // Обновляем attributeBoni из актора
          rollData.attributeBoni = actor.attributeBoni;
        }
      }
      await rollDamage(rollData);
    } else {
      ui.notifications.warn(game.i18n.localize("CHAT.NO_DAMAGE_TO_ROLL") || "Нет урона для броска или атака не успешна");
    }
  }
}

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
 *
 * @param {HTMLElement} roll    The chat entry which contains the roll data
 * @param {number} multiplier   A damage multiplier to apply to the rolled damage.
 * @returns {Promise}
 */
function applyChatCardDamage(roll, multiplier) {
  // Get the damage data, get them as arrays in case of multiple hits
  const amount = roll.find(".damage-total");
  const location = roll.find(".damage-location");
  const penetration = roll.find(".damage-penetration");
  const type = roll.find(".damage-type");
  const righteousFury = roll.find(".damage-righteous-fury");

  // Put the data from different hits together
  const damages = [];
  for (let i = 0; i < amount.length; i++) {
    damages.push({
      amount: $(amount[i]).text(),
      location: $(location[i]).data("location"),
      penetration: $(penetration[i]).text(),
      type: $(type[i]).text(),
      righteousFury: $(righteousFury[i]).text()
    });
  }

  // Apply to any selected actors
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    return a.applyDamage(damages);
  }));
}

function rerollTest(rollData) {
    let actor = game.actors.get(rollData.ownerId);    
    actor.update({ "system.fate.value" : actor.fate.value -1 });
    delete rollData.damages; //reset so no old data is shown on failure
    
    rollData.isReRoll = true;
    if(rollData.isCombatTest) {
        //All the regexes in this are broken once retrieved from the chatmessage
        //No idea why this happens so we need to fetch them again so the roll works correctly
        rollData.attributeBoni = actor.attributeBoni;
        return combatRoll(rollData);
    } else {
        return commonRoll(rollData);
    }
}

export const showRolls =html => {
// Show dice rolls on double click (изменено с click на dblclick)
  html.on("dblclick", ".rogue-trader.chat.roll>.background.border", onChatRollClick);
  // Обработчики для кнопок
  html.on("click", ".invoke-damage", onInvokeDamage);
  html.on("click", ".invoke-test", onInvokeTest); // Добавлено
};
/**
 * Show/hide dice rolls when a chat message is clicked.
 * @param {Event} event
 */
function onChatRollClick(event) {
  event.preventDefault();
  let roll = $(event.currentTarget.parentElement);
  let tip = roll.find(".dice-rolls");
  if ( !tip.is(":visible") ) tip.slideDown(200);
  else tip.slideUp(200);
}