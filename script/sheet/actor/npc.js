import { RogueTraderSheet } from "./actor.js";

export class NpcSheet extends RogueTraderSheet {

	static get defaultOptions() 
	{
		return mergeObject(super.defaultOptions, {
			classes: ["rogue-trader", "sheet", "actor"],
			template: "systems/rogue-trader/template/sheet/actor/npc.html",
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

	_getHeaderButtons() 
	{
		let buttons = super._getHeaderButtons();
		if (this.actor.isOwner) {
			buttons = [].concat(buttons);
		}
		return buttons;
	}

	/** @override */
	async getData() 
	{
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

	activateListeners(html) 
	{
		super.activateListeners(html);
		html.find(".item-cost").focusout(async ev => { await this._onItemCostFocusOut(ev); });
	}

	async _onItemCostFocusOut(event) 
	{
		event.preventDefault();
		const div = $(event.currentTarget).parents(".item");
		let item = this.actor.items.get(div.data("itemId"));
		item.update({"system.cost": $(event.currentTarget)[0].value});
	}
}
