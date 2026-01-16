import { RogueTraderSheet } from "./actor.js";

export class ExplorerSheet extends RogueTraderSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "actor"],
      template: "systems/rogue-trader/template/sheet/actor/explorer.html",
      width: 720,
      height: 881,
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
    if (this.actor.isOwner) {
      buttons = [].concat(buttons);
    }
    return buttons;
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    data.system.bio.biographyHTML = await TextEditor.enrichHTML(
      data.system.bio.notes,
      {
        secrets: data.actor.isOwner,
        rollData: data.rollData,
        async: true,
        relativeTo: this.actor,
      }
    );
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".aptitude-create").click(async ev => { await this._onAptitudeCreate(ev); });
    html.find(".aptitude-delete").click(async ev => { await this._onAptitudeDelete(ev); });
    html.find(".item-cost").focusout(async ev => { await this._onItemCostFocusOut(ev); });
  }

  async _onAptitudeCreate(event) {
    event.preventDefault();
    let aptitudeId = Date.now().toString();
    let aptitude = { id: Date.now().toString(), name: "New Aptitude" };
    await this.actor.update({[`system.aptitudes.${aptitudeId}`]: aptitude});
    this._render(true);
  }

  async _onAptitudeDelete(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    const aptitudeId = div.data("aptitudeId").toString();
    await this.actor.update({[`system.aptitudes.-=${aptitudeId}`]: null});
    this._render(true);
  }

  async _onItemCostFocusOut(event) {
    event.preventDefault();
    const div = $(event.currentTarget).parents(".item");
    let item = this.actor.items.get(div.data("itemId"));
    item.update({"system.cost": $(event.currentTarget)[0].value});
  }
}
