package com.rancho.dragones.ui

import android.graphics.Paint
import android.graphics.RectF
import com.rancho.dragones.logic.Action
import com.rancho.dragones.logic.Battle
import com.rancho.dragones.logic.BattleRewards
import com.rancho.dragones.logic.ElementChart
import com.rancho.dragones.logic.Fighter
import com.rancho.dragones.logic.Hit
import com.rancho.dragones.logic.Reward
import com.rancho.dragones.render.DragonRenderer
import kotlin.math.PI
import kotlin.math.max
import kotlin.math.sin

/** Combate por turnos contra oleadas de dragones salvajes. */
class BattleScreen : Screen() {
    override val bgTop = 0xFFE86B5A.toInt()
    override val bgBottom = 0xFF7A2E4F.toInt()

    private enum class Phase { SELECT, PLAYER, ENEMY, RESULT }

    private class Floater(val text: String, val x: Float, val y: Float, val color: Int, var life: Float = 1.1f)

    private var phase = Phase.SELECT
    private var enemy: Fighter? = null
    private var enemyWave = 0
    private var battle: Battle? = null
    private var playerDragonId = 0L
    private var enemyTimer = 0f
    private var reward: Reward? = null
    private var log = ""
    private var lungePlayer = 0f
    private var lungeEnemy = 0f
    private val floaters = ArrayList<Floater>()
    private var lastT = 0f

    override fun draw(ui: Ui, g: Game, area: RectF, t: Float) {
        val dt = (t - lastT).coerceIn(0f, 0.1f)
        lastT = t
        if (phase == Phase.SELECT) drawSelect(ui, g, area, t) else drawFight(ui, g, area, t, dt)
    }

    private fun previewEnemy(g: Game): Fighter {
        val wave = g.state.wave
        if (enemy == null || enemyWave != wave) {
            enemy = Battle.enemyFor(wave, g.rng)
            enemyWave = wave
        }
        return enemy!!
    }

    // ---------- Selección ----------

    private fun drawSelect(ui: Ui, g: Game, area: RectF, t: Float) {
        val s = g.state
        val e = previewEnemy(g)
        val l = area.left + 10f
        val r = area.right - 10f
        val boss = Battle.isBoss(s.wave)
        ui.text(
            if (boss) "Oleada ${s.wave} · ¡JEFE!" else "Oleada ${s.wave}", l + 4f, area.top + 24f, 20f,
            0xFFFFFFFF.toInt(), bold = true,
        )
        ui.text("Mejor oleada: ${s.bestWave}", r - 4f, area.top + 22f, 12f, 0xCCFFFFFF.toInt(), Paint.Align.RIGHT)

        val card = RectF(l, area.top + 36f, r, area.top + 156f)
        ui.panel(card, 0x44000000, radius = 14f)
        DragonRenderer.draw(ui.c, e.species, card.left + 62f, card.centerY() - 4f, 96f, t)
        val tx = card.left + 124f
        ui.text(e.name, tx, card.top + 34f, 18f, 0xFFFFFFFF.toInt(), bold = true, maxW = card.right - tx - 8f)
        ui.text("Nivel ${e.level} · ${describe(e.species)}", tx, card.top + 56f, 13f, 0xFFFFFFFF.toInt(), maxW = card.right - tx - 8f)
        ui.text("${e.maxHp} PS · ${e.atk} ATQ", tx, card.top + 76f, 13f, 0xFFFFFFFF.toInt())
        ui.text("Tu dragón elegido luchará 1 contra 1", tx, card.top + 98f, 11f, 0xCCFFFFFF.toInt(), maxW = card.right - tx - 8f)

        ui.text("Elige a tu luchador", l + 4f, area.top + 178f, 15f, 0xFFFFFFFF.toInt(), bold = true)
        val list = s.dragons.sortedByDescending { it.level }
        val listArea = RectF(area.left, area.top + 188f, area.right, area.bottom)
        ui.beginScroll("battleSel", listArea, list.size * 62f + 8f)
        list.forEachIndexed { i, d ->
            val top = listArea.top + i * 62f
            val mult = ElementChart.multiplier(d.species.primary, e.species.elements)
            val tag = when {
                mult > 1.2 -> "Ventaja x${"%.1f".format(mult)}"
                mult < 0.8 -> "Desventaja x${"%.1f".format(mult)}"
                else -> "Neutral"
            }
            ui.listRow(
                RectF(l, top, r, top + 56f), describe(d), "${describe(d.species)} · $tag",
                BtnSpec("Luchar", color = Pal.red) { startBattle(g, d.id) },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, d.species, ix, iy - 6f, 40f, 0f) },
            )
        }
        ui.endScroll()
    }

    private fun startBattle(g: Game, dragonId: Long) {
        val d = g.state.dragon(dragonId) ?: return
        val e = previewEnemy(g)
        playerDragonId = dragonId
        battle = Battle(Fighter.of(d), e, g.state.wave, g.rng)
        phase = Phase.PLAYER
        reward = null
        floaters.clear()
        lungePlayer = 0f
        lungeEnemy = 0f
        log = "¡Un ${e.name} salvaje aparece!"
    }

    // ---------- Pelea ----------

    private fun drawFight(ui: Ui, g: Game, area: RectF, t: Float, dt: Float) {
        val b = battle
        if (b == null) { phase = Phase.SELECT; return }
        val c = ui.c

        // suelo de la arena
        val ground = RectF(area.left, area.top + area.height() * 0.30f, area.right, area.bottom)
        ui.panel(ground, 0x55000000, radius = 0f)

        lungePlayer = max(0f, lungePlayer - dt)
        lungeEnemy = max(0f, lungeEnemy - dt)
        val ex = area.right - 100f - lunge(lungeEnemy) * 40f
        val ey = area.top + 130f
        val px = area.left + 100f + lunge(lungePlayer) * 40f
        val py = area.top + 270f
        val ePose = if (b.enemy.alive) 1f else 0f
        if (b.enemy.alive) DragonRenderer.draw(c, b.enemy.species, ex, ey, 110f * (0.9f + 0.1f * ePose), t, flip = true)
        if (b.player.alive) DragonRenderer.draw(c, b.player.species, px, py, 124f, t + 1f)

        hpBar(ui, RectF(area.left + 16f, area.top + 14f, area.left + 176f, area.top + 30f), b.enemy)
        ui.text(
            "${b.enemy.name} Nv ${b.enemy.level}", area.left + 16f, area.top + 46f, 13f, 0xFFFFFFFF.toInt(), bold = true,
            maxW = 190f,
        )
        hpBar(ui, RectF(area.right - 176f, py + 70f, area.right - 16f, py + 86f), b.player)
        ui.text(
            "${b.player.name} Nv ${b.player.level}", area.right - 16f, py + 106f, 13f, 0xFFFFFFFF.toInt(),
            Paint.Align.RIGHT, true, maxW = 190f,
        )

        // números flotantes
        val fit = floaters.iterator()
        while (fit.hasNext()) {
            val f = fit.next()
            f.life -= dt
            if (f.life <= 0f) { fit.remove(); continue }
            ui.text(f.text, f.x, f.y - (1.1f - f.life) * 50f, 22f, f.color, Paint.Align.CENTER, true)
        }

        ui.text(log, area.centerX(), area.bottom - 96f, 13f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, maxW = ui.w - 24f)

        // acciones
        val enabled = phase == Phase.PLAYER && !b.over
        val by = area.bottom - 80f
        ui.button(RectF(area.left + 12f, by, area.centerX() - 6f, by + 44f), "Ataque", enabled, Pal.red) {
            playerAct(g, b, Action.ATTACK, px, py, ex, ey)
        }
        val cd = b.player.skillCooldown
        ui.button(
            RectF(area.centerX() + 6f, by, area.right - 12f, by + 44f),
            if (cd > 0) "Habilidad ($cd)" else "Habilidad", enabled && b.player.skillReady, Pal.blue,
        ) { playerAct(g, b, Action.SKILL, px, py, ex, ey) }

        if (phase == Phase.ENEMY) {
            enemyTimer -= dt
            if (enemyTimer <= 0f) enemyAct(g, b, px, py, ex, ey)
        }
        if (phase == Phase.RESULT) drawResult(ui, g, b)
    }

    private fun lunge(timer: Float): Float = sin((timer / 0.35f).coerceIn(0f, 1f) * PI.toFloat())

    private fun hpBar(ui: Ui, r: RectF, f: Fighter) {
        val frac = f.hp / f.maxHp.toFloat()
        ui.bar(r, frac, if (frac > 0.5f) Pal.green else if (frac > 0.25f) Pal.gold else Pal.red)
        ui.text("${f.hp}/${f.maxHp}", r.centerX(), r.centerY() + 4f, 10f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, true)
    }

    private fun hitText(h: Hit): String {
        val eff = when {
            h.multiplier > 1.2 -> " ¡Es muy eficaz!"
            h.multiplier < 0.8 -> " No es muy eficaz..."
            else -> ""
        }
        return (if (h.skill) "habilidad" else "ataque") + eff
    }

    private fun playerAct(g: Game, b: Battle, a: Action, px: Float, py: Float, ex: Float, ey: Float) {
        val h = b.playerAct(a) ?: return
        lungePlayer = 0.35f
        floaters.add(Floater("-${h.damage}", ex, ey - 30f, if (h.multiplier > 1.2) 0xFFFFE066.toInt() else 0xFFFFFFFF.toInt()))
        log = "${b.player.name} usa ${hitText(h)}"
        if (b.over) finish(g, b) else { phase = Phase.ENEMY; enemyTimer = 0.9f }
    }

    private fun enemyAct(g: Game, b: Battle, px: Float, py: Float, ex: Float, ey: Float) {
        val h = b.enemyAct()
        if (h != null) {
            lungeEnemy = 0.35f
            floaters.add(Floater("-${h.damage}", px, py - 40f, 0xFFFF8A80.toInt()))
            log = "${b.enemy.name} usa ${hitText(h)}"
        }
        if (b.over) finish(g, b) else phase = Phase.PLAYER
    }

    private fun finish(g: Game, b: Battle) {
        phase = Phase.RESULT
        if (b.playerWon) {
            reward = BattleRewards.applyVictory(g.state, playerDragonId, b.wave, g.rng)
            g.save()
        }
    }

    private fun drawResult(ui: Ui, g: Game, b: Battle) {
        val won = b.playerWon
        val r = ui.modal(if (won) "¡Victoria!" else "Derrota", 330f) { backToSelect() }
        val rw = reward
        if (won && rw != null) {
            ui.text("Recompensas", r.centerX(), r.top + 20f, 15f, Pal.inkSoft, Paint.Align.CENTER, true)
            ui.coin(r.centerX() - 60f, r.top + 52f, 9f)
            ui.text("+${rw.gold} de oro", r.centerX() - 44f, r.top + 58f, 16f, Pal.ink, bold = true)
            ui.text("+${rw.xp} XP${if (rw.levelsGained > 0) " · ¡subió de nivel!" else ""}", r.centerX(), r.top + 88f, 14f, Pal.ink, Paint.Align.CENTER, maxW = r.width())
            if (rw.gems > 0) {
                ui.gem(r.centerX() - 50f, r.top + 112f, 9f)
                ui.text("+${rw.gems} gemas", r.centerX() - 34f, r.top + 118f, 16f, Pal.ink, bold = true)
            }
            ui.button(RectF(r.left + 20f, r.bottom - 54f, r.right - 20f, r.bottom - 14f), "Siguiente oleada", color = Pal.red) {
                backToSelect()
            }
            return
        } else {
            ui.text("Tu dragón ha caído, pero no pierdes nada.", r.centerX(), r.top + 40f, 14f, Pal.ink, Paint.Align.CENTER, maxW = r.width())
            ui.text("Sube de nivel a tus dragones o elige uno con ventaja.", r.centerX(), r.top + 64f, 12f, Pal.inkSoft, Paint.Align.CENTER, maxW = r.width())
            ui.button(RectF(r.left + 20f, r.bottom - 100f, r.right - 20f, r.bottom - 60f), "Reintentar", color = Pal.red) {
                backToSelect()
            }
        }
        ui.button(RectF(r.left + 20f, r.bottom - 50f, r.right - 20f, r.bottom - 14f), "Volver", color = Pal.blue) {
            backToSelect()
        }
    }

    private fun backToSelect() {
        phase = Phase.SELECT
        battle = null
        enemy = null
    }
}
