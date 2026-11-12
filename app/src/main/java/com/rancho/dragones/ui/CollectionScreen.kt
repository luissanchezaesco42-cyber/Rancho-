package com.rancho.dragones.ui

import android.graphics.Paint
import android.graphics.RectF
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.render.DragonRenderer

/** Colección: todos tus dragones, para alimentarlos o venderlos. */
class CollectionScreen : Screen() {
    override val bgTop = 0xFF4FB38A.toInt()
    override val bgBottom = 0xFF1F6F5B.toInt()

    private val rowH = 66f
    private val gap = 6f

    override fun draw(ui: Ui, g: Game, area: RectF, t: Float) {
        val s = g.state
        val list = s.dragons.sortedWith(compareByDescending<com.rancho.dragones.model.Dragon> { it.level }.thenBy { it.id })
        val contentH = 4f + 40f + list.size * (rowH + gap) + 10f
        ui.beginScroll("collection", area, contentH)
        val l = area.left + 10f
        val r = area.right - 10f
        var y = area.top + 4f
        ui.text("Colección (${list.size})", l + 4f, y + 22f, 20f, 0xFFFFFFFF.toInt(), bold = true)
        ui.food(r - 40f, y + 16f, 10f)
        ui.text("x${s.food}", r - 26f, y + 22f, 15f, 0xFFFFFFFF.toInt(), bold = true)
        y += 40f
        for (d in list) {
            val hab = s.habitatOf(d.id)
            val place = hab?.let { "vive en ${it.element.label}" } ?: "sin hábitat"
            val xp = if (d.level >= Rules.MAX_LEVEL) "nivel máx." else "XP ${d.xp}/${Rules.xpToNext(d.level)}"
            ui.listRow(
                RectF(l, y, r, y + rowH), describe(d),
                "${describe(d.species)} · ${Rules.maxHp(d)} PS · ${Rules.attack(d)} ATQ",
                BtnSpec("Alimentar", s.food > 0 && d.level < Rules.MAX_LEVEL, Pal.green) { g.feed(d.id) },
                BtnSpec("Vender ${Rules.sellPrice(d)}", s.dragons.size > 1, Pal.red) { g.sell(d.id) },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, d.species, ix, iy - 6f, 42f, t) },
            )
            ui.text("$xp · $place", l + rowH + 4f, y + 58f, 11f, Pal.inkSoft, Paint.Align.LEFT, maxW = r - 100f - (l + rowH + 4f))
            y += rowH + gap
        }
        ui.endScroll()
    }
}
