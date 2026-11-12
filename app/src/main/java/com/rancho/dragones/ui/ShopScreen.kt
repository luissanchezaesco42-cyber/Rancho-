package com.rancho.dragones.ui

import android.graphics.RectF
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.SpeciesCatalog
import com.rancho.dragones.render.DragonRenderer

/** Tienda: dragones básicos, hábitats, comida y gemas. */
class ShopScreen : Screen() {
    override val bgTop = 0xFFFFB65C.toInt()
    override val bgBottom = 0xFFD96A2B.toInt()

    private val rowH = 56f
    private val gap = 6f

    private fun heading(ui: Ui, text: String, x: Float, y: Float) =
        ui.text(text, x, y, 16f, 0xFFFFFFFF.toInt(), bold = true)

    override fun draw(ui: Ui, g: Game, area: RectF, t: Float) {
        val s = g.state
        val basics = SpeciesCatalog.basics
        val elems = Element.values()
        val contentH = 4f + 30f + (basics.size + elems.size + 2) * (rowH + gap) + 3 * 30f + 10f
        ui.beginScroll("shop", area, contentH)
        val l = area.left + 10f
        val r = area.right - 10f
        var y = area.top + 4f

        heading(ui, "Dragones", l + 4f, y + 20f)
        y += 30f
        for (sp in basics) {
            ui.listRow(
                RectF(l, y, r, y + rowH), sp.nombre, "${describe(sp)} · ${"%.0f".format(sp.goldPerMin)} oro/min",
                BtnSpec("${sp.price}", s.gold >= sp.price, Pal.green) { g.buyDragon(sp.id) },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, sp, ix, iy - 6f, 40f, t) },
            )
            y += rowH + gap
        }

        heading(ui, "Hábitats (${s.habitats.size}/${Rules.MAX_HABITATS})", l + 4f, y + 20f)
        y += 30f
        val cost = Rules.habitatCost(s)
        val full = s.habitats.size >= Rules.MAX_HABITATS
        for (e in elems) {
            ui.listRow(
                RectF(l, y, r, y + rowH), "Hábitat de ${e.label}", "Aloja ${Rules.HABITAT_CAPACITY} dragones de ${e.label}",
                BtnSpec(if (full) "Lleno" else "$cost", !full && s.gold >= cost, e.dark) {
                    val slot = (0 until Rules.MAX_HABITATS).firstOrNull { sl -> s.habitats.none { it.slot == sl } }
                    if (slot != null) g.buyHabitat(e, slot)
                },
                icon = { cv, ix, iy ->
                    val p = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
                    p.color = e.dark; cv.drawRoundRect(ix - 16f, iy - 8f, ix + 16f, iy + 14f, 5f, 5f, p)
                    p.color = e.color; cv.drawArc(RectF(ix - 19f, iy - 30f, ix + 19f, iy - 2f), 180f, 180f, true, p)
                },
            )
            y += rowH + gap
        }

        heading(ui, "Otros", l + 4f, y + 20f)
        y += 30f
        ui.listRow(
            RectF(l, y, r, y + rowH), "Comida x${Rules.FOOD_PACK}", "Cada una da ${Rules.FOOD_XP} XP a un dragón",
            BtnSpec("${Rules.FOOD_PACK_PRICE}", s.gold >= Rules.FOOD_PACK_PRICE, Pal.green) { g.buyFood() },
            icon = { _, ix, iy -> ui.food(ix, iy, 14f) },
        )
        y += rowH + gap
        ui.listRow(
            RectF(l, y, r, y + rowH), "Gemas x${Rules.GEM_PACK}", "Cambia oro por gemas para acelerar huevos",
            BtnSpec("${Rules.GEM_PACK_PRICE}", s.gold >= Rules.GEM_PACK_PRICE, Pal.gem) { g.buyGems() },
            icon = { _, ix, iy -> ui.gem(ix, iy, 14f) },
        )
        ui.endScroll()
    }
}
