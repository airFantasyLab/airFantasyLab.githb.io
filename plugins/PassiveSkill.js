//=============================================================================
// RPG Maker MZ - Passive Skill
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 被動技能
 * @author airFantasyLab - Chris Chan
 * @url https://github.com/airFantasyLab/rm-mz-plugins
 *
 * @help PassiveSkill.js
 * 被動技能
 *
 * ##更新履歷
 * v1.0
 *   - 被動技能設定
 *
 * @param skillTypes
 * @text 被動技能類型
 * @type number[]
 * @default []
 *
 */

/*
 * $dataSkills.scope:
 *   - 0: null
 *   - 1: one enemy
 *   - 2: all enemies
 *   - 3: random(1) enemy
 *   - 4: random(2) enemy
 *   - 5: random(3) enemy
 *   - 6: random(4) enemy
 *   - 7: one live member
 *   - 8: all live members
 *   - 9: one dead member
 *   - 10: all dead members
 *   - 11: user
 *   - 12: one member
 *   - 13: all members
 *   - 14: all
 */

/*
 * ANCHOR PassiveSkill
 */
(() => {
  const pluginName = 'PassiveSkill';

  const _parameters = PluginManager._parameters[pluginName.toLowerCase()] || {};
  const skillTypes = JSON.parse(_parameters.skillTypes || '[]').map((type) =>
    Number(type)
  );

  /*
   * NOTE isPassiveSkillWithTraits
   */
  function isPassiveSkillWithTraits(skillId, scope = [11]) {
    const skill = $dataSkills[skillId] || {};
    return skill.isPassive && skill.traits && scope.includes(skill.scope);
  }

  /*
   * NOTE isMenuPassiveSkill
   */
  function isMenuPassiveSkill(skillId) {
    const skill = $dataSkills[skillId] || {};
    return skill.isPassive && skill.effects.length > 0 && skill.occasion === 2;
  }

  /*
   * NOTE isBattlePassiveSkill
   */
  function isBattlePassiveSkill(skillId) {
    const skill = $dataSkills[skillId] || {};
    return skill.isPassive && skill.effects.length > 0 && skill.occasion === 1;
  }

  /*
   * ANCHOR Scene_Boot.onDatabaseLoaded
   */
  const _Scene_Boot_onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
  Scene_Boot.prototype.onDatabaseLoaded = function () {
    $dataSkills = $dataSkills.map((skill) => {
      if (skillTypes.includes((skill || {}).stypeId)) {
        skill.isPassive = true;
        switch (skill.scope) {
          case 1:
            skill.scope = 3;
          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
          case 14:
            skill.occasion = 1;
            break;
          case 7:
          case 11:
          case 12:
            skill.scope = 11;
          case 8:
          case 13:
            if (skill.occasion !== 1 && skill.occasion !== 3) {
              skill.occasion = 2;
              const effects = skill.effects.filter(
                (effect) => (effect || {}).code === 21
              );
              skill.effects = skill.effects.filter(
                (effect) => (effect || {}).code !== 21
              );
              if (effects.length > 0) {
                skill.traits = [];
                effects.forEach((effect) => {
                  skill.traits = skill.traits.concat(
                    ($dataStates[effect.dataId] || {}).traits || []
                  );
                });
              }
            }
            break;
        }
      }

      return skill;
    });
    _Scene_Boot_onDatabaseLoaded.apply(this, arguments);
  };

  /*
   * ANCHOR Game_Actor.setup
   */
  const _Game_Actor_setup = Game_Actor.prototype.setup;
  Game_Actor.prototype.setup = function (actorId) {
    this._passiveSkillsWithTraits = null;
    this._partyPassiveSkillsWithTraits = null;
    this._menuPassiveSkills = null;
    this._battlePassiveSkills = [];
    this._activePassiveSkills = null;
    this._isActing = false;
    _Game_Actor_setup.apply(this, arguments);
  };

  /*
   * ANCHOR Game_Actor.learnSkill
   */
  const _Game_Actor_learnSkill = Game_Actor.prototype.learnSkill;
  Game_Actor.prototype.learnSkill = function (skillId) {
    this._passiveSkillsWithTraits && this.addPassiveSkills(skillId);
    _Game_Actor_learnSkill.apply(this, arguments);
  };

  /*
   * ANCHOR Game_Actor.forgetSkill
   */
  const _Game_Actor_forgetSkill = Game_Actor.prototype.forgetSkill;
  Game_Actor.prototype.forgetSkill = function (skillId) {
    this._passiveSkillsWithTraits && this.removePassiveSkills(skillId);
    _Game_Actor_forgetSkill.apply(this, arguments);
  };

  /*
   * ANCHOR Game_Actor.initPassiveSkills
   */
  Game_Actor.prototype.initPassiveSkills = function () {
    this._menuPassiveSkills = [];
    this._passiveSkillsWithTraits = [];
    this._partyPassiveSkillsWithTraits = [];
    this._activePassiveSkills = [];
    this.skills().forEach((skill) => {
      if (isPassiveSkillWithTraits(skill.id)) {
        this._passiveSkillsWithTraits.push(skill.id);
      }
      if (isPassiveSkillWithTraits(skill.id, [8, 13])) {
        this._partyPassiveSkillsWithTraits.push(skill.id);
      }
      if (isMenuPassiveSkill(skill.id)) {
        this._menuPassiveSkills.push(skill.id);
      }
      if (isBattlePassiveSkill(skill.id)) {
        this._battlePassiveSkills.push(skill.id);
      }
    });
    this.initActivePassiveSkills();
  };

  /*
   * ANCHOR Game_Actor.addPassiveSkills
   */
  Game_Actor.prototype.addPassiveSkills = function (skillId) {
    if (this._passiveSkillsWithTraits) {
      if (
        isPassiveSkillWithTraits(skillId) &&
        !this._passiveSkillsWithTraits.includes(skillId)
      ) {
        this._passiveSkillsWithTraits.push(skillId);
      }
      if (
        isPassiveSkillWithTraits(skillId, [8, 13]) &&
        !this._partyPassiveSkillsWithTraits.includes(skillId)
      ) {
        this._partyPassiveSkillsWithTraits.push(skillId);
        $gameParty.addPassiveSkills(this._actorId, skillId);
      }
      if (
        isMenuPassiveSkill(skillId) &&
        !this._menuPassiveSkills.includes(skillId)
      ) {
        this._menuPassiveSkills.push(skillId);
        this.setActivePassiveSkills(skillId);
      }
      if (
        isBattlePassiveSkill(skillId) &&
        !this._battlePassiveSkills.includes(skillId)
      ) {
        this._battlePassiveSkills.push(skillId);
      }
    }
  };

  /*
   * ANCHOR Game_Actor.removePassiveSkills
   */
  Game_Actor.prototype.removePassiveSkills = function (skillId) {
    if (this._passiveSkillsWithTraits) {
      this._passiveSkillsWithTraits = this._passiveSkillsWithTraits.filter(
        (skill) => skill !== skillId
      );
      this._partyPassiveSkillsWithTraits =
        this._partyPassiveSkillsWithTraits.filter((skill) => skill !== skillId);
      this._menuPassiveSkills = this._menuPassiveSkills.filter(
        (skill) => skill !== skillId
      );
      this._battlePassiveSkills = this._battlePassiveSkills.filter(
        (skill) => skill !== skillId
      );
      this._activePassiveSkills = this._activePassiveSkills.filter(
        (skill) => skill !== skillId
      );
    }
  };

  /*
   * ANCHOR Game_Actor.passiveSkillsWithTraits
   */
  Game_Actor.prototype.passiveSkillsWithTraits = function () {
    return (this._passiveSkillsWithTraits || []).map(
      (skillId) => $dataSkills[skillId]
    );
  };

  /*
   * ANCHOR Game_Actor.partyPassiveSkills
   */
  Game_Actor.prototype.partyPassiveSkills = function () {
    return (this._partyPassiveSkillsWithTraits || []).map(
      (skillId) => $dataSkills[skillId]
    );
  };

  /*
   * ANCHOR Game_Actor.battlePassiveSkills
   */
  Game_Actor.prototype.battlePassiveSkills = function () {
    return (this._battlePassiveSkills || []).map(
      (skillId) => $dataSkills[skillId]
    );
  };

  /*
   * ANCHOR Game_Actor.initActivePassiveSkills
   */
  Game_Actor.prototype.initActivePassiveSkills = function () {
    if ((this._menuPassiveSkills || []).length > 0) {
      this._menuPassiveSkills.forEach((skillId) => {
        const action = new Game_Action(this);
        action.setSkill(skillId);
        action.makeTargets().forEach((target) => action.apply(target));

        this._activePassiveSkills.push(skillId);
      });
    }
  };

  /*
   * ANCHOR Game_Actor.setActivePassiveSkills
   */
  Game_Actor.prototype.setActivePassiveSkills = function (skillId) {
    if (
      (this._menuPassiveSkills || []).includes(skillId) &&
      !(this._activePassiveSkills || []).includes(skillId)
    ) {
      const action = new Game_Action(this);
      action.setSkill(skillId);
      action.makeTargets().forEach((target) => action.apply(target));

      this._activePassiveSkills.push(skillId);
    }
  };

  /*
   * ANCHOR Game_Actor.addState
   */
  const _Game_Actor_addState = Game_Actor.prototype.addState;
  Game_Actor.prototype.addState = function (stateId) {
    _Game_Actor_addState.call(this, stateId);
    if (this.isStateAddable(stateId)) {
      if (!this.isStateAffected(stateId) && stateId === this.deathStateId()) {
        $gameParty.removePassiveSkills(this._actorId);
      }
    }
  };

  /*
   * ANCHOR Game_Actor.removeState
   */
  const _Game_Actor_removeState = Game_Actor.prototype.removeState;
  Game_Actor.prototype.removeState = function (stateId) {
    _Game_Actor_removeState.call(this, stateId);

    if (this.isStateAffected(stateId) && stateId === this.deathStateId()) {
      $gameParty.addPassiveSkills(this._actorId);
    }
  };

  /*
   * ANCHOR Game_Actor.traitObjects
   */
  const _Game_Actor_traitObjects = Game_Actor.prototype.traitObjects;
  Game_Actor.prototype.traitObjects = function () {
    const objects = _Game_Actor_traitObjects.call(this);
    Array.prototype.push.apply(objects, this.passiveSkillsWithTraits() || []);
    Array.prototype.push.apply(objects, $gameParty.passiveSkills() || []);

    return objects;
  };

  /*
   * ANCHOR Game_Actor.refresh
   */
  const _Game_Actor_refresh = Game_Actor.prototype.refresh;
  Game_Actor.prototype.refresh = function () {
    _Game_Actor_refresh.apply(this, arguments);
  };

  /*
   * ANCHOR Game_Party.initialize
   */
  const _Game_Party_initialize = Game_Party.prototype.initialize;
  Game_Party.prototype.initialize = function () {
    _Game_Party_initialize.call(this);
    this._passiveSkills = null;
  };

  /*
   * ANCHOR Game_Party.setupStartingMembers
   */
  const _Game_Party_setupStartingMembers =
    Game_Party.prototype.setupStartingMembers;
  Game_Party.prototype.setupStartingMembers = function () {
    _Game_Party_setupStartingMembers.call(this);
    if (this._passiveSkills === null) {
      this.initMembersPssiveSkills();
      this.initPassiveSkills();
    }
  };

  /*
   * ANCHOR Game_Party.initMembersPssiveSkills
   */
  Game_Party.prototype.initMembersPssiveSkills = function () {
    this.allMembers().forEach((member) => member.initPassiveSkills());
  };

  /*
   * ANCHOR Game_Party.addActor
   */
  const _Game_Party_addActor = Game_Party.prototype.addActor;
  Game_Party.prototype.addActor = function (actorId) {
    _Game_Party_addActor.call(this, actorId);
    this.addPassiveSkills(actorId);
  };

  /*
   * ANCHOR Game_Party.removeActor
   */
  const _Game_Party_removeActor = Game_Party.prototype.removeActor;
  Game_Party.prototype.removeActor = function (actorId) {
    _Game_Party_removeActor.call(this, actorId);
    this.removePassiveSkills(actorId);
  };

  /*
   * ANCHOR Game_Party.initPassiveSkills
   */
  Game_Party.prototype.initPassiveSkills = function () {
    this._passiveSkills = this.aliveMembers().reduce((skills, member) => {
      Array.prototype.push.apply(skills, member.partyPassiveSkills());
      return skills;
    }, []);
  };

  /*
   * ANCHOR Game_Party.addPassiveSkills
   */
  Game_Party.prototype.addPassiveSkills = function (actorId, skillId = -1) {
    if (this._passiveSkills) {
      const actor = $gameActors.actor(actorId);
      // actor.initPassiveSkills();
      if (actor.isAlive()) {
        if (skillId === -1) {
          Array.prototype.push.apply(
            this._passiveSkills,
            actor.partyPassiveSkills()
          );
        } else if (actor._partyPassiveSkillsWithTraits.includes(skillId)) {
          this._passiveSkills.push($dataSkills[skillId]);
        }
      }
    }
  };

  /*
   * ANCHOR Game_Party.removePassiveSkills
   */
  Game_Party.prototype.removePassiveSkills = function (actorId, skillId = -1) {
    if (this._passiveSkills) {
      const actor = $gameActors.actor(actorId);
      if (actor.isAlive()) {
        const partyPassiveSkills = [].concat(
          actor._partyPassiveSkillsWithTraits
        );
        let index = -1;
        if (skillId === -1) {
          while (partyPassiveSkills.length > 0) {
            index = this._passiveSkills.findIndex(
              (skill) => skill.id === partyPassiveSkills[0]
            );
            index !== -1 && this._passiveSkills.splice(index, 1);
            partyPassiveSkills.shift();
          }
        } else if (partyPassiveSkills.includes(skillId)) {
          index = this._passiveSkills.findIndex(
            (skill) => skill.id === skillId
          );
          index !== -1 && this._passiveSkills.splice(index, 1);
        }
      }
      this.initPassiveSkills();
    }
  };

  /*
   * ANCHOR Game_Party.passiveSkills
   */
  Game_Party.prototype.passiveSkills = function () {
    return this._passiveSkills || [];
  };

  /*
   * ANCHOR BattleManager.initMembers
   */
  const _BattleManager_initMembers = BattleManager.initMembers;
  BattleManager.initMembers = function () {
    _BattleManager_initMembers.call(this);
    this._passiveSkills = [];
  };

  /*
   * ANCHOR BattleManager.updateStart
   */
  const _BattleManager_updateStart = BattleManager.updateStart;
  BattleManager.updateStart = function () {
    this.startPassiveSkill();
  };

  /*
   * ANCHOR BattleManager.updatePhase
   */
  const _BattleManager_updatePhase = BattleManager.updatePhase;
  BattleManager.updatePhase = function (timeActive) {
    _BattleManager_updatePhase.call(this, timeActive);
    switch (this._phase) {
      case 'passiveSkill':
        this.updatePassiveSkill();
        break;
    }
  };

  /*
   * ANCHOR BattleManager.startPassiveSkill
   */
  BattleManager.startPassiveSkill = function () {
    this._passiveSkills = $gameParty
      .battleMembers()
      .reduce((skills, member) => {
        if (member._battlePassiveSkills.length > 0) {
          member._battlePassiveSkills.forEach((skillId) => {
            if (member.isAlive()) {
              const action = new Game_Action(member);
              action.setSkill(skillId);
              skills.push(action);
            }
          });
        }
        return skills;
      }, []);
    this._phase = 'passiveSkill';
  };

  /*
   * ANCHOR BattleManager.updatePassiveSkill
   */
  BattleManager.updatePassiveSkill = function () {
    if (this._passiveSkills.length > 0) {
      const action = this._passiveSkills[0];
      const subject = action.subject();
      const targets = action.makeTargets();
      this._action = action;
      subject.cancelMotionRefresh();
      subject.useItem(action.item());
      action.applyGlobal();
      this._logWindow.clear();
      this._logWindow.startAction(subject, action, targets);
      while (targets.length > 0) {
        if (targets[0]) {
          this.invokeAction(subject, targets[0]);
        }
        targets.shift();
      }
      this._passiveSkills.shift();
    } else {
      this._logWindow.clear();
      this.endPassiveSkill();
    }
  };

  /*
   * ANCHOR BattleManager.endPassiveSkill
   */
  BattleManager.endPassiveSkill = function () {
    _BattleManager_updateStart.call(this);
  };

  /*
   * ANCHOR Window_ActorCommand.addSkillCommands
   */
  Window_ActorCommand.prototype.addSkillCommands = function () {
    const _skillTypes = this._actor
      .skillTypes()
      .filter((stypeId) => !skillTypes.includes(stypeId));
    for (const stypeId of _skillTypes) {
      const name = $dataSystem.skillTypes[stypeId];
      this.addCommand(name, 'skill', true, stypeId);
    }
  };

  /*
   * ANCHOR Window_SkillList.addSkillCommands
   */
  Window_SkillList.prototype.isEnabled = function (item) {
    return (
      this._actor &&
      this._actor.canUse(item) &&
      !skillTypes.includes(item.stypeId)
    );
  };
})();
