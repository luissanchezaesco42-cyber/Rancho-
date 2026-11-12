package com.rancho.dragones.logic

import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import com.rancho.dragones.model.Species
import com.rancho.dragones.model.SpeciesCatalog
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.random.Random

object ElementChart {
    /** x2 con ventaja, x0.5 con desventaja, x1 en otro caso, frente a un solo elemento. */
    fun multiplier(att: Element, def: Element): Double = when {
        def in att.beats() -> 2.0
        att in def.beats() -> 0.5
        else -> 1.0
    }

    /** Frente a un dragón híbrido se promedian los multiplicadores de sus elementos. */
    fun multiplier(att: Element, defenders: List<Element>): Double =
        defenders.map { multiplier(att, it) }.average()
}

class Fighter(val name: String, val species: Species, val level: Int, val maxHp: Int, val atk: Int) {
    var hp: Int = maxHp
    var skillCooldown: Int = 0

    val alive: Boolean get() = hp > 0
    val skillReady: Boolean get() = skillCooldown <= 0

    companion object {
        fun of(d: Dragon) = Fighter(d.species.nombre, d.species, d.level, Rules.maxHp(d), Rules.attack(d))
    }
}

enum class Action { ATTACK, SKILL }

class Hit(val byPlayer: Boolean, val damage: Int, val multiplier: Double, val skill: Boolean)

class Battle(val player: Fighter, val enemy: Fighter, val wave: Int, private val rng: Random) {
    var over = false
        private set
    var playerWon = false
        private set

    fun playerAct(action: Action): Hit? = act(player, enemy, action, byPlayer = true)

    /** El enemigo usa la habilidad cuando está lista, con un 60 % de probabilidad. */
    fun enemyAct(): Hit? {
        val action = if (enemy.skillReady && rng.nextDouble() < 0.6) Action.SKILL else Action.ATTACK
        return act(enemy, player, action, byPlayer = false)
    }

    private fun act(att: Fighter, def: Fighter, action: Action, byPlayer: Boolean): Hit? {
        if (over) return null
        if (action == Action.SKILL && !att.skillReady) return null
        val skill = action == Action.SKILL
        val element = if (skill) att.species.secondary ?: att.species.primary else att.species.primary
        val mult = ElementChart.multiplier(element, def.species.elements)
        val power = att.atk * (if (skill) SKILL_POWER else 1.0)
        val dmg = max(1, (power * mult * (0.9 + rng.nextDouble() * 0.2)).roundToInt())
        def.hp = max(0, def.hp - dmg)
        att.skillCooldown = if (skill) SKILL_COOLDOWN else max(0, att.skillCooldown - 1)
        if (!def.alive) {
            over = true
            playerWon = byPlayer
        }
        return Hit(byPlayer, dmg, mult, skill)
    }

    companion object {
        const val SKILL_POWER = 1.8
        const val SKILL_COOLDOWN = 3

        fun isBoss(wave: Int) = wave % 5 == 0

        fun enemyFor(wave: Int, rng: Random): Fighter {
            val species = SpeciesCatalog.all.random(rng)
            val level = (wave + rng.nextInt(2)).coerceIn(1, Rules.MAX_LEVEL)
            val d = Dragon(0, species.id, level)
            val bossMul = if (isBoss(wave)) 1.5 else 1.0
            val hp = (Rules.maxHp(d) * bossMul).roundToInt()
            val atk = (Rules.attack(d) * (if (isBoss(wave)) 1.2 else 1.0)).roundToInt()
            val name = if (isBoss(wave)) "Jefe ${species.nombre}" else species.nombre
            return Fighter(name, species, level, hp, atk)
        }

        fun goldReward(wave: Int) = 40 + wave * 25
        fun xpReward(wave: Int) = 25 + wave * 10
    }
}

/** Recompensas de ganar una oleada. */
class Reward(val gold: Int, val xp: Int, val gems: Int, val levelsGained: Int)

object BattleRewards {
    fun applyVictory(state: GameState, dragonId: Long, wave: Int, rng: Random): Reward {
        val gold = Battle.goldReward(wave)
        val xp = Battle.xpReward(wave)
        val gems = if (Battle.isBoss(wave)) 2 else if (rng.nextDouble() < 0.25) 1 else 0
        state.gold += gold
        state.gems += gems
        val levels = state.dragon(dragonId)?.let { Rules.addXp(it, xp) } ?: 0
        state.bestWave = max(state.bestWave, wave)
        state.wave = wave + 1
        return Reward(gold, xp, gems, levels)
    }
}
