import { prepareCommonRoll, prepareConsumeResourcesRoll } from "../../common/dialog.js";
import { rollColonyEvents, rollColonyGrowth } from "../../common/roll.js";
import RogueTraderUtil from "../../common/util.js";
import { RogueTraderSheet } from "./actor.js";

export class ColonySheet extends RogueTraderSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rogue-trader", "sheet", "actor"],
      template: "systems/rogue-trader/template/sheet/actor/colony.html",
      width: 750,
      height: 920,
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

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-growth").click(async ev => await this._onRollColonyGrowth(ev));
    html.find(".roll-events").click(async ev => await this._onRollColonyEvents(ev));
    html.find(".roll-governor").click(async ev => await this._onRollGovernorSkill(ev));
    html.find(".roll-resources").click(async ev => await this._onRollConsumeResources(ev));
  }

  /** @override */
  async getData(options) {
    const data = await super.getData(options);
    return data;
  }

  async _onRollColonyGrowth(ev) {
    ev.preventDefault();
    const actorData = await this.getData();
    const growthData = this._updateGrowthPoints(actorData);
    await rollColonyGrowth(RogueTraderUtil.prepareColonyGrowthRollData(this.actor, growthData));
    this._updateObject(ev, actorData);
  }

  _updateGrowthPoints(actorData) {
    const actorStats = actorData.system.stats;
    const startLoyalty = actorStats.loyalty;
    const startProsperity = actorStats.prosperity;
    const startSecurity = actorStats.security;
    const startPiety = actorStats.piety;
    actorStats.loyalty += actorStats.loyaltyGain;
    actorStats.prosperity += actorStats.prosperityGain;
    actorStats.security += actorStats.securityGain;
    actorStats.piety += actorStats.pietyGain;
    switch (actorData.system.governor.governorType) {
      case "accounting":
        actorStats.prosperity = Math.max(actorStats.prosperity, 0);
        break;
      case "local":
        actorStats.loyalty = Math.max(actorStats.loyalty, 0);
        break;
      case "warlike":
        actorStats.security = Math.max(actorStats.security, 0);
        break;
      case "saint":
        actorStats.piety = Math.max(actorStats.piety, 0);
        break;
    }
    return {
      loyalty: {
        start: startLoyalty,
        updated: actorStats.loyalty,
        difference: actorStats.loyalty - startLoyalty
      },
      prosperity: {
        start: startProsperity,
        updated: actorStats.prosperity,
        difference: actorStats.prosperity - startProsperity
      },
      security: {
        start: startSecurity,
        updated: actorStats.security,
        difference: actorStats.security - startSecurity
      },
      piety: {
        start: startPiety,
        updated: actorStats.piety,
        difference: actorStats.piety - startPiety
      }
    }
  }

  async _onRollColonyEvents(ev) {
    ev.preventDefault();
    await rollColonyEvents(RogueTraderUtil.prepareColonyRollData(this.actor));
  }

  async _onRollConsumeResources(ev) {
    ev.preventDefault();
    await prepareConsumeResourcesRoll(RogueTraderUtil.prepareResourceRollData(this.actor), this.actor);
  }

  async _onRollGovernorSkill(ev) {
    ev.preventDefault();
    await this._prepareGovernorRoll();
  }

  async _prepareGovernorRoll() {
    const actorData = await this.getData();
    const rollData = {
      name: "DIALOG.GOVERNOR_SKILL_ROLL",
      baseTarget: actorData.system.governor.skillBonus,
      modifier: 0,
      ownerId: actorData.system.governor.actor
    };
    await prepareCommonRoll(rollData);
  }

  async _onDropActor(event, data) {
    const actorData = await this.getData();
    const droppedActor = game.actors.get(data.uuid.split(".")[1]);
    if (droppedActor)
    {
      switch (event.target.dataset.crewrole) {
        case "governor":
          {
            actorData.system.governor.actor = droppedActor.id;
            break;
          }
        default:
          console.log(event.target.dataset.crewRole);
          break;
      }
      this._updateObject(event, actorData);
    }
  }
}
