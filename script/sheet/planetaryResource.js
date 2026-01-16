import { RogueTraderItemSheet } from "./item.js";

export class PlanetaryResourceSheet extends RogueTraderItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "planetary-resource"],
      template: "systems/rogue-trader/template/sheet/planetaryResource.html",
      width: 400,
      height: 325,
      resizable: true,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "data"
        }
      ]
    });
  }

  activateListeners(html) {
    super.activateListeners(html); 
  }
}