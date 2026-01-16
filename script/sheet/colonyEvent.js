import { RogueTraderItemSheet } from "./item.js";

export class ColonyEventSheet extends RogueTraderItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "colony-event"],
      template: "systems/rogue-trader/template/sheet/colony-event.html",
      width: 500,
      height: 500,
      resizable: true,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "stats"
        }
      ]
    });
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons = [].concat(buttons);
    return buttons;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }

  async getData(options) {
    let data = await super.getData(options);
    data.item.effectHTML = await TextEditor.enrichHTML(
      data.system.effect,
      {
        secrets: data.item.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.item,
      }
    );
    return data;
  }
}
