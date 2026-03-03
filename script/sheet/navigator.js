import { RogueTraderItemSheet } from "./item.js";

export class NavigatorSheet extends RogueTraderItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "navigator"],
      template: "systems/rogue-trader/template/sheet/navigator.html",
      width: 500,
      height: 397,
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

   /**
   * Обновляет список доступных тестов при изменении типа
   */
  _updateTestOptions() {
    // Эта функция будет вызвана при изменении типа теста
    // Может потребоваться дополнительная логика в зависимости от ваших нужд
    console.log("Power test type changed");
  }
}