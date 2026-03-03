import {prepareCommonRoll, prepareCombatRoll, preparePsychicPowerRoll, prepareForceFieldRoll} from "../../common/dialog.js";
import RogueTraderUtil from "../../common/util.js";

export class RogueTraderSheet extends ActorSheet {
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-create").click(ev => this._onItemCreate(ev));
    html.find(".item-edit").click(ev => this._onItemEdit(ev));
    html.find(".item-delete").click(ev => this._onItemDelete(ev));
    let inputs = html.find("input");
    inputs.focusin(ev => this._onFocusIn(ev));
    html.find(".roll-characteristic").click(async ev => await this._prepareRollCharacteristic(ev));
    html.find(".roll-skill").click(async ev => await this._prepareRollSkill(ev));
    html.find(".roll-speciality").click(async ev => await this._prepareRollSpeciality(ev));
    html.find(".roll-insanity").click(async ev => await this._prepareRollInsanity(ev));
    html.find(".roll-corruption").click(async ev => await this._prepareRollCorruption(ev));
    html.find(".roll-weapon").click(async ev => await this._prepareRollWeapon(ev));
    html.find(".roll-forceField").click(async ev => await this._prepareRollForceField(ev));
    // html.find(".roll-shipWeapon").click(async ev => await this._prepareRollShipWeapon(ev));
    html.find(".roll-psychic-power").click(async ev => await this._prepareRollPsychicPower(ev));
    
    // ===== ДОБАВЛЕНО: Обработчик для переключателя псикера/навигатора =====
    html.find('input[name="attr_psypowerswitch"]').change(ev => this._onPsypowerSwitch(ev));
    html.find('.roll-navigator').click(async ev => await this._prepareRollNavigator(ev));
    html.find(".create-custom-speciality").click(ev => this._onCreateCustomSpeciality(ev));
    html.find(".delete-custom-speciality").click(ev => this._onDeleteCustomSpeciality(ev));
    html.find('input[name*=".specialities."]').on('blur', ev => this._onSpecialityNameChange(ev));
    html.find('.faction-create').click(ev => this._onFactionCreate(ev));
    html.find('.faction-delete').click(ev => this._onFactionDelete(ev));
    html.find(".roll-reputation").click(async ev => await this._prepareRollReputation(ev));
    html.find(".custom-counter-create").click(ev => this._onCustomCounterCreate(ev));
    html.find(".custom-counter-delete").click(ev => this._onCustomCounterDelete(ev));
    html.find('.skill-search-button').click(ev => this._onSkillSearch(ev));
    html.find('.skill-search-input').on('keypress', ev => {
    if (ev.key === 'Enter') {
        this._onSkillSearch(ev);
    }
});
  }

  /** @override */
 async getData(options) {
    const data = super.getData(options);
    data.system = data.data.system;
    data.items = this.constructItemLists(data);
    
    // Убедимся, что psypowerswitch всегда определен
    if (data.system.psypowerswitch === undefined) {
        data.system.psypowerswitch = false;
    }
    
    // Убедимся, что relations и reputationNotes инициализированы
    if (!data.system.relations) {
        data.system.relations = {
            factions: {},
            trade: {}
        };
    }

    if (data.system.relations.trade) {
        for (const key in data.system.relations.trade) {
            const trade = data.system.relations.trade[key];
            if (trade) {
                // Инициализируем trader, если не установлен
                if (!trade.trader) {
                    trade.trader = "trade";
                }
                // Инициализируем rep, если не установлен
                if (!trade.rep) {
                    trade.rep = "neutral";
                }
            }
        }
    }
    
    if (!data.system.relations.trade) {
        data.system.relations.trade = {};
    }
    
    if (!data.system.reputationNotes) {
        data.system.reputationNotes = "";
    }
    
    // ДОБАВЛЕНО: Передача данных для изображения
    // Если используете отдельный объект reputation
    if (data.system.reputation) {
        data.reputation = data.system.reputation;
    } else {
        // Или используйте системное изображение
        data.reputation = {
            img: data.system.img || "icons/svg/mystery-man.svg",
            name: this.actor.name
        };
    }
    
const actor = this.actor;
  
  // Сбор опций для навыков (как в showAddSkillModifierDialog)
  const skillOptions = [];
  const basicSkills = [];
  const specialities = [];

  if (actor) {
    for (const [skillKey, skill] of Object.entries(actor.system.skills || {})) {
      const parentName = game.i18n.localize(skill.label) || skill.label || skillKey;
      
      // Основной навык, если он не специализированный
      if (!skill.isSpecialist) {
        basicSkills.push({
          value: skillKey,
          label: skill.label,
          type: 'skill'
        });
      }
      
      // Специализации
      if (skill.isSpecialist && skill.specialities) {
        for (const [specKey, spec] of Object.entries(skill.specialities)) {
          const isCustom = spec.isCustom || specKey.startsWith('custom_');
          const fullKey = `${skillKey}:${specKey}`;
          specialities.push({
            value: fullKey,
            label: spec.label || specKey,
            parentName,
            type: 'speciality',
            isCustom
          });
        }
      }
    }
  }

  data.skillOptions = [...basicSkills, ...specialities];
  data.hasSkills = data.skillOptions.length > 0;
  data.hasBasicSkills = basicSkills.length > 0;
  data.hasSpecialities = specialities.length > 0;

  // Если хелпер getCharacteristics не работает, передаём список характеристик вручную
  if (actor) {
    const characteristics = {};
    for (const [key, char] of Object.entries(actor.system.characteristics || {})) {
      characteristics[key] = char.label;
    }
    data.characteristics = characteristics;
  }

  return data;
}

  /** @override */
  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/rogue-trader/template/sheet/actor/limited-sheet.html";
    } else {
      return this.options.template;
    }
  }



getReputationModifier(rep) {
    switch (rep) {
        case "neutral":
            return 0;
        case "peer":
            return 10;
        case "goodreputation":
            return 20;
        case "rival":
            return -10;    
        case "emeny":
            return -20;
        default:
            return 0;
    }
}

async _onCustomCounterCreate(event) {
    event.preventDefault();
    const counterKey = `counter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const updateData = {
        [`system.customCounters.${counterKey}`]: {
            name: "Новый счетчик",
            current: 0,
            max: 0,
            color: "#5d2f149e", // цвет по умолчанию
            showMax: true // показывать ли максимальное значение
        }
    };
    
    await this.actor.update(updateData);
    this.render();
}

// Метод для удаления кастомного счетчика
async _onCustomCounterDelete(event) {
    event.preventDefault();
    const counterKey = $(event.currentTarget).data("counter-key");
    
    // Подтверждение удаления
    const confirmed = await new Promise((resolve) => {
        new Dialog({
            title: "Удалить счетчик?",
            content: `<p>Вы уверены, что хотите удалить этот счетчик?</p>`,
            buttons: {
                yes: {
                    label: "Да",
                    callback: () => resolve(true)
                },
                no: {
                    label: "Нет",
                    callback: () => resolve(false)
                }
            }
        }).render(true);
    });
    
    if (!confirmed) return;
    
    const updateData = {
        [`system.customCounters.-=${counterKey}`]: null
    };
    
    await this.actor.update(updateData);
    this.render();
}
async _onSkillSearch(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log("Поиск навыков запущен");
    
    // НАИБОЛЕЕ ВАЖНОЕ ИСПРАВЛЕНИЕ: Ищем input внутри текущего sheet, а не всего документа
    const sheetElement = this.element; // Получаем DOM элемент листа
    const input = sheetElement.find('.skill-search-input');
    const searchTerm = input.val().toLowerCase().trim();
    
    if (!searchTerm) {
        ui.notifications.warn("Введите текст для поиска");
        return;
    }
    
    // Ищем ТОЛЬКО внутри текущего листа
    const allSkills = sheetElement.find('.skills .skill.item, .skills .speciality.item');
    console.log(`Найдено элементов: ${allSkills.length}`);
    
    let found = null;
    
    for (const element of allSkills) {
        const nameElement = $(element).find('.name');
        if (!nameElement.length) continue;
        
        let skillName = '';
        
        // Проверяем, есть ли внутри input
        const inputField = nameElement.find('input[type="text"]');
        if (inputField.length) {
            skillName = inputField.val().toLowerCase().trim();
        } else {
            skillName = nameElement.text().toLowerCase().trim();
        }
        
        if (skillName && skillName.includes(searchTerm)) {
            found = element;
            break;
        }
    }
    
    if (found) {
        // Убираем старые подсветки
        sheetElement.find('.search-highlight').removeClass('search-highlight');
        
        // Добавляем новую
        $(found).addClass('search-highlight');
        
        // Прокрутка к найденному элементу
        $(found)[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Сообщение
        const nameText = $(found).find('.name').text().trim() || 
                        $(found).find('.name input').val().trim();
        ui.notifications.info(`Найден: ${nameText}`);
        
        // Автоматическое скрытие
        setTimeout(() => {
            $(found).removeClass('search-highlight');
        }, 3000);
    } else {
        ui.notifications.warn(`Не найдено: "${searchTerm}"`);
    }
    
    // Возвращаем фокус
    setTimeout(() => input.focus().select(), 100);
}
async _prepareRollReputation(event) {
    event.preventDefault();
    const factionKey = $(event.currentTarget).data("faction-key");
    const trade = this.actor.system.relations.trade[factionKey];
    
    if (!trade) {
        ui.notifications.error("Фракция не найдена!");
        return;
    }
    
    // Получаем тип торговли
     let traderType = "trade";
    if (trade.trader) {
        traderType = trade.trader; // Теперь берем из trade.trader
    }     
    // Определяем данные для навыка/специализации
    let skillKey, specialityKey, skillDisplayName, baseTarget, isSpeciality;
    
    if (traderType === "barter") {
        // Используем навык barter (не специализированный)
        skillKey = "barter";
        isSpeciality = false;
        skillDisplayName = "SKILL.BARTER";
        
        const skill = this.actor.skills[skillKey];
        baseTarget = skill ? skill.total : 0;
    } else {
        // Используем специализацию commerce навыка trade
        skillKey = "advFel";
        specialityKey = "commerce";
        isSpeciality = true;
        skillDisplayName = "SKILL.COMMERCE";
        
        // Получаем значение специализации
        const skill = this.actor.skills[skillKey];
        if (skill && skill.specialities && skill.specialities[specialityKey]) {
            baseTarget = skill.specialities[specialityKey].total;
        } else {
            baseTarget = 0;
            ui.notifications.warn(`У актора нет специализации ${specialityKey} в навыке trade.`);
        }
    }
    
    // ИЗМЕНЕНИЕ: Устанавливаем modifier в 0 вместо trade.bonus
    const rollData = {
        name: trade.name,
        factionKey: factionKey,
        baseTarget: baseTarget,
        modifier: 0, // Был: trade.bonus || 0
        reputation: trade.rep || "neutral",
        skillKey: skillKey,
        specialityKey: specialityKey,
        skillDisplayName: skillDisplayName,
        isSpeciality: isSpeciality,
        ownerId: this.actor.id
    };
    
    // Вызываем диалог для броска репутации
    await this._prepareReputationRollDialog(rollData);
}

async _prepareReputationRollDialog(rollData) {
    // Получаем актуальные данные о фракции для расчета
    const trade = this.actor.system.relations.trade[rollData.factionKey];
    const profitFactor = this.actor.system.characteristics?.ProfitFactor?.total || 0;
    
    // Рассчитываем модификатор репутации
    const repModifier = this.getReputationModifier(trade?.rep || "neutral");
    
    // Добавляем данные для вкладки "Реквизиция"
    rollData.reputationBonus = trade?.bonus || 0;
    rollData.profitFactor = profitFactor;
    rollData.suppleBaseTarget = (trade?.bonus || 0) + profitFactor; // Правильно вычисляем сумму
    rollData.repModifier = repModifier; // Добавляем модификатор репутации
    
    // Получаем HTML шаблона rep-roll.html
    const html = await renderTemplate("systems/rogue-trader/template/dialog/rep-roll.html", rollData);
    
    let dialog = new Dialog({
        title: `Проверка репутации: ${rollData.name}`,
        content: html,
        buttons: {
            roll: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("BUTTON.ROLL"),
                callback: async html => {
                    // Определяем активную вкладку
                    const activeTab = html.find('.tabs .item.active').data('tab');
                    
                    if (activeTab === 'trade') {
                        // Обработка для вкладки "Торговля"
                        const modifier = parseInt(html.find("#modifier-skill-value")[0].value, 10) || 0;
                        const baseTarget = parseInt(html.find("#base-target")[0].value, 10) || 0;
                        const skillKey = html.find("#skill-key")[0].value;
                        const specialityKey = html.find("#speciality-key")[0].value;
                        const factionKey = html.find("#faction-key")[0].value;
                        const isSpeciality = html.find("#is-speciality")[0].value === "true";
                        const useReputation = html.find("#use-reputation-trade")[0].checked;
                        
                        // Получаем актуальные данные о фракции
                        const trade = this.actor.system.relations.trade[factionKey];
                        if (!trade) return;
                        
                        // Рассчитываем модификатор репутации, если чекбокс отмечен
                        let finalModifier = modifier;
                        if (useReputation) {
                            const repMod = this.getReputationModifier(trade.rep || "neutral");
                            finalModifier += repMod;
                        }
                        
                        // Обновляем данные для броска
                        const finalRollData = {
                            name: `Проверка ${game.i18n.localize(rollData.skillDisplayName)}: ${trade.name}`,
                            baseTarget: baseTarget,
                            modifier: finalModifier,
                            skillKey: skillKey,
                            specialityKey: specialityKey,
                            isSpeciality: isSpeciality,
                            skillDisplayName: rollData.skillDisplayName,
                            factionKey: factionKey,
                            ownerId: this.actor.id,
                            isCombatTest: false,
                            useReputation: useReputation,
                            reputationModifier: useReputation ? this.getReputationModifier(trade.rep || "neutral") : 0
                        };
                        
                        // Выполняем бросок репутации
                        await this._executeReputationRoll(finalRollData);
                    } 
                    else if (activeTab === 'supple') {
                        // Обработка для вкладки "Реквизиция"
                        const factionKey = html.find("#faction-key-supple")[0].value;
                        const reputationBonus = parseInt(html.find("#reputation-bonus")[0].value, 10) || 0;
                        const profitFactor = parseInt(html.find("#profit-factor")[0].value, 10) || 0;
                        const suppleModifier = parseInt(html.find("#supple-modifier")[0].value, 10) || 0;
                        const useReputation = html.find("#use-reputation-supple")[0].checked;
                        
                        // Рассчитываем цели
                        let baseTarget = reputationBonus + profitFactor;
                        let finalModifier = suppleModifier;
                        
                        // Получаем данные о фракции
                        const trade = this.actor.system.relations.trade[factionKey];
                        if (!trade) return;
                        
                        // Добавляем модификатор репутации, если чекбокс отмечен
                        if (useReputation) {
                            const repMod = this.getReputationModifier(trade.rep || "neutral");
                            finalModifier += repMod;
                        }
                        
                        const finalTarget = baseTarget + finalModifier;
                        
                        // Создаем данные для броска реквизиции
                        const suppleRollData = {
                            name: `Снабжение: ${trade.name}`,
                            baseTarget: baseTarget,
                            modifier: finalModifier,
                            finalTarget: finalTarget,
                            isSupple: true, // Флаг для определения типа броска
                            factionKey: factionKey,
                            ownerId: this.actor.id,
                            reputationBonus: reputationBonus,
                            profitFactor: profitFactor,
                            isCombatTest: false,
                            useReputation: useReputation,
                            reputationModifier: useReputation ? this.getReputationModifier(trade.rep || "neutral") : 0
                        };
                        
                        // Выполняем бросок реквизиции
                        await this._executeSuppleRoll(suppleRollData);
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
            // Инициализация табов
            const tabs = html.find('.tabs .item');
            const tabContents = html.find('.tab');
            
            tabs.click(ev => {
                const tab = $(ev.currentTarget).data('tab');
                tabs.removeClass('active');
                $(ev.currentTarget).addClass('active');
                tabContents.hide();
                html.find(`.tab[data-tab="${tab}"]`).show();
            });
            
            // Функция для обновления финальной цели с учетом репутации
            const updateFinalTarget = (tabType) => {
                if (tabType === 'trade') {
                    const base = parseInt(html.find('#base-target').val()) || 0;
                    const modifier = parseInt(html.find('#modifier-skill-value').val()) || 0;
                    const useReputation = html.find('#use-reputation-trade').is(':checked');
                    const repModifier = html.find('#rep-modifier-trade').val() || 0;
                    
                    let finalTarget = base + modifier;
                    if (useReputation) {
                        finalTarget += parseInt(repModifier);
                    }
                    html.find('#final-target-trade').val(finalTarget);
                } else if (tabType === 'supple') {
                    const base = parseInt(html.find('#supple-base-target').val()) || 0;
                    const modifier = parseInt(html.find('#supple-modifier').val()) || 0;
                    const useReputation = html.find('#use-reputation-supple').is(':checked');
                    const repModifier = html.find('#rep-modifier-supple').val() || 0;
                    
                    let finalTarget = base + modifier;
                    if (useReputation) {
                        finalTarget += parseInt(repModifier);
                    }
                    html.find('#supple-final-target').val(finalTarget);
                }
            };
            
            // Обработчики для вкладки "Торговля"
            html.find('#modifier-skill-value').on('input', () => updateFinalTarget('trade'));
            html.find('#use-reputation-trade').change(() => updateFinalTarget('trade'));
            
            // Обработчики для вкладки "Реквизиция"
            html.find('#supple-modifier').on('input', () => updateFinalTarget('supple'));
            html.find('#use-reputation-supple').change(() => updateFinalTarget('supple'));
            
            // Инициализируем начальные значения
            updateFinalTarget('trade');
            updateFinalTarget('supple');
            
            // Активируем первую вкладку
            tabs.first().addClass('active');
            html.find('.tab[data-tab="trade"]').show();
        }
    }, { width: 280     }); // Увеличим ширину для новых полей
    
    dialog.render(true);
}

// Метод для выполнения броска реквизиции
async _executeSuppleRoll(rollData) {
    // Получаем актора
    const actor = game.actors.get(rollData.ownerId);
    if (!actor) return;
    
    // Рассчитываем финальную цель
    const finalTarget = rollData.finalTarget;
    
    // Создаем бросок d100
    let roll = new Roll("1d100");
    await roll.evaluate({async: true});
    
    const result = roll.total;
    const isSuccess = result <= finalTarget;
    
    // Вычисляем степени успеха/провала
    let dos = 0;
    let dof = 0;
    
    if (isSuccess) {
        dos = Math.floor((finalTarget - result) / 10);
    } else {
        dof = Math.floor((result - finalTarget) / 10);
    }
    
    // Подготавливаем данные для отправки в чат
    const chatData = {
        name: rollData.name,
        target: finalTarget,
        result: result,
        isSuccess: isSuccess,
        dos: dos,
        dof: dof,
        showDoS: true,
        baseTarget: rollData.baseTarget,
        modifier: rollData.modifier,
        reputationBonus: rollData.reputationBonus,
        profitFactor: rollData.profitFactor,
        rollObject: roll,
        render: await roll.render(),
        isSuppleRoll: true,
        useReputation: rollData.useReputation || false,
        reputationModifier: rollData.reputationModifier || 0
    };
    
    // Отправляем в чат
    await this._sendSuppleToChat(chatData);
}

// Метод для отправки результата реквизиции в чат
async _sendSuppleToChat(rollData) {
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
    
    const html = await renderTemplate("systems/rogue-trader/template/chat/reputation-roll.html", rollData);
    chatData.content = html;
    
    if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    } else if (chatData.rollMode === "selfroll") {
        chatData.whisper = [game.user];
    }
    
    ChatMessage.create(chatData);
}
// Метод для выполнения броска репутации
async _executeReputationRoll(rollData) {
    // Получаем актора
    const actor = game.actors.get(rollData.ownerId);
    if (!actor) return;
    
    // Рассчитываем финальную цель
    const finalTarget = rollData.baseTarget + rollData.modifier;
    
    // Создаем бросок d100
    let roll = new Roll("1d100");
    await roll.evaluate({async: true});
    
    const result = roll.total;
    const isSuccess = result <= finalTarget;
    
    // Вычисляем степени успеха/провала
    let dos = 0;
    let dof = 0;
    
    if (isSuccess) {
        dos = Math.floor((finalTarget - result) / 10);
    } else {
        dof = Math.floor((result - finalTarget) / 10);
    }
    
    // Получаем локализованное название навыка/специализации
    const skillName = game.i18n.localize(rollData.skillDisplayName);
    
    // Подготавливаем данные для отправки в чат
    const chatData = {
        name: rollData.name,
        target: finalTarget,
        result: result,
        isSuccess: isSuccess,
        dos: dos,
        dof: dof,
        showDoS: true,
        modifier: rollData.modifier,
        baseTarget: rollData.baseTarget,
        skillName: skillName,
        isSpeciality: rollData.isSpeciality,
        rollObject: roll,
        render: await roll.render(),
        isReputationRoll: true,
        useReputation: rollData.useReputation || false,
        reputationModifier: rollData.reputationModifier || 0
    };
    
    // Отправляем в чат
    await this._sendReputationToChat(chatData);
}
// Метод для отправки результата в чат
async _sendReputationToChat(rollData) {
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
    
    const html = await renderTemplate("systems/rogue-trader/template/chat/reputation-roll.html", rollData);
    chatData.content = html;
    
    if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    } else if (chatData.rollMode === "selfroll") {
        chatData.whisper = [game.user];
    }
    
    ChatMessage.create(chatData);
}

async _onFactionCreate(event) {
    event.preventDefault();
    const factionType = $(event.currentTarget).data('faction-type');
    
    // Генерируем уникальный ключ
    const factionKey = `faction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let updateData = {};
    
    if (factionType === 'trade') {
        updateData[`system.relations.trade.${factionKey}`] = {
            name: "Новая Фракция",
            bonus: 0,
            trader: "trade", // ДОБАВЛЕНО: инициализация поля trader
            rep: "neutral"   // ДОБАВЛЕНО: инициализация поля rep
        };
    }
    
    await this.actor.update(updateData);
    this.render();
}


// ДОБАВЛЕНО: Метод для удаления фракции
async _onFactionDelete(event) {
    event.preventDefault();
    const factionType = $(event.currentTarget).data('faction-type');
    const factionKey = $(event.currentTarget).data('faction-key');
    
    // Подтверждение удаления
    const confirmed = await new Promise((resolve) => {
        new Dialog({
            title: "Удалить фракцию?",
            content: `<p>Вы уверены, что хотите удалить эту фракцию?</p>`,
            buttons: {
                yes: {
                    label: "Да",
                    callback: () => resolve(true)
                },
                no: {
                    label: "Нет",
                    callback: () => resolve(false)
                }
            }
        }).render(true);
    });
    
    if (!confirmed) return;
    
    // Удаляем фракцию
    const updateData = {};
    if (factionType === 'relation') {
        updateData[`system.relations.factions.-=${factionKey}`] = null;
    } else if (factionType === 'trade') {
        updateData[`system.relations.trade.-=${factionKey}`] = null;
    }
    
    await this.actor.update(updateData);
    this.render();
}

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if (this.actor.isOwner) {
      buttons = [
        {
          label: game.i18n.localize("BUTTON.ROLL"),
          class: "custom-roll",
          icon: "fas fa-dice",
          onclick: async ev => await this._prepareCustomRoll()
        }
      ].concat(buttons);
    }
    return buttons;
  }

  
async _prepareRollNavigator(event) {
  event.preventDefault();
  const div = $(event.currentTarget).parents('.item');
  const item = this.actor.items.get(div.data('item-id'));
  
  if (!item) return;
  
  // Получаем данные из предмета навигатора
  const skillLevel = item.system.skillLevel || "novice";
  const navigatorTest = item.system.navigatortest || "willpower";
  const navigatorDifficulty = item.system.navigatorPower?.difficulty || 0;
  
  // Подготавливаем данные для броска навигатора
  const rollData = {
    name: item.name,
    baseTarget: 0, // Будет вычислено в диалоге на основе выбранного теста
    modifier: 0, // Ручной модификатор
    skillLevel: skillLevel,
    navigatorTest: navigatorTest,
    navigatorDifficulty: navigatorDifficulty,
    itemId: item.id,
    ownerId: this.actor.id,
    isNavigator: true
  };
  
  // Вызываем диалог для броска навигатора
  const { prepareNavigatorRoll } = await import("../../common/dialog.js");
  await prepareNavigatorRoll(rollData);
}

  // ===== ДОБАВЛЕНО: Метод для обработки изменения переключателя =====
   async _onPsypowerSwitch(event) {
    const checkbox = event.currentTarget;
    const isChecked = checkbox.checked;
    
    // Обновляем значение в данных актора
    await this.actor.update({
      "system.psypowerswitch": isChecked
    });
    
    // Перерисовываем только секцию с псионическими способностями
    // Либо перерисовываем весь лист, если нужно
    this.render();
  }

// ДОБАВЛЕНО: Метод для создания кастомной специализации
  async _onCreateCustomSpeciality(event) {
    event.preventDefault();
    const skillKey = $(event.currentTarget).data("skill");
    
    // Генерируем уникальный ключ
    const specialityKey = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Создаем новую специализацию
    const updateData = {
      [`system.skills.${skillKey}.specialities.${specialityKey}`]: {
        label: name,
        advance: -20,
        cost: 0,
        isCustom: true,
        total: 0
      }
    };
    
    await this.actor.update(updateData);
    this.render();
  }

  // ДОБАВЛЕНО: Метод для удаления кастомной специализации
  async _onDeleteCustomSpeciality(event) {
    event.preventDefault();
    const skillKey = $(event.currentTarget).data("skill");
    const specialityKey = $(event.currentTarget).data("speciality");
    
    // Подтверждение удаления
    const confirmed = await new Promise((resolve) => {
      new Dialog({
        title: "Удалить специализацию?",
        content: `<p>Вы уверены, что хотите удалить эту кастомную специализацию?</p>`,
        buttons: {
          yes: {
            label: "Да",
            callback: () => resolve(true)
          },
          no: {
            label: "Нет",
            callback: () => resolve(false)
          }
        }
      }).render(true);
    });
    
    if (!confirmed) return;
    
    // Удаляем специализацию
    const updateData = {
      [`system.skills.${skillKey}.specialities.-=${specialityKey}`]: null
    };
    
    await this.actor.update(updateData);
    this.render();
  }

  // ДОБАВЛЕНО: Метод для обработки изменения названия
  _onSpecialityNameChange(event) {
    const input = event.currentTarget;
    const name = input.name;
    const value = input.value;
    
    // Находим родительский элемент для проверки, является ли это кастомной специализацией
    const row = $(input).closest('.speciality');
    const isCustom = row.data('speciality-key')?.startsWith('custom_');
    
    if (isCustom && value.trim()) {
      // Для кастомных специализаций сохраняем изменения
      const updateData = {};
      updateData[name] = value.trim();
      this.actor.update(updateData);
    }
  }


  _onItemCreate(event) {
    event.preventDefault();
    let header = event.currentTarget.dataset;

    let data = {
      name: `New ${game.i18n.localize(`TYPES.Item.${this.camelCase(header.type)}`)}`,
      type: header.type
    };
    this.actor.createEmbeddedDocuments("Item", [data], { renderSheet: true });
  }

  camelCase(str) {
    // Using replace method with regEx
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return index == 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  _onItemEdit(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    let item = this.actor.items.get(div.data("itemId"));
    item.sheet.render(true);
  }

  _onItemDelete(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    this.actor.deleteEmbeddedDocuments("Item", [div.data("itemId")]);
    div.slideUp(200, () => this.render(false));
  }

  _onFocusIn(event) {
    $(event.currentTarget).select();
  }

  async _prepareCustomRoll() {
    const rollData = {
      name: "DIALOG.CUSTOM_ROLL",
      baseTarget: 50,
      modifier: 0,
      ownerId: this.actor.id
    };
    await prepareCommonRoll(rollData);
  }
  

async _prepareRollCharacteristic(event) {
  event.preventDefault();
  const characteristicName = $(event.currentTarget).data("characteristic");
  const characteristic = this.actor.characteristics[characteristicName];
  const rollData = {
    name: characteristic.label,
    baseTarget: characteristic.total,
    modifier: 0,
    ownerId: this.actor.id,
    characteristicKey: characteristicName   // добавляем ключ
  };
  await prepareCommonRoll(rollData);
}

_getCharacteristicOptions(selected) {
    const characteristics = [];
    for (let [key, char] of Object.entries(this.actor.characteristics)) {
        characteristics.push({
            key: key,                                   // добавляем ключ
            label: char.label,
            target: char.total,
            selected: char.short === selected,
            unnatural: char.unnatural
        });
    }
    return characteristics;
}

async _prepareRollSkill(event) {
    event.preventDefault();
    const skillName = $(event.currentTarget).data("skill");
    const skill = this.actor.skills[skillName];
    const defaultChar = skill.defaultCharacteristic || skill.characteristics[0];
    const defaultCharKey = this._getCharacteristicKeyByShort(defaultChar);
    const defaultCharTotal = this.actor.characteristics[defaultCharKey].total;

    // Базовая часть для стандартной характеристики
    const baseDefault = this._getBaseSkillValue(defaultCharTotal, skill.advance);
    // Модификаторы от предметов (общие для всех характеристик)
    const itemMod = skill.total - baseDefault;

    // Формируем список характеристик с корректными целевыми значениями
    let characteristics = this._getCharacteristicOptions(defaultChar);
    characteristics = characteristics.map(char => {
        const charTotal = this.actor.characteristics[char.key].total;
        const base = this._getBaseSkillValue(charTotal, skill.advance);
        char.target = base + itemMod;
        return char;
    });

    const selectedChar = characteristics.find(c => c.selected);
    const charKey = selectedChar.key;
    const unnatural = charKey ? this.actor.getCharacteristicMultiplier(charKey) : 0;

    const rollData = {
        name: skill.label,
        baseTarget: selectedChar.target,
        modifier: 0,
        characteristics: characteristics,
        ownerId: this.actor.id,
        characteristicKey: charKey,
        unnatural: unnatural
    };
    await prepareCommonRoll(rollData);
}
_getCharacteristicKeyByShort(short) {
    for (let [key, char] of Object.entries(this.actor.characteristics)) {
        if (char.short === short) return key;
    }
    return null;
}

async _prepareRollSpeciality(event) {
    event.preventDefault();
    const skillName = $(event.currentTarget).parents(".item").data("skill");
    const specialityName = $(event.currentTarget).data("speciality");
    const skill = this.actor.skills[skillName];
    const speciality = skill.specialities[specialityName];

    const defaultChar = skill.defaultCharacteristic || skill.characteristics[0];
    const defaultCharKey = this._getCharacteristicKeyByShort(defaultChar);
    const defaultCharTotal = this.actor.characteristics[defaultCharKey].total;

    // Базовая часть для стандартной характеристики с учётом advance специализации
    const baseDefault = this._getBaseSkillValue(defaultCharTotal, speciality.advance);
    // Модификаторы от предметов для данной специализации
    const itemMod = speciality.total - baseDefault;

    let characteristics = this._getCharacteristicOptions(defaultChar);
    characteristics = characteristics.map(char => {
        const charTotal = this.actor.characteristics[char.key].total;
        const base = this._getBaseSkillValue(charTotal, speciality.advance);
        char.target = base + itemMod;
        return char;
    });

    const selectedChar = characteristics.find(c => c.selected);
    const charKey = selectedChar.key;
    const unnatural = charKey ? this.actor.getCharacteristicMultiplier(charKey) : 0;

    const rollData = {
        name: speciality.label,
        baseTarget: selectedChar.target,
        modifier: 0,
        characteristics: characteristics,
        ownerId: this.actor.id,
        characteristicKey: charKey,
        unnatural: unnatural
    };
    await prepareCommonRoll(rollData);
}

  async _prepareRollInsanity(event) {
    event.preventDefault();
    const characteristic = this.actor.characteristics.willpower;
    const rollData = {
      name: "FEAR.HEADER",
      baseTarget: characteristic.total,
      modifier: 0,
      ownerId: this.actor.id
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollCorruption(event) {
    event.preventDefault();
    const characteristic = this.actor.characteristics.willpower;
    const rollData = {
      name: "CORRUPTION.HEADER",
      baseTarget: characteristic.total,
      modifier: this._getCorruptionModifier(),
      ownerId: this.actor.id
    };
    await prepareCommonRoll(rollData);
  }

  async _prepareRollWeapon(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const weapon = this.actor.items.get(div.data("itemId"));
    await prepareCombatRoll(
      RogueTraderUtil.createWeaponRollData(this.actor, weapon), 
      this.actor
    );
  }

  async _prepareRollForceField(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const forceField = this.actor.items.get(div.data("itemId"));
    await prepareForceFieldRoll(
      RogueTraderUtil.createForceFieldRollData(this.actor, forceField),
      this.actor
    );
  }
  
  _getBaseSkillValue(charTotal, advance) {
    if (advance === -20 || advance === -10) {
        return Math.floor(charTotal / 2);
    } else {
        return charTotal + advance;
    }
}


/*   async _prepareRollShipWeapon(event) {
    event.preventDefault();
    await this.selectTargetToken();
    if (this.selectedToken) {
      const div = $(event.currentTarget).parents(".item");
      const weapon = this.actor.items.get(div.data("itemId"));
      await prepareShipCombatRoll(
        RogueTraderUtil.createShipWeaponRollData(this.actor, weapon), 
        this.actor,
        this.selectedToken
      );
    }
  }
 */
  async _prepareRollPsychicPower(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const psychicPower = this.actor.items.get(div.data("itemId"));    
    await preparePsychicPowerRoll(
      RogueTraderUtil.createPsychicRollData(this.actor, psychicPower)
    );
  }

  _extractWeaponTraits(traits) {
    // These weapon traits never go above 9 or below 2
    return {
      accurate: this._hasNamedTrait(/Accurate/gi, traits),
      rfFace: this._extractNumberedTrait(/Vengeful.*\(\d\)/gi, traits), // The alternativ die face Righteous Fury is triggered on
      proven: this._extractNumberedTrait(/Proven.*\(\d\)/gi, traits),
      primitive: this._extractNumberedTrait(/Primitive.*\(\d\)/gi, traits),
      razorSharp: this._hasNamedTrait(/Razor *Sharp/gi, traits),
      skipAttackRoll: this._hasNamedTrait(/Spray/gi, traits),
      tearing: this._hasNamedTrait(/Tearing/gi, traits),
      force: this._hasNamedTrait(/Force/gi, traits),
      scatter: this._hasNamedTrait(/Scatter/gi, traits)
    };
  }

  _getMaxPsyRating() {
    let base = this.actor.psy.rating;
    switch (this.actor.psy.class) {
      case "bound":
        return base + 2;
      case "unbound":
        return base + 4;
      case "daemonic":
        return base + 3;
    }
  }

  _getModifiers(modType) {
    let result = {}
    for (let list in this.actor.items) {
      switch (modType) {
        case 'characteristic':
          for (let itemType in this.actor.items[list]) {
            let items = this.actor.items[list][itemType];
            for (let item in items) {
              let itemModifiers = items[item].modifiers;
              for (let charMod in itemModifiers.characteristic) {
                if (result[charMod]) {
                  result[charMod].valueMod += itemModifiers.characteristic[charMod].valueMod;
                  result[charMod].unnaturalMod += itemModifiers.characteristic[charMod].unnaturalMod;
                }
                else {
                  result[charMod] = {
                    valueMod: itemModifiers.characteristic[charMod].valueMod,
                    unnaturalMod: itemModifiers.characteristic[charMod].unnaturalMod
                  };
                }
              }
            }
          }
          break;
        case 'skill':
          for (let itemType in this.actor.items[list]) {
            let items = this.actor.items[list][itemType];
            for (let item in items) {
              let itemModifiers = items[item].modifiers;
              for (let skillMod in itemModifiers.skill) {
                if (result[skillMod]) {
                  result[skillMod].valueMod += itemModifiers.skill[skillMod].valueMod;
                }
                else {
                  result[skillMod] = {
                    valueMod: itemModifiers.skill[skillMod].valueMod,
                  };
                }
              }
            }
          }
          break;
        case 'other':
          break;
      }
    }
  }

  _extractNumberedTrait(regex, traits) {
    let rfMatch = traits.match(regex);
    if (rfMatch) {
      regex = /\d+/gi;
      return parseInt(rfMatch[0].match(regex)[0]);
    }
    return undefined;
  }

  _hasNamedTrait(regex, traits) {
    let rfMatch = traits.match(regex);
    if (rfMatch) {
      return true;
    } else {
      return false;
    }
  }

  _getCorruptionModifier() {
    const corruption = this.actor.corruption;
    if (corruption <= 30) {
      return 0;
    } else if (corruption >= 31 && corruption <= 60) {
      return -10;
    } else if (corruption >= 61 && corruption <= 90) {
      return -20;
    } else if (corruption >= 91) {
      return -30;
    }
  }

  _getWeaponCharacteristic(weapon) {
    if (weapon.class === "melee") {
      return this.actor.characteristics.weaponSkill;
    } else {
      return this.actor.characteristics.ballisticSkill;
    }
  }

  _getFocusPowerTarget(psychicPower) {
    const normalizeName = psychicPower.focusPower.test.toLowerCase();
    if (this.actor.characteristics.hasOwnProperty(normalizeName)) {
      return this.actor.characteristics[normalizeName];
    } else if (this.actor.skills.hasOwnProperty(normalizeName)) {
      return this.actor.skills[normalizeName];
    } else {
      return this.actor.characteristics.willpower;
    }
  }

  constructItemLists() {
      let items = {}
      let itemTypes = this.actor.itemTypes;
      items.mentalDisorders = itemTypes["mentalDisorder"];
      items.malignancies = itemTypes["malignancy"];
      items.mutations = itemTypes["mutation"];
      items.navigator = itemTypes["navigator"];
      if (this.actor.type === "npc") {
          items.abilities = itemTypes["talent"]
          .concat(itemTypes["trait"])
          .concat(itemTypes["specialAbility"]);
      }
      items.talents = itemTypes["talent"];
      items.traits = itemTypes["trait"];
      items.specialAbilities = itemTypes["specialAbility"];
      items.aptitudes = itemTypes["aptitude"];

      items.psychicPowers = itemTypes["psychicPower"];

      items.criticalInjuries = itemTypes["criticalInjury"];

      items.gear = itemTypes["gear"];
      items.drugs = itemTypes["drug"];
      items.tools = itemTypes["tool"];
      items.cybernetics = itemTypes["cybernetic"];

      items.armour = itemTypes["armour"];
      items.forceFields = itemTypes["forceField"];

      items.weapons = itemTypes["weapon"];
      items.weaponMods = itemTypes["weaponModification"];
      items.ammunitions = itemTypes["ammunition"];
      items.shipWeapons = itemTypes["shipWeapon"];
      items.portWeapons = [];
      items.starWeapons = [];
      items.dorsalWeapons = [];
      items.keelWeapons = [];
      items.prowWeapons = [];
      items.shipWeapons.forEach(wp => {
        items[`${wp.system.side}Weapons`].push(wp)
      });
      items.shipComponents = itemTypes["shipComponent"];
      const componentClasses = ["voidEngine", "warpEngine", "gellarField", "voidShield", "bridge", "lifeSupport", "crewQuarters", "augurArrays"];
      const itemsByClass = {};
      for (const componentClass of componentClasses) {
        itemsByClass[componentClass] = items.shipComponents.find(cp => cp.system.class === componentClass);
      }
      items.supplemental = items.shipComponents.filter(cp => cp.system.class === "supplemental");    
      // Access the items using the respective keys
      items.voidEngine = itemsByClass["voidEngine"];
      items.warpEngine = itemsByClass["warpEngine"];
      items.gellarField = itemsByClass["gellarField"];
      items.voidShield = itemsByClass["voidShield"];
      items.bridge = itemsByClass["bridge"];
      items.lifeSupport = itemsByClass["lifeSupport"];
      items.crewQuarters = itemsByClass["crewQuarters"];
      items.augurArrays = itemsByClass["augurArrays"];
      this._sortItemLists(items)
      return items;
  }

    _sortItemLists(items) {
        for (let list in items) {
            if (Array.isArray(items[list]))
                items[list] = items[list].sort((a, b) => a.sort - b.sort)
            else if (typeof items[list] == "object")
                this._sortItemLists(items[list])
        }
    }
}