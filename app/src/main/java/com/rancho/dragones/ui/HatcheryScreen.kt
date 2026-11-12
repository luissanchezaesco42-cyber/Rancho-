package com.rancho.dragones.ui

import android.graphics.Paint
import android.graphics.RectF
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.SpeciesCatalog
import com.rancho.dragones.render.DragonRenderer

/** Criadero: fusiona dos dragones para obtener un huevo, y recetas conocidas. */
class HatcheryScreen : Screen() {
    override val bgTop = 0xFF5B3F8E.toInt()
    override val bgBottom = 0xFF2A1B4D.toInt()

    private enum class Mode { NONE, PICK_A, PICK_B }

    private var mode = Mode.NONE
    private var pickA = 0L
    private var reveal: Dragon? = null

    override fun badge(g: Game) = g.state.eggs.any { Rules.remainingSec(it, g.now()) == 0 }

    override fun draw(ui: Ui, g: Game, area: RectF, t: Float) {
        val s = g.state
        val now = g.now()
        val recipes = SpeciesCatalog.hybrids
        val contentH = 28f + Rules.HATCHERY_SLOTS * 132f + 34f + recipes.size * 46f + 10f
        ui.beginScroll("hatchery", area, contentH)
        var y = area.top + 4f
        ui.text("Criadero", area.left + 14f, y + 20f, 20f, 0xFFFFFFFF.toInt(), bold = true)
        ui.text("Fusiona dos dragones para obtener uno nuevo", area.left + 14f, y + 38f, 12f, 0xCCFFFFFF.toInt(), maxW = ui.w - 28f)
        y += 48f

        for (i in 0 until Rules.HATCHERY_SLOTS) {
            val card = RectF(area.left + 10f, y, area.right - 10f, y + 124f)
            ui.panel(card, Pal.panel, 0xFFE3D3B0.toInt(), 14f)
            val egg = s.eggs.getOrNull(i)
            if (egg == null) {
                ui.text("Ranura ${i + 1} libre", card.centerX(), card.top + 44f, 16f, Pal.inkSoft, Paint.Align.CENTER, true)
                ui.button(
                    RectF(card.centerX() - 80f, card.top + 62f, card.centerX() + 80f, card.top + 98f), "Criar dragones",
                    s.dragons.size >= 2, Pal.blue,
                ) { mode = Mode.PICK_A }
                if (s.dragons.size < 2) {
                    ui.text("Necesitas al menos 2 dragones", card.centerX(), card.top + 116f, 11f, Pal.red, Paint.Align.CENTER)
                }
            } else {
                val a = SpeciesCatalog.get(egg.parentA)
                val b = SpeciesCatalog.get(egg.parentB)
                val rem = Rules.remainingSec(egg, now)
                DragonRenderer.drawEgg(ui.c, a.primary, b.primary, card.left + 60f, card.centerY(), 84f, t, rem == 0)
                val tx = card.left + 116f
                ui.text("${a.nombre} + ${b.nombre}", tx, card.top + 30f, 14f, Pal.ink, bold = true, maxW = card.right - tx - 10f)
                if (rem == 0) {
                    ui.text("¡Lista para abrir!", tx, card.top + 52f, 13f, Pal.green, bold = true)
                    ui.button(RectF(tx, card.top + 66f, card.right - 14f, card.top + 100f), "Abrir huevo", color = Pal.green) {
                        reveal = g.hatch(i)
                    }
                } else {
                    ui.text("Eclosiona en ${mmss(rem)}", tx, card.top + 52f, 13f, Pal.inkSoft)
                    val cost = Rules.speedUpCost(egg, now)
                    ui.button(
                        RectF(tx, card.top + 66f, card.right - 14f, card.top + 100f), "Acelerar · $cost gemas",
                        s.gems >= cost, Pal.gem,
                    ) { g.speedUp(i) }
                }
            }
            y += 132f
        }

        ui.text("Recetas conocidas", area.left + 14f, y + 22f, 16f, 0xFFFFFFFF.toInt(), bold = true)
        y += 34f
        for (h in recipes) {
            val row = RectF(area.left + 10f, y, area.right - 10f, y + 40f)
            ui.panel(row, 0x33FFFFFF, radius = 10f)
            DragonRenderer.draw(ui.c, h, row.left + 24f, row.centerY() - 2f, 34f, 0f)
            ui.text(
                "${h.primary.label} + ${h.secondary!!.label}  →  ${h.nombre}",
                row.left + 52f, row.centerY() + 5f, 13f, 0xFFFFFFFF.toInt(), maxW = row.width() - 60f,
            )
            y += 46f
        }
        ui.endScroll()

        when (mode) {
            Mode.NONE -> Unit
            Mode.PICK_A -> drawPick(ui, g, "Elige el primer dragón", null)
            Mode.PICK_B -> drawPick(ui, g, "Elige el segundo dragón", pickA)
        }
        reveal?.let { drawReveal(ui, it, t) }
    }

    private fun drawPick(ui: Ui, g: Game, title: String, exclude: Long?) {
        val r = ui.modal(title, 520f) { mode = Mode.NONE }
        val list = g.state.dragons.filter { it.id != exclude }.sortedByDescending { it.level }
        ui.beginScroll("pick", r, list.size * 60f)
        list.forEachIndexed { i, d ->
            val top = r.top + i * 60f
            ui.listRow(
                RectF(r.left, top, r.right, top + 54f), describe(d), describe(d.species),
                BtnSpec("Elegir") {
                    if (exclude == null) {
                        pickA = d.id
                        mode = Mode.PICK_B
                    } else {
                        g.startFusion(pickA, d.id)
                        mode = Mode.NONE
                    }
                },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, d.species, ix, iy - 6f, 38f, 0f) },
            )
        }
        ui.endScroll()
    }

    private fun drawReveal(ui: Ui, d: Dragon, t: Float) {
        val r = ui.modal("¡Ha nacido un dragón!", 380f) { reveal = null }
        DragonRenderer.draw(ui.c, d.species, r.centerX(), r.top + 110f, 150f, t)
        ui.text(d.species.nombre, r.centerX(), r.top + 220f, 22f, Pal.ink, Paint.Align.CENTER, true)
        ui.text(describe(d.species), r.centerX(), r.top + 242f, 14f, Pal.inkSoft, Paint.Align.CENTER)
        ui.button(RectF(r.centerX() - 70f, r.bottom - 50f, r.centerX() + 70f, r.bottom - 14f), "¡Genial!") { reveal = null }
    }
}
