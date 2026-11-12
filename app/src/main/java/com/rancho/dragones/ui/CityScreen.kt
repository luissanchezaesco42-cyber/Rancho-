package com.rancho.dragones.ui

import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.Habitat
import com.rancho.dragones.render.DragonRenderer
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

/** La isla: hábitats en una cuadrícula isométrica de 3x3 con los dragones paseando. */
class CityScreen : Screen() {
    override val bgTop = 0xFF59C1F2.toInt()
    override val bgBottom = 0xFF1F78B8.toInt()

    private enum class Mode { NONE, BUY, HABITAT, PLACE }

    private var mode = Mode.NONE
    private var selSlot = 0
    private var selHabitat = 0L

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()

    /** Punto rojo cuando algún hábitat tiene la mitad de su tope de oro (y al menos 10). */
    override fun badge(g: Game) = g.state.habitats.any {
        it.pendingGold >= 10 && it.pendingGold >= Rules.habitatCap(g.state, it) * 0.5
    }

    override fun draw(ui: Ui, g: Game, area: RectF, t: Float) {
        val c = ui.c
        val cx = area.centerX()
        val cy = area.top + area.height() * 0.46f
        val dx = 56f
        val dy = 33f

        fun slotX(s: Int) = cx + ((s % 3) - (s / 3)) * dx
        fun slotY(s: Int) = cy + ((s % 3) + (s / 3) - 2) * dy

        // olas suaves
        fill.style = Paint.Style.FILL
        fill.color = 0x22FFFFFF
        for (i in 0..5) {
            val wy = area.top + 30f + i * (area.height() / 6f)
            val wx = ((t * 12f + i * 70f) % (ui.w + 80f)) - 40f
            c.drawOval(wx, wy, wx + 60f, wy + 6f, fill)
        }

        // base de la isla (tierra y césped)
        fun diamond(x: Float, y: Float, hw: Float, hh: Float, color: Int) {
            path.reset()
            path.moveTo(x, y - hh); path.lineTo(x + hw, y); path.lineTo(x, y + hh); path.lineTo(x - hw, y); path.close()
            fill.color = color
            c.drawPath(path, fill)
        }
        diamond(cx, cy + 22f, dx * 3 + 6, dy * 3 + 6, 0xFF8A5A2B.toInt())
        diamond(cx, cy + 12f, dx * 3 + 6, dy * 3 + 6, 0xFFB57C3E.toInt())
        diamond(cx, cy, dx * 3 + 4, dy * 3 + 4, 0xFF7ED957.toInt())

        val order = (0 until 9).sortedBy { (it % 3) + (it / 3) }
        for (s in order) {
            val x = slotX(s)
            val y = slotY(s)
            val checker = ((s % 3) + (s / 3)) % 2 == 0
            diamond(x, y, dx - 2, dy - 1.5f, if (checker) 0xFF8BE05F.toInt() else 0xFF74CF4C.toInt())
            val h = g.state.habitats.firstOrNull { it.slot == s }
            if (h == null) {
                // casilla libre con un +
                fill.color = 0x66FFFFFF
                c.drawCircle(x, y, 11f, fill)
                ui.text("+", x, y + 8f, 22f, 0xFF3C7A2A.toInt(), Paint.Align.CENTER, true)
                ui.hit(RectF(x - dx * 0.7f, y - dy, x + dx * 0.7f, y + dy)) {
                    selSlot = s
                    mode = Mode.BUY
                }
            } else {
                drawHabitat(ui, g, h, x, y, t)
            }
        }

        ui.text(
            "Toca un hábitat para gestionarlo · toca las monedas para recoger",
            cx, area.bottom - 10f, 11f, 0xCCFFFFFF.toInt(), Paint.Align.CENTER, maxW = ui.w - 20f,
        )

        when (mode) {
            Mode.NONE -> Unit
            Mode.BUY -> drawBuy(ui, g)
            Mode.HABITAT -> drawHabitatModal(ui, g)
            Mode.PLACE -> drawPlaceModal(ui, g)
        }
    }

    private fun drawHabitat(ui: Ui, g: Game, h: Habitat, x: Float, y: Float, t: Float) {
        val c = ui.c
        // caseta: base y cúpula del color del elemento
        val e = h.element
        fill.style = Paint.Style.FILL
        fill.color = e.dark
        c.drawRoundRect(x - 26f, y - 22f, x + 26f, y + 8f, 6f, 6f, fill)
        fill.color = DragonRenderer.lighten(e.color, 0.15f)
        c.drawArc(RectF(x - 30f, y - 52f, x + 30f, y - 8f), 180f, 180f, true, fill)
        fill.color = e.color
        c.drawArc(RectF(x - 22f, y - 48f, x + 22f, y - 12f), 180f, 180f, true, fill)
        fill.color = 0xFF2B1B10.toInt()
        c.drawRoundRect(x - 7f, y - 14f, x + 7f, y + 8f, 5f, 5f, fill)
        fill.color = 0x55FFFFFF
        c.drawCircle(x - 12f, y - 36f, 4f, fill)

        // dragones paseando
        val dragons = h.dragonIds.mapNotNull { g.state.dragon(it) }
        dragons.forEachIndexed { k, d ->
            val ph = t * 0.5f + k * 2.1f
            val ox = sin(ph) * 20f + (k - 1) * 20f
            val oy = 20f + cos(ph * 1.3f) * 4f
            val facingRight = cos(ph) > 0
            DragonRenderer.draw(c, d.species, x + ox, y + oy - 6f, 38f, t + k, flip = !facingRight)
        }

        // burbuja de oro
        val pending = floor(h.pendingGold).toInt()
        val bubble = RectF(x + 6f, y - 74f + sin(t * 3f) * 2f, x + 62f, y - 52f + sin(t * 3f) * 2f)
        if (pending >= 1) {
            ui.panel(bubble, 0xFFFFF3C4.toInt(), 0xFFE09A00.toInt(), 11f)
            ui.coin(bubble.left + 11f, bubble.centerY(), 7f)
            ui.text(pending.toString(), bubble.left + 22f, bubble.centerY() + 5f, 12f, Pal.ink, bold = true, maxW = 36f)
            ui.hit(RectF(bubble.left - 6f, bubble.top - 6f, bubble.right + 6f, bubble.bottom + 8f)) { g.collect(h.id) }
        }
        ui.hit(RectF(x - 34f, y - 54f, x + 34f, y + 36f)) {
            selHabitat = h.id
            mode = Mode.HABITAT
        }
    }

    private fun drawBuy(ui: Ui, g: Game) {
        val cost = Rules.habitatCost(g.state)
        val r = ui.modal("Construir hábitat", 360f) { mode = Mode.NONE }
        ui.text("Cada hábitat aloja hasta ${Rules.HABITAT_CAPACITY} dragones de su elemento.", r.left, r.top + 14f, 12f, Pal.inkSoft, maxW = r.width())
        ui.coin(r.left + 8f, r.top + 38f, 8f)
        ui.text("Precio: $cost", r.left + 22f, r.top + 43f, 14f, Pal.ink, bold = true)
        val elems = Element.values()
        val bw = (r.width() - 10f) / 2
        elems.forEachIndexed { i, e ->
            val col = i % 2
            val row = i / 2
            val left = r.left + col * (bw + 10f)
            val top = r.top + 62f + row * 62f
            ui.button(RectF(left, top, left + bw, top + 50f), e.label, g.state.gold >= cost, e.dark) {
                if (g.buyHabitat(e, selSlot) != null) mode = Mode.NONE
            }
        }
    }

    private fun drawHabitatModal(ui: Ui, g: Game) {
        val h = g.state.habitats.firstOrNull { it.id == selHabitat }
        if (h == null) { mode = Mode.NONE; return }
        val dragons = h.dragonIds.mapNotNull { g.state.dragon(it) }
        val r = ui.modal("Hábitat de ${h.element.label}", 420f) { mode = Mode.NONE }
        val rate = Rules.habitatRate(g.state, h)
        ui.text("Dragones ${dragons.size}/${Rules.HABITAT_CAPACITY} · produce ${"%.1f".format(rate)} oro/min", r.left, r.top + 14f, 12f, Pal.inkSoft, maxW = r.width())
        val pending = floor(h.pendingGold).toInt()
        ui.button(RectF(r.left, r.top + 24f, r.right, r.top + 56f), "Recoger $pending de oro", pending >= 1, Pal.gold) {
            g.collect(h.id)
        }
        var y = r.top + 66f
        for (d in dragons) {
            ui.listRow(
                RectF(r.left, y, r.right, y + 54f), describe(d),
                "+${"%.1f".format(Rules.goldPerMin(d))} oro/min",
                BtnSpec("Quitar", color = Pal.red) { g.remove(d.id) },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, d.species, ix, iy - 6f, 38f, 0f) },
            )
            y += 60f
        }
        if (dragons.size < Rules.HABITAT_CAPACITY) {
            ui.button(RectF(r.left, y + 4f, r.right, y + 38f), "Añadir dragón", color = Pal.blue) { mode = Mode.PLACE }
        }
    }

    private fun drawPlaceModal(ui: Ui, g: Game) {
        val h = g.state.habitats.firstOrNull { it.id == selHabitat }
        if (h == null) { mode = Mode.NONE; return }
        val r = ui.modal("Colocar en ${h.element.label}", 460f) { mode = Mode.HABITAT }
        val free = g.state.dragons.filter { g.state.habitatOf(it.id) == null && Rules.canLiveIn(it, h) }
        if (free.isEmpty()) {
            ui.text("No tienes dragones libres de ${h.element.label}.", r.centerX(), r.top + 30f, 14f, Pal.ink, Paint.Align.CENTER, maxW = r.width())
            ui.text("Cómpralos en la tienda o críalos.", r.centerX(), r.top + 52f, 12f, Pal.inkSoft, Paint.Align.CENTER, maxW = r.width())
            return
        }
        ui.beginScroll("place", r, free.size * 60f)
        free.forEachIndexed { i, d ->
            val top = r.top + i * 60f
            ui.listRow(
                RectF(r.left, top, r.right, top + 54f), describe(d), describe(d.species),
                BtnSpec("Colocar") {
                    if (g.place(d.id, h.id)) mode = Mode.HABITAT
                },
                icon = { _, ix, iy -> DragonRenderer.draw(ui.c, d.species, ix, iy - 6f, 38f, 0f) },
            )
        }
        ui.endScroll()
    }
}
