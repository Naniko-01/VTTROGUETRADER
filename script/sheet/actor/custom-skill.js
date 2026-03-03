export class RogueTraderCustomSkillItem extends Item {
  static get type() {
    return 'customSkill';
  }

  prepareData() {
    super.prepareData();
    
    const itemData = this.system;
    const actorData = this.actor?.system || {};
    
    // Базовая инициализация
    if (!itemData.advance) itemData.advance = -20;
    if (!itemData.cost) itemData.cost = 0;
    if (!itemData.total) itemData.total = 0;
    
    // Расчет значения навыка
    if (this.actor) {
      const characteristics = actorData.characteristics || {};
      const defaultChar = itemData.characteristics?.[0];
      const characteristic = this._findCharacteristic(defaultChar, characteristics);
      
      if (itemData.advance === -20 || itemData.advance === -10) {
        itemData.total = Math.floor((characteristic?.total || 0) / 2);
      } else {
        itemData.total = (characteristic?.total || 0) + itemData.advance;
      }
    }
    
    // Уровень навыка
    itemData.advanceSkill = this._getAdvanceSkill(itemData.advance);
  }
  
  _findCharacteristic(short, characteristics) {
    if (!short || !characteristics) return null;
    
    for (let key in characteristics) {
      if (characteristics[key].short === short) {
        return characteristics[key];
      }
    }
    
    if (characteristics[short]) {
      return characteristics[short];
    }
    
    return null;
  }
  
  _getAdvanceSkill(skill) {
    switch (skill || 0) {
      case -20:
        return "U";
      case 0:
        return "T";
      case 10:
        return "E";
      case 20:
        return "V";
      default:
        return "U";
    }
  }
  
  async roll() {
    const actorData = this.actor?.system;
    if (!actorData) return;
    
    const characteristics = actorData.characteristics || {};
    const defaultChar = this.system.characteristics?.[0];
    const characteristic = this._findCharacteristic(defaultChar, characteristics);
    
    const rollData = {
      name: this.name,
      baseTarget: this.system.total || 0,
      modifier: 0,
      ownerId: this.actor.id,
      unnatural: characteristic?.unnatural || 0
    };
    
    const { prepareCommonRoll } = await import("../common/dialog.js");
    await prepareCommonRoll(rollData);
  }
}