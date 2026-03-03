// Удаляем импорты диалогов, так как они больше не используются
// import {showAddCharacteristicModifierDialog, showAddSkillModifierDialog} from "../common/dialog.js";

export class RogueTraderItemSheet extends ItemSheet {
  activateListeners(html) {
    super.activateListeners(html);
    html.find("input").focusin(ev => this._onFocusIn(ev));

    // === Добавление новых модификаторов ===
    html.find('.add-characteristic-modifier').click(ev => {
      ev.preventDefault();
      if (!this._characteristics) return;
      const firstKey = Object.keys(this._characteristics)[0] || 'weaponSkill';
      const firstLabel = this._characteristics[firstKey] || firstKey;
      const modifierData = {
        id: firstKey,
        label: firstLabel,
        characteristicModifier: 0,
        unnaturalModifier: 0
      };
      this.addModifier('characteristic', firstKey, modifierData);
    });

    html.find('.add-skill-modifier').click(ev => {
      ev.preventDefault();
      if (!this._skillOptions || this._skillOptions.length === 0) return;
      const first = this._skillOptions[0];
      const modifierData = {
        id: first.value,
        label: first.label,
        skillModifier: 0
      };
      this.addModifier('skill', first.value, modifierData);
    });

    html.find('.add-other-modifier').click(ev => {
      ev.preventDefault();
      const newId = `other_${Date.now()}`;
      const modifierData = {
        id: newId,
        label: '',
        value: 0
      };
      this.addModifier('other', newId, modifierData);
    });

    // === Изменение существующих модификаторов ===
    // Характеристики – изменение выпадающего списка
    html.find('.characteristic-select').change(ev => this._onCharacteristicSelectChange(ev));
    // Навыки – изменение выпадающего списка
    html.find('.skill-select').change(ev => this._onSkillSelectChange(ev));

    // Подписка на изменения значений (поля ввода)
    const { modifiers } = this.object.system;
    for (const category in modifiers) {
      if (modifiers.hasOwnProperty(category)) {
        for (const key in modifiers[category]) {
          if (modifiers[category].hasOwnProperty(key)) {  
            switch (category) {
              case 'characteristic':
                this._subscribeCharacteristicChange(html, category, key);
                break;
              case 'skill':
                this._subscribeSkillChange(html, category, key);
                break;
              case 'other':
                this._subscribeOtherChange(html, key);
                break;
            }
          }
        }
      }
    }

    // === Принудительная установка значений select для навыков ===
    // Исправляет проблему, когда после смены навыка select сбрасывается на первую позицию
    html.find('.modifier-item[data-modifier-id="skill"] select.skill-select').each((i, sel) => {
      const row = $(sel).closest('.modifier-item');
      const key = row.data('modifier-key');
      if (key) {
        $(sel).val(key);
      }
    });

    // Удаление модификатора
    html.find(".item-delete").click(ev => this._onModifierDelete(ev));
  }

  // ===== Обработчики смены выпадающего списка (смена атрибута) =====
  _onCharacteristicSelectChange(ev) {
    const select = ev.currentTarget;
    const row = $(select).closest('.modifier-item');
    const oldKey = row.data('modifier-key');
    const newKey = select.value;
    if (oldKey === newKey) return; // ничего не изменилось

    const category = row.data('modifier-id'); // 'characteristic'
    const valueInput = row.find('input[id^="modifier-char-value-"]');
    const unnaturalInput = row.find('input[id^="modifier-unnatural-value-"]');
    const modifierValue = valueInput.val();
    const unnaturalValue = unnaturalInput.val() || 0;
    const optionLabel = select.selectedOptions[0]?.dataset.optionLabel || newKey;

    const newModData = {
      id: newKey,
      label: optionLabel,
      characteristicModifier: modifierValue,
      unnaturalModifier: unnaturalValue
    };

    // Атомарное обновление: удалить старый ключ, добавить новый
    const updateData = {
      [`system.modifiers.${category}.-=${oldKey}`]: null,
      [`system.modifiers.${category}.${newKey}`]: newModData
    };
    this.object.update(updateData).then(() => this.render());
  }

  _onSkillSelectChange(ev) {
    const select = ev.currentTarget;
    const row = $(select).closest('.modifier-item');
    const oldKey = row.data('modifier-key');
    const newKey = select.value;
    if (oldKey === newKey) return;

    const category = row.data('modifier-id'); // 'skill'
    const valueInput = row.find('input[id^="modifier-skill-value-"]');
    const modifierValue = valueInput.val();
    const optionLabel = select.selectedOptions[0]?.dataset.optionLabel || newKey;

    const newModData = {
      id: newKey,
      label: optionLabel,
      skillModifier: modifierValue
    };

    const updateData = {
      [`system.modifiers.${category}.-=${oldKey}`]: null,
      [`system.modifiers.${category}.${newKey}`]: newModData
    };
    this.object.update(updateData).then(() => this.render());
  }

  // ===== Подписка на изменения полей ввода =====
  _subscribeCharacteristicChange(html, category, key) {
    const charModInputField = html.find(`input[id='modifier-char-value-${key}']`);
    const unnaturalModInputField = html.find(`input[id='modifier-unnatural-value-${key}']`);
    const charModLabel = html.find(`a[id='modifier-char-label-${key}']`); // не используется, но оставлено
    charModInputField.change(() => this._onCharacteristicModifierChange(category, key, charModLabel, charModInputField, unnaturalModInputField));
    unnaturalModInputField.change(() => this._onCharacteristicModifierChange(category, key, charModLabel, charModInputField, unnaturalModInputField));
  }

  _subscribeSkillChange(html, category, key) {
    const skillModInputField = html.find(`input[id='modifier-skill-value-${key}']`);
    const skillModLabel = html.find(`a[id='modifier-skill-label-${key}']`);
    skillModInputField.change(() => this._onSkillModifierChange(category, key, skillModLabel, skillModInputField));
  }

  _subscribeOtherChange(html, key) {
    const row = html.find(`.modifier-item[data-modifier-key="${key}"]`);
    const labelInput = row.find('.other-label');
    const valueInput = row.find('.other-value');
    labelInput.change(ev => this._onOtherLabelChange(ev, key));
    valueInput.change(ev => this._onOtherValueChange(ev, key));
  }

  _onCharacteristicModifierChange(category, key, labelElement, charValueField, unnaturalValueField) {
    const charValue = charValueField.val();
    const unnaturalValue = parseInt(unnaturalValueField.val(), 10) || 0;
    const modifierData = {
      id: key,
      label: labelElement.data('modifier-label'),
      characteristicModifier: charValue,
      unnaturalModifier: unnaturalValue
    };
    this.addModifier(category, key, modifierData);
  }

  _onSkillModifierChange(category, key, labelElement, skillValueField) {
    const skillValue = skillValueField.val();
    const modifierData = {
      id: key,
      label: labelElement.data('modifier-label'),
      skillModifier: skillValue,
    };
    this.addModifier(category, key, modifierData);
  }

  _onOtherLabelChange(ev, key) {
    const input = ev.currentTarget;
    const newLabel = input.value;
    const current = this.object.system.modifiers.other[key] || {};
    const modifierData = { ...current, label: newLabel };
    this.object.update({ [`system.modifiers.other.${key}`]: modifierData });
  }

  _onOtherValueChange(ev, key) {
    const input = ev.currentTarget;
    const newValue = input.value;
    const current = this.object.system.modifiers.other[key] || {};
    const modifierData = { ...current, value: newValue };
    this.object.update({ [`system.modifiers.other.${key}`]: modifierData });
  }

  async getData(options) {
    // Получаем базовые данные от родительского класса
    const data = await super.getData(options);
    
    // Обогащение HTML для описаний (как в оригинале)
    data.item.descriptionHTML = await TextEditor.enrichHTML(
      data.item.system.description,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    
    if (data.item.system.descriptionNovice) {
      data.item.system.descriptionNoviceHTML = await TextEditor.enrichHTML(
        data.item.system.descriptionNovice,
        {
          secrets: data.item.isOwner,
          rollData: data.rollData,
          async: true,
          relativeTo: this.item,
        }
      );
    }
    
    if (data.item.system.descriptionAdept) {
      data.item.system.descriptionAdeptHTML = await TextEditor.enrichHTML(
        data.item.system.descriptionAdept,
        {
          secrets: data.item.isOwner,
          rollData: data.rollData,
          async: true,
          relativeTo: this.item,
        }
      );
    }
    
    if (data.item.system.descriptionMaster) {
      data.item.system.descriptionMasterHTML = await TextEditor.enrichHTML(
        data.item.system.descriptionMaster,
        {
          secrets: data.item.isOwner,
          rollData: data.rollData,
          async: true,
          relativeTo: this.item,
        }
      );
    }

    // Обогащение HTML для компонентов корабля и прочего
    data.item.system.essentialComponentsHTML = await TextEditor.enrichHTML(
      data.item.system.essentialComponents,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    data.item.system.supplementalComponentsHTML = await TextEditor.enrichHTML(
      data.item.system.supplementalComponents,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    data.item.system.complicationsHTML = await TextEditor.enrichHTML(
      data.item.system.complications,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    data.item.system.pastHistoryHTML = await TextEditor.enrichHTML(
      data.item.system.pastHistory,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    data.item.system.weaponsHTML = await TextEditor.enrichHTML(
      data.item.system.weapons,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );

    // Формируем результат для шаблона: добавляем system = data.data.system
    const result = {
      item: data.item,
      system: data.data.system // именно это ожидает modifiers.html
    };

    // --- Добавление данных для выпадающих списков в модификаторах ---
    const actor = this.actor;
    if (actor) {
      // Характеристики
      const characteristics = {};
      for (const [key, char] of Object.entries(actor.system.characteristics || {})) {
        characteristics[key] = char.label;
      }
      result.characteristics = characteristics;
      this._characteristics = characteristics; // кешируем для кнопок добавления

      // Сбор опций для навыков
      const skillOptions = [];
      const basicSkills = [];
      const specialities = [];

      for (const [skillKey, skill] of Object.entries(actor.system.skills || {})) {
        const parentName = game.i18n.localize(skill.label) || skill.label || skillKey;
        
        // Основные навыки (без специализаций)
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

      result.skillOptions = [...basicSkills, ...specialities];
      result.hasSkills = result.skillOptions.length > 0;
      result.hasBasicSkills = basicSkills.length > 0;
      result.hasSpecialities = specialities.length > 0;
      this._skillOptions = result.skillOptions; // кешируем
    }

    return result;
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons = [
      {
        label: game.i18n.localize("BUTTON.POST_ITEM"),
        class: "item-post",
        icon: "fas fa-comment",
        onclick: ev => this.item.sendToChat()
      }
    ].concat(buttons);
    return buttons;
  }

  _onFocusIn(event) {
    $(event.currentTarget).select();
  }

  /**
   * Adds a new modifier to the item.
   * @param {string} modifierType - The type of the modifier ('characteristic', 'skill', 'other').
   * @param {string} attributeName - The name of the affected attribute.
   * @param {object} modifierData - The value of the modifier to add.
   */
  addModifier(modifierType, attributeName, modifierData) {
    if (!['characteristic', 'skill', 'other'].includes(modifierType)) {
      console.error('Invalid modifier type. Must be "characteristic", "skill", or "other".');
      return;
    }
    const itemData = this.object.system;
    if (!itemData.modifiers) {
      itemData.modifiers = { characteristic: {}, skill: {}, other: {} };
    }
    itemData.modifiers[modifierType][attributeName] = modifierData;
    this.object.update({ 'system.modifiers': itemData.modifiers })
      .then(() => {
        console.log(`Modifier added: ${modifierType} - ${attributeName}:`, modifierData);
        // Принудительно перерисовываем лист, чтобы новый модификатор отобразился
        this.render();
      })
      .catch(err => console.error('Error updating item with new modifier:', err));
  }

  _onModifierDelete(event) { 
    event.preventDefault();
    const div = $(event.currentTarget).parents(".modifier-item");
    const modId = div.data("modifierId");
    const modKey = div.data("modifierKey");
    const itemData = this.object.system;
    delete itemData.modifiers[modId][modKey];
    this.object.update({ [`system.modifiers.${modId}.-=${modKey}`]: null })
      .then(() => {
        console.log(`Modifier removed: ${modId} - ${modKey}`);
        this.render();
      })
      .catch(err => console.error('Error updating item with deleted modifier:', err));
    div.slideUp(200, () => this.render(false));
  }
}